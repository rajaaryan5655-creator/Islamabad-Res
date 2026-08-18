import { Router } from 'express';
import { couponSchema, staffSchema, ORDER_STATUSES } from '@islamabad/shared';
import { prisma } from '../lib/prisma.js';
import { cached, cache } from '../lib/cache.js';
import {
  asyncHandler,
  authenticate,
  badRequest,
  requireManager,
  requireStaff,
  requireSuperAdmin,
  validate,
  param,
} from '../middleware/index.js';
import { hashPassword, generateReferralCode } from '../lib/auth.js';
import { audit } from '../services/audit.js';

export const adminRouter = Router();

adminRouter.use(authenticate, requireStaff);

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/* -------------------------------- overview ------------------------------- */

adminRouter.get(
  '/analytics/overview',
  asyncHandler(async (_req, res) => {
    const data = await cached('analytics:overview', 60, async () => {
      const now = new Date();
      const today = startOfDay(now);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      // Like-for-like: compare month-to-date against the same span last month,
      // otherwise a partial month always looks like a collapse in revenue.
      const prevMonthSameDay = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), now.getHours(), now.getMinutes());

      const paidFilter = { status: { not: 'CANCELLED' } } as const;

      const [
        todayOrders,
        monthOrders,
        prevMonthOrders,
        totalCustomers,
        newCustomers30,
        activeOrders,
        todayReservations,
        upcomingReservations,
        pendingEnquiries,
        unreadMessages,
      ] = await Promise.all([
        prisma.order.findMany({ where: { ...paidFilter, createdAt: { gte: today } }, select: { total: true } }),
        prisma.order.findMany({ where: { ...paidFilter, createdAt: { gte: monthStart } }, select: { total: true } }),
        prisma.order.findMany({
          where: { ...paidFilter, createdAt: { gte: prevMonthStart, lt: prevMonthSameDay } },
          select: { total: true },
        }),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: daysAgo(30) } } }),
        prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } } }),
        prisma.reservation.count({
          where: { date: new Date().toISOString().slice(0, 10), status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] } },
        }),
        prisma.reservation.count({
          where: { date: { gte: new Date().toISOString().slice(0, 10) }, status: { in: ['PENDING', 'CONFIRMED'] } },
        }),
        prisma.eventEnquiry.count({ where: { status: 'NEW' } }),
        prisma.contactMessage.count({ where: { status: 'NEW' } }),
      ]);

      const sum = (rows: { total: number }[]) => rows.reduce((s, r) => s + r.total, 0);
      const monthRevenue = sum(monthOrders);
      const prevRevenue = sum(prevMonthOrders);

      return {
        revenue: {
          today: sum(todayOrders),
          month: monthRevenue,
          prevMonthToDate: prevRevenue,
          growthPct: prevRevenue > 0 ? Number((((monthRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)) : null,
        },
        orders: {
          today: todayOrders.length,
          month: monthOrders.length,
          active: activeOrders,
          avgTicket: monthOrders.length ? Math.round(monthRevenue / monthOrders.length) : 0,
        },
        customers: { total: totalCustomers, new30: newCustomers30 },
        reservations: { today: todayReservations, upcoming: upcomingReservations },
        inbox: { enquiries: pendingEnquiries, messages: unreadMessages },
      };
    });
    res.json(data);
  }),
);

/* ------------------------------ revenue series --------------------------- */

adminRouter.get(
  '/analytics/revenue',
  asyncHandler(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const data = await cached(`analytics:revenue:${days}`, 120, async () => {
      const since = daysAgo(days);
      const orders = await prisma.order.findMany({
        where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
        select: { createdAt: true, total: true, type: true },
      });

      const byDay = new Map<string, { revenue: number; orders: number; delivery: number; pickup: number; dineIn: number }>();
      for (let i = days - 1; i >= 0; i--) {
        const key = daysAgo(i).toISOString().slice(0, 10);
        byDay.set(key, { revenue: 0, orders: 0, delivery: 0, pickup: 0, dineIn: 0 });
      }
      for (const o of orders) {
        const key = o.createdAt.toISOString().slice(0, 10);
        const entry = byDay.get(key);
        if (!entry) continue;
        entry.revenue += o.total;
        entry.orders += 1;
        if (o.type === 'DELIVERY') entry.delivery += 1;
        else if (o.type === 'PICKUP') entry.pickup += 1;
        else entry.dineIn += 1;
      }
      return [...byDay.entries()].map(([date, v]) => ({ date, ...v }));
    });
    res.json({ series: data });
  }),
);

/* --------------------------------- reports ------------------------------- */

adminRouter.get(
  '/analytics/report/:period',
  asyncHandler(async (req, res) => {
    const period = param(req, 'period') as 'daily' | 'weekly' | 'monthly' | 'annual';
    const spans: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, annual: 365 };
    const days = spans[period];
    if (!days) throw badRequest('Period must be daily, weekly, monthly or annual');

    const since = daysAgo(days);
    const prevSince = daysAgo(days * 2);

    const [orders, prevOrders, reservations, topItems, statusCounts] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
        include: { items: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: prevSince, lt: since }, status: { not: 'CANCELLED' } },
        select: { total: true },
      }),
      prisma.reservation.count({ where: { createdAt: { gte: since } } }),
      prisma.orderItem.groupBy({
        by: ['name'],
        where: { order: { createdAt: { gte: since }, status: { not: 'CANCELLED' } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0);
    const covers = orders.reduce((s, o) => s + o.items.reduce((n, i) => n + i.quantity, 0), 0);

    res.json({
      period,
      from: since.toISOString(),
      to: new Date().toISOString(),
      revenue,
      prevRevenue,
      growthPct: prevRevenue ? Number((((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1)) : null,
      orderCount: orders.length,
      avgTicket: orders.length ? Math.round(revenue / orders.length) : 0,
      itemsSold: covers,
      reservations,
      tax: orders.reduce((s, o) => s + o.tax, 0),
      discounts: orders.reduce((s, o) => s + o.discount + o.pointsDiscount, 0),
      deliveryRevenue: orders.reduce((s, o) => s + o.deliveryFee, 0),
      byType: {
        DELIVERY: orders.filter((o) => o.type === 'DELIVERY').length,
        PICKUP: orders.filter((o) => o.type === 'PICKUP').length,
        DINE_IN: orders.filter((o) => o.type === 'DINE_IN').length,
      },
      byStatus: Object.fromEntries(ORDER_STATUSES.map((s) => [s, statusCounts.find((c) => c.status === s)?._count._all ?? 0])),
      topItems: topItems.map((t) => ({ name: t.name, quantity: t._sum.quantity ?? 0, revenue: t._sum.total ?? 0 })),
    });
  }),
);

/* ------------------------------- customers ------------------------------- */

adminRouter.get(
  '/customers',
  requireManager,
  asyncHandler(async (req, res) => {
    const { search, page = '1', pageSize = '25' } = req.query as Record<string, string>;
    const take = Math.min(Number(pageSize) || 25, 100);
    const skip = ((Number(page) || 1) - 1) * take;
    const where: Record<string, unknown> = { role: 'CUSTOMER' };
    if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }];

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true, name: true, email: true, phone: true, tier: true, points: true, lifetimePoints: true,
          createdAt: true, lastLoginAt: true, marketingOptIn: true,
          _count: { select: { orders: true, reservations: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const spend = await prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: customers.map((c) => c.id) }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    });
    const spendMap = new Map(spend.map((s) => [s.userId, s._sum.total ?? 0]));

    res.json({
      customers: customers.map((c) => ({ ...c, totalSpend: spendMap.get(c.id) ?? 0 })),
      total,
      page: Number(page) || 1,
      totalPages: Math.ceil(total / take),
    });
  }),
);

adminRouter.get(
  '/customers/:id',
  requireManager,
  asyncHandler(async (req, res) => {
    const customer = await prisma.user.findUniqueOrThrow({
      where: { id: param(req, 'id') },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, take: 20, include: { items: true } },
        reservations: { orderBy: { date: 'desc' }, take: 20 },
        addresses: true,
        pointsLedger: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    res.json({ customer });
  }),
);

/* ---------------------------------- staff -------------------------------- */

adminRouter.get(
  '/staff',
  requireManager,
  asyncHandler(async (_req, res) => {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, phone: true, role: true, position: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    res.json({ staff });
  }),
);

adminRouter.post(
  '/staff',
  requireSuperAdmin,
  validate(staffSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('zod').infer<typeof staffSchema>;
    const password = input.password ?? `Ir${Math.random().toString(36).slice(2, 10)}A1`;
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        role: input.role,
        position: input.position ?? null,
        passwordHash: await hashPassword(password),
        referralCode: generateReferralCode(input.name),
        emailVerified: true,
      },
      select: { id: true, name: true, email: true, role: true, position: true, isActive: true },
    });
    await audit(req.user!.sub, 'staff.create', 'User', user.id, req, { role: input.role });
    res.status(201).json({ staff: user, temporaryPassword: input.password ? undefined : password });
  }),
);

adminRouter.patch(
  '/staff/:id',
  requireSuperAdmin,
  validate(staffSchema.partial()),
  asyncHandler(async (req, res) => {
    const input = req.body as Partial<import('zod').infer<typeof staffSchema>>;
    if (param(req, 'id') === req.user!.sub && input.role && input.role !== 'SUPER_ADMIN') {
      throw badRequest('You cannot demote your own account');
    }
    const staff = await prisma.user.update({
      where: { id: param(req, 'id') },
      data: {
        name: input.name,
        phone: input.phone,
        role: input.role,
        position: input.position,
        isActive: input.isActive,
        passwordHash: input.password ? await hashPassword(input.password) : undefined,
      },
      select: { id: true, name: true, email: true, role: true, position: true, isActive: true },
    });
    await audit(req.user!.sub, 'staff.update', 'User', staff.id, req);
    res.json({ staff });
  }),
);

/* -------------------------------- coupons -------------------------------- */

adminRouter.get(
  '/coupons',
  requireManager,
  asyncHandler(async (_req, res) => {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ coupons });
  }),
);

adminRouter.post(
  '/coupons',
  requireManager,
  validate(couponSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('zod').infer<typeof couponSchema>;
    const coupon = await prisma.coupon.create({
      data: {
        ...input,
        startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
    res.status(201).json({ coupon });
  }),
);

adminRouter.patch(
  '/coupons/:id',
  requireManager,
  validate(couponSchema.partial()),
  asyncHandler(async (req, res) => {
    const input = req.body as Partial<import('zod').infer<typeof couponSchema>>;
    const coupon = await prisma.coupon.update({
      where: { id: param(req, 'id') },
      data: {
        ...input,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      },
    });
    res.json({ coupon });
  }),
);

adminRouter.delete(
  '/coupons/:id',
  requireManager,
  asyncHandler(async (req, res) => {
    await prisma.coupon.delete({ where: { id: param(req, 'id') } });
    res.json({ ok: true });
  }),
);

/* ---------------------------- inbox & enquiries -------------------------- */

adminRouter.get(
  '/messages',
  asyncHandler(async (_req, res) => {
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ messages });
  }),
);

adminRouter.patch(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    const message = await prisma.contactMessage.update({
      where: { id: param(req, 'id') },
      data: { status: (req.body as { status: string }).status },
    });
    res.json({ message });
  }),
);

adminRouter.get(
  '/enquiries',
  asyncHandler(async (_req, res) => {
    const enquiries = await prisma.eventEnquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ enquiries });
  }),
);

adminRouter.patch(
  '/enquiries/:id',
  asyncHandler(async (req, res) => {
    const enquiry = await prisma.eventEnquiry.update({
      where: { id: param(req, 'id') },
      data: { status: (req.body as { status: string }).status },
    });
    res.json({ enquiry });
  }),
);

/* ------------------------------- audit log ------------------------------- */

adminRouter.get(
  '/audit',
  requireSuperAdmin,
  asyncHandler(async (_req, res) => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { actor: { select: { name: true, email: true, role: true } } },
    });
    res.json({ logs });
  }),
);

/* ------------------------------- cache ops ------------------------------- */

adminRouter.post(
  '/cache/flush',
  requireManager,
  asyncHandler(async (req, res) => {
    await cache.delPrefix('menu:');
    await cache.delPrefix('analytics:');
    await cache.delPrefix('availability:');
    await cache.del('categories:all');
    await audit(req.user!.sub, 'cache.flush', 'System', null, req);
    res.json({ ok: true, driver: cache.name });
  }),
);
