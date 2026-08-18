import { Router } from 'express';
import { contactSchema, eventEnquirySchema, giftCardPurchaseSchema, newsletterSchema, reviewSchema } from '@islamabad/shared';
import { prisma } from '../lib/prisma.js';
import {
  asyncHandler,
  authenticate,
  badRequest,
  notFound,
  optionalAuth,
  rateLimit,
  requireManager,
  validate,
  param,
} from '../middleware/index.js';
import { giftCardCode } from '../lib/auth.js';

export const marketingRouter = Router();

/* ------------------------------- newsletter ------------------------------ */

marketingRouter.post(
  '/newsletter',
  rateLimit({ windowSeconds: 3600, max: 10, keyPrefix: 'newsletter' }),
  validate(newsletterSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('zod').infer<typeof newsletterSchema>;
    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email: input.email },
      update: { isSubscribed: true, unsubscribedAt: null, name: input.name ?? undefined },
      create: { email: input.email, name: input.name ?? null, source: input.source ?? 'footer' },
    });
    res.status(201).json({
      ok: true,
      subscriber: { email: subscriber.email },
      message: 'You are on the list. Watch for our Thursday offers.',
    });
  }),
);

marketingRouter.post(
  '/newsletter/unsubscribe',
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };
    await prisma.newsletterSubscriber.updateMany({
      where: { email: email?.toLowerCase() },
      data: { isSubscribed: false, unsubscribedAt: new Date() },
    });
    res.json({ ok: true });
  }),
);

/* --------------------------------- contact ------------------------------- */

marketingRouter.post(
  '/contact',
  rateLimit({ windowSeconds: 3600, max: 8, keyPrefix: 'contact' }),
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('zod').infer<typeof contactSchema>;
    const message = await prisma.contactMessage.create({
      data: { ...input, phone: input.phone || null },
    });
    res.status(201).json({
      ok: true,
      id: message.id,
      message: 'Thank you — our team replies within one working day.',
    });
  }),
);

/* --------------------------------- coupons ------------------------------- */

/** Public list of live, publishable offers for the offers page. */
marketingRouter.get(
  '/offers',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { value: 'desc' },
      select: { code: true, description: true, type: true, value: true, minOrder: true, maxDiscount: true, expiresAt: true },
    });
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    res.json({ offers: coupons });
  }),
);

/* ------------------------------- gift cards ------------------------------ */

marketingRouter.post(
  '/gift-cards',
  optionalAuth,
  rateLimit({ windowSeconds: 3600, max: 10, keyPrefix: 'giftcard' }),
  validate(giftCardPurchaseSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('zod').infer<typeof giftCardPurchaseSchema>;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const card = await prisma.giftCard.create({
      data: {
        code: giftCardCode(),
        amount: input.amount,
        balance: input.amount,
        purchaserId: req.user?.sub ?? null,
        recipientName: input.recipientName,
        recipientEmail: input.recipientEmail,
        senderName: input.senderName,
        message: input.message || null,
        expiresAt,
      },
    });
    res.status(201).json({ giftCard: card });
  }),
);

marketingRouter.get(
  '/gift-cards/:code',
  asyncHandler(async (req, res) => {
    const card = await prisma.giftCard.findUnique({ where: { code: param(req, 'code').toUpperCase() } });
    if (!card) throw notFound('No gift card found with that code');
    res.json({
      giftCard: {
        code: card.code,
        balance: card.balance,
        amount: card.amount,
        status: card.status,
        expiresAt: card.expiresAt,
        recipientName: card.recipientName,
      },
    });
  }),
);

marketingRouter.post(
  '/gift-cards/:code/redeem',
  authenticate,
  asyncHandler(async (req, res) => {
    const { amount } = req.body as { amount: number };
    const card = await prisma.giftCard.findUnique({ where: { code: param(req, 'code').toUpperCase() } });
    if (!card) throw notFound('No gift card found with that code');
    if (card.status !== 'ACTIVE') throw badRequest('That gift card is no longer active');
    if (card.expiresAt < new Date()) throw badRequest('That gift card has expired');
    if (!amount || amount <= 0 || amount > card.balance) throw badRequest('Invalid redemption amount');

    const balance = card.balance - amount;
    const updated = await prisma.giftCard.update({
      where: { id: card.id },
      data: { balance, status: balance === 0 ? 'REDEEMED' : 'ACTIVE' },
    });
    res.json({ giftCard: { code: updated.code, balance: updated.balance, status: updated.status } });
  }),
);

/* --------------------------------- events -------------------------------- */

marketingRouter.post(
  '/events/enquiry',
  rateLimit({ windowSeconds: 3600, max: 10, keyPrefix: 'event' }),
  validate(eventEnquirySchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('zod').infer<typeof eventEnquirySchema>;
    const enquiry = await prisma.eventEnquiry.create({
      data: { ...input, details: input.details || null, budget: input.budget ?? null },
    });
    res.status(201).json({
      ok: true,
      id: enquiry.id,
      message: 'Enquiry received. Our events manager will call you within one working day.',
    });
  }),
);

/* -------------------------------- reviews -------------------------------- */

marketingRouter.post(
  '/reviews',
  authenticate,
  rateLimit({ windowSeconds: 3600, max: 10, keyPrefix: 'review' }),
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('zod').infer<typeof reviewSchema>;

    // Only verified purchasers may review a specific dish.
    if (input.menuItemId) {
      const ordered = await prisma.orderItem.findFirst({
        where: { menuItemId: input.menuItemId, order: { userId: req.user!.sub, status: 'DELIVERED' } },
      });
      if (!ordered) throw badRequest('You can review a dish once you have ordered it');
    }

    const review = await prisma.review.create({
      data: {
        userId: req.user!.sub,
        menuItemId: input.menuItemId ?? null,
        rating: input.rating,
        title: input.title ?? null,
        body: input.body,
      },
    });

    if (input.menuItemId) {
      const agg = await prisma.review.aggregate({
        where: { menuItemId: input.menuItemId, isApproved: true },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await prisma.menuItem.update({
        where: { id: input.menuItemId },
        data: { rating: agg._avg.rating ?? 4.5, ratingCount: agg._count._all },
      });
    }

    res.status(201).json({ review, message: 'Thank you — your review is pending moderation.' });
  }),
);

marketingRouter.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { isApproved: true, ...(req.query.menuItemId ? { menuItemId: String(req.query.menuItemId) } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { user: { select: { name: true, tier: true } } },
    });
    res.json({ reviews });
  }),
);

marketingRouter.patch(
  '/reviews/:id/approve',
  authenticate,
  requireManager,
  asyncHandler(async (req, res) => {
    const review = await prisma.review.update({
      where: { id: param(req, 'id') },
      data: { isApproved: Boolean((req.body as { isApproved?: boolean }).isApproved ?? true) },
    });
    res.json({ review });
  }),
);

/* ------------------------------- campaigns ------------------------------- */

marketingRouter.get(
  '/campaigns',
  authenticate,
  requireManager,
  asyncHandler(async (_req, res) => {
    const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });
    const audience = await prisma.newsletterSubscriber.count({ where: { isSubscribed: true } });
    res.json({ campaigns, audience });
  }),
);

marketingRouter.post(
  '/campaigns',
  authenticate,
  requireManager,
  asyncHandler(async (req, res) => {
    const { name, subject, body, segment, scheduledAt } = req.body as Record<string, string>;
    if (!name || !subject || !body) throw badRequest('Name, subject and body are required');
    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject,
        body,
        segment: segment ?? 'ALL',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
    });
    res.status(201).json({ campaign });
  }),
);

marketingRouter.post(
  '/campaigns/:id/send',
  authenticate,
  requireManager,
  asyncHandler(async (req, res) => {
    const recipients = await prisma.newsletterSubscriber.count({ where: { isSubscribed: true } });
    const campaign = await prisma.campaign.update({
      where: { id: param(req, 'id') },
      data: { status: 'SENT', sentAt: new Date(), recipients },
    });
    res.json({ campaign, dispatched: recipients });
  }),
);

/* ----------------------------- notifications ----------------------------- */

marketingRouter.get(
  '/notifications',
  authenticate,
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    res.json({ notifications, unread: notifications.filter((n) => !n.readAt).length });
  }),
);

marketingRouter.post(
  '/notifications/read',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  }),
);
