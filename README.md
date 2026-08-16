# Islamabad Restaurant — Premium Dark Luxury Website

A production-ready, fully responsive restaurant website UI built to match the reference design:
dark luxury theme, premium Pakistani food branding, and a conversion-optimized ordering flow.

## Live preview

```bash
npx serve -l tcp://0.0.0.0:3000 .
# open http://localhost:3000
```

No build step, no framework — plain HTML, CSS and vanilla JS.

## Pages

| File | Contents |
| --- | --- |
| `index.html` | Hero, feature cards, Best Sellers, stats counter, menu preview + filters, about preview + stats |
| `menu.html` | Dark banner, 8 category filters, 18 menu cards with add-to-cart, stats bar |
| `about.html` | Story, mission, quality standards, bottom stats, promise cards |
| `reservation.html` | Book-a-table form with validation + contact tiles |
| `gallery.html` | Masonry-style dish gallery with hover zoom |
| `contact.html` | Contact tiles, message form, embedded map |

Inner pages are generated from `index.html`'s header/footer via `node tools/build-pages.js`,
so the navigation chrome can never drift between pages. Edit the header in `index.html`,
re-run the script, and all pages update.

## Structure

```
index.html, menu.html, about.html, reservation.html, gallery.html, contact.html
assets/
  css/style.css      design tokens + all components + responsive rules
  js/icons.js        inline SVG icon set (no icon-font dependency)
  js/data.js         menu items & categories — single source of truth
  js/main.js         header, drawer, filters, cart, counters, reveals
  img/               original food photography + SVG facade/favicon
tools/build-pages.js page generator
```

## Design tokens

| Token | Value | Use |
| --- | --- | --- |
| `--black` | `#0a0a0a` | header, hero, banners |
| `--charcoal` | `#111111` | footer, dark surfaces |
| `--red` | `#c8102e` | primary CTA, prices, accents |
| `--gold` | `#f4b400` | script headings, icons, secondary CTA |
| `--white` | `#ffffff` | cards, body background |

Typography: **Montserrat** (display/headings), **Poppins** (body/UI), **Dancing Script** (script accents).

## Features

- **Sticky header** — transparent over the hero, solid `#0a0a0a` on scroll; the top info bar
  collapses smoothly to keep the viewport tall.
- **Category filtering** — client-side, animated, shared by the home preview and full menu.
- **Cart counter** — persists via `localStorage`, guarded so it also works from `file://`.
- **Animated stat counters** — eased count-up triggered by `IntersectionObserver`.
- **Scroll reveals** — staggered fade/slide-up with per-element delays.
- **Hero parallax** — subtle, desktop-only.
- **Accessibility** — semantic landmarks, `aria-label`s on icon buttons, keyboard-dismissible
  drawer (Esc), visible focus rings on form fields, and full `prefers-reduced-motion` support.

## Responsive breakpoints

| Range | Behaviour |
| --- | --- |
| ≥1025px | 4-up feature/food grids, 3-up menu grid, full nav |
| 701–1024px | Hamburger drawer, 2-up grids |
| ≤700px | Single column, stacked full-width CTAs, 2-up stats |

## Assets

All food photography and the restaurant facade are original generated assets committed under
`assets/img/` — no third-party stock images or licensing constraints.
