import { Router } from 'express';
import { LOYALTY_TIERS, nextTier, tierForPoints } from '@islamabad/shared';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, authenticate } from '../middleware/index.js';

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
