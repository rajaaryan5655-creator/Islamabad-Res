import { Router } from 'express';
import { LOYALTY_TIERS, nextTier, tierForPoints, pushSubscriptionSchema } from '@islamabad/shared';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, authenticate, validate } from '../middleware/index.js';
import { env } from '../lib/env.js';
import { normalisePhone } from '../services/orders.js';
import { pushEnabled, sendPush } from '../services/push.js';

export const customerRouter = Router();

customerRouter.use(authenticate);

/** Customer dashboard summary (Phase 8). */
customerRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const today = new Date().toISOString().slice(0, 10);

    const [user, orders, upcomingReservations, notifications, spend] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { items: true },
      }),
      prisma.reservation.findMany({
        where: { userId, date: { gte: today }, status: { in: ['PENDING', 'CONFIRMED', 'WAITLIST'] } },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        take: 5,
        include: { table: true },
      }),
      prisma.notification.findMany({ where: { userId, readAt: null }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.order.aggregate({
        where: { userId, status: { not: 'CANCELLED' } },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);

    const tier = tierForPoints(user.lifetimePoints);
    const next = nextTier(user.lifetimePoints);

    const activeOrder = orders.find((o) =>
      ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status),
    );

    // Favourite dish by lifetime quantity.
    const favourites = await prisma.orderItem.groupBy({
      by: ['name'],
      where: { order: { userId, status: { not: 'CANCELLED' } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 3,
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        points: user.points,
        lifetimePoints: user.lifetimePoints,
        referralCode: user.referralCode,
        memberSince: user.createdAt,
      },
      loyalty: {
        tier,
        nextTier: next,
        pointsToNext: next ? next.minPoints - user.lifetimePoints : 0,
        progressPct: next
          ? Math.min(100, Math.round(((user.lifetimePoints - tier.minPoints) / (next.minPoints - tier.minPoints)) * 100))
          : 100,
        allTiers: LOYALTY_TIERS,
      },
      stats: {
        totalOrders: spend._count._all,
        totalSpend: spend._sum.total ?? 0,
        upcomingReservations: upcomingReservations.length,
      },
      recentOrders: orders,
      activeOrder: activeOrder ?? null,
      upcomingReservations,
      notifications,
      favourites: favourites.map((f) => ({ name: f.name, quantity: f._sum.quantity ?? 0 })),
    });
  }),
);

customerRouter.get(
  '/loyalty',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const [user, ledger, referrals] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.pointsEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.user.count({ where: { referredById: userId } }),
    ]);
    const tier = tierForPoints(user.lifetimePoints);
    res.json({
      points: user.points,
      lifetimePoints: user.lifetimePoints,
      tier,
      nextTier: nextTier(user.lifetimePoints),
      allTiers: LOYALTY_TIERS,
      ledger,
      referralCode: user.referralCode,
      referralCount: referrals,
    });
  }),
);

customerRouter.get(
  '/gift-cards',
  asyncHandler(async (req, res) => {
    const cards = await prisma.giftCard.findMany({
      where: { purchaserId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ giftCards: cards });
  }),
);

/* -------------------------------- coupons --------------------------------- */

/**
 * Every offer this customer can actually use right now, with the reason any
 * unusable one is unavailable. Showing a code that then fails at checkout is
 * worse than not showing it, so eligibility is resolved here rather than in
 * the UI.
 */
customerRouter.get(
  '/coupons',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const now = new Date();

    const [user, coupons] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.coupon.findMany({
        where: {
          isActive: true,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const redemptions = await prisma.couponRedemption.groupBy({
      by: ['couponId'],
      where: {
        couponId: { in: coupons.map((c) => c.id) },
        OR: [
          { userId },
          { email: user.email.toLowerCase() },
          ...(user.phone ? [{ phone: normalisePhone(user.phone) }] : []),
        ],
      },
      _count: { couponId: true },
    });
    const usedById = new Map(redemptions.map((r) => [r.couponId, r._count.couponId]));

    const decorated = coupons.map((coupon) => {
      const timesUsed = usedById.get(coupon.id) ?? 0;
      const exhausted = Boolean(coupon.usageLimit && coupon.usageCount >= coupon.usageLimit);
      const personallyUsedUp = Boolean(coupon.perUserLimit && timesUsed >= coupon.perUserLimit);

      return {
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        minOrder: coupon.minOrder,
        maxDiscount: coupon.maxDiscount,
        expiresAt: coupon.expiresAt,
        timesUsed,
        perUserLimit: coupon.perUserLimit,
        isUsable: !exhausted && !personallyUsedUp,
        unavailableReason: personallyUsedUp
          ? 'You have already used this offer'
          : exhausted
            ? 'Fully redeemed'
            : null,
      };
    });

    res.json({
      available: decorated.filter((c) => c.isUsable),
      used: decorated.filter((c) => !c.isUsable),
    });
  }),
);

/* ---------------------------- push notifications --------------------------- */

/** The browser needs the public VAPID key before it can subscribe. */
customerRouter.get(
  '/push/key',
  asyncHandler(async (_req, res) => {
    res.json({ enabled: pushEnabled, publicKey: env.VAPID_PUBLIC_KEY || null });
  }),
);

customerRouter.post(
  '/push/subscribe',
  validate(pushSubscriptionSchema),
  asyncHandler(async (req, res) => {
    const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };

    // Endpoints are unique per browser install; upsert so re-subscribing after
    // a permission reset does not create duplicates.
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: req.user!.sub,
        userAgent: req.headers['user-agent']?.slice(0, 240) ?? null,
      },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: req.user!.sub },
    });

    res.status(201).json({ subscribed: true, id: subscription.id });
  }),
);

customerRouter.post(
  '/push/unsubscribe',
  asyncHandler(async (req, res) => {
    const { endpoint } = req.body as { endpoint?: string };
    const { count } = await prisma.pushSubscription.deleteMany({
      where: endpoint ? { endpoint, userId: req.user!.sub } : { userId: req.user!.sub },
    });
    res.json({ removed: count });
  }),
);

/** Confirms the round trip works from the customer's own device. */
customerRouter.post(
  '/push/test',
  asyncHandler(async (req, res) => {
    const delivered = await sendPush(req.user!.sub, {
      title: 'Notifications are on',
      body: 'We will let you know the moment your order is on its way.',
      url: '/dashboard',
    });
    res.json({ delivered });
  }),
);
