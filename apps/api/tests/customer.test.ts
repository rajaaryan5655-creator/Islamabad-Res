/** Customer dashboard, address book and payment-webhook integration tests. */
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';

let app: Express;
let prisma: typeof import('../src/lib/prisma.js')['prisma'];
let token: string;
let dishId: string;

const USER = { name: 'Dashboard User', email: 'dashboard.user@example.com', phone: '03004445566', password: 'Passw0rd!' };

beforeAll(async () => {
  app = (await import('../src/app.js')).createApp();
  ({ prisma } = await import('../src/lib/prisma.js'));

  const category = await prisma.category.upsert({
    where: { slug: 'dashboard-test' },
    update: {},
    create: { name: 'Dashboard Test', slug: 'dashboard-test' },
  });
  const dish = await prisma.menuItem.upsert({
    where: { slug: 'dashboard-test-dish' },
    update: {},
    create: {
      name: 'Dashboard Test Dish',
      slug: 'dashboard-test-dish',
      description: 'Used by the customer dashboard tests.',
      price: 800,
      categoryId: category.id,
      image: '/images/dish-chicken-biryani.jpg',
    },
  });
  dishId = dish.id;

  const res = await request(app).post('/api/auth/register').send(USER);
  token = res.body.accessToken;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('customer dashboard', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/customer/dashboard').expect(401);
  });

  it('returns a full dashboard payload', async () => {
    const res = await request(app).get('/api/customer/dashboard').set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body.user.email).toBe(USER.email);
    expect(res.body.loyalty.tier.name).toBe('Bronze');
    expect(res.body.stats).toHaveProperty('totalOrders');
    expect(Array.isArray(res.body.recentOrders)).toBe(true);
    expect(Array.isArray(res.body.upcomingReservations)).toBe(true);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  it('shows the welcome notification', async () => {
    const res = await request(app).get('/api/customer/dashboard').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.notifications.some((n: { title: string }) => n.title.includes('Welcome'))).toBe(true);
  });

  it('surfaces an in-progress order', async () => {
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'PICKUP',
        items: [{ menuItemId: dishId, quantity: 1 }],
        customerName: USER.name,
        customerPhone: USER.phone,
        paymentMethod: 'COD',
      })
      .expect(201);

    const res = await request(app).get('/api/customer/dashboard').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.activeOrder).not.toBeNull();
    expect(res.body.activeOrder.status).toBe('PENDING');
  });

  it('reports loyalty state and the referral code', async () => {
    const res = await request(app).get('/api/customer/loyalty').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.points).toBe(250);
    expect(res.body.tier.name).toBe('Bronze');
    expect(res.body.nextTier.name).toBe('Silver');
    expect(res.body.allTiers).toHaveLength(4);
    expect(res.body.referralCode).toMatch(/^[A-Z]{4}[0-9A-F]{6}$/);
  });

  it('lists purchased gift cards', async () => {
    await request(app)
      .post('/api/marketing/gift-cards')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 3000,
        recipientName: 'A Friend',
        recipientEmail: 'friend@example.com',
        senderName: USER.name,
      })
      .expect(201);

    const res = await request(app).get('/api/customer/gift-cards').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.giftCards).toHaveLength(1);
    expect(res.body.giftCards[0].amount).toBe(3000);
  });
});

describe('profile and addresses', () => {
  let addressId: string;

  it('updates the profile', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed User', marketingOptIn: true, dietaryPrefs: ['nuts'] })
      .expect(200);

    expect(res.body.user.name).toBe('Renamed User');
    expect(res.body.user.marketingOptIn).toBe(true);
    expect(res.body.user.dietaryPrefs).toEqual(['nuts']);
  });

  it('creates the first address and makes it the default', async () => {
    const res = await request(app)
      .post('/api/auth/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Home', line1: 'House 9, Street 4, G-11/2', city: 'Islamabad', zoneId: 'zone-g' })
      .expect(201);

    expect(res.body.address.isDefault).toBe(true);
    addressId = res.body.address.id;
  });

  it('moves the default when a second address claims it', async () => {
    const second = await request(app)
      .post('/api/auth/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Office', line1: 'Blue Area, Jinnah Avenue', city: 'Islamabad', zoneId: 'zone-f', isDefault: true })
      .expect(201);

    expect(second.body.address.isDefault).toBe(true);

    const list = await request(app).get('/api/auth/addresses').set('Authorization', `Bearer ${token}`).expect(200);
    const defaults = list.body.addresses.filter((a: { isDefault: boolean }) => a.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].label).toBe('Office');
  });

  it('places an order against a saved address', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'DELIVERY',
        items: [{ menuItemId: dishId, quantity: 1 }],
        customerName: USER.name,
        customerPhone: USER.phone,
        addressId,
        paymentMethod: 'COD',
      })
      .expect(201);

    expect(res.body.order.addressText).toContain('G-11/2');
    expect(res.body.order.zoneId).toBe('zone-g');
  });

  it('rejects another user’s address', async () => {
    const other = await request(app).post('/api/auth/register').send({
      name: 'Other Person',
      email: 'other.person@example.com',
      phone: '03007778899',
      password: 'Passw0rd!',
    });

    await request(app)
      .patch(`/api/auth/addresses/${addressId}`)
      .set('Authorization', `Bearer ${other.body.accessToken}`)
      .send({ label: 'Hijacked' })
      .expect(404);
  });

  it('deletes an address', async () => {
    await request(app).delete(`/api/auth/addresses/${addressId}`).set('Authorization', `Bearer ${token}`).expect(200);
    const list = await request(app).get('/api/auth/addresses').set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.addresses.find((a: { id: string }) => a.id === addressId)).toBeUndefined();
  });

  it('changes the password and invalidates other sessions', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: USER.password, newPassword: 'BrandNewPass1' })
      .expect(200);
    expect(res.body.ok).toBe(true);

    await request(app).post('/api/auth/login').send({ email: USER.email, password: USER.password }).expect(401);
    const relogin = await request(app)
      .post('/api/auth/login')
      .send({ email: USER.email, password: 'BrandNewPass1' })
      .expect(200);
    token = relogin.body.accessToken;
  });

  it('refuses a password change with the wrong current password', async () => {
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'nope', newPassword: 'AnotherPass1' })
      .expect(401);
  });
});

describe('notifications', () => {
  it('lists notifications and marks them read', async () => {
    const before = await request(app).get('/api/marketing/notifications').set('Authorization', `Bearer ${token}`).expect(200);
    expect(before.body.unread).toBeGreaterThan(0);

    await request(app).post('/api/marketing/notifications/read').set('Authorization', `Bearer ${token}`).expect(200);

    const after = await request(app).get('/api/marketing/notifications').set('Authorization', `Bearer ${token}`).expect(200);
    expect(after.body.unread).toBe(0);
  });
});

describe('payment webhooks', () => {
  it('confirms an order when Stripe reports a successful payment', async () => {
    const created = await request(app)
      .post('/api/orders')
      .send({
        type: 'PICKUP',
        items: [{ menuItemId: dishId, quantity: 1 }],
        customerName: 'Webhook Tester',
        customerPhone: '03001234567',
        paymentMethod: 'CARD_STRIPE',
      })
      .expect(201);

    const orderId = created.body.order.id;

    await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send({
        type: 'payment_intent.succeeded',
        data: { object: { metadata: { orderId }, charges: { data: [{ receipt_url: 'https://receipt.test/x' }] } } },
      })
      .expect(200);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.paymentStatus).toBe('PAID');
    expect(order.status).toBe('CONFIRMED');
  });

  it('marks a payment failed without confirming the order', async () => {
    const created = await request(app)
      .post('/api/orders')
      .send({
        type: 'PICKUP',
        items: [{ menuItemId: dishId, quantity: 1 }],
        customerName: 'Failed Payment',
        customerPhone: '03001234567',
        paymentMethod: 'CARD_STRIPE',
      })
      .expect(201);

    await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send({ type: 'payment_intent.payment_failed', data: { object: { metadata: { orderId: created.body.order.id } } } })
      .expect(200);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: created.body.order.id } });
    expect(order.paymentStatus).toBe('FAILED');
    expect(order.status).toBe('PENDING');
  });

  it('acknowledges an unrelated Stripe event without side effects', async () => {
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send({ type: 'customer.created', data: { object: {} } })
      .expect(200);
    expect(res.body.received).toBe(true);
  });

  it('confirms an order from a wallet callback', async () => {
    const created = await request(app)
      .post('/api/orders')
      .send({
        type: 'PICKUP',
        items: [{ menuItemId: dishId, quantity: 1 }],
        customerName: 'Wallet Tester',
        customerPhone: '03001234567',
        paymentMethod: 'JAZZCASH',
      })
      .expect(201);

    await request(app)
      .post('/api/webhooks/wallet')
      .set('Content-Type', 'application/json')
      .send({ intentId: created.body.payment.intentId, status: 'SUCCESS' })
      .expect(200);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: created.body.order.id } });
    expect(order.paymentStatus).toBe('PAID');
  });

  it('acknowledges a PayPal capture', async () => {
    const res = await request(app)
      .post('/api/webhooks/paypal')
      .set('Content-Type', 'application/json')
      .send({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'unknown-intent' } })
      .expect(200);
    expect(res.body.received).toBe(true);
  });
});
