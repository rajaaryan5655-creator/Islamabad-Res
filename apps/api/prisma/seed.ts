/**
 * Seeds the platform with the real Islamabad Restaurant menu, floor plan,
 * staff accounts, live offers and a realistic 90-day trading history so the
 * admin analytics are meaningful from first boot.
 */
import { FLOOR_PLAN, TESTIMONIALS } from '@islamabad/shared';
import { prisma } from '../src/lib/prisma.js';
import { generateReferralCode, hashPassword, orderNumber, trackingToken, reservationCode } from '../src/lib/auth.js';
import { stringifyList } from '../src/lib/json.js';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CATEGORIES = [
  { name: 'Biryani', icon: 'rice', description: 'Degh-cooked in limited batches, three times a day', sortOrder: 1 },
  { name: 'BBQ', icon: 'flame', description: 'Charcoal-fired at the open counter', sortOrder: 2 },
  { name: 'Karahi & Handi', icon: 'pot', description: 'Cooked to order in iron karahi', sortOrder: 3 },
  { name: 'Curries', icon: 'bowl', description: 'Slow-cooked house curries', sortOrder: 4 },
  { name: 'Breads', icon: 'bread', description: 'From the tandoor, to order', sortOrder: 5 },
  { name: 'Chinese', icon: 'noodles', description: 'Pakistani-Chinese classics', sortOrder: 6 },
  { name: 'Fast Food', icon: 'burger', description: 'Burgers, rolls and fries', sortOrder: 7 },
  { name: 'Starters', icon: 'salad', description: 'Soups, chaat and small plates', sortOrder: 8 },
  { name: 'Desserts', icon: 'dessert', description: 'Made in-house daily', sortOrder: 9 },
  { name: 'Drinks', icon: 'cup', description: 'Fresh juices, lassi and chai', sortOrder: 10 },
];

interface SeedItem {
  name: string;
  cat: string;
  price: number;
  compareAt?: number;
  desc: string;
  img: string;
  cal?: number;
  protein?: number;
  spice?: 'MILD' | 'MEDIUM' | 'HOT' | 'FIERY';
  allergens?: string[];
  veg?: boolean;
  featured?: boolean;
  best?: boolean;
  prep?: number;
  serves?: number;
  rating?: number;
  tags?: string[];
}

const ITEMS: SeedItem[] = [
  // Biryani
  { name: 'Chicken Biryani', cat: 'Biryani', price: 450, desc: 'Aged basmati layered with chicken on the bone, cooked ninety minutes on dum with our house-ground masala. Served with raita and salad.', img: '/images/dish-chicken-biryani.jpg', cal: 720, protein: 38, spice: 'MEDIUM', allergens: ['dairy'], best: true, featured: true, prep: 20, serves: 1, rating: 4.7, tags: ['signature', 'degh', 'rice'] },
  { name: 'Mutton Biryani', cat: 'Biryani', price: 700, desc: 'Bone-in mutton slow-cooked until it falls from the bone, layered with saffron rice and fried onion.', img: '/images/dish-mutton-biryani.jpg', cal: 860, protein: 44, spice: 'MEDIUM', allergens: ['dairy'], best: true, prep: 25, rating: 4.8, tags: ['degh', 'rice'] },
  { name: 'Beef Biryani', cat: 'Biryani', price: 650, desc: 'Tender beef shank braised with whole spices and folded through fragrant basmati.', img: '/images/dish-beef-biryani.jpg', cal: 810, protein: 42, spice: 'MEDIUM', allergens: ['dairy'], prep: 25, rating: 4.5, tags: ['rice'] },
  { name: 'Sindhi Biryani', cat: 'Biryani', price: 520, desc: 'The spicier Sindhi style, with potato, dried plum and a heavier hand on the chilli.', img: '/images/dish-chicken-biryani.jpg', cal: 780, protein: 34, spice: 'HOT', allergens: ['dairy'], prep: 22, rating: 4.6, tags: ['spicy', 'rice'] },
  { name: 'Vegetable Biryani', cat: 'Biryani', price: 380, desc: 'Seasonal vegetables, paneer and cashew layered with saffron rice.', img: '/images/dish-chicken-biryani.jpg', cal: 590, protein: 16, spice: 'MILD', allergens: ['dairy', 'nuts'], veg: true, prep: 18, rating: 4.3, tags: ['vegetarian', 'rice'] },

  // BBQ
  { name: 'Mix Grill Platter', cat: 'BBQ', price: 1200, compareAt: 1450, desc: 'Seekh kebab, chicken tikka, mutton boti and malai boti on one platter, with naan, chutney and salad. Our answer to the first-visit question.', img: '/images/dish-mix-grill.jpg', cal: 1240, protein: 78, spice: 'MEDIUM', allergens: ['dairy', 'gluten'], best: true, featured: true, prep: 30, serves: 3, rating: 4.9, tags: ['sharing', 'signature', 'charcoal'] },
  { name: 'Chicken Tikka', cat: 'BBQ', price: 550, desc: 'Bone-in chicken, double-marinated in ginger-garlic then yoghurt and mustard oil for six hours, grilled over lump charcoal.', img: '/images/dish-chicken-tikka.jpg', cal: 480, protein: 52, spice: 'MEDIUM', allergens: ['dairy', 'mustard'], best: true, prep: 22, rating: 4.7, tags: ['charcoal', 'grill'] },
  { name: 'Seekh Kebab', cat: 'BBQ', price: 480, desc: 'Hand-minced beef at a strict twenty per cent fat ratio, pressed onto flat skewers and char-grilled.', img: '/images/dish-mix-grill.jpg', cal: 520, protein: 40, spice: 'HOT', allergens: [], prep: 18, rating: 4.6, tags: ['charcoal', 'grill'] },
  { name: 'Malai Boti', cat: 'BBQ', price: 620, desc: 'Boneless chicken in cream, cheese and white pepper — the mildest thing on the counter and what we give the children.', img: '/images/dish-chicken-tikka.jpg', cal: 560, protein: 46, spice: 'MILD', allergens: ['dairy'], featured: true, prep: 20, rating: 4.8, tags: ['mild', 'creamy', 'charcoal'] },
  { name: 'Mutton Boti', cat: 'BBQ', price: 880, desc: 'Cubed mutton over high heat and constant motion — ninety seconds too long and it is leather, so we watch it.', img: '/images/dish-mix-grill.jpg', cal: 640, protein: 54, spice: 'HOT', allergens: [], prep: 25, rating: 4.6, tags: ['charcoal'] },
  { name: 'Chapli Kebab', cat: 'BBQ', price: 420, desc: 'Peshawari-style flat kebab with tomato, coriander seed and pomegranate, fried on a griddle.', img: '/images/dish-mix-grill.jpg', cal: 610, protein: 36, spice: 'HOT', allergens: ['egg'], prep: 18, rating: 4.5, tags: ['peshawari'] },

  // Karahi & Handi
  { name: 'Mutton Karahi', cat: 'Karahi & Handi', price: 1750, desc: 'A full kilo of mutton cooked to order in an iron karahi with tomato, green chilli and ginger. Nothing frozen, nothing reheated.', img: '/images/dish-mutton-karahi.jpg', cal: 1180, protein: 92, spice: 'HOT', allergens: [], best: true, featured: true, prep: 35, serves: 3, rating: 4.9, tags: ['signature', 'sharing'] },
  { name: 'Chicken Karahi', cat: 'Karahi & Handi', price: 1150, desc: 'Full chicken in the karahi with tomato, green chilli and fresh ginger julienne.', img: '/images/dish-chicken-karahi.jpg', cal: 940, protein: 76, spice: 'HOT', allergens: [], best: true, prep: 30, serves: 3, rating: 4.7, tags: ['sharing'] },
  { name: 'Chicken Handi', cat: 'Karahi & Handi', price: 980, desc: 'Boneless chicken in a cream, yoghurt and cashew gravy, finished in a clay handi.', img: '/images/dish-chicken-handi.jpg', cal: 880, protein: 62, spice: 'MILD', allergens: ['dairy', 'nuts'], featured: true, prep: 28, serves: 2, rating: 4.8, tags: ['creamy', 'mild'] },
  { name: 'White Karahi', cat: 'Karahi & Handi', price: 1250, desc: 'Chicken cooked in yoghurt and white pepper without tomato — subtle, rich and increasingly our regulars’ order.', img: '/images/dish-chicken-karahi.jpg', cal: 910, protein: 70, spice: 'MEDIUM', allergens: ['dairy'], prep: 30, serves: 3, rating: 4.7, tags: ['creamy'] },

  // Curries
  { name: 'Nihari', cat: 'Curries', price: 720, desc: 'Beef shank simmered overnight with bone marrow, finished with ginger, chilli and lemon.', img: '/images/dish-mutton-karahi.jpg', cal: 780, protein: 58, spice: 'HOT', allergens: ['gluten'], best: true, prep: 15, rating: 4.8, tags: ['slow-cooked', 'breakfast'] },
  { name: 'Daal Makhani', cat: 'Curries', price: 380, desc: 'Black lentils cooked twelve hours with butter and cream.', img: '/images/dish-chicken-handi.jpg', cal: 520, protein: 18, spice: 'MILD', allergens: ['dairy'], veg: true, prep: 12, rating: 4.6, tags: ['vegetarian', 'comfort'] },
  { name: 'Palak Paneer', cat: 'Curries', price: 450, desc: 'House-made paneer in slow-cooked spinach with garlic and cumin.', img: '/images/dish-chicken-handi.jpg', cal: 430, protein: 22, spice: 'MILD', allergens: ['dairy'], veg: true, prep: 15, rating: 4.4, tags: ['vegetarian'] },
  { name: 'Haleem', cat: 'Curries', price: 480, desc: 'Wheat, barley and lentils pounded with beef for eight hours until it is a single texture.', img: '/images/dish-mutton-karahi.jpg', cal: 660, protein: 34, spice: 'MEDIUM', allergens: ['gluten'], prep: 12, rating: 4.5, tags: ['slow-cooked'] },

  // Breads
  { name: 'Garlic Naan', cat: 'Breads', price: 120, desc: 'Tandoor naan brushed with garlic butter and coriander.', img: '/images/dish-chicken-burger.jpg', cal: 320, protein: 8, spice: 'MILD', allergens: ['gluten', 'dairy'], veg: true, prep: 8, rating: 4.6, tags: ['vegetarian', 'tandoor'] },
  { name: 'Roghni Naan', cat: 'Breads', price: 140, desc: 'Enriched naan topped with sesame and nigella seed.', img: '/images/dish-chicken-burger.jpg', cal: 380, protein: 9, spice: 'MILD', allergens: ['gluten', 'dairy', 'sesame'], veg: true, prep: 8, rating: 4.5, tags: ['vegetarian', 'tandoor'] },
  { name: 'Tandoori Roti', cat: 'Breads', price: 60, desc: 'Wholewheat roti straight off the tandoor wall.', img: '/images/dish-chicken-burger.jpg', cal: 180, protein: 6, spice: 'MILD', allergens: ['gluten'], veg: true, prep: 6, rating: 4.4, tags: ['vegetarian', 'tandoor'] },

  // Chinese
  { name: 'Chicken Chowmein', cat: 'Chinese', price: 520, desc: 'Stir-fried noodles with chicken, cabbage and spring onion in a soy-garlic sauce.', img: '/images/dish-chicken-tikka.jpg', cal: 640, protein: 32, spice: 'MEDIUM', allergens: ['gluten', 'soy', 'egg'], prep: 18, rating: 4.3, tags: ['noodles'] },
  { name: 'Chilli Chicken', cat: 'Chinese', price: 580, desc: 'Crisp-fried chicken tossed in a hot garlic and chilli sauce with peppers.', img: '/images/dish-chicken-karahi.jpg', cal: 590, protein: 38, spice: 'FIERY', allergens: ['gluten', 'soy'], prep: 18, rating: 4.4, tags: ['spicy'] },
  { name: 'Chicken Manchurian', cat: 'Chinese', price: 560, desc: 'Chicken dumplings in a tangy Manchurian gravy, served with egg-fried rice.', img: '/images/dish-chicken-karahi.jpg', cal: 620, protein: 34, spice: 'MEDIUM', allergens: ['gluten', 'soy', 'egg'], prep: 20, rating: 4.2, tags: ['rice'] },

  // Fast Food
  { name: 'Zinger Burger', cat: 'Fast Food', price: 420, compareAt: 490, desc: 'Buttermilk-marinated crispy fillet, lettuce and house mayo in a brioche bun, with fries.', img: '/images/dish-chicken-burger.jpg', cal: 780, protein: 34, spice: 'MEDIUM', allergens: ['gluten', 'dairy', 'egg'], best: true, prep: 15, rating: 4.5, tags: ['burger', 'student'] },
  { name: 'Beef Cheese Burger', cat: 'Fast Food', price: 520, desc: 'Char-grilled beef patty with cheddar, caramelised onion and smoked mayo.', img: '/images/dish-chicken-burger.jpg', cal: 880, protein: 42, spice: 'MILD', allergens: ['gluten', 'dairy', 'egg'], prep: 16, rating: 4.4, tags: ['burger'] },
  { name: 'Chicken Paratha Roll', cat: 'Fast Food', price: 320, desc: 'Chargrilled chicken, chutney and onion wrapped in a flaky paratha.', img: '/images/dish-chicken-burger.jpg', cal: 610, protein: 30, spice: 'MEDIUM', allergens: ['gluten', 'dairy'], prep: 12, rating: 4.5, tags: ['roll', 'student'] },
  { name: 'Loaded Fries', cat: 'Fast Food', price: 380, desc: 'Fries under cheese sauce, chargrilled chicken and jalapeño.', img: '/images/dish-chicken-burger.jpg', cal: 720, protein: 24, spice: 'MEDIUM', allergens: ['gluten', 'dairy'], prep: 12, rating: 4.3, tags: ['sharing', 'student'] },

  // Starters
  { name: 'Chicken Corn Soup', cat: 'Starters', price: 240, desc: 'Shredded chicken and sweetcorn in a clear egg-drop broth.', img: '/images/dish-chicken-handi.jpg', cal: 210, protein: 16, spice: 'MILD', allergens: ['egg', 'soy'], prep: 10, rating: 4.4, tags: ['soup', 'starter'] },
  { name: 'Fruit Chaat', cat: 'Starters', price: 260, desc: 'Seasonal fruit with chaat masala and lemon — our iftar staple all year round.', img: '/images/dish-chicken-handi.jpg', cal: 180, protein: 3, spice: 'MILD', allergens: [], veg: true, prep: 8, rating: 4.5, tags: ['vegetarian', 'light'] },
  { name: 'Dahi Bhallay', cat: 'Starters', price: 280, desc: 'Lentil dumplings in whipped yoghurt with tamarind and chaat masala.', img: '/images/dish-chicken-handi.jpg', cal: 340, protein: 12, spice: 'MEDIUM', allergens: ['dairy'], veg: true, prep: 10, rating: 4.6, tags: ['vegetarian', 'chaat'] },

  // Desserts
  { name: 'Gulab Jamun', cat: 'Desserts', price: 250, desc: 'Warm milk dumplings in cardamom syrup, crusted with pistachio.', img: '/images/dish-beef-biryani.jpg', cal: 420, protein: 7, spice: 'MILD', allergens: ['dairy', 'gluten', 'nuts'], veg: true, best: true, prep: 8, rating: 4.7, tags: ['vegetarian', 'sweet'] },
  { name: 'Special Kheer', cat: 'Desserts', price: 240, desc: 'Rice slow-cooked in full-cream milk with cardamom, almond and pistachio.', img: '/images/dish-mutton-biryani.jpg', cal: 380, protein: 9, spice: 'MILD', allergens: ['dairy', 'nuts'], veg: true, featured: true, prep: 6, rating: 4.8, tags: ['vegetarian', 'sweet'] },
  { name: 'Shahi Tukray', cat: 'Desserts', price: 290, desc: 'Fried bread soaked in saffron milk under a layer of thickened cream.', img: '/images/dish-beef-biryani.jpg', cal: 520, protein: 11, spice: 'MILD', allergens: ['dairy', 'gluten', 'nuts'], veg: true, prep: 8, rating: 4.6, tags: ['vegetarian', 'sweet'] },

  // Drinks
  { name: 'Kashmiri Chai', cat: 'Drinks', price: 180, desc: 'Pink tea simmered forty minutes before service, with salted pistachio and almond.', img: '/images/dish-mutton-karahi.jpg', cal: 160, protein: 5, spice: 'MILD', allergens: ['dairy', 'nuts'], veg: true, featured: true, prep: 6, rating: 4.8, tags: ['vegetarian', 'tea', 'signature'] },
  { name: 'Mint Margarita', cat: 'Drinks', price: 220, desc: 'Fresh mint, lemon and crushed ice, blended to order.', img: '/images/dish-chicken-handi.jpg', cal: 180, protein: 1, spice: 'MILD', allergens: [], veg: true, best: true, prep: 5, rating: 4.7, tags: ['vegetarian', 'cold'] },
  { name: 'Mango Lassi', cat: 'Drinks', price: 240, desc: 'Chaunsa mango whipped with set yoghurt and a pinch of cardamom.', img: '/images/dish-chicken-handi.jpg', cal: 280, protein: 8, spice: 'MILD', allergens: ['dairy'], veg: true, prep: 5, rating: 4.6, tags: ['vegetarian', 'cold'] },
  { name: 'Fresh Lime Soda', cat: 'Drinks', price: 160, desc: 'Lime, soda and a choice of sweet or salted.', img: '/images/dish-chicken-handi.jpg', cal: 90, protein: 0, spice: 'MILD', allergens: [], veg: true, prep: 4, rating: 4.4, tags: ['vegetarian', 'cold'] },
];

const COUPONS = [
  { code: 'WELCOME15', description: '15% off your first order', type: 'PERCENT', value: 15, minOrder: 1000, maxDiscount: 500, perUserLimit: 1 },
  { code: 'STUDENT20', description: '20% off for students on orders over Rs. 800', type: 'PERCENT', value: 20, minOrder: 800, maxDiscount: 400 },
  { code: 'FREEDEL', description: 'Free delivery, any order over Rs. 1,500', type: 'FREE_DELIVERY', value: 0, minOrder: 1500 },
  { code: 'FAMILY500', description: 'Rs. 500 off family orders over Rs. 3,500', type: 'FIXED', value: 500, minOrder: 3500 },
  { code: 'HAPPYHOUR', description: '25% off between 3 PM and 6 PM', type: 'PERCENT', value: 25, minOrder: 600, maxDiscount: 600 },
];

interface OptionGroupSeed {
  name: string;
  type: 'SINGLE' | 'MULTI';
  isRequired?: boolean;
  maxSelect?: number;
  choices: { label: string; priceDelta?: number; isDefault?: boolean }[];
}

async function main() {
  console.log('[seed] starting');

  // Idempotent: clear transactional + catalogue data, keep nothing stale.
  await prisma.orderEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.review.deleteMany();
  await prisma.pointsEntry.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.address.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.giftCard.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.restaurantTable.deleteMany();
  await prisma.eventEnquiry.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.user.deleteMany();

  /* ------------------------------ floor plan ----------------------------- */
  await prisma.restaurantTable.createMany({
    data: FLOOR_PLAN.map((t) => ({ id: t.id, name: t.name, seats: t.seats, zone: t.zone })),
  });
  console.log(`[seed] ${FLOOR_PLAN.length} tables`);

  /* ------------------------------ categories ----------------------------- */
  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const created = await prisma.category.create({
      data: { name: c.name, slug: slugify(c.name), description: c.description, icon: c.icon, sortOrder: c.sortOrder },
    });
    categoryIds.set(c.name, created.id);
  }
  console.log(`[seed] ${CATEGORIES.length} categories`);

  /* -------------------------------- menu --------------------------------- */
  const menuIds: string[] = [];
  for (const [index, item] of ITEMS.entries()) {
    const created = await prisma.menuItem.create({
      data: {
        name: item.name,
        slug: slugify(item.name),
        description: item.desc,
        price: item.price,
        compareAtPrice: item.compareAt ?? null,
        cost: Math.round(item.price * 0.38),
        categoryId: categoryIds.get(item.cat)!,
        image: item.img,
        calories: item.cal ?? null,
        protein: item.protein ?? null,
        spiceLevel: item.spice ?? 'MEDIUM',
        allergens: stringifyList(item.allergens),
        tags: stringifyList(item.tags),
        isVegetarian: item.veg ?? false,
        isFeatured: item.featured ?? false,
        isBestSeller: item.best ?? false,
        prepMinutes: item.prep ?? 20,
        serves: item.serves ?? 1,
        rating: item.rating ?? 4.5,
        ratingCount: Math.floor(Math.random() * 180) + 20,
        sortOrder: index,
      },
    });
    menuIds.push(created.id);
  }
  console.log(`[seed] ${ITEMS.length} menu items`);

  /* --------------------------- dish customization ------------------------- */
  /**
   * Real option sets taken from how the kitchen actually sells these dishes:
   * karahi by weight, biryani by portion, BBQ by skewer count.
   */
  const bySlug = new Map(
    (await prisma.menuItem.findMany({ select: { id: true, slug: true, categoryId: true } })).map((m) => [m.slug, m]),
  );
  const catOf = new Map([...categoryIds].map(([name, id]) => [id, name]));

  const groupsFor = (slug: string): OptionGroupSeed[] => {
    const item = bySlug.get(slug);
    if (!item) return [];
    const category = catOf.get(item.categoryId);

    if (category === 'Karahi & Handi') {
      return [
        {
          name: 'Portion',
          type: 'SINGLE',
          isRequired: true,
          choices: [
            { label: 'Half kg', priceDelta: -400 },
            { label: 'One kg', priceDelta: 0, isDefault: true },
            { label: 'One and a half kg', priceDelta: 700 },
          ],
        },
        {
          name: 'Spice level',
          type: 'SINGLE',
          isRequired: true,
          choices: [
            { label: 'Mild' },
            { label: 'Medium', isDefault: true },
            { label: 'Hot — as the chef makes it' },
            { label: 'Extra hot' },
          ],
        },
        {
          name: 'Add-ons',
          type: 'MULTI',
          maxSelect: 4,
          choices: [
            { label: 'Extra raita', priceDelta: 90 },
            { label: 'Two roghni naan', priceDelta: 160 },
            { label: 'Extra green chilli & ginger', priceDelta: 60 },
            { label: 'Fresh lemon wedges', priceDelta: 40 },
          ],
        },
      ];
    }

    if (category === 'Biryani') {
      return [
        {
          name: 'Portion',
          type: 'SINGLE',
          isRequired: true,
          choices: [
            { label: 'Single plate', priceDelta: 0, isDefault: true },
            { label: 'Family (serves 4)', priceDelta: 1250 },
            { label: 'Degh quarter (serves 10)', priceDelta: 3400 },
          ],
        },
        {
          name: 'Cut',
          type: 'SINGLE',
          choices: [
            { label: 'Mixed pieces', isDefault: true },
            { label: 'Leg piece', priceDelta: 80 },
            { label: 'Boneless', priceDelta: 120 },
          ],
        },
        {
          name: 'Sides',
          type: 'MULTI',
          maxSelect: 3,
          choices: [
            { label: 'Extra raita', priceDelta: 90 },
            { label: 'Shami kebab', priceDelta: 140 },
            { label: 'Kachumber salad', priceDelta: 70 },
          ],
        },
      ];
    }

    if (category === 'BBQ') {
      return [
        {
          name: 'Skewers',
          type: 'SINGLE',
          isRequired: true,
          choices: [
            { label: 'Four sticks', priceDelta: 0, isDefault: true },
            { label: 'Six sticks', priceDelta: 380 },
            { label: 'Ten sticks (platter)', priceDelta: 950 },
          ],
        },
        {
          name: 'Served with',
          type: 'MULTI',
          maxSelect: 3,
          choices: [
            { label: 'Mint chutney', priceDelta: 0, isDefault: true },
            { label: 'Imli chutney', priceDelta: 0 },
            { label: 'Two plain naan', priceDelta: 120 },
          ],
        },
      ];
    }

    return [];
  };

  let groupCount = 0;
  for (const [slug, item] of bySlug) {
    for (const [order, group] of groupsFor(slug).entries()) {
      await prisma.menuOptionGroup.create({
        data: {
          menuItemId: item.id,
          name: group.name,
          type: group.type,
          isRequired: group.isRequired ?? false,
          minSelect: group.isRequired ? 1 : 0,
          maxSelect: group.type === 'SINGLE' ? 1 : (group.maxSelect ?? 1),
          sortOrder: order,
          choices: {
            create: group.choices.map((c, i) => ({
              label: c.label,
              priceDelta: c.priceDelta ?? 0,
              isDefault: c.isDefault ?? false,
              sortOrder: i,
            })),
          },
        },
      });
      groupCount += 1;
    }
  }
  console.log(`[seed] ${groupCount} dish option groups`);

  /* -------------------------------- coupons ------------------------------ */
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 6);
  for (const c of COUPONS) {
    await prisma.coupon.create({ data: { ...c, expiresAt: expires } });
  }
  console.log(`[seed] ${COUPONS.length} coupons`);

  /* --------------------------------- staff ------------------------------- */
  const staff = [
    { name: 'Haji Abdul Rahman', email: 'admin@islamabadrestaurant.pk', role: 'SUPER_ADMIN', position: 'Founder & Owner', password: 'Admin@1234' },
    { name: 'Imran Baig', email: 'manager@islamabadrestaurant.pk', role: 'MANAGER', position: 'Executive Chef & GM', password: 'Manager@1234' },
    { name: 'Usman Ali', email: 'kitchen@islamabadrestaurant.pk', role: 'STAFF', position: 'Head of Charcoal Counter', password: 'Staff@1234' },
    { name: 'Sana Yousaf', email: 'floor@islamabadrestaurant.pk', role: 'STAFF', position: 'Floor Manager', password: 'Staff@1234' },
  ];
  for (const s of staff) {
    await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        role: s.role,
        position: s.position,
        passwordHash: await hashPassword(s.password),
        referralCode: generateReferralCode(s.name),
        emailVerified: true,
        phone: '+923064650507',
      },
    });
  }
  console.log(`[seed] ${staff.length} staff accounts`);

  /* ------------------------------- customers ----------------------------- */
  const customerSeeds = [
    { name: 'Ayesha Khan', email: 'ayesha@example.com', phone: '03001234567', zone: 'zone-f', line1: 'House 42, Street 18, F-10/3' },
    { name: 'Hamza Sheikh', email: 'hamza@example.com', phone: '03211234567', zone: 'zone-g', line1: 'Office 7, 3rd Floor, Blue Area' },
    { name: 'Zainab Tariq', email: 'zainab@example.com', phone: '03331234567', zone: 'zone-e', line1: 'NUST H-12 Hostel Block C' },
    { name: 'Faisal Ahmed', email: 'faisal@example.com', phone: '03451234567', zone: 'zone-g', line1: 'House 8, Street 22, G-11/2' },
    { name: 'Dr. Nadia Aslam', email: 'nadia@example.com', phone: '03011234567', zone: 'zone-f', line1: 'Apartment 5B, Silver Oaks, F-10' },
    { name: 'Sofia Marchetti', email: 'sofia@example.com', phone: '03051234567', zone: 'zone-bahria', line1: 'Serena Hotel, Khayaban-e-Suhrwardy' },
  ];

  const customers: { id: string; name: string; email: string; phone: string; addressId: string; zone: string; line1: string }[] = [];
  for (const c of customerSeeds) {
    const user = await prisma.user.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: 'CUSTOMER',
        passwordHash: await hashPassword('Customer@1234'),
        referralCode: generateReferralCode(c.name),
        emailVerified: true,
        marketingOptIn: true,
      },
    });
    const address = await prisma.address.create({
      data: { userId: user.id, label: 'Home', line1: c.line1, city: 'Islamabad', zoneId: c.zone, isDefault: true },
    });
    customers.push({ id: user.id, name: c.name, email: c.email, phone: c.phone, addressId: address.id, zone: c.zone, line1: c.line1 });
  }
  console.log(`[seed] ${customers.length} customers`);

  /* ---------------------- 90 days of trading history --------------------- */
  const menuItems = await prisma.menuItem.findMany();
  const statuses = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'CANCELLED'] as const;
  const types = ['DELIVERY', 'DELIVERY', 'DELIVERY', 'PICKUP', 'DINE_IN'] as const;
  const methods = ['CARD_STRIPE', 'COD', 'COD', 'JAZZCASH', 'EASYPAISA'] as const;

  let orderCount = 0;
  for (let day = 89; day >= 0; day--) {
    const date = new Date(Date.now() - day * 86_400_000);
    const dow = date.getDay();
    // Weekend + Friday uplift, plus a mild growth trend toward the present.
    const base = dow === 5 || dow === 6 ? 14 : dow === 0 ? 11 : 8;
    const growth = 1 + (89 - day) / 300;
    const count = Math.max(3, Math.round((base + Math.random() * 5) * growth));

    for (let i = 0; i < count; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const status = day === 0 && i < 3 ? (['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY'] as const)[i] : statuses[Math.floor(Math.random() * statuses.length)];
      const lineCount = 1 + Math.floor(Math.random() * 4);

      const picked = new Set<number>();
      while (picked.size < lineCount) picked.add(Math.floor(Math.random() * menuItems.length));

      const lines = [...picked].map((idx) => {
        const mi = menuItems[idx];
        const qty = 1 + Math.floor(Math.random() * 2);
        return { menuItemId: mi.id, name: mi.name, unitPrice: mi.price, quantity: qty, total: mi.price * qty };
      });

      const subtotal = lines.reduce((s, l) => s + l.total, 0);
      const packaging = type === 'DINE_IN' ? 0 : 60;
      const deliveryFee = type === 'DELIVERY' ? (subtotal >= 4000 ? 0 : 149) : 0;
      const tax = Math.round(subtotal * 0.16);
      const total = subtotal + tax + packaging + deliveryFee;

      const createdAt = new Date(date);
      createdAt.setHours(11 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60), 0, 0);

      await prisma.order.create({
        data: {
          orderNumber: orderNumber(),
          trackingToken: trackingToken(),
          userId: customer.id,
          addressId: type === 'DELIVERY' ? customer.addressId : null,
          type,
          status,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          addressText: type === 'DELIVERY' ? `${customer.line1}, Islamabad` : null,
          zoneId: type === 'DELIVERY' ? customer.zone : null,
          subtotal,
          packaging,
          deliveryFee,
          tax,
          total,
          pointsEarned: Math.floor(subtotal * 0.01),
          paymentMethod: methods[Math.floor(Math.random() * methods.length)],
          paymentStatus: status === 'DELIVERED' ? 'PAID' : 'UNPAID',
          etaMinutes: type === 'DELIVERY' ? 45 : type === 'PICKUP' ? 25 : null,
          createdAt,
          confirmedAt: status !== 'CANCELLED' ? createdAt : null,
          deliveredAt: status === 'DELIVERED' ? new Date(createdAt.getTime() + 40 * 60_000) : null,
          items: { create: lines },
          events: { create: { status, note: 'Seeded history', createdAt } },
        },
      });
      orderCount += 1;
    }
  }
  console.log(`[seed] ${orderCount} historical orders`);

  // Update per-item order counters from the generated history.
  const counts = await prisma.orderItem.groupBy({ by: ['menuItemId'], _sum: { quantity: true } });
  for (const c of counts) {
    await prisma.menuItem.update({ where: { id: c.menuItemId }, data: { orderCount: c._sum.quantity ?? 0 } });
  }

  // Loyalty balances reflecting the seeded spend.
  for (const c of customers) {
    const agg = await prisma.order.aggregate({
      where: { userId: c.id, status: 'DELIVERED' },
      _sum: { pointsEarned: true },
    });
    const points = agg._sum.pointsEarned ?? 0;
    const tier = points >= 15000 ? 'PLATINUM' : points >= 6000 ? 'GOLD' : points >= 2000 ? 'SILVER' : 'BRONZE';
    await prisma.user.update({
      where: { id: c.id },
      data: { points, lifetimePoints: points, tier },
    });
    await prisma.pointsEntry.create({
      data: { userId: c.id, delta: points, reason: 'Historical orders', balance: points },
    });
  }

  /* ------------------------------ reservations --------------------------- */
  const times = ['12:30', '13:00', '19:00', '19:30', '20:00', '20:30', '21:00'];
  let reservationCount = 0;
  for (let day = -7; day <= 14; day++) {
    const date = new Date(Date.now() + day * 86_400_000).toISOString().slice(0, 10);
    const n = 2 + Math.floor(Math.random() * 5);
    const usedTables = new Set<string>();
    for (let i = 0; i < n; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const guests = [2, 2, 4, 4, 4, 6, 8][Math.floor(Math.random() * 7)];
      const table = FLOOR_PLAN.find((t) => t.seats >= guests && !usedTables.has(`${t.id}-${i}`));
      if (table) usedTables.add(`${table.id}-${i}`);
      await prisma.reservation.create({
        data: {
          code: reservationCode(),
          userId: customer.id,
          tableId: table?.id ?? null,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          date,
          time: times[Math.floor(Math.random() * times.length)],
          guests,
          durationMin: guests <= 2 ? 75 : guests <= 4 ? 90 : 120,
          seating: 'ANY',
          status: day < 0 ? 'COMPLETED' : 'CONFIRMED',
        },
      });
      reservationCount += 1;
    }
  }
  console.log(`[seed] ${reservationCount} reservations`);

  /* -------------------------------- reviews ------------------------------ */
  const reviewCustomers = customers.slice(0, TESTIMONIALS.length);
  for (const [i, t] of TESTIMONIALS.entries()) {
    const customer = reviewCustomers[i % reviewCustomers.length];
    await prisma.review.create({
      data: {
        userId: customer.id,
        menuItemId: menuIds[i % menuIds.length],
        rating: t.rating,
        title: `${t.source} review`,
        body: t.quote,
        isApproved: true,
      },
    });
  }

  /* ------------------------------- marketing ----------------------------- */
  await prisma.newsletterSubscriber.createMany({
    data: customers.map((c) => ({ email: c.email, name: c.name, source: 'seed' })),
  });
  await prisma.campaign.create({
    data: {
      name: 'Ramadan Iftar 2026',
      subject: 'Iftar bookings are now open',
      body: 'Our iftar buffet opens twenty minutes before maghrib. Two sittings nightly — book early, last Ramadan sold out ten days ahead.',
      segment: 'ALL',
      status: 'SENT',
      sentAt: new Date(),
      recipients: customers.length,
      opens: Math.floor(customers.length * 0.62),
      clicks: Math.floor(customers.length * 0.28),
    },
  });
  await prisma.eventEnquiry.createMany({
    data: [
      { name: 'Hamza Sheikh', email: 'hamza@example.com', phone: '03211234567', type: 'CORPORATE', date: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10), guests: 14, budget: 90000, details: 'Client dinner in the Margalla Room. Need a GST invoice.', status: 'NEW' },
      { name: 'Sarah Malik', email: 'sarah@example.com', phone: '03009876543', type: 'WEDDING', date: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10), guests: 350, budget: 1400000, details: 'Walima reception, outdoor catering.', status: 'CONTACTED' },
    ],
  });
  await prisma.contactMessage.create({
    data: {
      name: 'Bilal Raza',
      email: 'bilal@example.com',
      phone: '03123456789',
      subject: 'Lost item',
      message: 'I think I left a grey scarf at table 14 on Saturday evening. Could you check the lost property?',
    },
  });

  console.log('[seed] complete');
  console.log(`
  Sign-in credentials
  ────────────────────────────────────────────
  Super Admin  admin@islamabadrestaurant.pk   / Admin@1234
  Manager      manager@islamabadrestaurant.pk / Manager@1234
  Kitchen      kitchen@islamabadrestaurant.pk / Staff@1234
  Customer     ayesha@example.com             / Customer@1234
`);
}

await main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
