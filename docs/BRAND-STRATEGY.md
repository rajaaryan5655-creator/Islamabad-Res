# Brand & Digital Strategy

Phase 1 research underpinning every design and engineering decision in this platform.
The findings here are not decoration — each one is encoded in `packages/shared` and
shipped as working behaviour.

---

## 1. Brand identity

**Islamabad Restaurant** · Plot 14, Main Margalla Road, Margalla Town, Islamabad
Founded 1998 · 260 covers · 3 halls · 2 private rooms

### The story

> Islamabad Restaurant began in 1998 as a nine-table dhaba on the old Margalla Road,
> where Haji Abdul Rahman cooked a single degh of chicken biryani each morning and
> closed when it ran out. Twenty-seven years later the degh has become a 260-cover
> dining room, a live BBQ counter, and a delivery kitchen serving the twin cities — but
> the rule has not changed: nothing is reheated, nothing is frozen, and the kitchen
> closes when the last order is served, not before.

### Mission

To serve the honest, fire-cooked food of Pakistan — sourced daily, cooked to order, and
delivered with the hospitality of a Punjabi household.

### Vision

To become the most trusted premium Pakistani dining brand in the twin cities, and to
carry that kitchen to every major city in Pakistan by 2030.

### Unique selling points

1. Charcoal-fired BBQ counter visible from the dining floor
2. Meat sourced daily from the Bhara Kahu abattoir — never frozen
3. Degh-cooked biryani in limited batches, three times a day
4. A 27-year-old family masala recipe, ground in-house every week
5. No-contact delivery across the twin cities within 45 minutes

Note the shape of these: each is a *verifiable operational fact*, not an adjective.
"Never frozen" is checkable. "Best food in Islamabad" is not. The website therefore
argues with specifics — 5 AM at the abattoir, 20% fat in the seekh mince, 40 minutes of
dum — rather than superlatives.

---

## 2. Design language

### Colour

| Token | Hex | Role |
| --- | --- | --- |
| Obsidian | `#0a0a0a` | Primary surface — headers, hero, footer |
| Charcoal | `#121212` | Secondary dark surfaces, admin console |
| Ember | `#c8102e` | Primary action, prices, live indicators |
| Saffron | `#f4b400` | Accents, script headings, loyalty |
| Cream | `#f7f3ec` | Page background — warmer than white |

Dark-first, because food photography reads richer against black and because the room
itself is dark wood and brass. Ember red is used sparingly and *only* for things that are
actionable or urgent; saffron carries warmth and premium signalling.

### Typography

| Face | Use | Why |
| --- | --- | --- |
| **Cormorant Garamond** | Display, headings | High-contrast serif; editorial, not corporate |
| **Inter** | Body, UI | Excellent at small sizes, wide weight range |
| **Dancing Script** | Accents only | Human warmth against the geometry |

Self-hosted (176 KB, Latin subsets only) — no third-party DNS on the critical path, no
GDPR exposure from Google Fonts.

### Motion

Scroll reveals, hover lifts, hero parallax, staggered grids, page transitions. Every
animation respects `prefers-reduced-motion`, and `.reveal` elements are **visible by
default** — the animation removes and re-adds opacity, so crawlers and no-JS users see
complete content.

---

## 3. Customer personas

Derived from the restaurant's actual mix. Each drove specific features.

| Persona | Share | Core need | What we built |
| --- | :---: | --- | --- |
| **Family diners** — Ayesha & Bilal, 32–45 | 34% | A 6-seater on Friday, kid-friendly food, a predictable bill | Guest-count-aware availability, family platters, transparent pricing on every card |
| **Delivery-first** — Faisal, 24–40, G-11 | 20% | Hot food in 45 min, visibility, no re-typing the address | Six-state live tracking, saved address book, one-tap reorder, per-item kitchen notes |
| **Corporate** — Hamza, 28–50, Blue Area | 18% | A private room within 24 h, a GST invoice | Events enquiry pipeline, private dining pages, tax broken out on every receipt |
| **Students** — Zainab, 18–24, NUST | 16% | Value under Rs. 800, fast mobile, hostel delivery | Student and happy-hour coupons, sub-2s mobile loads, cash on delivery |
| **Tourists** — Sofia, 25–55 | 12% | Allergen clarity, card payment, trust | Allergens/calories/spice on every dish, Stripe + PayPal, schema-rich Google presence |

The personas are shipped as data in `packages/shared/src/content.ts` and rendered on the
About page — the strategy is visible to the client, not buried in a slide deck.

### Customer journey

```
Discover ──► Evaluate ──► Decide ──► Transact ──► Receive ──► Return
Google       Menu with    Reviews    Checkout     Live        Loyalty
Instagram    prices &     Photos     < 90 s       tracking    points
Maps         allergens    Awards                              Reorder
```

Every stage has an owner in the codebase: JSON-LD and local SEO for Discover, the
filterable menu for Evaluate, testimonials and awards for Decide, the server-priced
quote engine for Transact, the tracking page for Receive, and the loyalty programme for
Return.

---

## 4. Competitor analysis

| Competitor | Strengths | Weaknesses | Our edge |
| --- | --- | --- | --- |
| **Monal** (local, hilltop fine dining) | Iconic view, brand recognition, tourist traffic | No online ordering; phone-only reservations; slow site | Full transactional stack — order, reserve, track and pay in under 90 seconds |
| **Kabul Restaurant** (local BBQ) | Strong BBQ reputation, large capacity | Menu is a scanned PDF; no allergen or calorie data; no loyalty | Structured, filterable menu with nutrition; four-tier loyalty programme |
| **Foodpanda / Cheetay** (aggregators) | Reach, familiar tracking UX, payments | 20–30% commission; no customer data; brand invisible | First-party ordering keeps the margin *and* the relationship, with aggregator-grade tracking |
| **Dishoom** (London benchmark) | Editorial storytelling, cohesive art direction | Delivery left to third parties | Match the editorial polish, add the commerce layer |
| **Sketch / Noma** (luxury benchmark) | Immersive motion, premium typography | Poor mobile performance, accessibility gaps | Luxury feel at Lighthouse 95+, mobile-first, reduced-motion safe |

### The strategic conclusion

The aggregator line is the important one. Foodpanda takes 20–30% of every order and owns
the customer relationship — the restaurant never learns who its regulars are. On a
Rs. 2,400 average ticket, first-party ordering returns roughly **Rs. 480–720 per order**
to the business.

That single fact justifies the entire build. Everything else — loyalty, saved addresses,
reorder, tracking — exists to make ordering directly *easier* than ordering through an
aggregator, because convenience is the only reason customers use them.

---

## 5. Business goals and how the platform serves them

| Goal | Mechanism |
| --- | --- |
| Shift delivery from aggregators to first-party | Tracking parity, saved addresses, one-tap reorder, member-only pricing |
| Raise average ticket | AI upsell ("complete your meal"), sharing platters surfaced first, free delivery threshold at Rs. 4,000 |
| Fill off-peak covers | Happy-hour coupon (3–6 PM), student deals, peak-slot marking that nudges to quieter times |
| Grow high-value private events | Dedicated events funnel, one-working-day SLA, pipeline tracking in the admin inbox |
| Increase repeat rate | Four-tier loyalty with escalating earn rates; points expire only after 24 months of inactivity |
| Own the customer relationship | Every order captures a contact; newsletter with explicit consent |
| Reduce phone load on the floor | Self-service bookings, changes and cancellations; AI concierge for routine questions |

---

## 6. Local SEO strategy

**Primary keywords** — restaurant in Islamabad · best biryani Islamabad · BBQ restaurant
Islamabad · Pakistani restaurant Margalla Town · food delivery Islamabad · karahi
Islamabad · family restaurant Islamabad · private dining Islamabad · halal restaurant
Islamabad · iftar buffet Islamabad · wedding catering Islamabad · restaurant near F-10

**Technical foundation**

- `Restaurant` JSON-LD with geo coordinates, opening hours, price range, cuisines,
  aggregate rating, amenities, and `OrderAction` + `ReserveAction`
- `Menu` and `MenuItem` schema with offers and nutrition, so dishes are eligible for
  rich results
- `FAQPage`, `Article` and `BreadcrumbList` schema
- Dynamic sitemap including every dish and article
- Per-page canonical URLs and Open Graph images

**Content strategy** — the journal exists to rank for informational queries that
transactional pages cannot reach ("what is degh biryani", "types of Pakistani BBQ",
"what is Kashmiri chai"). Five long-form pieces written in the restaurant's own voice,
each targeting a keyword cluster and linking back to the relevant menu category.

---

## 7. Success metrics

| Metric | Target |
| --- | --- |
| Lighthouse performance (mobile) | ≥ 95 |
| Largest Contentful Paint | < 2.0 s |
| Checkout completion | > 65% |
| First-party share of delivery | > 40% within 12 months |
| Repeat order rate | > 35% |
| Average ticket | +12% year on year |
| Reservation no-show rate | < 8% |
| Event enquiry response time | < 1 working day |
