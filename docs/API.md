# API Reference

Base URL: `https://api.islamabadrestaurant.pk` (production) · `http://localhost:4000` (dev)

The browser never calls the API host directly — the Next.js app proxies `/api/*` to it,
so requests are always same-origin.

## Conventions

- All requests and responses are JSON.
- Monetary amounts are **whole Pakistani rupees** as integers. There are no fractional
  units anywhere in the API.
- Dates are ISO-8601. Reservation `date` and `time` are stored as `YYYY-MM-DD` and
  `HH:mm` strings so a booking never shifts across timezones.
- Errors share one shape:

```json
{ "error": "VALIDATION_ERROR", "message": "Please check the highlighted fields",
  "details": [{ "path": "phone", "message": "Enter a valid Pakistani mobile number" }] }
```

| Status | `error` | Meaning |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Malformed or semantically invalid request |
| 401 | `UNAUTHORIZED` | Missing, expired or invalid token |
| 403 | `FORBIDDEN` / `CSRF_FAILED` | Authenticated but not permitted |
| 404 | `NOT_FOUND` | No such resource |
| 409 | `CONFLICT` | Duplicate, or an illegal state transition |
| 422 | `VALIDATION_ERROR` | Zod rejected the payload; see `details` |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected; details suppressed in production |

## Authentication

Two interchangeable mechanisms:

1. **Bearer token** — `Authorization: Bearer <accessToken>`. Preferred for API clients.
2. **Cookies** — `access_token` + `refresh_token`, set `HttpOnly`. Used by the web app.
   Cookie-authenticated mutations must also send `X-CSRF-Token` matching the
   `csrf_token` cookie.

Access tokens live 15 minutes; refresh tokens live 30 days and **rotate on every use**
(the old one is revoked immediately, so a stolen refresh token is single-use).

### Roles

`SUPER_ADMIN` (40) → `MANAGER` (30) → `STAFF` (20) → `CUSTOMER` (10). Endpoints require a
minimum rank; higher ranks inherit everything below.

## Rate limits

| Scope | Window | Max |
| --- | --- | --- |
| Global `/api` | 60 s | 300 |
| `POST /auth/login` | 15 min | 20 |
| `POST /auth/register` | 15 min | 10 |
| `POST /auth/change-password` | 15 min | 5 |
| `POST /orders` | 5 min | 20 |
| `POST /orders/quote` | 60 s | 60 |
| `POST /reservations` | 15 min | 15 |
| `POST /assistant/chat` | 60 s | 30 |
| `POST /marketing/contact` | 60 min | 8 |

Responses carry `X-RateLimit-Limit` and `X-RateLimit-Remaining`.

---

# Endpoints

## System

### `GET /api/health`
Liveness and dependency check. Used by the load balancer.

```json
{ "status": "ok", "database": { "status": "up", "provider": "postgresql" },
  "cache": { "driver": "redis" }, "latencyMs": 3 }
```

### `GET /api/config`
Public brand configuration, opening hours and delivery zones. Cached 10 minutes.

---

## Auth — `/api/auth`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | — | Create an account; awards 250 welcome points |
| POST | `/login` | — | Email + password |
| POST | `/oauth` | — | Google or Facebook token exchange |
| POST | `/refresh` | cookie | Rotate the token pair |
| POST | `/logout` | — | Revoke the refresh token, clear cookies |
| GET | `/me` | user | Current profile |
| PATCH | `/me` | user | Update name, phone, dietary prefs, marketing opt-in |
| POST | `/change-password` | user | Requires the current password; revokes other sessions |
| GET | `/addresses` | user | Address book |
| POST | `/addresses` | user | Add (first one becomes default automatically) |
| PATCH | `/addresses/:id` | user | Update; setting `isDefault` demotes the previous default |
| DELETE | `/addresses/:id` | user | Remove |

**`POST /register`**

```json
{ "name": "Ayesha Khan", "email": "ayesha@example.com",
  "phone": "03001234567", "password": "Passw0rd!" }
```

Password must be ≥8 characters with an uppercase letter, a lowercase letter and a digit.
Phone must match `^(\+92|0)?3\d{9}$`.

Returns `201` with `{ user, accessToken, refreshToken, csrfToken }`.

Login failures return an identical message for unknown email and wrong password, to
prevent account enumeration.

---

## Menu — `/api/menu`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/categories` | — | Categories with item counts (cached 5 min) |
| GET | `/` | — | Filtered, sorted, paginated list |
| GET | `/featured` | — | Best sellers and featured dishes |
| GET | `/:slug` | — | One dish with reviews and related items |
| POST | `/` | manager | Create a dish |
| PATCH | `/:id` | manager | Update a dish |
| PATCH | `/:id/availability` | **staff** | Toggle availability — kitchen can 86 an item |
| DELETE | `/:id` | manager | Remove a dish |
| POST | `/categories` | manager | Create a category |

**`GET /api/menu` query parameters**

| Param | Type | Notes |
| --- | --- | --- |
| `category` | string | Category slug |
| `search` | string | Matches name and description |
| `minPrice` / `maxPrice` | number | Rupees |
| `vegetarian` | boolean | |
| `spice` | string | `MILD` \| `MEDIUM` \| `HOT` \| `FIERY` |
| `excludeAllergens` | string | Comma-separated, e.g. `nuts,dairy` |
| `sort` | string | `popular` \| `price-asc` \| `price-desc` \| `rating` \| `name` |
| `page` / `pageSize` | number | Default 1 / 50, max 100 |

Returns `{ items, total, page, pageSize, totalPages }`.

Note the deliberate split between `PATCH /:id` (manager) and `PATCH /:id/availability`
(staff): a line cook can mark the biryani sold out mid-service without being able to
change prices.

---

## Orders — `/api/orders`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/quote` | optional | Price a basket — **call before checkout** |
| POST | `/` | optional | Place an order (guest checkout allowed) |
| GET | `/mine` | user | The caller's orders |
| GET | `/track/:token` | — | Public tracking by opaque token |
| GET | `/:id` | owner/staff | Full order |
| POST | `/:id/cancel` | owner | Only while `PENDING` or `CONFIRMED` |
| POST | `/:id/reorder` | owner | Rebuild a cart, reporting unavailable items |
| GET | `/` | staff | Search and filter all orders |
| GET | `/kitchen/queue` | staff | Active tickets, oldest first |
| PATCH | `/:id/status` | staff | Advance the state machine |

**`POST /api/orders/quote`**

```json
{ "items": [{ "menuItemId": "…", "quantity": 2 }],
  "type": "DELIVERY", "zoneId": "zone-f", "couponCode": "WELCOME15", "redeemPoints": 100 }
```

Prices come from the database, never from the client — a submitted `price` is ignored.

```json
{ "quote": { "subtotal": 900, "packaging": 60, "deliveryFee": 149, "discount": 135,
  "pointsDiscount": 200, "pointsRedeemed": 100, "tax": 90, "total": 864,
  "pointsEarned": 5, "freeDeliveryApplied": false, "couponCode": "WELCOME15",
  "couponError": null, "etaMinutes": 45 } }
```

Pricing rules, in order: subtotal → coupon discount → point redemption (capped at the
balance and at 50% of the bill) → 16% tax **on the discounted amount** → packaging →
delivery (free above Rs. 4,000).

**`POST /api/orders`** takes the quote fields plus `customerName`, `customerPhone`,
`paymentMethod`, and either `addressId` (a saved address, which carries its own zone) or
`address` + `zoneId`. Returns `{ order, payment }`, where `payment` contains the gateway
intent (`clientSecret` for Stripe, `redirectUrl` for PayPal and wallets).

### Order state machine

```
PENDING ──► CONFIRMED ──► PREPARING ──► READY ──┬─► OUT_FOR_DELIVERY ──► DELIVERED
   │            │             │                 └─► DELIVERED
   └────────────┴─────────────┴──► CANCELLED
```

Any other transition returns `409`. On `DELIVERED` the customer's loyalty points are
credited with their tier multiplier; on `CANCELLED` any redeemed points are refunded.

---

## Reservations — `/api/reservations`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/availability` | — | Live slots for a date and party size |
| POST | `/` | optional | Book, or join the waiting list |
| GET | `/mine` | user | Upcoming and past bookings |
| GET | `/code/:code` | — | Look up by confirmation code |
| PATCH | `/:id` | owner/code | Change date, time, party size or seating |
| POST | `/:id/cancel` | owner/code/staff | Cancel; promotes the first waitlisted party |
| GET | `/` | staff | The book for a date |
| GET | `/calendar/:month` | staff | Covers and bookings per day (`YYYY-MM`) |
| PATCH | `/:id/status` | staff | Seat, complete, or mark a no-show |

**`GET /api/reservations/availability?date=2026-08-20&guests=4&seating=ANY`**

```json
{ "date": "2026-08-20", "guests": 4, "anyAvailable": true,
  "slots": [{ "time": "19:00", "available": true, "peak": true,
              "tableId": "T11", "tableName": "Table 11", "past": false }] }
```

Availability is computed against the real 42-table floor plan with clash detection over
each party's dining window (75–150 minutes by size), so a slot marked available is
genuinely bookable. Slots within the next hour are marked `past`.

Booking an unavailable slot does not fail — it creates a `WAITLIST` entry with a queue
position, and cancellation of a conflicting booking promotes it automatically.

---

## Customer — `/api/customer`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/dashboard` | Stats, live order, upcoming bookings, notifications, favourites |
| GET | `/loyalty` | Balance, tier, next tier, full points ledger, referrals |
| GET | `/gift-cards` | Gift cards this user purchased |

All require a signed-in customer.

---

## Admin — `/api/admin`

All endpoints require **staff** or above; individual routes require more.

| Method | Path | Min role | Description |
| --- | --- | --- | --- |
| GET | `/analytics/overview` | staff | Revenue, orders, customers, bookings, inbox |
| GET | `/analytics/revenue?days=30` | staff | Daily series (max 365 days) |
| GET | `/analytics/report/:period` | staff | `daily` \| `weekly` \| `monthly` \| `annual` |
| GET | `/customers` | manager | Search, paginate, with lifetime spend |
| GET | `/customers/:id` | manager | One customer with orders and ledger |
| GET | `/staff` | manager | Staff accounts |
| POST | `/staff` | super admin | Create; returns a temporary password if none given |
| PATCH | `/staff/:id` | super admin | Update role, position, active state |
| GET/POST/PATCH/DELETE | `/coupons` | manager | Coupon CRUD |
| GET/PATCH | `/messages` | staff | Contact inbox |
| GET/PATCH | `/enquiries` | staff | Event enquiry pipeline |
| GET | `/audit` | super admin | Audit log, most recent 200 |
| POST | `/cache/flush` | manager | Invalidate menu, analytics and availability caches |

Month-over-month growth compares month-to-date against the **same span** of the previous
month, so a partial month does not read as a collapse.

Super admins cannot demote their own account (guards against lockout).

---

## Marketing — `/api/marketing`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/newsletter` | — | Subscribe (idempotent) |
| POST | `/newsletter/unsubscribe` | — | Unsubscribe |
| POST | `/contact` | — | Contact form |
| GET | `/offers` | — | Live, publishable coupons |
| POST | `/gift-cards` | optional | Purchase; 12-month validity |
| GET | `/gift-cards/:code` | — | Check a balance |
| POST | `/gift-cards/:code/redeem` | user | Redeem against a bill |
| POST | `/events/enquiry` | — | Private dining / catering enquiry |
| GET | `/reviews` | — | Approved reviews |
| POST | `/reviews` | user | Submit; dish reviews require a delivered order |
| PATCH | `/reviews/:id/approve` | manager | Moderate |
| GET/POST | `/campaigns` | manager | Email campaigns |
| POST | `/campaigns/:id/send` | manager | Dispatch |
| GET | `/notifications` | user | In-app notifications |
| POST | `/notifications/read` | user | Mark all read |

---

## AI Concierge — `/api/assistant`

### `POST /api/assistant/chat`

```json
{ "message": "how much is delivery to F-10?", "history": [] }
```

```json
{ "reply": "We deliver to F-Sectors (F-6 → F-11). The delivery charge is Rs. 149…",
  "intent": "delivery", "confidence": 0.94,
  "suggestions": ["Start an order", "…"],
  "items": [{ "name": "…", "slug": "…", "price": 450, "image": "…" }],
  "actions": [{ "label": "Order for delivery", "href": "/order" }] }
```

Twelve intents (greeting, recommend, delivery, price, reservation, order-status,
dietary, hours, location, events, loyalty, payment) with an FAQ knowledge base and a
live-menu search as fallbacks. Answers are grounded in database rows, so prices and
availability are always current. Recognises Islamabad sector codes (`F-10`, `g11`).

### `GET /api/assistant/recommendations?cart=id1,id2`

Personalised for signed-in customers from their order history; otherwise cart-aware
("complete your meal" with drinks and desserts) or best-sellers.

---

## Webhooks — `/api/webhooks`

Mounted **before** the JSON body parser so the raw body is available for signature
verification.

| Path | Provider | Events |
| --- | --- | --- |
| `/stripe` | Stripe | `payment_intent.succeeded`, `payment_intent.payment_failed` |
| `/paypal` | PayPal | `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED` |
| `/wallet` | JazzCash / Easypaisa | HMAC-signed status callback |

A successful payment marks the order paid and advances `PENDING → CONFIRMED`.
Stripe signatures are verified with a timing-safe comparison when
`STRIPE_WEBHOOK_SECRET` is configured.

---

## cURL examples

```bash
# Sign in
curl -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ayesha@example.com","password":"Customer@1234"}'

# Price a basket
curl -X POST localhost:4000/api/orders/quote \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"menuItemId":"<id>","quantity":2}],"type":"DELIVERY","zoneId":"zone-f"}'

# Check tables for four on 20 August
curl 'localhost:4000/api/reservations/availability?date=2026-08-20&guests=4'

# Advance an order (staff)
curl -X PATCH localhost:4000/api/orders/<id>/status \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"PREPARING"}'
```
