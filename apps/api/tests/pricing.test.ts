import { describe, expect, it } from 'vitest';
import {
  FREE_DELIVERY_THRESHOLD,
  PACKAGING_FEE,
  POINT_VALUE,
  TAX_RATE,
  nextTier,
  quoteOrder,
  tierForPoints,
  type PriceLine,
} from '@islamabad/shared';

const line = (unitPrice: number, quantity = 1): PriceLine => ({
  menuItemId: 'x',
  name: 'Test dish',
  unitPrice,
  quantity,
  total: unitPrice * quantity,
});

describe('quoteOrder', () => {
  it('computes subtotal, tax and total for a simple delivery order', () => {
    const q = quoteOrder({ lines: [line(1000, 2)], type: 'DELIVERY', zoneId: 'zone-f' });

    expect(q.subtotal).toBe(2000);
    expect(q.tax).toBe(Math.round(2000 * TAX_RATE));
    expect(q.deliveryFee).toBe(149);
    expect(q.packaging).toBe(PACKAGING_FEE);
    expect(q.total).toBe(2000 + q.tax + PACKAGING_FEE + 149);
  });

  it('waives delivery above the free-delivery threshold', () => {
    const q = quoteOrder({ lines: [line(FREE_DELIVERY_THRESHOLD)], type: 'DELIVERY', zoneId: 'zone-bahria' });
    expect(q.freeDeliveryApplied).toBe(true);
    expect(q.deliveryFee).toBe(0);
  });

  it('charges no packaging or delivery for dine-in', () => {
    const q = quoteOrder({ lines: [line(1200)], type: 'DINE_IN' });
    expect(q.packaging).toBe(0);
    expect(q.deliveryFee).toBe(0);
    expect(q.etaMinutes).toBeNull();
  });

  it('applies a percentage coupon and honours its cap', () => {
    const q = quoteOrder({
      lines: [line(10000)],
      type: 'PICKUP',
      coupon: { code: 'HALF', type: 'PERCENT', value: 50, minOrder: 0, maxDiscount: 500 },
    });
    // 50% of 10,000 is 5,000, but the cap is 500.
    expect(q.discount).toBe(500);
    expect(q.couponCode).toBe('HALF');
  });

  it('rejects a coupon below its minimum order', () => {
    const q = quoteOrder({
      lines: [line(500)],
      type: 'DELIVERY',
      zoneId: 'zone-f',
      coupon: { code: 'BIG', type: 'FIXED', value: 300, minOrder: 3000 },
    });
    expect(q.discount).toBe(0);
    expect(q.couponError).toContain('minimum order');
    expect(q.couponCode).toBeNull();
  });

  it('applies a free-delivery coupon', () => {
    const q = quoteOrder({
      lines: [line(1000)],
      type: 'DELIVERY',
      zoneId: 'zone-rwp',
      coupon: { code: 'FREEDEL', type: 'FREE_DELIVERY', value: 0, minOrder: 0 },
    });
    expect(q.deliveryFee).toBe(0);
    expect(q.discount).toBe(0);
  });

  it('never lets a fixed discount exceed the subtotal', () => {
    const q = quoteOrder({
      lines: [line(200)],
      type: 'PICKUP',
      coupon: { code: 'HUGE', type: 'FIXED', value: 5000, minOrder: 0 },
    });
    expect(q.discount).toBe(200);
    expect(q.total).toBeGreaterThanOrEqual(0);
  });

  it('caps point redemption at 50% of the bill and the available balance', () => {
    const q = quoteOrder({
      lines: [line(2000)],
      type: 'PICKUP',
      redeemPoints: 100_000,
      availablePoints: 400,
    });
    // 50% of 2,000 = 1,000 → 500 points at Rs.2 each; balance allows 400.
    expect(q.pointsRedeemed).toBe(400);
    expect(q.pointsDiscount).toBe(400 * POINT_VALUE);
  });

  it('does not redeem points the customer does not have', () => {
    const q = quoteOrder({ lines: [line(5000)], type: 'PICKUP', redeemPoints: 500, availablePoints: 0 });
    expect(q.pointsRedeemed).toBe(0);
    expect(q.pointsDiscount).toBe(0);
  });

  it('taxes the discounted amount, not the gross', () => {
    const withCoupon = quoteOrder({
      lines: [line(1000)],
      type: 'PICKUP',
      coupon: { code: 'TEN', type: 'PERCENT', value: 10, minOrder: 0 },
    });
    expect(withCoupon.tax).toBe(Math.round(900 * TAX_RATE));
  });

  it('is deterministic — the same input always yields the same total', () => {
    const input = { lines: [line(750, 3)], type: 'DELIVERY' as const, zoneId: 'zone-g' };
    expect(quoteOrder(input).total).toBe(quoteOrder(input).total);
  });
});

describe('loyalty tiers', () => {
  it.each([
    [0, 'Bronze'],
    [1999, 'Bronze'],
    [2000, 'Silver'],
    [6000, 'Gold'],
    [15000, 'Platinum'],
    [999999, 'Platinum'],
  ])('maps %i lifetime points to %s', (points, expected) => {
    expect(tierForPoints(points).name).toBe(expected);
  });

  it('reports the next tier, and null at the top', () => {
    expect(nextTier(0)?.name).toBe('Silver');
    expect(nextTier(15000)).toBeNull();
  });
});
