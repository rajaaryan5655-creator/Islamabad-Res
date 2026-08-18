/** Editorial + research content (Phase 1 & 10 deliverables) used across the site. */

export interface Persona {
  id: string;
  name: string;
  segment: string;
  share: number;
  age: string;
  goals: string[];
  frustrations: string[];
  journey: string[];
  designResponse: string;
}

export const PERSONAS: Persona[] = [
  {
    id: 'family',
    name: 'Ayesha & Bilal Khan',
    segment: 'Family diners',
    share: 34,
    age: '32–45, two children',
    goals: ['Big-table seating on a Friday night', 'Kid-friendly, less-spicy options', 'Predictable bill under Rs. 6,000'],
    frustrations: ['Waiting 40 minutes for a table with tired children', 'Menus that hide prices', 'No high chairs'],
    journey: ['Google "family restaurant Islamabad"', 'Scan menu & prices', 'Check photos of the hall', 'Book a 6-seater', 'Arrive, pay, collect points'],
    designResponse: 'Guest-count-aware reservation engine, family platters surfaced first, transparent pricing on every card.',
  },
  {
    id: 'corporate',
    name: 'Hamza Sheikh',
    segment: 'Corporate & business',
    share: 18,
    age: '28–50, Blue Area offices',
    goals: ['Private room for 12 within 24 hours', 'A single invoice with GST', 'Punctual lunch service'],
    frustrations: ['Phone-only bookings', 'No private dining information online', 'Slow lunch turnaround'],
    journey: ['Search private dining', 'Submit event enquiry', 'Confirm by email', 'Bulk catering order', 'Request invoice'],
    designResponse: 'Private-events enquiry pipeline, dedicated corporate catering page, order invoices with tax breakdown.',
  },
  {
    id: 'tourist',
    name: 'Sofia Marchetti',
    segment: 'Tourists & visitors',
    share: 12,
    age: '25–55, international',
    goals: ['A safe, authentic Pakistani meal', 'English menu with allergen info', 'Card payment accepted'],
    frustrations: ['Unclear spice levels', 'No allergen labelling', 'Cash-only venues'],
    journey: ['Maps / TripAdvisor', 'Read reviews', 'Open menu with allergens', 'Walk in or reserve', 'Share photos'],
    designResponse: 'Allergen + spice + calorie badges on every dish, Stripe & PayPal checkout, schema-rich Google presence.',
  },
  {
    id: 'student',
    name: 'Zainab Tariq',
    segment: 'Students',
    share: 16,
    age: '18–24, NUST / QAU / Bahria',
    goals: ['Value deals under Rs. 800', 'Fast delivery to hostel', 'Group split orders'],
    frustrations: ['High delivery fees', 'Minimum order thresholds', 'Slow mobile sites'],
    journey: ['Instagram deal post', 'Open offers page', 'Apply coupon', 'Cash on delivery', 'Repeat weekly'],
    designResponse: 'Student & happy-hour coupon engine, sub-2s mobile loads, cash-on-delivery, reorder in one tap.',
  },
  {
    id: 'delivery',
    name: 'Faisal Ahmed',
    segment: 'Delivery-first customers',
    share: 20,
    age: '24–40, F & G sectors',
    goals: ['Hot food in under 45 minutes', 'Live order tracking', 'Saved addresses & one-tap reorder'],
    frustrations: ['No status visibility after ordering', 'Wrong items, no notes support', 'Re-entering the address every time'],
    journey: ['Open site directly', 'Reorder last order', 'Track status', 'Rate & earn points'],
    designResponse: 'Six-state live order tracking, saved address book, per-item kitchen notes, loyalty points on every order.',
  },
];

export interface Competitor {
  name: string;
  type: string;
  strengths: string[];
  weaknesses: string[];
  ourEdge: string;
}

export const COMPETITOR_ANALYSIS: Competitor[] = [
  {
    name: 'Monal Islamabad',
    type: 'Local — hilltop fine dining',
    strengths: ['Iconic view', 'Brand recognition', 'Heavy tourist footfall'],
    weaknesses: ['No online ordering', 'Reservations by phone only', 'Slow, image-heavy website'],
    ourEdge: 'Full transactional stack — order, reserve, track and pay online in under 90 seconds.',
  },
  {
    name: 'Kabul Restaurant',
    type: 'Local — Afghan/Pakistani BBQ',
    strengths: ['Strong BBQ reputation', 'Large capacity'],
    weaknesses: ['Menu is a PDF scan', 'No allergen or calorie data', 'No loyalty programme'],
    ourEdge: 'Structured, searchable, filterable menu with nutrition & allergens, plus a four-tier loyalty programme.',
  },
  {
    name: 'Foodpanda / Cheetay (aggregators)',
    type: 'Delivery marketplace',
    strengths: ['Massive reach', 'Familiar tracking UX', 'Payment options'],
    weaknesses: ['20–30% commission', 'No customer data ownership', 'Brand is invisible'],
    ourEdge: 'First-party ordering keeps the margin and the customer relationship, with aggregator-grade tracking UX.',
  },
  {
    name: 'Dishoom (London)',
    type: 'International benchmark',
    strengths: ['Editorial storytelling', 'Cohesive art direction', 'Waitlist innovation'],
    weaknesses: ['No delivery integration on site'],
    ourEdge: 'Match the editorial polish, add the commerce layer they leave to third parties.',
  },
  {
    name: 'Sketch / Noma (luxury benchmark)',
    type: 'International benchmark',
    strengths: ['Immersive motion design', 'Premium typography', 'Scarcity-driven booking'],
    weaknesses: ['Poor mobile performance', 'Accessibility gaps'],
    ourEdge: 'Luxury feel at Lighthouse 95+, mobile-first, WCAG-conscious, reduced-motion safe.',
  },
];

export interface Chef {
  id: string;
  name: string;
  role: string;
  bio: string;
  years: number;
  specialty: string;
  image: string;
}

export const CHEFS: Chef[] = [
  {
    id: 'rahman',
    name: 'Haji Abdul Rahman',
    role: 'Founder & Master of the Degh',
    bio: 'Started the original nine-table dhaba in 1998 with one degh and one recipe. Still grinds the house masala every Sunday and tastes every batch of biryani before service.',
    years: 27,
    specialty: 'Degh-cooked Sindhi & Chicken Biryani',
    image: '/images/chef-rahman.jpg',
  },
  {
    id: 'imran',
    name: 'Chef Imran Baig',
    role: 'Executive Chef',
    bio: 'Trained at the Serena Islamabad and eight years in Dubai’s Mughlai kitchens. Runs the pass, designs the seasonal menu, and rebuilt the karahi station around a single-batch rule.',
    years: 18,
    specialty: 'Karahi, Handi & slow-braised mutton',
    image: '/images/chef-imran.jpg',
  },
  {
    id: 'sana',
    name: 'Chef Sana Yousaf',
    role: 'Head of Pastry & Desserts',
    bio: 'Pastry diploma from Le Cordon Bleu Bangkok. Brought the kheer and the pistachio-crusted gulab jamun to the menu; her Kashmiri chai service is now a house signature.',
    years: 11,
    specialty: 'Desserts, chai service, plated sweets',
    image: '/images/chef-sana.jpg',
  },
  {
    id: 'usman',
    name: 'Ustad Usman Ali',
    role: 'Head of the Charcoal Counter',
    bio: 'Third-generation BBQ ustad from Rawalpindi’s Saddar bazaar. Twenty-two years over open coals; keeps the seekh kebab mince at a strict 20% fat ratio and never leaves the grill during service.',
    years: 22,
    specialty: 'Seekh kebab, tikka, mix grill',
    image: '/images/chef-usman.jpg',
  },
];

export interface Milestone {
  year: string;
  title: string;
  description: string;
}

export const TIMELINE: Milestone[] = [
  { year: '1998', title: 'A nine-table dhaba', description: 'Haji Abdul Rahman opens on the old Margalla Road with one degh of chicken biryani a day.' },
  { year: '2004', title: 'The charcoal counter', description: 'Ustad Usman joins and the open BBQ counter is built into the dining floor.' },
  { year: '2011', title: 'Margalla Town flagship', description: 'The restaurant moves to a 260-cover building with three halls and two private rooms.' },
  { year: '2016', title: 'Best Biryani in Islamabad', description: 'Awarded by the Islamabad Food Guide for the third consecutive year.' },
  { year: '2020', title: 'Delivery kitchen', description: 'A dedicated dispatch kitchen opens; no-contact delivery launches across the twin cities.' },
  { year: '2023', title: 'Chef’s table', description: 'The Margalla Room opens for private tasting menus and corporate dining.' },
  { year: '2026', title: 'Digital flagship', description: 'First-party ordering, reservations and loyalty go live on this platform.' },
];

export interface Award {
  year: string;
  title: string;
  body: string;
}

export const AWARDS: Award[] = [
  { year: '2025', title: 'Restaurant of the Year — Pakistani Cuisine', body: 'Twin Cities Hospitality Awards' },
  { year: '2024', title: 'Best BBQ Counter', body: 'Islamabad Food Guide' },
  { year: '2023', title: 'Excellence in Food Safety — Grade A', body: 'Islamabad Food Authority' },
  { year: '2022', title: 'Travellers’ Choice', body: 'TripAdvisor' },
  { year: '2016–2019', title: 'Best Biryani in Islamabad', body: 'Islamabad Food Guide (4 consecutive years)' },
];

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  quote: string;
  source: string;
  date: string;
}

export const TESTIMONIALS: Testimonial[] = [
  { id: 't1', name: 'Ayesha Khan', role: 'Regular guest, F-10', rating: 5, source: 'Google', date: '2026-06-14', quote: 'The mutton karahi is the closest thing to my grandmother’s cooking I have found in Islamabad. We book the courtyard every second Friday and it has never once disappointed.' },
  { id: 't2', name: 'Hamza Sheikh', role: 'Director, Blue Area', rating: 5, source: 'Google', date: '2026-05-30', quote: 'We hosted fourteen clients in the Margalla Room. The booking took two minutes online, the invoice arrived with GST, and the food came out hot and together. Rare in this city.' },
  { id: 't3', name: 'Sofia Marchetti', role: 'Visitor from Milan', rating: 5, source: 'TripAdvisor', date: '2026-04-22', quote: 'As a guest with a nut allergy I usually avoid unfamiliar cuisine. Every dish here is labelled, and the manager walked me through the kitchen’s process. Outstanding hospitality.' },
  { id: 't4', name: 'Zainab Tariq', role: 'Student, NUST', rating: 4, source: 'Instagram', date: '2026-06-02', quote: 'Ordered the zinger deal to the hostel at 11pm and it arrived in half an hour, still crisp. The student coupon makes it cheaper than cooking.' },
  { id: 't5', name: 'Faisal Ahmed', role: 'Delivery regular, G-11', rating: 5, source: 'Google', date: '2026-06-19', quote: 'Live tracking that actually works. I can see when the rider leaves the kitchen. Forty minutes door to door, every single time.' },
  { id: 't6', name: 'Dr. Nadia Aslam', role: 'Consultant, PIMS', rating: 5, source: 'Google', date: '2026-03-11', quote: 'The chicken handi is extraordinary and the calorie information on the menu is genuinely useful. I recommend it to patients who ask where they can eat well.' },
];

export interface FaqItem {
  q: string;
  a: string;
  tags: string[];
}

/** Doubles as the AI assistant knowledge base (Phase 13) and the FAQ schema. */
export const FAQS: FaqItem[] = [
  { q: 'What are your opening hours?', a: 'We are open 11:00 AM to 11:00 PM Monday to Thursday and Sunday, and 11:00 AM to midnight on Friday and Saturday. Friday service begins at 2:00 PM after Jummah prayers.', tags: ['hours', 'open', 'timing', 'close'] },
  { q: 'Do you deliver, and how much does it cost?', a: 'Yes. We deliver across Islamabad and Rawalpindi. Delivery is Rs. 99 in Margalla Town and the E-sectors, Rs. 149 in the F and G sectors, and Rs. 249 for Bahria Town, DHA II and Rawalpindi. Delivery is free on orders above Rs. 4,000.', tags: ['delivery', 'charges', 'fee', 'zone', 'area'] },
  { q: 'How long does delivery take?', a: 'Most orders arrive in 30 to 45 minutes. Outer zones such as Bahria Town and Rawalpindi take 45 to 70 minutes. You can watch the live status of your order on the tracking page.', tags: ['delivery', 'time', 'eta', 'how long', 'track'] },
  { q: 'How do I book a table?', a: 'Use the reservation page. Pick your date, party size and time slot — availability is live against our real floor plan, so any slot you can select is genuinely free. You will receive a confirmation code immediately.', tags: ['reservation', 'book', 'table', 'booking'] },
  { q: 'Can I cancel or change a reservation?', a: 'Yes. Sign in and open Reservations in your dashboard, or use the confirmation code from your email. Changes are free up to two hours before the booking.', tags: ['cancel', 'change', 'modify', 'reservation'] },
  { q: 'Do you cater for private events and weddings?', a: 'We do. The Margalla Room seats 14 and the Faisal Room seats 20, and we cater off-site for up to 1,000 guests. Submit an enquiry on the Events page and our events manager replies within one working day.', tags: ['event', 'private', 'wedding', 'catering', 'birthday', 'corporate'] },
  { q: 'Which payment methods do you accept?', a: 'Credit and debit cards through Stripe, PayPal, JazzCash, Easypaisa, and cash on delivery.', tags: ['payment', 'pay', 'card', 'cash', 'jazzcash', 'easypaisa', 'stripe', 'paypal'] },
  { q: 'Do you have vegetarian options?', a: 'Yes — daal makhani, palak paneer, vegetable biryani, mixed vegetable karahi and several starters and breads. Filter the menu by Vegetarian to see everything.', tags: ['vegetarian', 'veg', 'vegan', 'meat free'] },
  { q: 'Is allergen information available?', a: 'Every dish lists its allergens (gluten, dairy, nuts, egg, soy, mustard, sesame, fish) along with calories and spice level. You can also filter the menu to exclude specific allergens.', tags: ['allergen', 'allergy', 'nuts', 'gluten', 'dairy', 'calorie'] },
  { q: 'Is there parking?', a: 'Yes — 40 free parking spaces on site, with complimentary valet for Gold and Platinum loyalty members and for all private-room bookings.', tags: ['parking', 'valet', 'car'] },
  { q: 'How does the loyalty programme work?', a: 'You earn 1 point per Rs. 100 spent, and each point is worth Rs. 2 at checkout. Members move from Bronze to Silver at 2,000 lifetime points, Gold at 6,000, and Platinum at 15,000, with higher earn multipliers at each tier.', tags: ['loyalty', 'points', 'rewards', 'membership', 'tier'] },
  { q: 'Do you have a minimum order for delivery?', a: 'Yes, and it depends on the zone: Rs. 600 in Margalla Town and the E-sectors, Rs. 800 in the F and G sectors, Rs. 1,000 for the I-sectors, and Rs. 1,500 for Bahria Town, DHA II and Rawalpindi.', tags: ['minimum', 'order', 'delivery'] },
  { q: 'Is the food halal?', a: 'Entirely. All meat is halal-certified and sourced daily from the Bhara Kahu abattoir. We hold a Grade A food safety certificate from the Islamabad Food Authority.', tags: ['halal', 'certified', 'meat', 'hygiene', 'safety'] },
  { q: 'Where are you located?', a: 'Plot 14, Main Margalla Road, Margalla Town, Islamabad 44000. We are a five-minute drive from the Kashmir Highway interchange, with parking on site.', tags: ['location', 'address', 'where', 'map', 'directions'] },
  { q: 'Can I order for a large group or office lunch?', a: 'Yes. Bulk and catering orders of 20 covers or more can be placed through the Events page with 24 hours notice, and we issue a GST invoice.', tags: ['bulk', 'office', 'group', 'catering', 'invoice', 'corporate'] },
  { q: 'Do you sell gift cards?', a: 'Yes, from Rs. 1,000 to Rs. 100,000. They are delivered by email with a unique code, valid for 12 months, and redeemable on dine-in, delivery and pickup.', tags: ['gift', 'card', 'voucher', 'present'] },
];

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readMinutes: number;
  image: string;
  body: string[];
  keywords: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'what-makes-a-real-degh-biryani',
    title: 'What Makes a Real Degh Biryani (And Why We Cook Only Three a Day)',
    excerpt: 'A degh is not a big pot. It is a method, a fuel, and a limit — and the limit is the point.',
    category: 'Kitchen Craft',
    author: 'Haji Abdul Rahman',
    date: '2026-07-28',
    readMinutes: 6,
    image: '/images/dish-chicken-biryani.jpg',
    body: [
      'People ask why we do not simply cook more biryani. The honest answer is that a degh cannot be scaled the way a stockpot can. A degh is a thick-walled vessel that holds heat rather than transferring it quickly, and the rice at the top cooks in the steam of the meat below. Double the volume and the physics change: the bottom scorches before the top has taken the aroma.',
      'We cook three deghs a day — one at 11:00, one at 3:00 and one at 7:00. Each takes ninety minutes of dum, sealed with dough, over a low charcoal bed. When a degh finishes, that is the biryani for that service. When it is gone, it is gone.',
      'The rice matters as much as the method. We use aged basmati, at least twelve months old, because young rice holds too much moisture and breaks under dum. It is soaked for exactly forty minutes, no longer, and parboiled to seventy per cent before it meets the meat.',
      'The masala is ground in-house every Sunday: coriander seed, cumin, black cardamom, mace, and a small amount of stone flower that most kitchens have stopped using because it is expensive. It is the ingredient guests cannot name but always notice.',
      'This is why the 7:00 degh often sells out by 8:30 on a Friday. We would rather disappoint you at nine o’clock than serve you something reheated at ten.',
    ],
    keywords: ['degh biryani', 'best biryani islamabad', 'authentic pakistani biryani', 'dum cooking'],
  },
  {
    slug: 'guide-to-pakistani-bbq-cuts',
    title: 'A Guide to Pakistani BBQ: Every Cut on Our Charcoal Counter',
    excerpt: 'Seekh, tikka, boti, chapli, malai — what each one is, how it is cooked, and what to order first.',
    category: 'Guides',
    author: 'Ustad Usman Ali',
    date: '2026-07-11',
    readMinutes: 8,
    image: '/images/dish-mix-grill.jpg',
    body: [
      'Everything on our counter is cooked over lump charcoal, never gas. Charcoal gives radiant heat and smoke; gas gives heat alone. You can taste the difference in the first thirty seconds of a seekh kebab.',
      'Seekh kebab is minced meat pressed onto a flat skewer. The ratio is the whole craft: twenty per cent fat, no more and no less. Below that the kebab dries and cracks; above it, the fat renders out and the kebab slides off the skewer into the coals.',
      'Chicken tikka is bone-in and marinated twice — first in salt, lemon and ginger-garlic to open the meat, then in yoghurt, red chilli and mustard oil for at least six hours. The double marinade is why the flavour reaches the bone.',
      'Boti is boneless cubed meat, usually mutton, and is the most unforgiving cut on the grill. It needs high heat and constant motion; ninety seconds too long and it becomes leather.',
      'Malai boti sits in cream, cheese and white pepper. It is the mildest thing on the counter and the one we recommend for children and for guests new to Pakistani spice.',
      'If it is your first visit, order the mix grill. It carries seekh, tikka, boti and malai boti on one platter, and it settles the argument at the table.',
    ],
    keywords: ['pakistani bbq', 'seekh kebab', 'chicken tikka', 'bbq islamabad', 'charcoal grill'],
  },
  {
    slug: 'ramadan-iftar-2026',
    title: 'Ramadan at Islamabad Restaurant: Iftar Service 2026',
    excerpt: 'Our iftar buffet, the pre-booking window, and how we time the kitchen to the adhan.',
    category: 'Events',
    author: 'Chef Imran Baig',
    date: '2026-06-30',
    readMinutes: 4,
    image: '/images/banner-spices.jpg',
    body: [
      'Iftar is the hardest service of the year. Two hundred and sixty covers all begin eating within ninety seconds of the adhan, which means everything must be ready at once and nothing may be ready early.',
      'Our buffet opens twenty minutes before maghrib with dates, fruit chaat, pakoras, samosas, dahi bhallay and three chilled drinks on the table. The hot line — biryani, karahi, BBQ and two curries — is fired to land within five minutes of the call.',
      'Tables are released in two sittings: iftar at maghrib, and a dinner sitting from 8:45 PM for guests who prefer to eat later. Both can be booked online, and we strongly recommend booking — the last two Ramadans sold out ten days ahead.',
      'Sehri service runs on Friday and Saturday nights only, from 2:30 AM until fajr: paratha, halwa puri, nihari, and chai.',
    ],
    keywords: ['iftar islamabad', 'ramadan buffet', 'sehri restaurant islamabad'],
  },
  {
    slug: 'how-we-source-our-meat',
    title: 'Bhara Kahu at 5 AM: How We Source Our Meat',
    excerpt: 'Why nothing in our kitchen is frozen, and what a daily supply chain actually costs.',
    category: 'Sourcing',
    author: 'Chef Imran Baig',
    date: '2026-05-19',
    readMinutes: 5,
    image: '/images/dish-mutton-karahi.jpg',
    body: [
      'Our purchasing manager leaves for the Bhara Kahu abattoir at five every morning. He buys that day’s mutton, beef and chicken, and it is in our cold room by half past seven and on the grill by noon.',
      'Freezing is cheaper. It lets a kitchen buy weekly, negotiate harder, and waste nothing. It also changes the meat: ice crystals rupture the cell walls, and when the meat thaws it loses moisture it can never take back. In a karahi, where the meat cooks in its own liquid, you taste that loss immediately.',
      'The daily run costs us roughly eleven per cent more per kilo than a weekly frozen order would. We have absorbed that difference for twenty-seven years and it is the single reason the karahi tastes the way it does.',
      'Every delivery is logged, temperature-checked and traceable. Our Grade A certification from the Islamabad Food Authority is renewed annually and the certificate hangs by the entrance where you can read it.',
    ],
    keywords: ['halal meat islamabad', 'fresh not frozen', 'restaurant sourcing', 'food safety'],
  },
  {
    slug: 'pairing-kashmiri-chai',
    title: 'The Kashmiri Chai Ritual: Pink Tea, Explained',
    excerpt: 'Why it is pink, why it takes forty minutes, and what to eat alongside it.',
    category: 'Guides',
    author: 'Chef Sana Yousaf',
    date: '2026-04-08',
    readMinutes: 4,
    image: '/images/dish-mutton-biryani.jpg',
    body: [
      'The colour is chemistry, not food dye. Green tea leaves are boiled hard with a pinch of bicarbonate of soda, which raises the pH and oxidises the leaves to a deep red. Shock it with cold water, aerate it, add milk, and it turns rose pink.',
      'It cannot be rushed. Our kitchen simmers the base for forty minutes before service and holds it, adding milk to order. A chai made in ten minutes is brown, and brown chai means somebody hurried.',
      'We serve it with crushed pistachio and almond, lightly salted rather than sweet, which is how it is drunk in Srinagar and across northern Pakistan.',
      'Order it after a heavy BBQ platter rather than with it. The salt and the fat in the milk settle the palate in a way sweet tea cannot.',
    ],
    keywords: ['kashmiri chai', 'pink tea', 'noon chai recipe', 'pakistani tea'],
  },
];

export interface GalleryImage {
  src: string;
  alt: string;
  category: 'Food' | 'Restaurant' | 'Events' | 'Team';
  span: 'tall' | 'wide' | 'normal';
}

export const GALLERY: GalleryImage[] = [
  { src: '/images/dish-mix-grill.jpg', alt: 'Mix grill platter with seekh kebab and chicken tikka', category: 'Food', span: 'tall' },
  { src: '/images/dish-chicken-biryani.jpg', alt: 'Degh-cooked chicken biryani served with raita', category: 'Food', span: 'normal' },
  { src: '/images/interior-hall.jpg', alt: 'The main dining hall at Islamabad Restaurant', category: 'Restaurant', span: 'wide' },
  { src: '/images/dish-mutton-karahi.jpg', alt: 'Mutton karahi in a traditional iron wok', category: 'Food', span: 'normal' },
  { src: '/images/chef-usman.jpg', alt: 'Ustad Usman at the charcoal counter', category: 'Team', span: 'tall' },
  { src: '/images/dish-chicken-handi.jpg', alt: 'Creamy chicken handi', category: 'Food', span: 'normal' },
  { src: '/images/event-private-dining.jpg', alt: 'The Margalla Room set for private dining', category: 'Events', span: 'wide' },
  { src: '/images/dish-chicken-tikka.jpg', alt: 'Charcoal-grilled chicken tikka', category: 'Food', span: 'normal' },
  { src: '/images/interior-courtyard.jpg', alt: 'Outdoor courtyard seating under string lights', category: 'Restaurant', span: 'tall' },
  { src: '/images/dish-beef-biryani.jpg', alt: 'Beef biryani with saffron rice', category: 'Food', span: 'normal' },
  { src: '/images/event-wedding.jpg', alt: 'A wedding reception in the main hall', category: 'Events', span: 'normal' },
  { src: '/images/dish-mutton-biryani.jpg', alt: 'Mutton biryani with fried onions', category: 'Food', span: 'normal' },
  { src: '/images/interior-bbq-counter.jpg', alt: 'The open charcoal BBQ counter', category: 'Restaurant', span: 'wide' },
  { src: '/images/dish-chicken-karahi.jpg', alt: 'Chicken karahi with green chillies', category: 'Food', span: 'normal' },
  { src: '/images/chef-rahman.jpg', alt: 'Haji Abdul Rahman, founder', category: 'Team', span: 'normal' },
  { src: '/images/dish-chicken-burger.jpg', alt: 'Crispy zinger chicken burger with fries', category: 'Food', span: 'normal' },
];

export const VIDEO_GALLERY = [
  { id: 'v1', title: 'Inside the Degh: 90 Minutes of Dum', poster: '/images/dish-chicken-biryani.jpg', duration: '2:14' },
  { id: 'v2', title: 'The Charcoal Counter at Full Service', poster: '/images/dish-mix-grill.jpg', duration: '1:48' },
  { id: 'v3', title: 'A Night in the Margalla Room', poster: '/images/event-private-dining.jpg', duration: '3:02' },
];
