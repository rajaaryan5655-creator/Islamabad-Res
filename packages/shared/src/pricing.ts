import { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD, PACKAGING_FEE, TAX_RATE, POINT_VALUE, POINTS_PER_RUPEE, LOYALTY_TIERS } from './brand.ts';
import type { OrderType } from './types.ts';

export interface PriceLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface CouponLike {
  code: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY';
  value: number;
  minOrder: number;
  maxDiscount?: number | null;
}

export interface QuoteInput {
  lines: PriceLine[];
  type: OrderType;
  zoneId?: string | null;
  coupon?: CouponLike | null;
  redeemPoints?: number;
  availablePoints?: number;
}

export interface Quote {
  subtotal: number;
  packaging: number;
  deliveryFee: number;
  discount: number;
  pointsDiscount: number;
  pointsRedeemed: number;
  tax: number;
  total: number;
  pointsEarned: number;
  freeDeliveryApplied: boolean;
  couponCode: string | null;
  couponError: string | null;
  etaMinutes: number | null;
}

const round = (n: number) => Math.round(n);

/**
 * Single authoritative pricing engine. The API is the source of truth; the web
 * app imports the same function so the cart total never disagrees with the
 * charged total.
 */
export function quoteOrder(input: QuoteInput): Quote {
  const { lines, type, zoneId, coupon, redeemPoints = 0, availablePoints = 0 } = input;

  const subtotal = round(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId) ?? null;

  const packaging = type === 'DINE_IN' ? 0 : PACKAGING_FEE;
  let deliveryFee = type === 'DELIVERY' ? (zone?.fee ?? 199) : 0;

  const freeDeliveryApplied = type === 'DELIVERY' && subtotal >= FREE_DELIVERY_THRESHOLD;
  if (freeDeliveryApplied) deliveryFee = 0;

  let discount = 0;
  let couponError: string | null = null;
  let couponCode: string | null = null;

  if (coupon) {
    if (subtotal < coupon.minOrder) {
      couponError = `Coupon ${coupon.code} requires a minimum order of Rs. ${coupon.minOrder.toLocaleString('en-PK')}`;
    } else {
      couponCode = coupon.code;
      if (coupon.type === 'PERCENT') {
        discount = round((subtotal * coupon.value) / 100);
        if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
      } else if (coupon.type === 'FIXED') {
        discount = Math.min(round(coupon.value), subtotal);
      } else if (coupon.type === 'FREE_DELIVERY') {
        discount = 0;
        deliveryFee = 0;
      }
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discount);

  // Loyalty redemption, capped at the customer's balance and 50% of the bill.
  const maxRedeemablePoints = Math.floor(Math.min(availablePoints, (discountedSubtotal * 0.5) / POINT_VALUE));
  const pointsRedeemed = Math.max(0, Math.min(Math.floor(redeemPoints), maxRedeemablePoints));
  const pointsDiscount = pointsRedeemed * POINT_VALUE;

  const taxable = Math.max(0, discountedSubtotal - pointsDiscount);
  const tax = round(taxable * TAX_RATE);
  const total = Math.max(0, round(taxable + tax + packaging + deliveryFee));
  const pointsEarned = Math.floor(taxable * POINTS_PER_RUPEE);

  const etaMinutes = type === 'DELIVERY' ? (zone?.etaMax ?? 60) : type === 'PICKUP' ? 25 : null;

  return {
    subtotal,
    packaging,
    deliveryFee,
    discount,
    pointsDiscount,
    pointsRedeemed,
    tax,
    total,
    pointsEarned,
    freeDeliveryApplied,
    couponCode,
    couponError,
    etaMinutes,
  };
}

export function tierForPoints(lifetimePoints: number) {
  return [...LOYALTY_TIERS].reverse().find((t) => lifetimePoints >= t.minPoints) ?? LOYALTY_TIERS[0];
}

export function nextTier(lifetimePoints: number) {
  return LOYALTY_TIERS.find((t) => t.minPoints > lifetimePoints) ?? null;
}

export function formatPKR(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-PK')}`;
}
