import { Router } from 'express';
import {
  allocateTable,
  availabilityForDate,
  availabilityQuerySchema,
  durationForGuests,
  reservationSchema,
  reservationStatusSchema,
  slotsForDate,
  toMinutes,
  type BookedRange,
  type ReservationInput,
  type ReservationStatus,
} from '@islamabad/shared';
import { prisma } from '../lib/prisma.js';
import {
  asyncHandler,
  authenticate,
  badRequest,
  forbidden,
  notFound,
  optionalAuth,
  rateLimit,
  requireStaff,
  validate,
  validated,
  param,
} from '../middleware/index.js';
import { reservationCode } from '../lib/auth.js';
import { cache } from '../lib/cache.js';
import { audit } from '../services/audit.js';

export const reservationRouter = Router();

const ACTIVE: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'SEATED'];

async function bookedRanges(date: string, excludeId?: string): Promise<BookedRange[]> {
  const rows = await prisma.reservation.findMany({
    where: { date, status: { in: ACTIVE }, tableId: { not: null }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { tableId: true, time: true, durationMin: true },
  });
  return rows.map((r) => ({
    tableId: r.tableId!,
    startMinutes: toMinutes(r.time),
    endMinutes: toMinutes(r.time) + r.durationMin,
  }));
}

/* ------------------------------ availability ----------------------------- */

reservationRouter.get(
  '/availability',
  validate(availabilityQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { date, guests } = req.validated as { date: string; guests: number };
    const seating = ((req.query.seating as string) ?? 'ANY').toUpperCase() as 'ANY' | 'INDOOR' | 'OUTDOOR' | 'PRIVATE';

    const key = `availability:${date}:${guests}:${seating}`;
    const cachedSlots = await cache.get<unknown>(key);
    if (cachedSlots) return res.json(cachedSlots);

    const booked = await bookedRanges(date);
    const slots = availabilityForDate(date, guests, booked, seating);

    // Hide slots that have already passed today.
    const now = new Date();
    const isToday = date === now.toISOString().slice(0, 10);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const filtered = slots.map((s) =>
      isToday && toMinutes(s.time) < nowMinutes + 60 ? { ...s, available: false, past: true } : { ...s, past: false },
    );

    const payload = {
      date,
      guests,
      seating,
      slots: filtered,
      anyAvailable: filtered.some((s) => s.available),
      openingSlots: slotsForDate(date).length,
    };
    await cache.set(key, payload, 45);
    res.json(payload);
  }),
);

/* -------------------------------- booking -------------------------------- */

reservationRouter.post(
  '/',
  optionalAuth,
  rateLimit({ windowSeconds: 900, max: 15, keyPrefix: 'reserve' }),
  validate(reservationSchema),
  asyncHandler(async (req, res) => {
    const input = validated<ReservationInput>(req);

    const bookingDate = new Date(`${input.date}T${input.time}:00`);
    if (Number.isNaN(bookingDate.getTime())) throw badRequest('That date and time is not valid');
    if (bookingDate.getTime() < Date.now() - 60_000) throw badRequest('Please choose a future date and time');

    const validSlots = slotsForDate(input.date);
    if (!validSlots.includes(input.time)) {
      throw badRequest('We are not seating at that time — please pick from the available slots');
    }

    const booked = await bookedRanges(input.date);
    const table = allocateTable(input.guests, input.time, booked, input.seating);

    const isWaitlist = !table;
    let waitlistPos: number | null = null;
    if (isWaitlist) {
      waitlistPos =
        (await prisma.reservation.count({ where: { date: input.date, time: input.time, status: 'WAITLIST' } })) + 1;
    }

    const reservation = await prisma.reservation.create({
      data: {
        code: reservationCode(),
        userId: req.user?.sub ?? null,
        tableId: table?.id ?? null,
        name: input.name,
        email: input.email,
        phone: input.phone,
        date: input.date,
        time: input.time,
        guests: input.guests,
        durationMin: durationForGuests(input.guests),
        seating: input.seating,
        occasion: input.occasion ?? null,
        requests: input.requests || null,
        status: isWaitlist ? 'WAITLIST' : 'CONFIRMED',
        waitlistPos,
      },
    });

    if (req.user) {
      await prisma.notification.create({
        data: {
          userId: req.user.sub,
          type: 'RESERVATION',
          title: isWaitlist ? 'You are on the waiting list' : 'Table confirmed',
          body: isWaitlist
            ? `We will call you if a table frees up for ${input.guests} on ${input.date} at ${input.time}.`
            : `Table for ${input.guests} confirmed on ${input.date} at ${input.time}. Code ${reservation.code}.`,
          link: '/dashboard/reservations',
        },
      });
    }

    await cache.delPrefix(`availability:${input.date}`);
    await audit(req.user?.sub ?? null, 'reservation.create', 'Reservation', reservation.id, req);

    res.status(201).json({
      reservation,
      waitlisted: isWaitlist,
      table: table ? { id: table.id, name: table.name, zone: table.zone } : null,
    });
  }),
);

/* ------------------------- customer reservation ops ---------------------- */

reservationRouter.get(
  '/mine',
  authenticate,
  asyncHandler(async (req, res) => {
    const reservations = await prisma.reservation.findMany({
      where: { userId: req.user!.sub },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      include: { table: true },
    });
    const today = new Date().toISOString().slice(0, 10);
    res.json({
      upcoming: reservations.filter((r) => r.date >= today && ACTIVE.concat('WAITLIST').includes(r.status as ReservationStatus)),
      past: reservations.filter((r) => r.date < today || !ACTIVE.concat('WAITLIST').includes(r.status as ReservationStatus)),
    });
  }),
);

/** Public lookup by confirmation code — lets guests manage without an account. */
reservationRouter.get(
  '/code/:code',
  asyncHandler(async (req, res) => {
    const reservation = await prisma.reservation.findUnique({
      where: { code: param(req, 'code').toUpperCase() },
      include: { table: true },
    });
    if (!reservation) throw notFound('No reservation found with that code');
    res.json({ reservation });
  }),
);

reservationRouter.patch(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const reservation = await prisma.reservation.findUnique({ where: { id: param(req, 'id') } });
    if (!reservation) throw notFound('Reservation not found');

    const code = (req.body as { code?: string }).code?.toUpperCase();
    const isOwner = reservation.userId && reservation.userId === req.user?.sub;
    const hasCode = code && code === reservation.code;
    if (!isOwner && !hasCode) throw forbidden('Sign in or provide your confirmation code to change this booking');

    const patch = reservationSchema.partial().parse(req.body);
    const date = patch.date ?? reservation.date;
    const time = patch.time ?? reservation.time;
    const guests = patch.guests ?? reservation.guests;
    const seating = (patch.seating ?? reservation.seating) as 'ANY' | 'INDOOR' | 'OUTDOOR' | 'PRIVATE';

    const booked = await bookedRanges(date, reservation.id);
    const table = allocateTable(guests, time, booked, seating);
    if (!table) throw badRequest('We have no table for that party size at that time — please pick another slot');

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        date,
        time,
        guests,
        seating,
        tableId: table.id,
        durationMin: durationForGuests(guests),
        occasion: patch.occasion ?? reservation.occasion,
        requests: patch.requests ?? reservation.requests,
        status: 'CONFIRMED',
        waitlistPos: null,
      },
      include: { table: true },
    });

    await cache.delPrefix('availability:');
    res.json({ reservation: updated });
  }),
);

reservationRouter.post(
  '/:id/cancel',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const reservation = await prisma.reservation.findUnique({ where: { id: param(req, 'id') } });
    if (!reservation) throw notFound('Reservation not found');

    const code = (req.body as { code?: string }).code?.toUpperCase();
    const isOwner = reservation.userId && reservation.userId === req.user?.sub;
    const isStaff = req.user && ['STAFF', 'MANAGER', 'SUPER_ADMIN'].includes(req.user.role);
    if (!isOwner && !isStaff && code !== reservation.code) throw forbidden();

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    // Promote the first waitlisted party for that slot, if a table now fits.
    const waiting = await prisma.reservation.findFirst({
      where: { date: reservation.date, time: reservation.time, status: 'WAITLIST' },
      orderBy: { waitlistPos: 'asc' },
    });
    if (waiting) {
      const booked = await bookedRanges(reservation.date, waiting.id);
      const table = allocateTable(waiting.guests, waiting.time, booked, waiting.seating as 'ANY');
      if (table) {
        await prisma.reservation.update({
          where: { id: waiting.id },
          data: { status: 'CONFIRMED', tableId: table.id, waitlistPos: null },
        });
        if (waiting.userId) {
          await prisma.notification.create({
            data: {
              userId: waiting.userId,
              type: 'RESERVATION',
              title: 'A table has opened up',
              body: `Your ${waiting.date} ${waiting.time} booking for ${waiting.guests} is now confirmed.`,
              link: '/dashboard/reservations',
            },
          });
        }
      }
    }

    await cache.delPrefix(`availability:${reservation.date}`);
    res.json({ reservation: updated, promoted: Boolean(waiting) });
  }),
);

/* --------------------------------- admin --------------------------------- */

reservationRouter.get(
  '/',
  authenticate,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { date, status } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (date) where.date = date;
    if (status && status !== 'all') where.status = status;

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: { table: true },
      take: 300,
    });

    const covers = reservations
      .filter((r) => ACTIVE.includes(r.status as ReservationStatus))
      .reduce((sum, r) => sum + r.guests, 0);

    res.json({ reservations, covers, count: reservations.length });
  }),
);

/** Calendar view: covers + booking counts per day for a month. */
reservationRouter.get(
  '/calendar/:month',
  authenticate,
  requireStaff,
  asyncHandler(async (req, res) => {
    const month = param(req, 'month'); // YYYY-MM
    const rows = await prisma.reservation.findMany({
      where: { date: { startsWith: month }, status: { in: ACTIVE } },
      select: { date: true, guests: true, time: true },
    });
    const byDay = new Map<string, { covers: number; bookings: number }>();
    for (const r of rows) {
      const entry = byDay.get(r.date) ?? { covers: 0, bookings: 0 };
      entry.covers += r.guests;
      entry.bookings += 1;
      byDay.set(r.date, entry);
    }
    res.json({ month, days: [...byDay.entries()].map(([date, v]) => ({ date, ...v })) });
  }),
);

reservationRouter.patch(
  '/:id/status',
  authenticate,
  requireStaff,
  validate(reservationStatusSchema),
  asyncHandler(async (req, res) => {
    const { status, tableId, note } = req.body as { status: ReservationStatus; tableId?: string; note?: string };
    const reservation = await prisma.reservation.update({
      where: { id: param(req, 'id') },
      data: {
        status,
        tableId: tableId ?? undefined,
        seatedAt: status === 'SEATED' ? new Date() : undefined,
        cancelledAt: status === 'CANCELLED' ? new Date() : undefined,
        requests: note ?? undefined,
      },
      include: { table: true },
    });
    await cache.delPrefix('availability:');
    await audit(req.user!.sub, 'reservation.status', 'Reservation', reservation.id, req, { status });
    res.json({ reservation });
  }),
);
