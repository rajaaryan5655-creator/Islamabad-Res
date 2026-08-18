/* =====================================================
   Islamabad Restaurant — interactions
   ===================================================== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (n) => 'Rs. ' + n;

  /* ---------- icons ---------- */
  if (window.renderIcons) window.renderIcons();

  /* ---------- sticky header ---------- */
  const header = $('#header');
  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 60);
    const t = $('#toTop');
    if (t) t.classList.toggle('show', window.scrollY > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  $('#toTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- mobile drawer ---------- */
  const nav = $('#mobileNav'), backdrop = $('#backdrop'), burger = $('#burger');
  const setNav = (open) => {
    nav?.classList.toggle('open', open);
    backdrop?.classList.toggle('show', open);
    burger?.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger?.addEventListener('click', () => setNav(true));
  $('#navClose')?.addEventListener('click', () => setNav(false));
  backdrop?.addEventListener('click', () => setNav(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ---------- cart (storage guarded: file:// and private mode can throw) ---------- */
  const store = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v === null ? fb : v; } catch (e) { return fb; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* no-op */ } }
  };
  let cart = Number(store.get('ir_cart', 2));
  const paintCart = () => $$('#cartCount, .cart-count').forEach((n) => (n.textContent = cart));
  paintCart();
  function addToCart(name) {
    cart += 1;
    store.set('ir_cart', cart);
    paintCart();
    toast(name + ' added to your cart');
  }
  $('#cartBtn')?.addEventListener('click', () => toast(cart + ' item(s) in your cart'));

  /* ---------- templates ---------- */
  const starIcon = window.ICONS ? window.ICONS.star : '';
  const plusIcon = window.ICONS ? window.ICONS.plus : '+';

  function foodCard(item, i) {
    return `<article class="food-card reveal" data-delay="${i * 90}">
      <div class="food-card__media">
        <img src="${item.img}" alt="${item.name}" loading="lazy">
        ${item.badge ? `<span class="food-card__badge">${item.badge}</span>` : ''}
      </div>
      <div class="food-card__body">
        <h3>${item.name}</h3>
        <p>${item.short || item.desc}</p>
        <div class="food-card__meta">
          <span class="price">${money(item.price)}</span>
          <span class="rating">${starIcon} ${item.rating}</span>
        </div>
      </div>
    </article>`;
  }

  function menuCard(item, i) {
    return `<article class="menu-card reveal" data-cat="${item.cat}" data-delay="${(i % 6) * 70}">
      <div class="menu-card__media"><img src="${item.img}" alt="${item.name}" loading="lazy"></div>
      <div class="menu-card__body">
        <h3>${item.name}</h3>
        <p>${item.desc}</p>
        <div class="menu-card__foot">
          <span class="price">${money(item.price)}</span>
          <button class="add-btn" data-add="${item.name}" aria-label="Add ${item.name} to cart">${plusIcon}</button>
        </div>
      </div>
    </article>`;
  }

  /* ---------- render best sellers ---------- */
  const bestWrap = $('#bestSellers');
  if (bestWrap && window.MENU) {
    bestWrap.innerHTML = window.MENU.filter((m) => m.best).slice(0, 4).map(foodCard).join('');
  }

  /* ---------- render menu grids + filters ---------- */
  function buildMenu(filtersSel, gridSel, limit) {
    const grid = $(gridSel);
    if (!grid || !window.MENU) return;
    const items = limit ? window.MENU.slice(0, limit) : window.MENU;
    grid.innerHTML = items.map(menuCard).join('');

    const fWrap = $(filtersSel);
    if (fWrap) {
      fWrap.innerHTML = window.CATEGORIES
        .map((c, i) => `<button class="filter-btn${i === 0 ? ' active' : ''}" data-filter="${c}">${c}</button>`)
        .join('');
      fWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        $$('.filter-btn', fWrap).forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        $$('.menu-card', grid).forEach((card) => {
          const show = f === 'All' || card.dataset.cat === f;
          card.classList.toggle('is-hidden', !show);
          if (show) {
            card.style.animation = 'none';
            void card.offsetWidth;
            card.style.animation = 'fadeUp .5s cubic-bezier(.22,.61,.36,1) both';
          }
        });
      });
    }
    if (window.renderIcons) window.renderIcons(grid);
  }

  buildMenu('#homeFilters', '#homeMenu', 9);
  buildMenu('#menuFilters', '#menuGrid');

  /* mobile preview clones (device mockups) */
  const mBest = $('#mobileBest');
  if (mBest && window.MENU) mBest.innerHTML = window.MENU.filter((m) => m.best).slice(0, 2).map(foodCard).join('');

  if (window.renderIcons) window.renderIcons();

  /* ---------- add to cart delegation ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (b) addToCart(b.dataset.add);
  });

  /* ---------- reveal on scroll ---------- */
  const revealables = () => $$('.reveal:not(.in)');
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const d = Number(en.target.dataset.delay || 0);
            setTimeout(() => en.target.classList.add('in'), d);
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px' })
    : null;
  if (io) revealables().forEach((el) => io.observe(el));
  else revealables().forEach((el) => el.classList.add('in'));

  /* ---------- counters ---------- */
  const counters = $$('[data-count]');
  const runCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || '';
    const dur = 1600;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => cio.observe(c));
  } else counters.forEach((c) => (c.textContent = c.dataset.count + (c.dataset.suffix || '')));

  /* ---------- hero parallax ---------- */
  const heroImg = $('.hero__bg img');
  const wide = typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1025px)').matches;
  if (heroImg && wide) {
    window.addEventListener('scroll', () => {
      const y = Math.min(window.scrollY, 700);
      heroImg.style.transform = `scale(1.06) translateY(${y * 0.06}px)`;
    }, { passive: true });
  }

  /* ---------- footer year ---------- */
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- simple form handling ---------- */
  $$('form[data-demo]').forEach((f) => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      toast(f.dataset.demo);
      f.reset();
    });
  });
})();
