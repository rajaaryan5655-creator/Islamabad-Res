import { Router } from 'express';
import { couponSchema, staffSchema, categorySchema, settingsSchema, refundSchema, ORDER_STATUSES } from '@islamabad/shared';
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
import { refundPayment } from '../services/payments.js';
import { getSettings, updateSettings } from '../services/settings.js';
import { queueEmail, refundEmail } from '../services/email/index.js';
import { uniqueSlug } from '../lib/slug.js';

export const adminRouter = Router();

adminRouter.use(authenticate, requireStaff);

/** Shared list paging: bounded page size, consistent envelope. */
function paging(query: Record<string, unknown>, defaultSize = 25, maxSize = 100) {
  const page = Math.max(1, Number(query.page) || 1);
  const take = Math.min(Math.max(1, Number(query.pageSize) || defaultSize), maxSize);
  return { page, take, skip: (page - 1) * take };
}

function envelope<T>(rows: T[], total: number, page: number, take: number) {
  return { total, page, pageSize: take, totalPages: Math.max(1, Math.ceil(total / take)), rows };
}

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
    // An explicit select, not include: a bare include returns every scalar on
    // User — passwordHash among them — straight to the browser.
    const customer = await prisma.user.findUniqueOrThrow({
      where: { id: param(req, 'id') },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        tier: true,
        points: true,
        lifetimePoints: true,
        referralCode: true,
        emailVerified: true,
        marketingOptIn: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 20, include: { items: true } },
        reservations: { orderBy: { date: 'desc' }, take: 20 },
        addresses: true,
        pointsLedger: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    const [spend, referrals] = await Promise.all([
      prisma.order.aggregate({
        where: { userId: customer.id, status: { not: 'CANCELLED' } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.user.count({ where: { referredById: customer.id } }),
    ]);

    res.json({
      customer,
      stats: {
        totalSpend: spend._sum.total ?? 0,
        orderCount: spend._count._all,
        averageOrder: spend._count._all ? Math.round((spend._sum.total ?? 0) / spend._count._all) : 0,
        referrals,
      },
    });
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
  asyncHandler(async (req, res) => {
    const { page, take, skip } = paging(req.query as Record<string, unknown>);
    const { status } = req.query as { status?: string };
    const where = status ? { status } : {};
    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.contactMessage.count({ where }),
    ]);
    res.json({ messages, ...envelope(messages, total, page, take) });
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
  asyncHandler(async (req, res) => {
    const { page, take, skip } = paging(req.query as Record<string, unknown>);
    const { status } = req.query as { status?: string };
    const where = status ? { status } : {};
    const [enquiries, total] = await Promise.all([
      prisma.eventEnquiry.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.eventEnquiry.count({ where }),
    ]);
    res.json({ enquiries, ...envelope(enquiries, total, page, take) });
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


/* ------------------------------- categories ------------------------------- */

adminRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { items: true } } },
    });
    res.json({ categories });
  }),
);

adminRouter.post(
  '/categories',
  requireManager,
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const input = req.body as { name: string; description?: string; image?: string; icon?: string; sortOrder?: number; isActive?: boolean };
    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug: await uniqueSlug('category', input.name),
        description: input.description ?? null,
        image: input.image ?? null,
        icon: input.icon ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
    await cache.delPrefix('menu:');
    await audit(req.user!.sub, 'category.create', 'Category', category.id, req);
    res.status(201).json({ category });
  }),
);

adminRouter.patch(
  '/categories/:id',
  requireManager,
  asyncHandler(async (req, res) => {
    const id = param(req, 'id');
    const input = categorySchema.partial().parse(req.body);
    const category = await prisma.category.update({
      where: { id },
      data: {
        ...input,
        ...(input.name ? { slug: await uniqueSlug('category', input.name, id) } : {}),
      },
    });
    await cache.delPrefix('menu:');
    await audit(req.user!.sub, 'category.update', 'Category', id, req);
    res.json({ category });
  }),
);

/**
 * Categories are never hard-deleted while they still hold dishes — that would
 * cascade away live menu items and their order history.
 */
adminRouter.delete(
  '/categories/:id',
  requireManager,
  asyncHandler(async (req, res) => {
    const id = param(req, 'id');
    const count = await prisma.menuItem.count({ where: { categoryId: id } });
    if (count > 0) {
      throw badRequest(`This category still holds ${count} dish${count === 1 ? '' : 'es'}. Move or delete them first.`);
    }
    await prisma.category.delete({ where: { id } });
    await cache.delPrefix('menu:');
    await audit(req.user!.sub, 'category.delete', 'Category', id, req);
    res.json({ deleted: true });
  }),
);

/** Drag-and-drop ordering from the admin UI. */
adminRouter.post(
  '/categories/reorder',
  requireManager,
  asyncHandler(async (req, res) => {
    const { order } = req.body as { order: string[] };
    if (!Array.isArray(order) || order.length === 0) throw badRequest('Send an array of category ids');
    await prisma.$transaction(
      order.map((id, index) => prisma.category.update({ where: { id }, data: { sortOrder: index } })),
    );
    await cache.delPrefix('menu:');
    res.json({ reordered: order.length });
  }),
);

/* --------------------------- review moderation ---------------------------- */

adminRouter.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const { page, take, skip } = paging(req.query as Record<string, unknown>);
    const { status = 'pending' } = req.query as { status?: string };
    const where: Record<string, unknown> =
      status === 'all' ? {} : { isApproved: status === 'approved' };

    const [reviews, total, pending] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: { select: { id: true, name: true, email: true, tier: true } },
          menuItem: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.count({ where: { isApproved: false } }),
    ]);

    res.json({ reviews, pending, ...envelope(reviews, total, page, take) });
  }),
);

/** Rating distribution and trend, for the reviews dashboard. */
adminRouter.get(
  '/reviews/analytics',
  asyncHandler(async (_req, res) => {
    const [byRating, approved, total, recent] = await Promise.all([
      prisma.review.groupBy({ by: ['rating'], where: { isApproved: true }, _count: { rating: true } }),
      prisma.review.aggregate({ where: { isApproved: true }, _avg: { rating: true }, _count: true }),
      prisma.review.count(),
      prisma.review.findMany({
        where: { isApproved: true, createdAt: { gte: daysAgo(30) } },
        select: { rating: true, createdAt: true },
      }),
    ]);

    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: byRating.find((r) => r.rating === rating)?._count.rating ?? 0,
    }));

    res.json({
      average: Number((approved._avg.rating ?? 0).toFixed(2)),
      approvedCount: approved._count,
      totalCount: total,
      pendingCount: total - approved._count,
      distribution,
      last30Days: {
        count: recent.length,
        average: recent.length
          ? Number((recent.reduce((sum, r) => sum + r.rating, 0) / recent.length).toFixed(2))
          : 0,
      },
    });
  }),
);

adminRouter.patch(
  '/reviews/:id',
  requireManager,
  asyncHandler(async (req, res) => {
    const id = param(req, 'id');
    const { isApproved, reply } = req.body as { isApproved?: boolean; reply?: string };

    const review = await prisma.review.update({
      where: { id },
      data: {
        ...(typeof isApproved === 'boolean' ? { isApproved } : {}),
        ...(reply !== undefined ? { reply: reply || null, repliedAt: reply ? new Date() : null } : {}),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Tell the guest their review is live, or that the owner has replied.
    if (review.userId) {
      await prisma.notification.create({
        data: {
          userId: review.userId,
          type: 'SYSTEM',
          title: reply ? 'The restaurant replied to your review' : 'Your review is published',
          body: reply ? reply.slice(0, 160) : 'Thank you for the feedback — your review is now on the site.',
          link: '/dashboard/reviews',
        },
      });
    }

    await audit(req.user!.sub, 'review.moderate', 'Review', id, req);
    res.json({ review });
  }),
);

adminRouter.delete(
  '/reviews/:id',
  requireManager,
  asyncHandler(async (req, res) => {
    const id = param(req, 'id');
    await prisma.review.delete({ where: { id } });
    await audit(req.user!.sub, 'review.delete', 'Review', id, req);
    res.json({ deleted: true });
  }),
);

/* --------------------------------- refunds -------------------------------- */

/**
 * Issues a full or partial refund. Manager-only, audited, and idempotent at the
 * gateway — the endpoint refuses to refund more than the order is worth.
 */
adminRouter.post(
  '/orders/:id/refund',
  requireManager,
  validate(refundSchema),
  asyncHandler(async (req, res) => {
    const id = param(req, 'id');
    const { amount, reason } = req.body as { amount?: number; reason?: string };

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw badRequest('Order not found');

    let result;
    try {
      result = await refundPayment(id, amount, reason);
    } catch (err) {
      throw badRequest((err as Error).message);
    }

    if (order.userId) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: 'ORDER',
          title: 'Refund issued',
          body: `Rs. ${result.refunded.toLocaleString('en-PK')} has been refunded for order ${order.orderNumber}.`,
          link: `/track/${order.trackingToken}`,
        },
      });
    }

    if (order.customerEmail) {
      queueEmail({
        to: order.customerEmail,
        kind: 'refund',
        userId: order.userId,
        email: refundEmail({
          name: order.customerName,
          orderNumber: order.orderNumber,
          amount: result.refunded,
          reason: reason ?? null,
        }),
      });
    }

    await audit(req.user!.sub, 'order.refund', 'Order', id, req);
    res.json({ refund: result });
  }),
);

/* -------------------------------- settings -------------------------------- */

adminRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    res.json({ settings: await getSettings() });
  }),
);

adminRouter.patch(
  '/settings',
  requireManager,
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const settings = await updateSettings(req.body as Record<string, never>);
    await audit(req.user!.sub, 'settings.update', 'Setting', 'restaurant', req);
    res.json({ settings });
  }),
);

/* ------------------------------- email log -------------------------------- */

/** Delivery log — lets staff confirm a customer really was emailed. */
adminRouter.get(
  '/emails',
  requireManager,
  asyncHandler(async (req, res) => {
    const { page, take, skip } = paging(req.query as Record<string, unknown>);
    const { kind, status } = req.query as { kind?: string; status?: string };
    const where: Record<string, unknown> = {};
    if (kind) where.kind = kind;
    if (status) where.status = status;

    const [emails, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: { id: true, to: true, subject: true, kind: true, status: true, error: true, createdAt: true },
      }),
      prisma.emailLog.count({ where }),
    ]);
    res.json({ emails, ...envelope(emails, total, page, take) });
  }),
);

/* ------------------------------- audit log ------------------------------- */

adminRouter.get(
  '/audit',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { page, take, skip } = paging(req.query as Record<string, unknown>, 50, 200);
    const { action, actorId } = req.query as { action?: string; actorId?: string };
    const where: Record<string, unknown> = {};
    if (action) where.action = { contains: action };
    if (actorId) where.actorId = actorId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { actor: { select: { name: true, email: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, ...envelope(logs, total, page, take) });
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
