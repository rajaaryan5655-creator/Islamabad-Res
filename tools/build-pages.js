/* Generates inner pages from index.html's header/footer so the chrome stays identical. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const headStart = index.indexOf('<body>');
const mainStart = index.indexOf('<main>');
const mainEnd = index.indexOf('</main>') + '</main>'.length;

const top = index.slice(0, mainStart);          // doctype + head + header + drawer
const bottom = index.slice(mainEnd);            // footer + scripts

function setActive(html, label) {
  return html
    .replace(/ class="active"/g, '')
    .replace(new RegExp(`(<a href="[^"]+"[^>]*)(>${label}</a>)`, 'g'), '$1 class="active"$2');
}
function setTitle(html, title, desc) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(">)/, `$1${desc}$2`);
}

const banner = (h1, crumb) => `
  <section class="page-banner">
    <img src="assets/img/banner-spices.jpg" alt="">
    <div class="container">
      <h1>${h1}</h1>
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="index.html">Home</a><span class="sep">&rsaquo;</span><span class="current">${crumb}</span>
      </nav>
    </div>
  </section>`;

const pages = {
  'menu.html': {
    title: 'Our Menu — Islamabad Restaurant',
    desc: 'Browse our full menu: biryani, BBQ, karahi, fast food, Chinese, drinks and desserts.',
    active: 'Menu',
    main: `<main>
  ${banner('OUR MENU', 'Menu')}
  <section class="section">
    <div class="container">
      <div class="filters" id="menuFilters"></div>
      <div class="menu-grid" id="menuGrid"></div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="container">
      <div class="stats reveal">
        <div class="stats__grid">
          <div class="stat"><span class="stat__icon" data-icon="users"></span><div><div class="stat__num" data-count="688" data-suffix="+">0</div><div class="stat__label">Happy Customers</div></div></div>
          <div class="stat"><span class="stat__icon" data-icon="star-big"></span><div><div class="stat__num" data-count="4.3" data-decimals="1">0</div><div class="stat__label">Average Rating</div></div></div>
          <div class="stat"><span class="stat__icon" data-icon="pot"></span><div><div class="stat__num" data-count="20" data-suffix="+">0</div><div class="stat__label">Delicious Items</div></div></div>
          <div class="stat"><span class="stat__icon" data-icon="thumb"></span><div><div class="stat__num" data-count="100" data-suffix="%">0</div><div class="stat__label">Quality Food</div></div></div>
        </div>
      </div>
    </div>
  </section>
</main>`
  },

  'about.html': {
    title: 'About Us — Islamabad Restaurant',
    desc: 'Our story, mission and quality standards — authentic Pakistani cuisine served since 2015.',
    active: 'About Us',
    main: `<main>
  ${banner('ABOUT US', 'About Us')}
  <section class="section">
    <div class="container">
      <div class="about-grid">
        <div class="about-media reveal">
          <img src="assets/img/restaurant-building.svg" alt="Islamabad Restaurant building at night">
        </div>
        <div class="about-body reveal" data-delay="120">
          <p class="script">Our Story</p>
          <h2>Islamabad Restaurant</h2>
          <p>Islamabad Restaurant was founded with a simple mission: to serve delicious, high-quality food in a warm and welcoming environment.</p>
          <p>We combine traditional Pakistani flavors with modern cooking techniques to deliver an unforgettable dining experience.</p>
          <div class="about-features">
            <div class="about-feature"><span class="about-feature__icon" data-icon="leaf"></span><p>Quality Ingredients</p></div>
            <div class="about-feature"><span class="about-feature__icon" data-icon="chef-hat"></span><p>Expert Chef</p></div>
            <div class="about-feature"><span class="about-feature__icon" data-icon="clean"></span><p>Hygienic Kitchen</p></div>
            <div class="about-feature"><span class="about-feature__icon" data-icon="ambience"></span><p>Great Ambiance</p></div>
          </div>
        </div>
      </div>

      <div class="stats reveal" style="margin-top:46px">
        <div class="stats__grid">
          <div class="stat"><div style="text-align:center"><div class="stat__num" data-count="10" data-suffix="+">0</div><div class="stat__label">Years Experience</div></div></div>
          <div class="stat"><div style="text-align:center"><div class="stat__num" data-count="50" data-suffix="+">0</div><div class="stat__label">Menu Items</div></div></div>
          <div class="stat"><div style="text-align:center"><div class="stat__num" data-count="100" data-suffix="%">0</div><div class="stat__label">Customer Satisfaction</div></div></div>
          <div class="stat"><div style="text-align:center"><div class="stat__num" data-count="688" data-suffix="+">0</div><div class="stat__label">Happy Customers</div></div></div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" style="background:var(--bg-soft);padding-top:0;padding-bottom:62px">
    <div class="container" style="padding-top:62px">
      <header class="section-head reveal">
        <p class="section-head__script">Why Choose Us</p>
        <h2 class="section-head__title">Our Promise</h2>
        <span class="section-head__sep" data-icon="sep"></span>
      </header>
      <div class="features__grid">
        <article class="feature-card reveal"><span class="feature-card__icon" data-icon="scooter"></span><div><h3>Fast Delivery</h3><p>On time, every time</p></div></article>
        <article class="feature-card reveal" data-delay="90"><span class="feature-card__icon" data-icon="award"></span><div><h3>Best Quality</h3><p>100% quality food</p></div></article>
        <article class="feature-card reveal" data-delay="180"><span class="feature-card__icon" data-icon="card"></span><div><h3>Easy Payment</h3><p>Cash or online</p></div></article>
        <article class="feature-card reveal" data-delay="270"><span class="feature-card__icon" data-icon="support"></span><div><h3>24/7 Support</h3><p>Always here to help</p></div></article>
      </div>
    </div>
  </section>
</main>`
  },

  'reservation.html': {
    title: 'Reservation — Islamabad Restaurant',
    desc: 'Book a table at Islamabad Restaurant — Margalla Town, Islamabad. Open 11:00 AM to 11:00 PM.',
    active: 'Reservation',
    main: `<main>
  ${banner('BOOK A TABLE', 'Reservation')}
  <section class="section">
    <div class="container">
      <div class="contact-grid">
        <div>
          <p class="section-head__script" style="text-align:left">Reserve Your Seat</p>
          <h2 class="section-head__title" style="text-align:left">Dine With Us</h2>
          <p style="color:#5c5c5c;font-size:14px;margin-top:14px">Planning a family dinner, a business lunch or a celebration? Reserve your table and our team will confirm your booking by phone within 15 minutes.</p>
          <div class="contact-info" style="margin-top:24px">
            <div class="contact-tile"><span class="contact-tile__icon" data-icon="clock"></span><div><h3>Opening Hours</h3><p>Every day · 11:00 AM – 11:00 PM</p></div></div>
            <div class="contact-tile"><span class="contact-tile__icon" data-icon="phone"></span><div><h3>Call to Book</h3><p>+92 306 4650507</p></div></div>
            <div class="contact-tile"><span class="contact-tile__icon" data-icon="pin"></span><div><h3>Location</h3><p>Margalla Town, Islamabad</p></div></div>
          </div>
        </div>

        <form class="form-card reveal" data-demo="Thank you! Your table request has been received.">
          <div class="grid-2">
            <div class="field"><label for="r-name">Full Name</label><input id="r-name" required placeholder="Your name"></div>
            <div class="field"><label for="r-phone">Phone</label><input id="r-phone" type="tel" required placeholder="+92 3xx xxxxxxx"></div>
            <div class="field"><label for="r-date">Date</label><input id="r-date" type="date" required></div>
            <div class="field"><label for="r-time">Time</label><input id="r-time" type="time" required></div>
            <div class="field"><label for="r-guests">Guests</label>
              <select id="r-guests"><option>1–2 people</option><option>3–4 people</option><option>5–8 people</option><option>9+ people</option></select>
            </div>
            <div class="field"><label for="r-area">Seating</label>
              <select id="r-area"><option>Indoor</option><option>Outdoor</option><option>Family Hall</option><option>Private Cabin</option></select>
            </div>
          </div>
          <div class="field"><label for="r-note">Special Request</label><textarea id="r-note" rows="4" placeholder="Birthday setup, high chair, allergies…"></textarea></div>
          <button class="btn btn--red" style="width:100%" type="submit">Confirm Reservation</button>
        </form>
      </div>
    </div>
  </section>
</main>`
  },

  'gallery.html': {
    title: 'Gallery — Islamabad Restaurant',
    desc: 'A look at our signature dishes, kitchen and dining ambience.',
    active: 'Gallery',
    main: `<main>
  ${banner('GALLERY', 'Gallery')}
  <section class="section">
    <div class="container">
      <header class="section-head reveal">
        <p class="section-head__script">A Feast For The Eyes</p>
        <h2 class="section-head__title">Our Gallery</h2>
        <span class="section-head__sep" data-icon="sep"></span>
      </header>
      <div class="gallery-grid">
        <figure class="reveal tall"><img src="assets/img/dish-chicken-biryani.jpg" alt="Chicken Biryani" loading="lazy"><figcaption>Chicken Biryani</figcaption></figure>
        <figure class="reveal" data-delay="60"><img src="assets/img/dish-mix-grill.jpg" alt="Mix Grill Platter" loading="lazy"><figcaption>Mix Grill Platter</figcaption></figure>
        <figure class="reveal" data-delay="120"><img src="assets/img/dish-mutton-karahi.jpg" alt="Mutton Karahi" loading="lazy"><figcaption>Mutton Karahi</figcaption></figure>
        <figure class="reveal tall" data-delay="180"><img src="assets/img/dish-chicken-handi.jpg" alt="Chicken Handi" loading="lazy"><figcaption>Chicken Handi</figcaption></figure>
        <figure class="reveal" data-delay="60"><img src="assets/img/dish-chicken-tikka.jpg" alt="Chicken Tikka" loading="lazy"><figcaption>Chicken Tikka</figcaption></figure>
        <figure class="reveal" data-delay="120"><img src="assets/img/dish-chicken-karahi.jpg" alt="Chicken Karahi" loading="lazy"><figcaption>Chicken Karahi</figcaption></figure>
        <figure class="reveal" data-delay="60"><img src="assets/img/dish-beef-biryani.jpg" alt="Beef Biryani" loading="lazy"><figcaption>Beef Biryani</figcaption></figure>
        <figure class="reveal" data-delay="120"><img src="assets/img/dish-mutton-biryani.jpg" alt="Mutton Biryani" loading="lazy"><figcaption>Mutton Biryani</figcaption></figure>
        <figure class="reveal" data-delay="180"><img src="assets/img/dish-chicken-burger.jpg" alt="Chicken Burger" loading="lazy"><figcaption>Chicken Burger</figcaption></figure>
        <figure class="reveal" data-delay="240"><img src="assets/img/hero-bg.jpg" alt="Signature platter" loading="lazy"><figcaption>Signature Platter</figcaption></figure>
      </div>
    </div>
  </section>
</main>`
  },

  'contact.html': {
    title: 'Contact Us — Islamabad Restaurant',
    desc: 'Get in touch with Islamabad Restaurant — Margalla Town, Islamabad. Call +92 306 4650507.',
    active: 'Contact Us',
    main: `<main>
  ${banner('CONTACT US', 'Contact Us')}
  <section class="section">
    <div class="container">
      <div class="contact-grid">
        <div class="contact-info">
          <div class="contact-tile reveal"><span class="contact-tile__icon" data-icon="pin"></span><div><h3>Visit Us</h3><p>Margalla Town, Islamabad, Pakistan</p></div></div>
          <div class="contact-tile reveal" data-delay="80"><span class="contact-tile__icon" data-icon="phone"></span><div><h3>Call Us</h3><p>+92 306 4650507</p></div></div>
          <div class="contact-tile reveal" data-delay="160"><span class="contact-tile__icon" data-icon="mail"></span><div><h3>Email Us</h3><p>hello@islamabadrestaurant.pk</p></div></div>
          <div class="contact-tile reveal" data-delay="240"><span class="contact-tile__icon" data-icon="clock"></span><div><h3>Opening Hours</h3><p>Every day · 11:00 AM – 11:00 PM</p></div></div>
        </div>

        <form class="form-card reveal" data-demo="Thanks for reaching out! We'll reply shortly.">
          <div class="grid-2">
            <div class="field"><label for="c-name">Full Name</label><input id="c-name" required placeholder="Your name"></div>
            <div class="field"><label for="c-email">Email</label><input id="c-email" type="email" required placeholder="you@email.com"></div>
          </div>
          <div class="field"><label for="c-sub">Subject</label><input id="c-sub" placeholder="How can we help?"></div>
          <div class="field"><label for="c-msg">Message</label><textarea id="c-msg" rows="6" required placeholder="Write your message…"></textarea></div>
          <button class="btn btn--red" style="width:100%" type="submit">Send Message</button>
        </form>
      </div>

      <div class="map-embed reveal" style="margin-top:34px">
        <iframe title="Islamabad Restaurant location" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
          src="https://www.openstreetmap.org/export/embed.html?bbox=73.02%2C33.63%2C73.12%2C33.70&amp;layer=mapnik"></iframe>
      </div>
    </div>
  </section>
</main>`
  }
};

Object.entries(pages).forEach(([file, cfg]) => {
  let html = setTitle(top, cfg.title, cfg.desc);
  html = setActive(html, cfg.active);
  fs.writeFileSync(path.join(root, file), html + cfg.main + bottom, 'utf8');
  console.log('built', file);
});
