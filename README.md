# Islamabad Restaurant — Enterprise Platform

Production-ready restaurant website and management platform for **Islamabad Restaurant**,
Margalla Town, Islamabad. Customer-facing site, first-party online ordering, live table
reservations, loyalty programme, and a full back-office console.

```
┌─────────────────┐        ┌──────────────────┐        ┌────────────────┐
│  Next.js 16     │  /api  │  Express 5 API   │        │  PostgreSQL    │
│  React 19       │ ─────► │  JWT · RBAC      │ ─────► │  (SQLite dev)  │
│  Tailwind v4    │ proxy  │  Prisma 7        │        └────────────────┘
│  Zustand + RQ   │        │  Zod validation  │        ┌────────────────┐
└─────────────────┘        └──────────────────┘ ─────► │ Redis (opt.)   │
                                                        └────────────────┘
```

---

## Quick start

```bash
npm install          # install all workspaces
npm run db:push      # create the schema
npm run db:seed      # real menu + 90 days of trading history
npm run dev          # API on :4000, web on :3000
```

Open <http://localhost:3000>. No Docker, no Postgres, no Redis required for local
development — see [Zero-dependency development](#zero-dependency-development).

### Sign-in credentials (seeded)

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@islamabadrestaurant.pk` | `Admin@1234` |
| Manager | `manager@islamabadrestaurant.pk` | `Manager@1234` |
| Kitchen staff | `kitchen@islamabadrestaurant.pk` | `Staff@1234` |
| Customer | `ayesha@example.com` | `Customer@1234` |

---

## What's in the box

### Customer

| Route | Purpose |
| --- | --- |
| `/` | Hero, signature dishes, live offers, story, reviews, chefs, gallery, map |
| `/menu` · `/menu/[slug]` | 39 dishes, search, category/price/spice/allergen filters, nutrition |
| `/order` | Delivery / pickup / dine-in browser with a live server-priced basket |
| `/checkout` | Coupons, point redemption, five payment methods |
| `/track/[token]` | Six-stage live order tracking, no login required |
| `/reservations` | Live availability against the real 42-table floor plan |
| `/dashboard/*` | Orders, reservations, loyalty, addresses, gift cards, settings |
| `/events` · `/gift-cards` · `/offers` | Private dining enquiries, gift cards, live coupons |
| `/about` · `/gallery` · `/blog` · `/contact` | Brand story, masonry gallery, food journal, contact |

### Admin (`/admin`, role-gated)

Analytics with revenue charts and daily/weekly/monthly/annual reports · order
management · a live **kitchen display board** · reservation book with a month heat-map ·
menu CRUD with one-tap 86'ing · customer records · coupons and email campaigns ·
unified inbox · staff and permissions.

### Platform

- **Auth** — JWT access tokens + rotating refresh tokens, Google/Facebook OAuth,
  bcrypt hashing, four-tier RBAC (`SUPER_ADMIN` → `MANAGER` → `STAFF` → `CUSTOMER`).
- **Ordering** — one authoritative pricing engine shared by client and server, so the
  displayed total can never disagree with the charged total.
- **Reservations** — best-fit table allocation with clash detection, waiting list, and
  automatic promotion when a booking is cancelled.
- **Loyalty** — four tiers, points ledger, referral codes, gift cards.
- **AI concierge** — retrieval-augmented assistant grounded in the live menu and a
  curated knowledge base; answers with real prices and availability.
- **Security** — Helmet, CORS allow-list, CSRF double-submit, per-route rate limiting,
  Zod validation at every boundary, audit log, GDPR cookie consent.
- **SEO** — JSON-LD (Restaurant, Menu, MenuItem, FAQ, Article, Breadcrumb), dynamic
  sitemap, robots, PWA manifest, per-page canonical/OG metadata.

---

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | API + web with hot reload |
| `npm run build` | Production build of both apps |
| `npm start` | Run the production builds |
| `npm test` | Full suite — 191 tests |
| `npm run test:coverage` | API coverage report (gate: 70%) |
| `npm run typecheck` | TypeScript, both apps |
| `npm run db:push` | Apply the schema |
| `npm run db:seed` | Reset and reseed |
| `npm run db:reset` | Drop, recreate, reseed |

---

## Architecture

```
apps/
  web/                  Next.js 16 App Router
    src/app/            routes (RSC by default)
    src/components/     ui · layout · home · menu · commerce · admin · dashboard
    src/lib/            api client · seo · fonts · utils
    src/store/          zustand (cart, auth)
  api/                  Express 5
    src/routes/         auth · menu · orders · reservations · admin · marketing
                        assistant · customer · webhooks
    src/services/       orders · payments · assistant · audit
    src/lib/            prisma · cache · auth · env · bootstrap
    prisma/             generated schema + reviewable SQL
packages/
  shared/               brand · types · zod schemas · pricing · reservations · content
scripts/                schema and DDL generators
```

### Single source of truth

Business rules live in `packages/shared` and are imported by **both** apps:

- `pricing.ts` — `quoteOrder()` computes every total. The cart, the checkout and the
  API all call the same function.
- `reservations.ts` — the floor plan and `allocateTable()`. The availability endpoint
  and the booking endpoint cannot disagree about what is free.
- `schemas.ts` — Zod schemas validate on the client for instant feedback and again on
  the server as the security boundary.

### Database

`scripts/schema.models.prisma` is the source of truth. Two generators derive everything:

```
schema.models.prisma ──► gen-schema.mjs ──► prisma/schema.prisma  (provider-aware)
                     └─► gen-sql.mjs    ──► prisma/sql/postgresql.sql
                                            prisma/sql/sqlite.sql
```

22 models: users, sessions, addresses, categories, menu items, orders, order items,
order events, payments, tables, reservations, coupons, subscribers, campaigns, contact
messages, notifications, points ledger, gift cards, event enquiries, reviews, audit log,
settings.

### Zero-dependency development

Production runs PostgreSQL and Redis. Locally, both are optional:

| Concern | Production | Local fallback |
| --- | --- | --- |
| Database | PostgreSQL via `@prisma/adapter-pg` | SQLite via `@prisma/adapter-libsql` |
| Cache | Redis via `ioredis` | In-process TTL map |
| Payments | Stripe / PayPal live keys | Sandbox intents, full flow still exercisable |

The fallback is chosen from `DATABASE_URL` and `REDIS_URL` at boot — no code branches in
route handlers. Set a `postgres://` URL and the same schema, queries and tests run
against PostgreSQL unchanged.

> **Note on migrations.** Prisma 7 runs queries through a WASM query compiler and driver
> adapters, so no engine binary is needed at runtime. `prisma migrate` does still shell
> out to a downloaded binary, which some CI and sandboxed environments cannot reach, so
> schema changes are applied with `npm run db:push` — it executes the reviewable SQL
> committed under `apps/api/prisma/sql/`. Run `npm run db:schema` after editing the
> models to regenerate both dialects.

---

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/API.md`](docs/API.md) | Every endpoint, payload, and error code |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel + AWS EC2 + RDS + S3, CI/CD, monitoring |
| [`docs/ADMIN-MANUAL.md`](docs/ADMIN-MANUAL.md) | Day-to-day operation for restaurant staff |
| [`docs/USER-MANUAL.md`](docs/USER-MANUAL.md) | Customer-facing guide |
| [`docs/BRAND-STRATEGY.md`](docs/BRAND-STRATEGY.md) | Phase 1 research: personas, competitors, positioning |

---

## Testing

```bash
npm test                 # 191 tests
npm run test:coverage    # API coverage, 70% gate
```

| Suite | Tests | Covers |
| --- | --- | --- |
| `api/tests/pricing` | 18 | Totals, coupons, caps, tax base, loyalty tiers |
| `api/tests/reservations` | 14 | Slot generation, best-fit allocation, clash detection |
| `api/tests/api` | 84 | Every route: auth, menu, orders, bookings, admin, security |
| `api/tests/services` | 28 | Payments, cache, JSON helpers, token generation |
| `api/tests/customer` | 20 | Dashboard, addresses, password change, webhooks |
| `web/tests/*` | 27 | Cart store, formatting and utility functions |

Security cases are explicit: SQL-injection attempts through query parameters, XSS
payloads in free text, password-hash leakage, user enumeration on login, rate limiting,
and cross-tenant access to another customer's address.

---

## Environment

`apps/api/.env` (see `.env.example`):

```ini
DATABASE_URL="postgresql://user:pass@host:5432/islamabad?schema=public"
JWT_ACCESS_SECRET="<64 random bytes>"
JWT_REFRESH_SECRET="<64 random bytes>"
WEB_ORIGIN="https://islamabadrestaurant.pk"
REDIS_URL="redis://…"          # optional
STRIPE_SECRET_KEY="sk_live_…"  # optional
PAYPAL_CLIENT_ID="…"           # optional
```

`apps/web/.env.local`:

```ini
API_ORIGIN=http://127.0.0.1:4000
NEXT_PUBLIC_SITE_URL=https://islamabadrestaurant.pk
```

The API refuses to boot in production with the default JWT secrets.

---

## Legacy site

The previous static HTML site is preserved under `legacy/` for reference.
