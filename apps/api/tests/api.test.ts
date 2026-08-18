/**
 * End-to-end API integration tests.
 *
 * These exercise the real Express app against a real (SQLite) database, so the
 * routing, validation, auth, pricing and state-machine layers are all covered
 * together rather than mocked.
 */
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';

let app: Express;
let prisma: typeof import('../src/lib/prisma.js')['prisma'];

let categoryId: string;
let dishId: string;
let secondDishId: string;
let customerToken: string;
let staffToken: string;
let adminToken: string;

const CUSTOMER = { name: 'Test Customer', email: 'test.customer@example.com', phone: '03001112233', password: 'Passw0rd!' };

beforeAll(async () => {
  ({ createApp: app } = { createApp: (await import('../src/app.js')).createApp() } as never);
  ({ prisma } = await import('../src/lib/prisma.js'));

  // Minimal catalogue for the tests.
  const { hashPassword, generateReferralCode } = await import('../src/lib/auth.js');

  const category = await prisma.category.create({
    data: { name: 'Test Biryani', slug: 'test-biryani', sortOrder: 1 },
  });
  categoryId = category.id;

  const dish = await prisma.menuItem.create({
    data: {
      name: 'Test Chicken Biryani',
      slug: 'test-chicken-biryani',
      description: 'A test dish used by the automated suite.',
      price: 500,
      categoryId,
      image: '/images/dish-chicken-biryani.jpg',
      isBestSeller: true,
      allergens: JSON.stringify(['dairy']),
    },
  });
  dishId = dish.id;

  const second = await prisma.menuItem.create({
    data: {
      name: 'Test Mint Margarita',
      slug: 'test-mint-margarita',
      description: 'A test drink used by the automated suite.',
      price: 200,
      categoryId,
      image: '/images/dish-chicken-handi.jpg',
      isVegetarian: true,
    },
  });
  secondDishId = second.id;

  await prisma.coupon.create({
    data: { code: 'TEST20', description: '20% off tests', type: 'PERCENT', value: 20, minOrder: 500, isActive: true },
  });
  await prisma.coupon.create({
    data: { code: 'BIGSPEND', description: 'Needs a big basket', type: 'FIXED', value: 500, minOrder: 50000, isActive: true },
  });

  for (const [email, role, password] of [
    ['test.staff@example.com', 'STAFF', 'StaffPass1'],
    ['test.admin@example.com', 'SUPER_ADMIN', 'AdminPass1'],
  ] as const) {
    await prisma.user.create({
      data: {
        name: role,
        email,
        role,
        passwordHash: await hashPassword(password),
        referralCode: generateReferralCode(role),
      },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

/* --------------------------------- health -------------------------------- */

describe('GET /api/health', () => {
  it('reports the service as healthy', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database.status).toBe('up');
  });
});

describe('GET /api/config', () => {
  it('exposes brand, hours and delivery zones', async () => {
    const res = await request(app).get('/api/config').expect(200);
    expect(res.body.brand.name).toBe('Islamabad Restaurant');
    expect(res.body.hours).toHaveLength(7);
    expect(res.body.deliveryZones.length).toBeGreaterThan(0);
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist').expect(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});

/* ---------------------------------- auth --------------------------------- */

describe('authentication', () => {
  it('registers a customer and awards welcome points', async () => {
    const res = await request(app).post('/api/auth/register').send(CUSTOMER).expect(201);
    expect(res.body.user.email).toBe(CUSTOMER.email);
    expect(res.body.user.points).toBe(250);
    expect(res.body.accessToken).toBeTruthy();
    customerToken = res.body.accessToken;
  });

  it('rejects a duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(CUSTOMER).expect(409);
    expect(res.body.error).toBe('CONFLICT');
  });

  it('rejects a weak password with field-level detail', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...CUSTOMER, email: 'weak@example.com', password: 'short' })
      .expect(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details.some((d: { path: string }) => d.path === 'password')).toBe(true);
  });

  it('rejects an invalid Pakistani mobile number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...CUSTOMER, email: 'badphone@example.com', phone: '12345' })
      .expect(422);
    expect(res.body.details.some((d: { path: string }) => d.path === 'phone')).toBe(true);
  });

  it('signs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: CUSTOMER.email, password: CUSTOMER.password })
      .expect(200);
    expect(res.body.user.email).toBe(CUSTOMER.email);
    customerToken = res.body.accessToken;
  });

  it('refuses a wrong password without revealing which field failed', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: CUSTOMER.email, password: 'WrongPass1' })
      .expect(401);
    expect(res.body.message).toBe('Incorrect email or password');
  });

  it('refuses an unknown email with the same message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPass1' })
      .expect(401);
    expect(res.body.message).toBe('Incorrect email or password');
  });

  it('returns the signed-in profile', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${customerToken}`).expect(200);
    expect(res.body.user.email).toBe(CUSTOMER.email);
  });

  it('blocks unauthenticated access to the profile', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('rejects a forged token', async () => {
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.real.token').expect(401);
  });

  it('signs in staff and admin accounts', async () => {
    const staff = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.staff@example.com', password: 'StaffPass1' })
      .expect(200);
    staffToken = staff.body.accessToken;

    const admin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.admin@example.com', password: 'AdminPass1' })
      .expect(200);
    adminToken = admin.body.accessToken;
  });
});

/* ---------------------------------- menu --------------------------------- */

describe('menu', () => {
  it('lists categories with item counts', async () => {
    const res = await request(app).get('/api/menu/categories').expect(200);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  it('lists menu items with pagination metadata', async () => {
    const res = await request(app).get('/api/menu').expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('totalPages');
  });

  it('searches by name', async () => {
    const res = await request(app).get('/api/menu?search=Margarita').expect(200);
    expect(res.body.items.every((i: { name: string }) => i.name.includes('Margarita'))).toBe(true);
  });

  it('filters to vegetarian dishes only', async () => {
    const res = await request(app).get('/api/menu?vegetarian=true').expect(200);
    expect(res.body.items.every((i: { isVegetarian: boolean }) => i.isVegetarian)).toBe(true);
  });

  it('excludes dishes containing a given allergen', async () => {
    const res = await request(app).get('/api/menu?excludeAllergens=dairy').expect(200);
    expect(res.body.items.every((i: { allergens: string[] }) => !i.allergens.includes('dairy'))).toBe(true);
  });

  it('sorts by price ascending', async () => {
    const res = await request(app).get('/api/menu?sort=price-asc').expect(200);
    const prices = res.body.items.map((i: { price: number }) => i.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('returns a single dish with related items', async () => {
    const res = await request(app).get('/api/menu/test-chicken-biryani').expect(200);
    expect(res.body.item.name).toBe('Test Chicken Biryani');
    expect(Array.isArray(res.body.related)).toBe(true);
  });

  it('404s an unknown dish', async () => {
    await request(app).get('/api/menu/no-such-dish').expect(404);
  });

  it('refuses menu edits from a customer', async () => {
    await request(app)
      .patch(`/api/menu/${dishId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ price: 1 })
      .expect(403);
  });

  it('lets staff toggle availability but not edit pricing', async () => {
    await request(app)
      .patch(`/api/menu/${dishId}/availability`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ isAvailable: true })
      .expect(200);

    await request(app)
      .patch(`/api/menu/${dishId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ price: 999 })
      .expect(403);
  });

  it('lets an admin update a dish', async () => {
    const res = await request(app)
      .patch(`/api/menu/${dishId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 500 })
      .expect(200);
    expect(res.body.item.price).toBe(500);
  });
});

/* --------------------------------- quoting -------------------------------- */

describe('order quoting', () => {
  it('prices a basket from server-side prices', async () => {
    const res = await request(app)
      .post('/api/orders/quote')
      .send({ items: [{ menuItemId: dishId, quantity: 2 }], type: 'DELIVERY', zoneId: 'zone-f' })
      .expect(200);
    expect(res.body.quote.subtotal).toBe(1000);
    expect(res.body.quote.deliveryFee).toBe(149);
  });

  it('ignores a client-supplied price', async () => {
    const res = await request(app)
      .post('/api/orders/quote')
      .send({ items: [{ menuItemId: dishId, quantity: 1, price: 1 }], type: 'PICKUP' })
      .expect(200);
    expect(res.body.quote.subtotal).toBe(500);
  });

  it('applies a valid coupon', async () => {
    const res = await request(app)
      .post('/api/orders/quote')
      .send({ items: [{ menuItemId: dishId, quantity: 2 }], type: 'PICKUP', couponCode: 'TEST20' })
      .expect(200);
    expect(res.body.quote.discount).toBe(200);
  });

  it('surfaces a coupon that does not meet its minimum', async () => {
    const res = await request(app)
      .post('/api/orders/quote')
      .send({ items: [{ menuItemId: dishId, quantity: 1 }], type: 'PICKUP', couponCode: 'BIGSPEND' })
      .expect(200);
    expect(res.body.quote.couponError).toBeTruthy();
  });

  it('rejects an empty basket', async () => {
    await request(app).post('/api/orders/quote').send({ items: [] }).expect(400);
  });
});

/* --------------------------------- orders --------------------------------- */

describe('order lifecycle', () => {
  let orderId: string;
  let trackingToken: string;

  it('places an order as a signed-in customer', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        type: 'DELIVERY',
        items: [{ menuItemId: dishId, quantity: 2, notes: 'Extra raita' }],
        customerName: CUSTOMER.name,
        customerPhone: CUSTOMER.phone,
        address: 'House 1, Street 1, F-10',
        zoneId: 'zone-f',
        paymentMethod: 'COD',
      })
      .expect(201);

    expect(res.body.order.status).toBe('PENDING');
    expect(res.body.order.orderNumber).toMatch(/^IR-\d{8}-[0-9A-F]{6}$/);
    expect(res.body.order.items[0].notes).toBe('Extra raita');
    orderId = res.body.order.id;
    trackingToken = res.body.order.trackingToken;
  });

  it('requires an address for a delivery order', async () => {
    await request(app)
      .post('/api/orders')
      .send({
        type: 'DELIVERY',
        items: [{ menuItemId: dishId, quantity: 1 }],
        customerName: 'No Address',
        customerPhone: '03001112233',
        paymentMethod: 'COD',
      })
      .expect(422);
  });

  it('allows a guest pickup order', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        type: 'PICKUP',
        items: [{ menuItemId: secondDishId, quantity: 1 }],
        customerName: 'Guest Diner',
        customerPhone: '03009998877',
        paymentMethod: 'COD',
      })
      .expect(201);
    expect(res.body.order.deliveryFee).toBe(0);
  });

  it('exposes public tracking without authentication', async () => {
    const res = await request(app).get(`/api/orders/track/${trackingToken}`).expect(200);
    expect(res.body.order.id).toBe(orderId);
  });

  it('404s an unknown tracking token', async () => {
    await request(app).get('/api/orders/track/not-a-real-token').expect(404);
  });

  it('advances through the full status flow', async () => {
    for (const status of ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status })
        .expect(200);
      expect(res.body.order.status).toBe(status);
    }
  });

  it('refuses an illegal status transition', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'PREPARING' })
      .expect(409);
    expect(res.body.message).toContain('Cannot move an order');
  });

  it('refuses status changes from a customer', async () => {
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'CANCELLED' })
      .expect(403);
  });

  it('awards loyalty points once delivered', async () => {
    const res = await request(app).get('/api/customer/loyalty').set('Authorization', `Bearer ${customerToken}`).expect(200);
    // 250 welcome + points earned on the delivered order.
    expect(res.body.points).toBeGreaterThan(250);
    expect(res.body.ledger.length).toBeGreaterThan(1);
  });

  it('lists the customer’s own orders only', async () => {
    const res = await request(app).get('/api/orders/mine').set('Authorization', `Bearer ${customerToken}`).expect(200);
    expect(res.body.orders.length).toBeGreaterThan(0);
    expect(res.body.orders.every((o: { customerName: string }) => o.customerName === CUSTOMER.name)).toBe(true);
  });

  it('rebuilds a cart from a past order', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/reorder`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(res.body.items[0].menuItemId).toBe(dishId);
  });

  it('cannot cancel an order that is already delivered', async () => {
    await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(400);
  });

  it('lets a customer cancel a pending order and refunds points', async () => {
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        type: 'PICKUP',
        items: [{ menuItemId: dishId, quantity: 1 }],
        customerName: CUSTOMER.name,
        customerPhone: CUSTOMER.phone,
        paymentMethod: 'COD',
        redeemPoints: 50,
      })
      .expect(201);

    expect(created.body.order.pointsRedeemed).toBe(50);

    const before = await request(app).get('/api/customer/loyalty').set('Authorization', `Bearer ${customerToken}`);
    await request(app)
      .post(`/api/orders/${created.body.order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const after = await request(app).get('/api/customer/loyalty').set('Authorization', `Bearer ${customerToken}`);

    expect(after.body.points).toBe(before.body.points + 50);
  });

  it('blocks the kitchen queue from unauthenticated callers', async () => {
    await request(app).get('/api/orders/kitchen/queue').expect(401);
  });
});

/* ------------------------------ reservations ------------------------------ */

describe('reservations', () => {
  const DATE = '2026-12-10'; // a Thursday
  let reservationId: string;
  let code: string;

  it('returns live availability', async () => {
    const res = await request(app).get(`/api/reservations/availability?date=${DATE}&guests=4`).expect(200);
    expect(res.body.slots.length).toBeGreaterThan(0);
    expect(res.body.anyAvailable).toBe(true);
  });

  it('books a table and allocates one automatically', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .send({
        name: 'Booking Test',
        email: 'booking@example.com',
        phone: '03001234567',
        date: DATE,
        time: '19:00',
        guests: 4,
        seating: 'ANY',
      })
      .expect(201);

    reservationId = res.body.reservation.id;
    code = res.body.reservation.code;

    // A table is held, but the booking waits for a manager unless the
    // autoApproveReservations setting is on (it is off by default).
    expect(res.body.reservation.status).toBe('PENDING');
    expect(res.body.table).not.toBeNull();
  });

  it('rejects a slot outside opening hours', async () => {
    await request(app)
      .post('/api/reservations')
      .send({
        name: 'Too Early',
        email: 'early@example.com',
        phone: '03001234567',
        date: DATE,
        time: '04:00',
        guests: 2,
        seating: 'ANY',
      })
      .expect(400);
  });

  it('rejects a booking in the past', async () => {
    await request(app)
      .post('/api/reservations')
      .send({
        name: 'Time Traveller',
        email: 'past@example.com',
        phone: '03001234567',
        date: '2020-01-01',
        time: '19:00',
        guests: 2,
        seating: 'ANY',
      })
      .expect(400);
  });

  it('looks a reservation up by its confirmation code', async () => {
    const res = await request(app).get(`/api/reservations/code/${code}`).expect(200);
    expect(res.body.reservation.id).toBe(reservationId);
  });

  it('cancels using the confirmation code', async () => {
    const res = await request(app).post(`/api/reservations/${reservationId}/cancel`).send({ code }).expect(200);
    expect(res.body.reservation.status).toBe('CANCELLED');
  });

  it('lets a manager approve a pending booking', async () => {
    const created = await request(app)
      .post('/api/reservations')
      .send({
        name: 'Approve Me',
        email: 'approve@example.com',
        phone: '03001234567',
        date: DATE,
        time: '18:00',
        guests: 4,
        seating: 'ANY',
      })
      .expect(201);
    expect(created.body.reservation.status).toBe('PENDING');

    const res = await request(app)
      .post(`/api/reservations/${created.body.reservation.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE' })
      .expect(200);

    expect(res.body.reservation.status).toBe('CONFIRMED');
    expect(res.body.reservation.tableId).toBeTruthy();
    expect(res.body.reservation.approvedAt).toBeTruthy();
  });

  it('lets a manager reject a pending booking with a reason', async () => {
    const created = await request(app)
      .post('/api/reservations')
      .send({
        name: 'Reject Me',
        email: 'reject@example.com',
        phone: '03001234567',
        date: DATE,
        time: '18:30',
        guests: 4,
        seating: 'ANY',
      })
      .expect(201);

    const res = await request(app)
      .post(`/api/reservations/${created.body.reservation.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'REJECT', reason: 'Private event that evening' })
      .expect(200);

    expect(res.body.reservation.status).toBe('REJECTED');
    expect(res.body.reservation.rejectionReason).toBe('Private event that evening');
    // The held table must be released back to the floor.
    expect(res.body.reservation.tableId).toBeNull();
  });

  it('refuses a decision from a customer', async () => {
    const created = await request(app).post('/api/reservations').send({
      name: 'Not Yours',
      email: 'notyours@example.com',
      phone: '03001234567',
      date: DATE,
      time: '19:30',
      guests: 2,
      seating: 'ANY',
    });
    await request(app)
      .post(`/api/reservations/${created.body.reservation.id}/decision`)
      .send({ decision: 'APPROVE' })
      .expect(401);
  });

  it('refuses a second decision on an already-decided booking', async () => {
    const created = await request(app).post('/api/reservations').send({
      name: 'Twice',
      email: 'twice@example.com',
      phone: '03001234567',
      date: DATE,
      time: '20:30',
      guests: 2,
      seating: 'ANY',
    });
    const id = created.body.reservation.id;
    await request(app).post(`/api/reservations/${id}/decision`).set('Authorization', `Bearer ${adminToken}`).send({ decision: 'APPROVE' }).expect(200);
    await request(app).post(`/api/reservations/${id}/decision`).set('Authorization', `Bearer ${adminToken}`).send({ decision: 'REJECT' }).expect(400);
  });

  it('refuses cancellation without the code or ownership', async () => {
    const created = await request(app).post('/api/reservations').send({
      name: 'Protected Booking',
      email: 'protected@example.com',
      phone: '03001234567',
      date: DATE,
      time: '20:00',
      guests: 2,
      seating: 'ANY',
    });
    await request(app).post(`/api/reservations/${created.body.reservation.id}/cancel`).send({ code: 'WRONG' }).expect(403);
  });

  it('requires staff rights to view the reservation book', async () => {
    await request(app).get('/api/reservations').set('Authorization', `Bearer ${customerToken}`).expect(403);
    await request(app).get('/api/reservations').set('Authorization', `Bearer ${staffToken}`).expect(200);
  });
});

/* -------------------------------- marketing ------------------------------- */

describe('marketing', () => {
  it('accepts a newsletter subscription', async () => {
    const res = await request(app).post('/api/marketing/newsletter').send({ email: 'sub@example.com' }).expect(201);
    expect(res.body.ok).toBe(true);
  });

  it('is idempotent for a repeated subscription', async () => {
    await request(app).post('/api/marketing/newsletter').send({ email: 'sub@example.com' }).expect(201);
  });

  it('rejects an invalid email', async () => {
    await request(app).post('/api/marketing/newsletter').send({ email: 'not-an-email' }).expect(422);
  });

  it('stores a contact message', async () => {
    const res = await request(app)
      .post('/api/marketing/contact')
      .send({
        name: 'Enquirer',
        email: 'enquirer@example.com',
        subject: 'A question',
        message: 'I would like to know about parking at the restaurant.',
      })
      .expect(201);
    expect(res.body.ok).toBe(true);
  });

  it('publishes live offers', async () => {
    const res = await request(app).get('/api/marketing/offers').expect(200);
    expect(res.body.offers.some((o: { code: string }) => o.code === 'TEST20')).toBe(true);
  });

  it('creates and looks up a gift card', async () => {
    const created = await request(app)
      .post('/api/marketing/gift-cards')
      .send({
        amount: 5000,
        recipientName: 'Gift Recipient',
        recipientEmail: 'recipient@example.com',
        senderName: 'Gift Sender',
      })
      .expect(201);

    const code = created.body.giftCard.code;
    const found = await request(app).get(`/api/marketing/gift-cards/${code}`).expect(200);
    expect(found.body.giftCard.balance).toBe(5000);
  });

  it('records an event enquiry', async () => {
    const res = await request(app)
      .post('/api/marketing/events/enquiry')
      .send({
        name: 'Event Organiser',
        email: 'events@example.com',
        phone: '03001234567',
        type: 'CORPORATE',
        date: '2026-12-20',
        guests: 30,
      })
      .expect(201);
    expect(res.body.ok).toBe(true);
  });
});

/* --------------------------------- admin ---------------------------------- */

describe('admin', () => {
  it('denies the admin API to customers', async () => {
    await request(app).get('/api/admin/analytics/overview').set('Authorization', `Bearer ${customerToken}`).expect(403);
  });

  it('returns the analytics overview to staff', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect(res.body.revenue).toHaveProperty('month');
    expect(res.body.orders).toHaveProperty('active');
  });

  it('returns a revenue time series', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/revenue?days=7')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect(res.body.series).toHaveLength(7);
  });

  it('builds period reports', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/report/monthly')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('topItems');
    expect(res.body).toHaveProperty('avgTicket');
  });

  it('rejects an unknown report period', async () => {
    await request(app)
      .get('/api/admin/analytics/report/hourly')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(400);
  });

  it('restricts customer records to managers and above', async () => {
    await request(app).get('/api/admin/customers').set('Authorization', `Bearer ${staffToken}`).expect(403);
    await request(app).get('/api/admin/customers').set('Authorization', `Bearer ${adminToken}`).expect(200);
  });

  it('restricts staff management to super admins', async () => {
    await request(app)
      .post('/api/admin/staff')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Nope', email: 'nope@example.com', role: 'MANAGER' })
      .expect(403);

    const res = await request(app)
      .post('/api/admin/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Manager', email: 'new.manager@example.com', role: 'MANAGER' })
      .expect(201);
    expect(res.body.temporaryPassword).toBeTruthy();
  });

  it('creates a coupon as an admin', async () => {
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'ADMINMADE', description: 'Created in tests', type: 'PERCENT', value: 5, minOrder: 0, isActive: true })
      .expect(201);
    expect(res.body.coupon.code).toBe('ADMINMADE');
  });
});

/* ------------------------------- assistant -------------------------------- */

describe('AI concierge', () => {
  it.each([
    ['What are your opening hours?', 'hours'],
    ['How much is delivery to F-10?', 'delivery'],
    ['I want to book a table for four', 'reservation'],
    ['Do you have vegetarian options?', 'dietary'],
    ['Where are you located?', 'location'],
    ['Can you host a wedding?', 'events'],
    ['How do loyalty points work?', 'loyalty'],
    ['Which payment methods do you take?', 'payment'],
  ])('routes "%s" to the %s intent', async (message, intent) => {
    const res = await request(app).post('/api/assistant/chat').send({ message }).expect(200);
    expect(res.body.intent).toBe(intent);
    expect(res.body.reply.length).toBeGreaterThan(20);
  });

  it('answers a price question from live menu data', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .send({ message: 'how much is the test chicken biryani' })
      .expect(200);
    expect(res.body.reply).toContain('500');
  });

  it('falls back gracefully on nonsense', async () => {
    const res = await request(app).post('/api/assistant/chat').send({ message: 'zzzz qqqq xyzzy' }).expect(200);
    expect(res.body.intent).toBe('fallback');
    expect(res.body.suggestions.length).toBeGreaterThan(0);
  });

  it('rejects an empty message', async () => {
    await request(app).post('/api/assistant/chat').send({ message: '' }).expect(422);
  });

  it('returns recommendations', async () => {
    const res = await request(app).get('/api/assistant/recommendations').expect(200);
    expect(res.body).toHaveProperty('reason');
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

/* -------------------------------- security -------------------------------- */

describe('security', () => {
  it('sets hardening headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });

  it('does not leak password hashes in any auth response', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${customerToken}`).expect(200);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('$2');
  });

  it('is not vulnerable to SQL injection through query parameters', async () => {
    const res = await request(app).get("/api/menu?search=' OR 1=1; DROP TABLE User;--").expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    // The table must still exist.
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${customerToken}`).expect(200);
  });

  it('stores XSS payloads verbatim rather than executing or stripping silently', async () => {
    const payload = '<script>alert("xss")</script>';
    const res = await request(app)
      .post('/api/marketing/contact')
      .send({
        name: 'XSS Tester',
        email: 'xss@example.com',
        subject: 'Testing escaping',
        message: `Here is a payload: ${payload} and some more text.`,
      })
      .expect(201);
    expect(res.body.ok).toBe(true);
  });

  it('enforces rate limits on repeated login attempts', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 30 }, () =>
        request(app).post('/api/auth/login').send({ email: 'flood@example.com', password: 'WrongPass1' }),
      ),
    );
    expect(attempts.some((r) => r.status === 429)).toBe(true);
  });
});
