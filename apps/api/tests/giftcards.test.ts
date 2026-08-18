/**
 * Gift cards applied at checkout.
 *
 * The redeem endpoint existed before this, but no order could consume a card —
 * the balance had to be drawn down by hand. These tests cover the money path:
 * full coverage, partial coverage, exhaustion and the failure cases.
 */
import { describe, expect, it, beforeAll } from 'vitest';

let prisma: typeof import('../src/lib/prisma.js')['prisma'];
let createOrder: typeof import('../src/services/orders.js')['createOrder'];
let resolveGiftCard: typeof import('../src/services/orders.js')['resolveGiftCard'];

let menuItemId: string;

async function makeCard(amount: number, over: Record<string, unknown> = {}) {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X');
  return prisma.giftCard.create({
    data: {
      code: `GIFT-TEST-${suffix}-0001`,
      amount,
      balance: amount,
      recipientName: 'Test Recipient',
      recipientEmail: 'recipient@example.com',
      senderName: 'Test Sender',
      expiresAt: new Date(Date.now() + 365 * 86_400_000),
      ...over,
    },
  });
}

function checkout(giftCardCode: string | undefined, quantity: number) {
  return createOrder({
    input: {
      type: 'PICKUP',
      items: [{ menuItemId, quantity }],
      customerName: 'Gift Tester',
      customerPhone: '03064650507',
      customerEmail: 'gift.tester@example.com',
      paymentMethod: 'COD',
      ...(giftCardCode ? { giftCardCode } : {}),
    } as Parameters<typeof createOrder>[0]['input'],
    userId: null,
  });
}

beforeAll(async () => {
  ({ prisma } = await import('../src/lib/prisma.js'));
  ({ createOrder, resolveGiftCard } = await import('../src/services/orders.js'));

  const category = await prisma.category.create({
    data: { name: 'Gift Test', slug: 'gift-test', sortOrder: 950 },
  });
  const item = await prisma.menuItem.create({
    data: {
      name: 'Gift Test Dish',
      slug: 'gift-test-dish',
      description: 'Priced for arithmetic that is easy to check.',
      price: 1000,
      image: '/images/dish-chicken-biryani.jpg',
      categoryId: category.id,
    },
  });
  menuItemId = item.id;
});

describe('resolveGiftCard', () => {
  it('caps the draw-down at the amount actually due', async () => {
    const card = await makeCard(10_000);
    const resolved = await resolveGiftCard(card.code, 2_500);
    expect(resolved?.amount).toBe(2_500);
  });

  it('caps the draw-down at the remaining balance', async () => {
    const card = await makeCard(800);
    const resolved = await resolveGiftCard(card.code, 5_000);
    expect(resolved?.amount).toBe(800);
  });

  it('returns null when no code is supplied', async () => {
    expect(await resolveGiftCard(undefined, 1_000)).toBeNull();
    expect(await resolveGiftCard('', 1_000)).toBeNull();
  });

  it('rejects an unknown code', async () => {
    await expect(resolveGiftCard('GIFT-0000-0000-0000', 1_000)).rejects.toThrow(/no gift card/i);
  });

  it('rejects an expired card', async () => {
    const card = await makeCard(1_000, { expiresAt: new Date(Date.now() - 86_400_000) });
    await expect(resolveGiftCard(card.code, 500)).rejects.toThrow(/expired/i);
  });

  it('rejects a card with no balance', async () => {
    const card = await makeCard(1_000, { balance: 0 });
    await expect(resolveGiftCard(card.code, 500)).rejects.toThrow(/no balance|no longer active/i);
  });
});

describe('gift cards at checkout', () => {
  it('settles a small order in full and marks the card redeemed', async () => {
    const card = await makeCard(5_000);
    const order = await checkout(card.code, 1); // 1000 + packaging + tax ≈ 1230

    expect(order.giftCardCode).toBe(card.code);
    expect(order.giftCardAmount).toBe(order.total);
    expect(order.paymentStatus).toBe('PAID');

    const after = await prisma.giftCard.findUniqueOrThrow({ where: { id: card.id } });
    expect(after.balance).toBe(5_000 - order.total);
    expect(after.status).toBe('ACTIVE');
  });

  it('part-pays a larger order and leaves the rest due', async () => {
    const card = await makeCard(1_500);
    const order = await checkout(card.code, 5);

    expect(order.giftCardAmount).toBe(1_500);
    expect(order.total).toBeGreaterThan(1_500);
    expect(order.paymentStatus).toBe('UNPAID');

    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
    // The gateway must be asked for the net amount, not the gross bill.
    expect(payment.amount).toBe(order.total - 1_500);

    const after = await prisma.giftCard.findUniqueOrThrow({ where: { id: card.id } });
    expect(after.balance).toBe(0);
    expect(after.status).toBe('REDEEMED');
  });

  it('refuses a card that a previous order exhausted', async () => {
    const card = await makeCard(600);
    await checkout(card.code, 5);
    await expect(checkout(card.code, 1)).rejects.toThrow(/no longer active|no balance/i);
  });

  it('records the redemption on the order timeline', async () => {
    const card = await makeCard(3_000);
    const order = await checkout(card.code, 1);
    const events = await prisma.orderEvent.findMany({ where: { orderId: order.id } });
    expect(events.some((e) => e.note?.includes(card.code))).toBe(true);
  });

  it('leaves an order without a card completely unaffected', async () => {
    const order = await checkout(undefined, 2);
    expect(order.giftCardCode).toBeNull();
    expect(order.giftCardAmount).toBe(0);
    expect(order.paymentStatus).toBe('UNPAID');
  });

  it('does not debit the card when checkout fails', async () => {
    const card = await makeCard(4_000);
    await expect(
      createOrder({
        input: {
          type: 'DELIVERY', // no address or zone — must fail validation downstream
          items: [{ menuItemId, quantity: 1 }],
          customerName: 'Gift Tester',
          customerPhone: '03064650507',
          paymentMethod: 'COD',
          giftCardCode: card.code,
          addressId: 'does-not-exist',
        } as Parameters<typeof createOrder>[0]['input'],
        userId: null,
      }),
    ).rejects.toThrow();

    const after = await prisma.giftCard.findUniqueOrThrow({ where: { id: card.id } });
    expect(after.balance).toBe(4_000);
  });
});
