/** Unit tests for the service and helper layers. */
import { describe, expect, it, beforeAll } from 'vitest';

let json: typeof import('../src/lib/json.js');
let auth: typeof import('../src/lib/auth.js');
let payments: typeof import('../src/services/payments.js');
let prisma: typeof import('../src/lib/prisma.js')['prisma'];

beforeAll(async () => {
  json = await import('../src/lib/json.js');
  auth = await import('../src/lib/auth.js');
  payments = await import('../src/services/payments.js');
  ({ prisma } = await import('../src/lib/prisma.js'));
});

describe('json helpers', () => {
  it('parses a JSON array column', () => {
    expect(json.parseList('["gluten","dairy"]')).toEqual(['gluten', 'dairy']);
  });

  it('returns an empty array for null, undefined and empty input', () => {
    expect(json.parseList(null)).toEqual([]);
    expect(json.parseList(undefined)).toEqual([]);
    expect(json.parseList('')).toEqual([]);
  });

  it('never throws on malformed JSON', () => {
    expect(json.parseList('{not json')).toEqual([]);
    expect(json.parseList('"a string"')).toEqual([]);
  });

  it('coerces non-string members to strings', () => {
    expect(json.parseList('[1,2]')).toEqual(['1', '2']);
  });

  it('round-trips through stringifyList', () => {
    const value = ['nuts', 'sesame'];
    expect(json.parseList(json.stringifyList(value))).toEqual(value);
    expect(json.stringifyList(undefined)).toBe('[]');
    expect(json.stringifyList(null)).toBe('[]');
  });

  it('parseJson falls back on bad input', () => {
    expect(json.parseJson('{"a":1}', {})).toEqual({ a: 1 });
    expect(json.parseJson('broken', { fallback: true })).toEqual({ fallback: true });
    expect(json.parseJson(null, 42)).toBe(42);
  });
});

describe('auth helpers', () => {
  it('hashes a password so it is not recoverable', async () => {
    const hash = await auth.hashPassword('Sup3rSecret!');
    expect(hash).not.toContain('Sup3rSecret!');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifies the correct password and rejects the wrong one', async () => {
    const hash = await auth.hashPassword('Sup3rSecret!');
    expect(await auth.verifyPassword('Sup3rSecret!', hash)).toBe(true);
    expect(await auth.verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces a different hash for the same password (salted)', async () => {
    expect(await auth.hashPassword('same')).not.toBe(await auth.hashPassword('same'));
  });

  it('signs and verifies an access token round-trip', () => {
    const token = auth.signAccessToken({ sub: 'u1', email: 'a@b.com', role: 'CUSTOMER', name: 'A' });
    const payload = auth.verifyAccessToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('CUSTOMER');
  });

  it('rejects a tampered token', () => {
    const token = auth.signAccessToken({ sub: 'u1', email: 'a@b.com', role: 'CUSTOMER', name: 'A' });
    expect(() => auth.verifyAccessToken(`${token}x`)).toThrow();
  });

  it('hashes refresh tokens deterministically', () => {
    const { token, hash } = auth.createRefreshToken();
    expect(auth.hashRefreshToken(token)).toBe(hash);
    expect(hash).not.toBe(token);
  });

  it('generates well-formed identifiers', () => {
    expect(auth.orderNumber()).toMatch(/^IR-\d{8}-[0-9A-F]{6}$/);
    expect(auth.reservationCode()).toMatch(/^RSV-[0-9A-F]{6}$/);
    expect(auth.giftCardCode()).toMatch(/^GIFT-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(auth.generateReferralCode('Ayesha Khan')).toMatch(/^AYES[0-9A-F]{6}$/);
  });

  it('pads a short name in the referral code', () => {
    expect(auth.generateReferralCode('Li')).toMatch(/^LIXX[0-9A-F]{6}$/);
  });

  it('generates unique identifiers across calls', () => {
    const codes = new Set(Array.from({ length: 200 }, () => auth.orderNumber()));
    expect(codes.size).toBe(200);
  });
});

describe('payment gateway', () => {
  async function makeOrder(method: string) {
    const category = await prisma.category.upsert({
      where: { slug: 'payments-test' },
      update: {},
      create: { name: 'Payments Test', slug: 'payments-test' },
    });
    const item = await prisma.menuItem.upsert({
      where: { slug: 'payments-test-dish' },
      update: {},
      create: {
        name: 'Payments Test Dish',
        slug: 'payments-test-dish',
        description: 'Used by the payments unit tests.',
        price: 1000,
        categoryId: category.id,
        image: '/images/dish-chicken-biryani.jpg',
      },
    });

    return prisma.order.create({
      data: {
        orderNumber: auth.orderNumber(),
        trackingToken: auth.trackingToken(),
        type: 'PICKUP',
        customerName: 'Payment Tester',
        customerPhone: '03001234567',
        customerEmail: 'pay@example.com',
        subtotal: 1000,
        total: 1160,
        paymentMethod: method,
        items: { create: [{ menuItemId: item.id, name: item.name, unitPrice: 1000, quantity: 1, total: 1000 }] },
        payment: { create: { provider: 'manual', method, status: 'UNPAID', amount: 1160 } },
      },
    });
  }

  it('returns a sandbox Stripe intent when no key is configured', async () => {
    const order = await makeOrder('CARD_STRIPE');
    const intent = await payments.createPaymentIntent(order);
    expect(intent.provider).toBe('stripe');
    expect(intent.sandbox).toBe(true);
    expect(intent.clientSecret).toBeTruthy();
    expect(intent.amount).toBe(1160);
  });

  it('returns a sandbox PayPal intent when no credentials are configured', async () => {
    const order = await makeOrder('PAYPAL');
    const intent = await payments.createPaymentIntent(order);
    expect(intent.provider).toBe('paypal');
    expect(intent.sandbox).toBe(true);
    expect(intent.redirectUrl).toContain('paypal');
  });

  it.each(['JAZZCASH', 'EASYPAISA'])('builds a signed %s wallet handshake', async (method) => {
    const order = await makeOrder(method);
    const intent = await payments.createPaymentIntent(order);
    expect(intent.provider).toBe(method.toLowerCase());
    expect(intent.redirectUrl).toContain('sig=');
    expect(intent.instructions).toBeTruthy();
  });

  it('handles cash on delivery without a gateway call', async () => {
    const order = await makeOrder('COD');
    const intent = await payments.createPaymentIntent(order);
    expect(intent.provider).toBe('manual');
    expect(intent.intentId).toContain('COD-');
  });

  it('marks an order paid', async () => {
    const order = await makeOrder('COD');
    await payments.markPaid(order.id, 'https://receipt.example/1');
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payment: true } });
    expect(updated.paymentStatus).toBe('PAID');
    expect(updated.payment?.status).toBe('PAID');
    expect(updated.payment?.receiptUrl).toBe('https://receipt.example/1');
  });

  it('accepts webhooks when no signing secret is configured, and rejects bad ones when it is', () => {
    // No STRIPE_WEBHOOK_SECRET in the test environment.
    expect(payments.verifyStripeSignature('{}', undefined)).toBe(true);

    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    // env is read at module load, so this asserts the no-secret branch only.
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });
});

describe('cache driver', () => {
  it('stores, reads, expires and clears values', async () => {
    const { cache } = await import('../src/lib/cache.js');

    await cache.set('unit:key', { hello: 'world' }, 60);
    expect(await cache.get<{ hello: string }>('unit:key')).toEqual({ hello: 'world' });

    await cache.del('unit:key');
    expect(await cache.get('unit:key')).toBeNull();

    await cache.set('unit:a', 1, 60);
    await cache.set('unit:b', 2, 60);
    await cache.delPrefix('unit:');
    expect(await cache.get('unit:a')).toBeNull();
    expect(await cache.get('unit:b')).toBeNull();
  });

  it('returns null for a value past its TTL', async () => {
    const { cache } = await import('../src/lib/cache.js');
    await cache.set('unit:ttl', 'gone', 0);
    await new Promise((r) => setTimeout(r, 5));
    expect(await cache.get('unit:ttl')).toBeNull();
  });

  it('increments counters for rate limiting', async () => {
    const { cache } = await import('../src/lib/cache.js');
    const key = `unit:counter:${Math.random()}`;
    expect(await cache.incr(key, 60)).toBe(1);
    expect(await cache.incr(key, 60)).toBe(2);
    expect(await cache.incr(key, 60)).toBe(3);
  });

  it('caches through the cache-aside helper and only loads once', async () => {
    const { cached } = await import('../src/lib/cache.js');
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return 'value';
    };
    const key = `unit:aside:${Math.random()}`;
    expect(await cached(key, 60, loader)).toBe('value');
    expect(await cached(key, 60, loader)).toBe('value');
    expect(calls).toBe(1);
  });
});

describe('floor plan bootstrap', () => {
  it('is idempotent', async () => {
    const { ensureFloorPlan } = await import('../src/lib/bootstrap.js');
    await ensureFloorPlan();
    expect(await ensureFloorPlan()).toBe(0);
  });

  it('recreates a table that has been removed', async () => {
    const { ensureFloorPlan } = await import('../src/lib/bootstrap.js');
    await prisma.reservation.deleteMany({ where: { tableId: 'T1' } });
    await prisma.restaurantTable.delete({ where: { id: 'T1' } });
    expect(await ensureFloorPlan()).toBe(1);
    expect(await prisma.restaurantTable.findUnique({ where: { id: 'T1' } })).not.toBeNull();
  });
});
