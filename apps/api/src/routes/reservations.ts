import { Router } from 'express';
import {
  allocateTable,
  availabilityForDate,
  availabilityQuerySchema,
  durationForGuests,
  reservationSchema,
  reservationStatusSchema,
  reservationDecisionSchema,
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
import { env } from '../lib/env.js';
import { BRAND } from '@islamabad/shared';
import { getSettings } from '../services/settings.js';
import { queueEmail, reservationEmail } from '../services/email/index.js';
import { sendPush } from '../services/push.js';

export const reservationRouter = Router();

/** Deep link that lets a guest look up or cancel a booking without an account. */
function manageUrl(code: string): string {
  return `${env.WEB_ORIGIN.replace(/\/$/, '')}/reservations?code=${encodeURIComponent(code)}`;
}

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

    const settings = await getSettings();
    if (!settings.acceptingReservations) {
      throw badRequest('Online bookings are paused right now — please call us on ' + BRAND.phone);
    }

    const booked = await bookedRanges(input.date);
    const table = allocateTable(input.guests, input.time, booked, input.seating);

    const isWaitlist = !table;
    let waitlistPos: number | null = null;
    if (isWaitlist) {
      waitlistPos =
        (await prisma.reservation.count({ where: { date: input.date, time: input.time, status: 'WAITLIST' } })) + 1;
    }

    /**
     * A table being free is not the same as the booking being accepted. Unless
     * the manager has switched auto-approval on, a held table sits at PENDING
     * until someone on the floor confirms it.
     */
    const status = isWaitlist ? 'WAITLIST' : settings.autoApproveReservations ? 'CONFIRMED' : 'PENDING';

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
        status,
        approvedAt: status === 'CONFIRMED' ? new Date() : null,
        waitlistPos,
      },
    });

    const headline =
      status === 'WAITLIST'
        ? 'You are on the waiting list'
        : status === 'CONFIRMED'
          ? 'Table confirmed'
          : 'Booking request received';
    const detail =
      status === 'WAITLIST'
        ? `We will call you if a table frees up for ${input.guests} on ${input.date} at ${input.time}.`
        : status === 'CONFIRMED'
          ? `Table for ${input.guests} confirmed on ${input.date} at ${input.time}. Code ${reservation.code}.`
          : `We have your request for ${input.guests} on ${input.date} at ${input.time}. Our team will confirm shortly. Code ${reservation.code}.`;

    if (req.user) {
      await prisma.notification.create({
        data: { userId: req.user.sub, type: 'RESERVATION', title: headline, body: detail, link: '/dashboard/reservations' },
      });
    }

    queueEmail({
      to: reservation.email,
      kind: 'reservation-' + status.toLowerCase(),
      userId: reservation.userId,
      email: reservationEmail({
        name: reservation.name,
        code: reservation.code,
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests,
        status: status as 'PENDING' | 'CONFIRMED' | 'WAITLIST',
        tableName: table?.name ?? null,
        occasion: reservation.occasion,
        manageUrl: manageUrl(reservation.code),
      }),
    });

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


/* --------------------------- approve / reject ----------------------------- */

/**
 * The manager's decision on a pending request. Approving allocates (or keeps) a
 * table and notifies the guest; rejecting frees the hold and explains why.
 * Both paths email the guest, because a booking they never hear back about is
 * the single worst outcome for the floor team.
 */
reservationRouter.post(
  '/:id/decision',
  authenticate,
  requireStaff,
  validate(reservationDecisionSchema),
  asyncHandler(async (req, res) => {
    const { decision, tableId, reason } = req.body as {
      decision: 'APPROVE' | 'REJECT';
      tableId?: string;
      reason?: string;
    };

    const reservation = await prisma.reservation.findUnique({ where: { id: param(req, 'id') } });
    if (!reservation) throw notFound('Reservation not found');
    if (!['PENDING', 'WAITLIST'].includes(reservation.status)) {
      throw badRequest(`This booking is already ${reservation.status.toLowerCase()}`);
    }

    if (decision === 'REJECT') {
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'REJECTED',
          tableId: null,
          waitlistPos: null,
          rejectionReason: reason || null,
          approvedById: req.user!.sub,
          approvedAt: new Date(),
        },
      });

      if (reservation.userId) {
        await prisma.notification.create({
          data: {
            userId: reservation.userId,
            type: 'RESERVATION',
            title: 'Booking could not be confirmed',
            body: reason || 'We are unable to seat that party at the requested time.',
            link: '/dashboard/reservations',
          },
        });
        void sendPush(reservation.userId, {
          title: 'Booking could not be confirmed',
          body: reason || 'Tap to pick another time.',
          url: '/dashboard/reservations',
        });
      }

      queueEmail({
        to: reservation.email,
        kind: 'reservation-rejected',
        userId: reservation.userId,
        email: reservationEmail({
          name: reservation.name,
          code: reservation.code,
          date: reservation.date,
          time: reservation.time,
          guests: reservation.guests,
          status: 'REJECTED',
          rejectionReason: reason || null,
          manageUrl: manageUrl(reservation.code),
        }),
      });

      await cache.delPrefix(`availability:${reservation.date}`);
      await audit(req.user!.sub, 'reservation.reject', 'Reservation', reservation.id, req);
      res.json({ reservation: updated });
      return;
    }

    // Approve: honour an explicit table choice, otherwise re-run allocation.
    const booked = await bookedRanges(reservation.date, reservation.id);
    let table: { id: string; name: string; zone: string } | null = null;

    if (tableId) {
      const chosen = await prisma.restaurantTable.findUnique({ where: { id: tableId } });
      if (!chosen) throw badRequest('That table does not exist');
      if (chosen.seats < reservation.guests) {
        throw badRequest(`${chosen.name} seats ${chosen.seats} — the party is ${reservation.guests}`);
      }
      const start = toMinutes(reservation.time);
      const end = start + reservation.durationMin;
      const clash = booked.some((b) => b.tableId === chosen.id && start < b.endMinutes && b.startMinutes < end);
      if (clash) throw badRequest(`${chosen.name} is already booked across that window`);
      table = { id: chosen.id, name: chosen.name, zone: chosen.zone };
    } else {
      table = allocateTable(reservation.guests, reservation.time, booked, reservation.seating as 'ANY');
      if (!table) throw badRequest('No table fits that party at that time — reject or ask the guest to move slot');
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'CONFIRMED',
        tableId: table.id,
        waitlistPos: null,
        rejectionReason: null,
        approvedById: req.user!.sub,
        approvedAt: new Date(),
      },
      include: { table: true },
    });

    if (reservation.userId) {
      await prisma.notification.create({
        data: {
          userId: reservation.userId,
          type: 'RESERVATION',
          title: 'Table confirmed',
          body: `Your table for ${reservation.guests} on ${reservation.date} at ${reservation.time} is confirmed. Code ${reservation.code}.`,
          link: '/dashboard/reservations',
        },
      });
      void sendPush(reservation.userId, {
        title: 'Table confirmed',
        body: `${reservation.date} at ${reservation.time} — see you then.`,
        url: '/dashboard/reservations',
      });
    }

    queueEmail({
      to: reservation.email,
      kind: 'reservation-confirmed',
      userId: reservation.userId,
      email: reservationEmail({
        name: reservation.name,
        code: reservation.code,
        date: reservation.date,
        time: reservation.time,
        guests: reservation.guests,
        status: 'CONFIRMED',
        tableName: table.name,
        occasion: reservation.occasion,
        manageUrl: manageUrl(reservation.code),
      }),
    });

    await cache.delPrefix(`availability:${reservation.date}`);
    await audit(req.user!.sub, 'reservation.approve', 'Reservation', reservation.id, req);
    res.json({ reservation: updated, table });
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
