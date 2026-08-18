import { Router } from 'express';
import { checkoutSchema, orderStatusSchema, quoteOrder, type CheckoutInput, type OrderStatus } from '@islamabad/shared';
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
import {
  buildLines,
  createOrder,
  resolveCoupon,
  toCouponLike,
  transitionOrder,
  type CartLineInput,
} from '../services/orders.js';
import { createPaymentIntent } from '../services/payments.js';
import { audit } from '../services/audit.js';
import { parseOptions } from '../lib/json.js';

export const orderRouter = Router();

/**
 * Order rows carry `items[].options` as a JSON string column. Every response
 * goes through here so clients never have to parse it themselves.
 */
function serializeOrder<T extends { items?: { options?: string | null }[] }>(order: T) {
  if (!order?.items) return order;
  return {
    ...order,
    items: order.items.map((item) => ({ ...item, options: parseOptions(item.options) })),
  };
}

function serializeOrders<T extends { items?: { options?: string | null }[] }>(orders: T[]) {
  return orders.map(serializeOrder);
}


/* ------------------------------ live quoting ----------------------------- */

/** Server-authoritative cart total — the web cart calls this before checkout. */
orderRouter.post(
  '/quote',
  optionalAuth,
  rateLimit({ windowSeconds: 60, max: 60, keyPrefix: 'quote' }),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      items: { menuItemId: string; quantity: number }[];
      type?: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
      zoneId?: string;
      couponCode?: string;
      redeemPoints?: number;
      customerEmail?: string;
      customerPhone?: string;
    };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw badRequest('Your cart is empty');
    }

    const lines = await buildLines(body.items as CartLineInput[]);
    let coupon = null;
    let couponError: string | null = null;
    try {
      // Quote with the same identity checkout will use, so a guest sees the
      // "already used" message before reaching the payment step.
      coupon = await resolveCoupon(body.couponCode, {
        userId: req.user?.sub ?? null,
        email: body.customerEmail,
        phone: body.customerPhone,
      });
    } catch (err) {
      couponError = (err as Error).message;
    }

    const user = req.user ? await prisma.user.findUnique({ where: { id: req.user.sub } }) : null;

    const quote = quoteOrder({
      lines,
      type: body.type ?? 'DELIVERY',
      zoneId: body.zoneId,
      coupon: toCouponLike(coupon),
      redeemPoints: body.redeemPoints ?? 0,
      availablePoints: user?.points ?? 0,
    });

    res.json({ quote: { ...quote, couponError: couponError ?? quote.couponError }, lines });
  }),
);

/* -------------------------------- checkout ------------------------------- */

orderRouter.post(
  '/',
  optionalAuth,
  rateLimit({ windowSeconds: 300, max: 20, keyPrefix: 'checkout' }),
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    const input = validated<CheckoutInput>(req);
    const order = await createOrder({ input, userId: req.user?.sub ?? null });
    const payment = await createPaymentIntent(order);
    await audit(req.user?.sub ?? null, 'order.create', 'Order', order.id, req, { total: order.total });
    res.status(201).json({ order, payment });
  }),
);

/* --------------------------- customer order views ------------------------ */

orderRouter.get(
  '/mine',
  authenticate,
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.sub },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ orders: serializeOrders(orders) });
  }),
);

/** Public tracking by opaque token — no auth, no enumeration risk. */
orderRouter.get(
  '/track/:token',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { trackingToken: param(req, 'token') },
      include: { items: true, events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw notFound('We could not find that order');
    res.json({ order: serializeOrder(order) });
  }),
);

orderRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: param(req, 'id') },
      include: { items: true, events: { orderBy: { createdAt: 'asc' } }, payment: true },
    });
    if (!order) throw notFound('Order not found');
    const isOwner = order.userId === req.user!.sub;
    const isStaff = ['STAFF', 'MANAGER', 'SUPER_ADMIN'].includes(req.user!.role);
    if (!isOwner && !isStaff) throw forbidden();
    res.json({ order: serializeOrder(order) });
  }),
);

/** Customer-initiated cancellation, allowed only before the kitchen starts. */
orderRouter.post(
  '/:id/cancel',
  authenticate,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: param(req, 'id') } });
    if (!order) throw notFound('Order not found');
    if (order.userId !== req.user!.sub) throw forbidden();
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw badRequest('This order is already being prepared and can no longer be cancelled online. Please call us.');
    }
    const updated = await transitionOrder(order.id, 'CANCELLED', req.user!.sub, 'Cancelled by customer');
    res.json({ order: serializeOrder(updated) });
  }),
);

/** One-tap reorder — rebuilds a cart payload from a past order. */
orderRouter.post(
  '/:id/reorder',
  authenticate,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: param(req, 'id') }, include: { items: true } });
    if (!order || order.userId !== req.user!.sub) throw notFound('Order not found');

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: order.items.map((i) => i.menuItemId) } },
    });
    const available = new Map(menuItems.filter((m) => m.isAvailable).map((m) => [m.id, m]));

    // Option choices may have been retired or sold out since the original
    // order. Re-validate each one and report what changed, rather than
    // silently rebuilding a basket the kitchen cannot make.
    const choiceIds = order.items.flatMap((i) => parseOptions(i.options).map((o) => o.choiceId));
    const liveChoices = choiceIds.length
      ? await prisma.menuOptionChoice.findMany({
          where: { id: { in: choiceIds }, isAvailable: true },
          include: { group: { select: { id: true, name: true } } },
        })
      : [];
    const choiceById = new Map(liveChoices.map((c) => [c.id, c]));

    const changed = new Set<string>();
    const items = order.items
      .filter((i) => available.has(i.menuItemId))
      .map((i) => {
        const menuItem = available.get(i.menuItemId)!;
        const stored = parseOptions(i.options);
        const options = stored
          .filter((o) => {
            if (choiceById.has(o.choiceId)) return true;
            changed.add(i.name);
            return false;
          })
          .map((o) => {
            const live = choiceById.get(o.choiceId)!;
            return {
              groupId: live.group.id,
              groupName: live.group.name,
              choiceId: live.id,
              label: live.label,
              // Today's surcharge, not the one captured on the old order.
              priceDelta: live.priceDelta,
            };
          });

        return {
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          // Current menu price — a reorder must never resurrect an old price.
          price: menuItem.price,
          image: menuItem.image,
          slug: menuItem.slug,
          notes: i.notes,
          options,
        };
      });

    res.json({
      items,
      unavailable: order.items.filter((i) => !available.has(i.menuItemId)).map((i) => i.name),
      optionsChanged: [...changed],
    });
  }),
);

/* ----------------------------- staff/kitchen ----------------------------- */

orderRouter.get(
  '/',
  authenticate,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { status, type, page = '1', pageSize = '25', search } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.type = type;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }
    const take = Math.min(Number(pageSize) || 25, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.order.count({ where }),
    ]);
    res.json({ orders: serializeOrders(orders), total, page: Number(page) || 1, pageSize: take, totalPages: Math.ceil(total / take) });
  }),
);

/** Kitchen display board — active tickets only, oldest first. */
orderRouter.get(
  '/kitchen/queue',
  authenticate,
  requireStaff,
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ orders: serializeOrders(orders) });
  }),
);

orderRouter.patch(
  '/:id/status',
  authenticate,
  requireStaff,
  validate(orderStatusSchema),
  asyncHandler(async (req, res) => {
    const { status, note } = req.body as { status: OrderStatus; note?: string };
    const order = await transitionOrder(param(req, 'id'), status, req.user!.sub, note);
    await audit(req.user!.sub, 'order.status', 'Order', order.id, req, { status });
    res.json({ order: serializeOrder(order) });
  }),
);
