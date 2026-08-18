# Codebase Audit

Full scan of the existing platform before this round of work. Findings are grouped by
severity, and every item is either fixed in this pass or explicitly deferred with a
reason.

**Audit date:** 18 August 2026
**Baseline:** 191 tests passing · 0 TypeScript errors · production build clean

---

## 1. Inventory

| Area | Files | Lines |
| --- | ---: | ---: |
| `apps/web/src` | 79 | 11,168 |
| `apps/api/src` | 22 | 3,996 |
| `packages/shared/src` | 7 | 1,077 |
| `docs` | 5 | 1,311 |
| `scripts` | 4 | 745 |

- **35 web routes**, **84 API endpoints**, **22 database models**
- Stack: Next.js 16 (App Router, React 19), Express 5, Prisma 7, Tailwind v4,
  Zustand, TanStack Query, Zod, Framer Motion, Recharts

### Dependency review

No unused or duplicated runtime dependencies. No known-vulnerable packages in the
production tree. `recharts@2` prints a deprecation notice (v3 is current) — deferred,
because the v3 migration changes the chart API surface and the current version is
stable and unaffected by any advisory.

---

## 2. Findings

### 🔴 Critical — missing features for a real client

| # | Finding | Impact | Status |
| --- | --- | --- | --- |
| C1 | **No password reset.** A customer who forgets their password is permanently locked out; support has no recovery path. | Blocks launch | ✅ Fixed |
| C2 | **No email verification.** Any address can be typed at signup, so order confirmations may go nowhere. | Blocks launch | ✅ Fixed |
| C3 | **No email system at all.** No welcome, order confirmation, reservation confirmation, password reset or promotional email. The spec requires five templates. | Blocks launch | ✅ Fixed |
| C4 | **No refund capability.** Orders can be cancelled but money cannot be returned; `Payment.status` has a `REFUNDED` value that nothing ever sets. | Blocks launch | ✅ Fixed |
| C5 | **Reservations auto-confirm.** The spec requires admin approve/reject. Bookings jumped straight to `CONFIRMED`, so staff could not decline a booking they cannot honour. | Operational | ✅ Fixed |

### 🟠 High — required by spec, absent

| # | Finding | Status |
| --- | --- | --- |
| H1 | No dish customization (size, spice, add-ons). Ordering a "large, extra spicy" biryani was impossible. | ✅ Fixed |
| H2 | No category management UI. The API exposed category CRUD; the admin console never surfaced it. | ✅ Fixed |
| H3 | No review moderation UI. `PATCH /reviews/:id/approve` existed but was unreachable, so reviews were written and never published. | ✅ Fixed |
| H4 | No customer-facing coupons page, despite being listed in the dashboard spec. | ✅ Fixed |
| H5 | No push notifications. | ✅ Fixed (Web Push, VAPID) |
| H6 | No restaurant settings module — hours and delivery config were hard-coded constants requiring a redeploy to change. | ✅ Fixed |

### 🟡 Medium — bugs and correctness

| # | Finding | Detail | Status |
| --- | --- | --- | --- |
| M1 | **Reorder adds wrong prices.** `dashboard/orders` spread a reorder line into `add()` casting through `unknown`; the cart stored the *historical* price, so a price rise was silently absorbed. | Revenue leak | ✅ Fixed |
| M2 | **Order notes never reached the kitchen.** `POST /orders` accepted `notes` and persisted it, but the kitchen board read `order.notes` from a type that omitted it — the field was rendered but the API response shape excluded it. | Wrong food | ✅ Fixed |
| M3 | **`GET /admin/customers/:id` unreachable.** Route defined after a `:id`-shadowing pattern; no UI consumed it. | Dead code | ✅ Fixed |
| M4 | **Coupon `perUserLimit` unenforceable for guests.** Guest checkout bypasses the per-user check entirely (no `userId`). | Abuse vector | ✅ Fixed |
| M5 | **No pagination on several admin lists.** `/admin/messages`, `/admin/enquiries`, `/admin/audit` and `/api/marketing/reviews` used bare `take:` caps with no page metadata. | Scale | ✅ Fixed |
| M6 | Gift-card redemption is not wired into checkout — the redeem endpoint exists but no order can consume a card. | Incomplete | ✅ Fixed |

### 🔵 Low — quality, performance, polish

| # | Finding | Status |
| --- | --- | --- |
| L1 | Hero image is 1.6 MB unoptimised JPEG source; no explicit `sizes` on several grid images. | ✅ Fixed |
| L2 | No `loading.tsx` or `error.tsx` boundaries — a slow API showed a blank screen, and a thrown error showed the Next.js default. | ✅ Fixed |
| L3 | Admin tables are not keyboard-navigable to the same standard as the storefront; some icon-only buttons lacked discernible names. | ✅ Fixed |
| L4 | No `<noscript>` path and no skip-link on admin. | ✅ Fixed |
| L5 | Recharts (~90 KB) is imported directly into the admin overview, inflating its first load. | ✅ Fixed (dynamic import) |
| L6 | No database indexes on `Order.trackingToken` lookups by `zoneId`, or `MenuItem.slug` ordering paths. | ✅ Fixed |

### ✅ Verified sound — no change needed

- **Pricing engine.** Single authoritative `quoteOrder()` shared by client and server;
  client prices are never trusted. 18 dedicated tests.
- **Order state machine.** Illegal transitions rejected with 409; loyalty credited on
  delivery, redeemed points refunded on cancellation.
- **Reservation allocation.** Best-fit with clash detection over real dining windows;
  waitlist promotion on cancellation.
- **Security posture.** Helmet, CORS allow-list, CSRF double-submit, per-route rate
  limits, Zod at every boundary, bcrypt cost 12, rotating refresh tokens, audit log.
  Explicit tests for SQL injection, XSS, hash leakage and user enumeration.
- **SEO.** Restaurant/Menu/MenuItem/FAQ/Article/Breadcrumb JSON-LD, dynamic sitemap,
  robots, canonical + OG + Twitter on every page.

---

## 3. What this pass delivers

1. Transactional email system with five responsive templates
2. Password reset and email verification flows
3. Refunds, including gateway calls and loyalty reversal
4. Reservation approval workflow (pending → approved/rejected)
5. Dish customization (options, add-ons, priced modifiers)
6. Web Push notifications
7. Restaurant settings module (hours, delivery, toggles) — no redeploy to change
8. Admin: categories, review moderation, settings, customer detail
9. Customer: coupons page, gift-card redemption at checkout
10. All medium bugs fixed, pagination standardised, indexes added
11. Loading/error boundaries, accessibility fixes, bundle reduction

---

## 4. Deferred, with reasons

| Item | Reason |
| --- | --- |
| Recharts v3 upgrade | Breaking API change; current version is stable and not subject to any advisory. Worth doing in a dedicated pass. |
| Real SMTP delivery | Requires client credentials. The mailer is fully implemented with a pluggable transport and logs rendered HTML in development; set `SMTP_URL` to go live. |
| Live Stripe/PayPal keys | Client-supplied. Sandbox path exercises the full flow. |
| Lighthouse audit | Chromium cannot be downloaded in this sandbox. Build is optimised for it; verify on the first real deployment. |
