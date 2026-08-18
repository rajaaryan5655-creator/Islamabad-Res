/**
 * Brand + business constants — single source of truth shared by web & API.
 * Phase 1 deliverable: brand identity encoded as data.
 */

export const BRAND = {
  legalName: 'Islamabad Restaurant (Pvt) Ltd',
  name: 'Islamabad Restaurant',
  shortName: 'Islamabad Res',
  tagline: 'The True Taste of Pakistan',
  established: 1998,
  mission:
    'To serve the honest, fire-cooked food of Pakistan — sourced daily, cooked to order, and delivered with the hospitality of a Punjabi household.',
  vision:
    'To become the most trusted premium Pakistani dining brand in the twin cities, and to carry that kitchen to every major city in Pakistan by 2030.',
  story:
    'Islamabad Restaurant began in 1998 as a nine-table dhaba on the old Margalla Road, where Haji Abdul Rahman cooked a single degh of chicken biryani each morning and closed when it ran out. Twenty-seven years later the degh has become a 260-cover dining room, a live BBQ counter, and a delivery kitchen serving the twin cities — but the rule has not changed: nothing is reheated, nothing is frozen, and the kitchen closes when the last order is served, not before.',
  usp: [
    'Charcoal-fired BBQ counter visible from the dining floor',
    'Meat sourced daily from the Bhara Kahu abattoir — never frozen',
    'Degh-cooked biryani in limited batches, three times a day',
    'A 27-year-old family masala recipe ground in-house every week',
    'No-contact delivery across Islamabad & Rawalpindi within 45 minutes',
  ],
  currency: 'PKR',
  currencySymbol: 'Rs.',
  locale: 'en-PK',
  timezone: 'Asia/Karachi',
  phone: '+92 306 4650507',
  phoneRaw: '+923064650507',
  whatsapp: '+923064650507',
  email: 'reservations@islamabadrestaurant.pk',
  supportEmail: 'support@islamabadrestaurant.pk',
  address: {
    street: 'Plot 14, Main Margalla Road, Margalla Town',
    locality: 'Islamabad',
    region: 'Islamabad Capital Territory',
    postalCode: '44000',
    country: 'PK',
    countryName: 'Pakistan',
  },
  geo: { lat: 33.6512, lng: 73.0731 },
  mapEmbed:
    'https://www.google.com/maps?q=Margalla+Town+Islamabad&output=embed',
  mapLink: 'https://maps.google.com/?q=33.6512,73.0731',
  social: {
    instagram: 'https://instagram.com/islamabadrestaurant',
    facebook: 'https://facebook.com/islamabadrestaurant',
    tiktok: 'https://tiktok.com/@islamabadrestaurant',
    youtube: 'https://youtube.com/@islamabadrestaurant',
  },
  priceRange: 'Rs. 500 – Rs. 3,000',
  servesCuisine: ['Pakistani', 'Mughlai', 'Barbecue', 'Chinese', 'Desserts'],
  capacity: { seats: 260, halls: 3, privateRooms: 2 },
} as const;

export const OPENING_HOURS = [
  { day: 'Monday', dayIndex: 1, open: '11:00', close: '23:00' },
  { day: 'Tuesday', dayIndex: 2, open: '11:00', close: '23:00' },
  { day: 'Wednesday', dayIndex: 3, open: '11:00', close: '23:00' },
  { day: 'Thursday', dayIndex: 4, open: '11:00', close: '23:00' },
  { day: 'Friday', dayIndex: 5, open: '14:00', close: '23:59' },
  { day: 'Saturday', dayIndex: 6, open: '11:00', close: '23:59' },
  { day: 'Sunday', dayIndex: 0, open: '11:00', close: '23:00' },
] as const;

/** Brand design tokens — mirrored in Tailwind theme + CSS variables. */
export const BRAND_TOKENS = {
  colors: {
    obsidian: '#0a0a0a',
    charcoal: '#121212',
    ember: '#c8102e',
    emberDeep: '#8f0a20',
    saffron: '#f4b400',
    gold: '#d4a437',
    cream: '#f7f3ec',
    smoke: '#8a8a8a',
  },
  fonts: {
    display: 'Cormorant Garamond, Georgia, serif',
    body: 'Inter, system-ui, sans-serif',
    script: 'Dancing Script, cursive',
  },
} as const;

/** Delivery zones with charges + ETA (Phase 5). */
export const DELIVERY_ZONES = [
  { id: 'zone-f', name: 'F-Sectors (F-6 → F-11)', fee: 149, etaMin: 30, etaMax: 45, minOrder: 800 },
  { id: 'zone-g', name: 'G-Sectors (G-6 → G-13)', fee: 149, etaMin: 30, etaMax: 45, minOrder: 800 },
  { id: 'zone-e', name: 'E-Sectors & Margalla Town', fee: 99, etaMin: 20, etaMax: 35, minOrder: 600 },
  { id: 'zone-i', name: 'I-Sectors & Industrial Area', fee: 199, etaMin: 40, etaMax: 60, minOrder: 1000 },
  { id: 'zone-bahria', name: 'Bahria Town & DHA Phase II', fee: 249, etaMin: 45, etaMax: 70, minOrder: 1500 },
  { id: 'zone-rwp', name: 'Rawalpindi (Saddar, Chaklala, Satellite Town)', fee: 249, etaMin: 45, etaMax: 70, minOrder: 1500 },
] as const;

export type DeliveryZone = (typeof DELIVERY_ZONES)[number];

export const TAX_RATE = 0.16; // ICT sales tax on services
export const PACKAGING_FEE = 60;
export const FREE_DELIVERY_THRESHOLD = 4000;

export const LOYALTY_TIERS = [
  { id: 'BRONZE', name: 'Bronze', minPoints: 0, multiplier: 1, perks: ['1 point per Rs. 100', 'Birthday dessert'] },
  { id: 'SILVER', name: 'Silver', minPoints: 2000, multiplier: 1.25, perks: ['1.25x points', 'Priority reservations', 'Free delivery over Rs. 2,500'] },
  { id: 'GOLD', name: 'Gold', minPoints: 6000, multiplier: 1.5, perks: ['1.5x points', 'Complimentary valet', 'Chef’s table access', 'Free delivery'] },
  { id: 'PLATINUM', name: 'Platinum', minPoints: 15000, multiplier: 2, perks: ['2x points', 'Private dining priority', 'Dedicated concierge line', 'Annual tasting menu for two'] },
] as const;

export const POINTS_PER_RUPEE = 0.01; // 1 point / Rs.100
export const POINT_VALUE = 2; // 1 point = Rs. 2 on redemption
