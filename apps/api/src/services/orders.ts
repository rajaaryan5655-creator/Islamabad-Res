import {
  quoteOrder,
  tierForPoints,
  ORDER_STATUS_FLOW,
  type CheckoutInput,
  type OrderStatus,
  type PriceLine,
  type CouponLike,
} from '@islamabad/shared';
import { prisma } from '../lib/prisma.js';
import { badRequest, conflict, notFound } from '../middleware/index.js';
import { orderNumber, trackingToken } from '../lib/auth.js';
import { cache } from '../lib/cache.js';

/** Resolves a coupon and validates it against the customer + basket. */
export async function resolveCoupon(code: string | undefined | null, userId?: string | null) {
  if (!code) return null;
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) throw badRequest('That coupon code is not valid');
  if (!coupon.isActive) throw badRequest('That coupon is no longer active');
  const now = new Date();
  if (coupon.startsAt > now) throw badRequest('That coupon is not active yet');
  if (coupon.expiresAt && coupon.expiresAt < now) throw badRequest('That coupon has expired');
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) throw badRequest('That coupon has been fully redeemed');

  if (coupon.perUserLimit && userId) {
    const used = await prisma.order.count({
      where: { userId, couponCode: coupon.code, status: { not: 'CANCELLED' } },
    });
    if (used >= coupon.perUserLimit) throw badRequest('You have already used that coupon');
  }
  return coupon;
}

export function toCouponLike(coupon: { code: string; type: string; value: number; minOrder: number; maxDiscount: number | null } | null): CouponLike | null {
  if (!coupon) return null;
  return {
    code: coupon.code,
    type: coupon.type as CouponLike['type'],
    value: coupon.value,
    minOrder: coupon.minOrder,
    maxDiscount: coupon.maxDiscount,
  };
}

export interface ResolvedOption {
  groupId: string;
  groupName: string;
  choiceId: string;
  label: string;
  priceDelta: number;
}

export interface OrderLine extends PriceLine {
  notes?: string;
  options: ResolvedOption[];
}

export interface CartLineInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
  options?: { groupId: string; choiceId: string }[];
}

/**
 * Loads menu items and builds authoritative price lines.
 *
 * Every price — base and option surcharge — is read from the database, never
 * from the request. The client sends only identifiers, so a tampered cart
 * cannot change what an order costs. Option groups are validated against their
 * required/min/max rules here too, because the checkout API is a public
 * surface, not just a backend for our own UI.
 */
export async function buildLines(items: CartLineInput[]): Promise<OrderLine[]> {
  const ids = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: ids } },
    include: { optionGroups: { include: { choices: true }, orderBy: { sortOrder: 'asc' } } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const lines: OrderLine[] = [];
  for (const item of items) {
    const menuItem = byId.get(item.menuItemId);
    if (!menuItem) throw badRequest('One of the items in your cart is no longer on the menu');
    if (!menuItem.isAvailable) throw conflict(`${menuItem.name} has just sold out — please remove it to continue`);

    const selected = item.options ?? [];
    const resolved: ResolvedOption[] = [];

    for (const group of menuItem.optionGroups) {
      const picks = selected.filter((s) => s.groupId === group.id);

      if (group.isRequired && picks.length === 0) {
        throw badRequest(`Please choose a ${group.name.toLowerCase()} for ${menuItem.name}`);
      }
      if (picks.length > 0) {
        const min = group.type === 'SINGLE' ? Math.min(group.minSelect, 1) : group.minSelect;
        const max = group.type === 'SINGLE' ? 1 : group.maxSelect;
        if (picks.length < min) {
          throw badRequest(`Choose at least ${min} ${group.name.toLowerCase()} for ${menuItem.name}`);
        }
        if (picks.length > max) {
          throw badRequest(`Choose at most ${max} ${group.name.toLowerCase()} for ${menuItem.name}`);
        }
      }

      for (const pick of picks) {
        const choice = group.choices.find((c) => c.id === pick.choiceId);
        if (!choice) throw badRequest(`That ${group.name.toLowerCase()} option is not available for ${menuItem.name}`);
        if (!choice.isAvailable) throw conflict(`${choice.label} is unavailable right now`);
        resolved.push({
          groupId: group.id,
          groupName: group.name,
          choiceId: choice.id,
          label: choice.label,
          priceDelta: choice.priceDelta,
        });
      }
    }

    // Reject selections that point at groups this dish does not have.
    const validGroupIds = new Set(menuItem.optionGroups.map((g) => g.id));
    if (selected.some((sel) => !validGroupIds.has(sel.groupId))) {
      throw badRequest(`An option in your cart no longer applies to ${menuItem.name}`);
    }

    const unitPrice = menuItem.price + resolved.reduce((sum, o) => sum + o.priceDelta, 0);
    if (unitPrice < 0) throw badRequest(`Invalid option pricing for ${menuItem.name}`);

    lines.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      unitPrice,
      quantity: item.quantity,
      total: unitPrice * item.quantity,
      notes: item.notes,
      options: resolved,
    });
  }
  return lines;
}

export interface CreateOrderArgs {
  input: CheckoutInput;
  userId: string | null;
}

export async function createOrder({ input, userId }: CreateOrderArgs) {
  const lines = await buildLines(input.items);
  const coupon = await resolveCoupon(input.couponCode, userId);

  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const availablePoints = user?.points ?? 0;

  let addressText = input.address ?? null;
  let zoneId = input.zoneId ?? null;
  if (input.addressId && userId) {
    const saved = await prisma.address.findFirst({ where: { id: input.addressId, userId } });
    if (!saved) throw notFound('Saved address not found');
    addressText = [saved.line1, saved.line2, saved.city].filter(Boolean).join(', ');
    zoneId = saved.zoneId;
  }

  const quote = quoteOrder({
    lines,
    type: input.type,
    zoneId,
    coupon: toCouponLike(coupon),
    redeemPoints: input.redeemPoints ?? 0,
    availablePoints,
  });

  if (quote.couponError) throw badRequest(quote.couponError);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: orderNumber(),
        trackingToken: trackingToken(),
        userId,
        addressId: input.addressId ?? null,
        type: input.type,
        status: 'PENDING',
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail || null,
        addressText,
        zoneId,
        tableNumber: input.tableNumber ?? null,
        notes: input.notes || null,
        subtotal: quote.subtotal,
        packaging: quote.packaging,
        deliveryFee: quote.deliveryFee,
        discount: quote.discount,
        pointsDiscount: quote.pointsDiscount,
        pointsRedeemed: quote.pointsRedeemed,
        tax: quote.tax,
        total: quote.total,
        pointsEarned: quote.pointsEarned,
        couponCode: quote.couponCode,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === 'COD' ? 'UNPAID' : 'UNPAID',
        etaMinutes: quote.etaMinutes,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        items: {
          create: lines.map((l) => ({
            menuItemId: l.menuItemId,
            name: l.name,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            total: l.total,
            notes: l.notes ?? null,
            options: JSON.stringify(l.options),
          })),
        },
        events: { create: { status: 'PENDING', note: 'Order placed' } },
        payment: {
          create: {
            provider: input.paymentMethod === 'CARD_STRIPE' ? 'stripe' : input.paymentMethod === 'PAYPAL' ? 'paypal' : input.paymentMethod.toLowerCase(),
            method: input.paymentMethod,
            status: 'UNPAID',
            amount: quote.total,
          },
        },
      },
      include: { items: true, events: true, payment: true },
    });

    if (coupon) {
      await tx.coupon.update({ where: { id: coupon.id }, data: { usageCount: { increment: 1 } } });
    }

    // Spend redeemed points immediately; award earned points on delivery.
    if (userId && quote.pointsRedeemed > 0) {
      const newBalance = availablePoints - quote.pointsRedeemed;
      await tx.user.update({ where: { id: userId }, data: { points: newBalance } });
      await tx.pointsEntry.create({
        data: {
          userId,
          delta: -quote.pointsRedeemed,
          reason: `Redeemed on order ${created.orderNumber}`,
          orderId: created.id,
          balance: newBalance,
        },
      });
    }

    await tx.menuItem.updateMany({
      where: { id: { in: lines.map((l) => l.menuItemId) } },
      data: { orderCount: { increment: 1 } },
    });

    return created;
  });

  await cache.delPrefix('analytics:');
  return order;
}

export async function transitionOrder(
  orderId: string,
  next: OrderStatus,
  actorId: string | null,
  note?: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw notFound('Order not found');

  const current = order.status as OrderStatus;
  const allowed = ORDER_STATUS_FLOW[current] ?? [];
  if (!allowed.includes(next)) {
    throw conflict(`Cannot move an order from ${current} to ${next}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: {
        status: next,
        confirmedAt: next === 'CONFIRMED' ? new Date() : undefined,
        deliveredAt: next === 'DELIVERED' ? new Date() : undefined,
        cancelledAt: next === 'CANCELLED' ? new Date() : undefined,
        paymentStatus: next === 'DELIVERED' && order.paymentMethod === 'COD' ? 'PAID' : undefined,
      },
      include: { items: true, events: { orderBy: { createdAt: 'asc' } } },
    });

    await tx.orderEvent.create({ data: { orderId, status: next, note: note ?? null, actorId } });

    // Award loyalty points on completion.
    if (next === 'DELIVERED' && order.userId && order.pointsEarned > 0) {
      const user = await tx.user.findUnique({ where: { id: order.userId } });
      if (user) {
        const multiplier = tierForPoints(user.lifetimePoints).multiplier;
        const awarded = Math.floor(order.pointsEarned * multiplier);
        const balance = user.points + awarded;
        await tx.user.update({
          where: { id: user.id },
          data: {
            points: balance,
            lifetimePoints: user.lifetimePoints + awarded,
            tier: tierForPoints(user.lifetimePoints + awarded).id,
          },
        });
        await tx.pointsEntry.create({
          data: { userId: user.id, delta: awarded, reason: `Order ${order.orderNumber}`, orderId, balance },
        });
      }
    }

    // Refund redeemed points when an order is cancelled.
    if (next === 'CANCELLED' && order.userId && order.pointsRedeemed > 0) {
      const user = await tx.user.findUnique({ where: { id: order.userId } });
      if (user) {
        const balance = user.points + order.pointsRedeemed;
        await tx.user.update({ where: { id: user.id }, data: { points: balance } });
        await tx.pointsEntry.create({
          data: { userId: user.id, delta: order.pointsRedeemed, reason: `Refund for cancelled ${order.orderNumber}`, orderId, balance },
        });
      }
    }

    if (order.userId) {
      const copy: Record<string, string> = {
        CONFIRMED: 'We have confirmed your order and sent it to the kitchen.',
        PREPARING: 'Your food is on the fire.',
        READY: 'Your order is packed and ready.',
        OUT_FOR_DELIVERY: 'Your rider has left the kitchen.',
        DELIVERED: 'Delivered. Thank you — points have been added to your account.',
        CANCELLED: 'Your order has been cancelled.',
      };
      if (copy[next]) {
        await tx.notification.create({
          data: {
            userId: order.userId,
            type: 'ORDER',
            title: `Order ${order.orderNumber}`,
            body: copy[next],
            link: `/track/${order.trackingToken}`,
          },
        });
      }
    }

    return result;
  });

  await cache.delPrefix('analytics:');
  return updated;
}
