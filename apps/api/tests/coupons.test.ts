/**
 * Coupon eligibility, including the per-user limit for guest checkouts.
 *
 * Before this was fixed a one-per-customer code could be reused indefinitely
 * by simply not signing in, because the limit was only checked against a user
 * id. These tests pin the behaviour for accounts, emails and phone numbers.
 */
import { describe, expect, it, beforeAll } from 'vitest';

let prisma: typeof import('../src/lib/prisma.js')['prisma'];
let resolveCoupon: typeof import('../src/services/orders.js')['resolveCoupon'];
let normalisePhone: typeof import('../src/services/orders.js')['normalisePhone'];

let couponId: string;

beforeAll(async () => {
  ({ prisma } = await import('../src/lib/prisma.js'));
  ({ resolveCoupon, normalisePhone } = await import('../src/services/orders.js'));

  const coupon = await prisma.coupon.create({
    data: {
      code: 'ONCEONLY',
      description: 'One per customer',
      type: 'FIXED',
      value: 200,
      perUserLimit: 1,
    },
  });
  couponId = coupon.id;
});

async function redeem(identity: { userId?: string; email?: string; phone?: string }) {
  await prisma.couponRedemption.create({
    data: {
      couponId,
      orderId: `order-${Math.random().toString(36).slice(2)}`,
      userId: identity.userId ?? null,
      email: identity.email?.toLowerCase() ?? null,
      phone: identity.phone ? normalisePhone(identity.phone) : null,
    },
  });
}

describe('normalisePhone', () => {
  it('reduces the common Pakistani formats to one canonical form', () => {
    expect(normalisePhone('+92 306 4650507')).toBe('03064650507');
    expect(normalisePhone('0306-4650507')).toBe('03064650507');
    expect(normalisePhone('03064650507')).toBe('03064650507');
    expect(normalisePhone('92 306 4650507')).toBe('03064650507');
  });
});

describe('perUserLimit', () => {
  it('allows a first use', async () => {
    const coupon = await resolveCoupon('ONCEONLY', { email: 'first@example.com' });
    expect(coupon?.code).toBe('ONCEONLY');
  });

  it('blocks a second use by the same email, with no account involved', async () => {
    await redeem({ email: 'guest@example.com' });
    await expect(resolveCoupon('ONCEONLY', { email: 'guest@example.com' })).rejects.toThrow(/already used/i);
  });

  it('matches the email case-insensitively', async () => {
    await redeem({ email: 'mixed@example.com' });
    await expect(resolveCoupon('ONCEONLY', { email: 'MIXED@Example.com' })).rejects.toThrow(/already used/i);
  });

  it('blocks a reuse from the same phone number written differently', async () => {
    await redeem({ phone: '03001112233' });
    await expect(resolveCoupon('ONCEONLY', { phone: '+92 300 111 2233' })).rejects.toThrow(/already used/i);
  });

  it('blocks a signed-in customer who already redeemed as a guest on the same email', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'crossover@example.com',
        name: 'Crossover Guest',
        referralCode: `X${Date.now().toString(36).toUpperCase().slice(-8)}`,
      },
    });
    await redeem({ email: 'crossover@example.com' });

    await expect(resolveCoupon('ONCEONLY', { userId: user.id, email: user.email })).rejects.toThrow(/already used/i);
  });

  it('still accepts an unrelated customer', async () => {
    const coupon = await resolveCoupon('ONCEONLY', { email: 'brandnew@example.com', phone: '03219998877' });
    expect(coupon?.code).toBe('ONCEONLY');
  });

  it('accepts a bare user id for backwards compatibility', async () => {
    const coupon = await resolveCoupon('ONCEONLY', 'no-such-user-id');
    expect(coupon?.code).toBe('ONCEONLY');
  });
});

describe('coupon validity', () => {
  it('rejects an unknown code', async () => {
    await expect(resolveCoupon('NOPE', {})).rejects.toThrow(/not valid/i);
  });

  it('rejects an expired coupon', async () => {
    await prisma.coupon.create({
      data: {
        code: 'LASTYEAR',
        description: 'Expired',
        type: 'PERCENT',
        value: 10,
        expiresAt: new Date(Date.now() - 86_400_000),
      },
    });
    await expect(resolveCoupon('LASTYEAR', {})).rejects.toThrow(/expired/i);
  });

  it('rejects a coupon that has hit its global usage limit', async () => {
    await prisma.coupon.create({
      data: { code: 'ALLGONE', description: 'Exhausted', type: 'PERCENT', value: 10, usageLimit: 5, usageCount: 5 },
    });
    await expect(resolveCoupon('ALLGONE', {})).rejects.toThrow(/fully redeemed/i);
  });

  it('returns null when no code is supplied', async () => {
    expect(await resolveCoupon(null, {})).toBeNull();
    expect(await resolveCoupon(undefined, {})).toBeNull();
  });
});
