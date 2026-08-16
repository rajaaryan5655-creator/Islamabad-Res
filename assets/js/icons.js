/* Inline SVG icon set — no external icon font dependency. */
(function () {
  const s = (p, extra = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${p}</svg>`;

  const ICONS = {
    chef: `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M13 22c-3.6 0-6.5-2.9-6.5-6.5S9.4 9 13 9c.7 0 1.4.1 2 .3C16.2 6.7 19 5 24 5s7.8 1.7 9 4.3c.6-.2 1.3-.3 2-.3 3.6 0 6.5 2.9 6.5 6.5S38.6 22 35 22v4H13v-4Z" fill="currentColor"/>
        <rect x="12" y="27.5" width="24" height="4.5" rx="1.6" fill="currentColor"/>
        <path d="M8 37h32M8 41.5h32" stroke="#c8102e" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    pin: s(`<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>`),
    clock: s(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>`),
    phone: s(`<path d="M4.5 5.5c0-.8.7-1.5 1.5-1.5h2.2c.7 0 1.3.5 1.5 1.1l.8 3c.1.6-.1 1.2-.6 1.5l-1.4 1a12.5 12.5 0 0 0 5.4 5.4l1-1.4c.4-.5 1-.7 1.6-.6l3 .8c.6.2 1.1.8 1.1 1.5V18c0 .8-.7 1.5-1.5 1.5C10.5 19.5 4.5 13.5 4.5 5.5Z"/>`),
    mail: s(`<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.8 7 7.3 5.3c.5.4 1.3.4 1.8 0L20.2 7"/>`),
    cart: s(`<circle cx="9.5" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h2.6l2.4 11.2c.1.7.7 1.1 1.4 1.1h9.1c.7 0 1.3-.4 1.4-1.1L21 7.3H6.1"/>`),
    burger: s(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
    up: s(`<path d="M12 19V6M6 11.5 12 5.5l6 6"/>`),
    dinein: s(`<path d="M6 3v8a2.5 2.5 0 0 0 5 0V3M8.5 11v10"/><path d="M17.5 3c-1.7 1.4-2.5 3.4-2.5 5.6 0 1.8.9 2.9 2.5 3.1V21"/>`),
    car: s(`<path d="M4 16v-3l1.9-4.4A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.8 1.2L20 13v3"/><path d="M3 16h18"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/><path d="M5.5 12.5h13"/>`),
    delivery: s(`<rect x="3" y="7" width="10" height="8" rx="1.6"/><path d="M13 10h3.6l3.4 3.2V15h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>`),
    scooter: s(`<circle cx="6" cy="17.5" r="2.4"/><circle cx="18" cy="17.5" r="2.4"/><path d="M8.4 17.5h7.2M15.6 17.5 13 8h-2.4M13 8h4.2l2.3 6"/><path d="M5.5 12h4"/>`),
    award: s(`<circle cx="12" cy="9.5" r="5.2"/><path d="m8.6 14 -1.3 6.4 4.7-2.4 4.7 2.4L15.4 14"/><path d="m12 6.9.9 1.9 2 .3-1.5 1.5.4 2.1-1.8-1-1.8 1 .4-2.1L9.1 9.1l2-.3z" stroke-width="1.2"/>`),
    card: s(`<rect x="2.8" y="5" width="18.4" height="14" rx="2.4"/><path d="M2.8 9.8h18.4M6.5 14.8h4"/>`),
    support: s(`<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="2.6" y="13.4" width="4" height="5.6" rx="1.8"/><rect x="17.4" y="13.4" width="4" height="5.6" rx="1.8"/><path d="M19.4 19v.6a2.6 2.6 0 0 1-2.6 2.6h-2"/>`),
    star: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3.4 2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.6l5.9-.9z"/></svg>`,
    'star-big': s(`<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>`),
    users: s(`<circle cx="10" cy="8" r="3.6"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 5.2a3.4 3.4 0 0 1 0 6.6M18.5 20a6.3 6.3 0 0 0-2-4.6"/>`),
    pot: s(`<path d="M4.5 9.5h15v5.7a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4z"/><path d="M3 9.5h18M9 6.4V4.2M12 6.4V3.6M15 6.4V4.2"/>`),
    thumb: s(`<path d="M7 10.5 11 3a2.4 2.4 0 0 1 2.4 2.4V9h4.4a2.2 2.2 0 0 1 2.1 2.8l-1.7 6A2.4 2.4 0 0 1 15.9 20H7"/><rect x="3" y="10.5" width="4" height="9.5" rx="1.4"/>`),
    plus: s(`<path d="M12 5.5v13M5.5 12h13"/>`, 'stroke-width="2.4"'),
    leaf: s(`<path d="M20 4c0 9-5 13-11 13H5c0-8 5.5-12 11-12 1.6 0 4 -1 4-1Z"/><path d="M5 20c1.5-5 4.5-8 9-10"/>`),
    'chef-hat': s(`<path d="M7 14c-2.2 0-4-1.8-4-4s1.8-4 4-4c.9-2 2.6-3 5-3s4.1 1 5 3c2.2 0 4 1.8 4 4s-1.8 4-4 4"/><path d="M7 14h10v5.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5z"/>`),
    clean: s(`<path d="M12 3.2 19.5 6v5.5c0 4.4-3.1 8.1-7.5 9.3-4.4-1.2-7.5-4.9-7.5-9.3V6z"/><path d="m9 12 2.2 2.3L15.4 10"/>`),
    ambience: s(`<path d="M12 3.5c3 2.4 4.6 4.7 4.6 7a4.6 4.6 0 1 1-9.2 0c0-2.3 1.6-4.6 4.6-7Z"/><path d="M12 20.5v-3"/>`),
    sep: `<svg viewBox="0 0 90 14" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
        <path d="M2 7h30M58 7h30"/><path d="m45 1.5 3.4 4L45 12.5 41.6 5.5z" fill="currentColor" stroke="none"/>
        <circle cx="36" cy="7" r="1.6" fill="currentColor" stroke="none"/><circle cx="54" cy="7" r="1.6" fill="currentColor" stroke="none"/>
      </svg>`,
    fb: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.7v8z"/></svg>`,
    ig: s(`<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none"/>`),
    wa: s(`<path d="M3.8 20.2 5 16.6a7.7 7.7 0 1 1 2.9 2.8z"/><path d="M9 9.4c.4 2.6 2.6 4.8 5.2 5.2.6.1 1.2-.4 1.2-1v-.7l-1.9-.7-.8.9a6.4 6.4 0 0 1-2.3-2.3l.9-.8-.7-1.9h-.7c-.6 0-1.1.6-.9 1.3Z" stroke-width="1.2"/>`),
    yt: s(`<rect x="2.8" y="5.5" width="18.4" height="13" rx="4"/><path d="m10.4 9.6 4.8 2.4-4.8 2.4z" fill="currentColor" stroke="none"/>`)
  };

  window.ICONS = ICONS;
  window.renderIcons = function (root = document) {
    root.querySelectorAll('[data-icon]').forEach((el) => {
      const name = el.getAttribute('data-icon');
      if (ICONS[name] && !el.dataset.rendered) {
        el.innerHTML = ICONS[name];
        el.dataset.rendered = '1';
      }
    });
  };
})();
