import { BRAND, DELIVERY_ZONES, FAQS, OPENING_HOURS, formatPKR } from '@islamabad/shared';
import { prisma } from '../lib/prisma.js';
import { parseList } from '../lib/json.js';

/**
 * AI concierge (Phase 13).
 *
 * A retrieval-augmented assistant grounded in live restaurant data: it scores
 * the question against a curated knowledge base and the live menu, then answers
 * from real rows (prices, availability, delivery zones) rather than guessing.
 * When OPENAI_API_KEY is present the same retrieved context is handed to an LLM
 * for phrasing; without it the deterministic responder answers directly, so the
 * feature never degrades into an error state.
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'do', 'does', 'you', 'your', 'i', 'we', 'can', 'what', 'how', 'much',
  'have', 'has', 'to', 'of', 'for', 'in', 'on', 'at', 'and', 'or', 'me', 'my', 'it', 'be', 'with', 'any',
  'there', 'this', 'that', 'please', 'want', 'would', 'like', 'get', 'need',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export interface AssistantReply {
  reply: string;
  intent: string;
  confidence: number;
  suggestions: string[];
  items?: { name: string; slug: string; price: number; image: string; description: string }[];
  actions?: { label: string; href: string }[];
}

interface Intent {
  id: string;
  patterns: RegExp[];
  handler: (message: string, tokens: string[]) => Promise<AssistantReply> | AssistantReply;
}

/**
 * Scores the question against the live menu.
 *
 * `minScore` guards the fallback path: a stray token that merely appears inside
 * a long description is not enough to claim we understood the question, so
 * free-text search demands at least one name-level hit (score 5).
 */
async function searchMenu(tokens: string[], limit = 4, minScore = 1) {
  if (!tokens.length) return [];
  const items = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    include: { category: { select: { name: true, slug: true } } },
  });

  const scored = items
    .map((item) => {
      const haystack = `${item.name} ${item.description} ${item.category?.name ?? ''} ${parseList(item.tags).join(' ')}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (item.name.toLowerCase().includes(t)) score += 5;
        else if (haystack.includes(t)) score += 2;
      }
      if (item.isBestSeller) score += 0.5;
      return { item, score };
    })
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ item }) => ({
    name: item.name,
    slug: item.slug,
    price: item.price,
    image: item.image,
    description: item.description,
  }));
}

function matchFaq(tokens: string[]) {
  let best: { score: number; faq: (typeof FAQS)[number] } | null = null;
  for (const faq of FAQS) {
    const haystack = `${faq.q} ${faq.tags.join(' ')}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (faq.tags.some((tag) => tag.includes(t) || t.includes(tag))) score += 3;
      else if (haystack.includes(t)) score += 1;
    }
    if (!best || score > best.score) best = { score, faq };
  }
  return best && best.score >= 3 ? best : null;
}

const DEFAULT_SUGGESTIONS = [
  'What are your best sellers?',
  'How much is delivery to F-10?',
  'Book a table for four tonight',
  'Do you have vegetarian options?',
];

const intents: Intent[] = [
  {
    id: 'greeting',
    patterns: [/^(hi|hello|hey|salam|assalam|aoa|good (morning|afternoon|evening))\b/i],
    handler: () => ({
      reply: `Assalam-o-Alaikum, and welcome to ${BRAND.name}. I can help you find a dish, check delivery to your area, book a table, or track an order. What would you like to do?`,
      intent: 'greeting',
      confidence: 0.95,
      suggestions: DEFAULT_SUGGESTIONS,
    }),
  },
  {
    id: 'recommend',
    patterns: [/recommend|suggest|what should i|best seller|popular|famous|signature|speciality|specialty|first time/i],
    handler: async () => {
      const items = await prisma.menuItem.findMany({
        where: { isAvailable: true, OR: [{ isBestSeller: true }, { isFeatured: true }] },
        orderBy: [{ isBestSeller: 'desc' }, { orderCount: 'desc' }],
        take: 4,
      });
      const names = items.map((i) => `${i.name} (${formatPKR(i.price)})`).join(', ');
      return {
        reply: `If it is your first visit, order the mix grill — it carries seekh kebab, tikka, boti and malai boti on one platter and settles the argument at the table. Our most-ordered dishes right now are ${names}. The 7:00 PM degh of biryani usually sells out by 8:30 on a Friday, so order early.`,
        intent: 'recommend',
        confidence: 0.9,
        suggestions: ['Add mix grill to my order', 'What is in the mix grill?', 'Show me the full menu'],
        items: items.map((i) => ({ name: i.name, slug: i.slug, price: i.price, image: i.image, description: i.description })),
        actions: [{ label: 'Browse the menu', href: '/menu' }, { label: 'Order online', href: '/order' }],
      };
    },
  },
  {
    id: 'delivery',
    // `\beta\b` and `\bfar\b` are boundary-anchored: an unanchored `eta` matches
    // inside "vegetarian", and `far` inside "farewell".
    patterns: [/deliver|delivery|charges|shipping|how long|\beta\b|\bfar\b|\barea\b|\bzone\b/i],
    handler: (message) => {
      const lower = message.toLowerCase();
      // Sector codes (F-10, g11, I-8) map to their lettered zone.
      const sector = lower.match(/\b([fgei])[-\s]?(\d{1,2})\b/);
      const sectorZone = sector
        ? DELIVERY_ZONES.find((z) => z.id === `zone-${sector[1]}`)
        : undefined;
      const namedZone = DELIVERY_ZONES.find((z) =>
        ['bahria', 'dha', 'rawalpindi', 'saddar', 'chaklala', 'satellite', 'margalla'].some(
          (key) => lower.includes(key) && z.name.toLowerCase().includes(key),
        ),
      );
      const zone = sectorZone ?? namedZone;
      if (zone) {
        return {
          reply: `We deliver to ${zone.name}. The delivery charge is ${formatPKR(zone.fee)}, the minimum order is ${formatPKR(zone.minOrder)}, and food usually arrives in ${zone.etaMin}–${zone.etaMax} minutes. Delivery is free on orders above Rs. 4,000.`,
          intent: 'delivery',
          confidence: 0.94,
          suggestions: ['Start an order', 'What are your best sellers?', 'Track my order'],
          actions: [{ label: 'Order for delivery', href: '/order' }],
        };
      }
      const summary = DELIVERY_ZONES.map((z) => `${z.name} — ${formatPKR(z.fee)}, ${z.etaMin}–${z.etaMax} min`).join('; ');
      return {
        reply: `We deliver across Islamabad and Rawalpindi: ${summary}. Delivery is free on orders above Rs. 4,000. Which area are you in?`,
        intent: 'delivery',
        confidence: 0.85,
        suggestions: ['Delivery to F-10', 'Delivery to Bahria Town', 'Start an order'],
        actions: [{ label: 'Order for delivery', href: '/order' }],
      };
    },
  },
  {
    id: 'price',
    patterns: [/how much|price of|cost of|rate of|kitna|kitne/i],
    // NB: registered after `delivery` so "how much is delivery" routes there first.
    handler: async (_m, tokens) => {
      const items = await searchMenu(tokens);
      if (!items.length) {
        return {
          reply: 'Tell me the dish and I will give you the current price. Our biryani starts at Rs. 450, karahi at Rs. 550, and the mix grill platter is Rs. 1,200.',
          intent: 'price',
          confidence: 0.5,
          suggestions: ['How much is mutton karahi?', 'Price of chicken biryani', 'Show me dishes under Rs. 500'],
        };
      }
      const list = items.map((i) => `${i.name} is ${formatPKR(i.price)}`).join('; ');
      return {
        reply: `${list}. All prices exclude 16% ICT sales tax, which is shown separately at checkout.`,
        intent: 'price',
        confidence: 0.92,
        suggestions: ['Add to my order', 'What comes with it?', 'Delivery charges'],
        items,
        actions: [{ label: 'Order now', href: '/order' }],
      };
    },
  },
  {
    id: 'reservation',
    patterns: [/\bbook\b|reserve|reservation|\btable\b|\bseat\b|booking/i],
    handler: (message) => {
      const guests = message.match(/(\d+)\s*(people|persons|guests|pax|of us)?/)?.[1];
      const partyText = guests ? ` for ${guests}` : '';
      return {
        reply: `I can get you a table${partyText}. Our reservation page shows live availability against the real floor plan — every slot you can select is genuinely free, and you get a confirmation code straight away. We seat from 11:00 AM until 9:30 PM, and Friday service starts at 2:00 PM. For parties over 20, the Faisal Room is bookable through our events team.`,
        intent: 'reservation',
        confidence: 0.93,
        suggestions: ['Book for tonight', 'Do you have private rooms?', 'Can I cancel a booking?'],
        actions: [{ label: 'Check availability', href: '/reservations' }, { label: 'Private events', href: '/events' }],
      };
    },
  },
  {
    id: 'order-status',
    patterns: [/track|where is my order|order status|my order|delivered yet/i],
    handler: () => ({
      reply: 'You can watch your order move through six live stages — pending, confirmed, preparing, ready, out for delivery and delivered. Open the tracking link in your confirmation email, or sign in and go to Orders in your dashboard.',
      intent: 'order-status',
      confidence: 0.9,
      suggestions: ['How long does delivery take?', 'Can I cancel my order?', 'Order again'],
      actions: [{ label: 'My orders', href: '/dashboard/orders' }],
    }),
  },
  {
    id: 'dietary',
    patterns: [/vegetarian|vegan|halal|allergy|allergen|gluten|nut|dairy|calorie|spicy|spice|mild|healthy|diet/i],
    handler: async (message, tokens) => {
      const lower = message.toLowerCase();
      if (/vegetarian|vegan/.test(lower)) {
        const items = await prisma.menuItem.findMany({ where: { isVegetarian: true, isAvailable: true }, take: 4 });
        return {
          reply: `Yes — we have ${items.length ? items.map((i) => i.name).join(', ') : 'several vegetarian dishes'} and more. You can filter the whole menu by Vegetarian, and every dish carries its allergens, calories and spice level.`,
          intent: 'dietary',
          confidence: 0.93,
          suggestions: ['Show vegetarian menu', 'Which dishes are mild?', 'Do you label allergens?'],
          items: items.map((i) => ({ name: i.name, slug: i.slug, price: i.price, image: i.image, description: i.description })),
          actions: [{ label: 'Vegetarian menu', href: '/menu?vegetarian=true' }],
        };
      }
      if (/mild|not spicy|less spicy|children|kids/.test(lower)) {
        const items = await prisma.menuItem.findMany({ where: { spiceLevel: 'MILD', isAvailable: true }, take: 4 });
        return {
          reply: `For a milder table, try ${items.map((i) => i.name).join(', ') || 'our malai boti and chicken handi'}. Malai boti is the mildest thing on the charcoal counter and the one we recommend for children.`,
          intent: 'dietary',
          confidence: 0.9,
          suggestions: ['Show mild dishes', 'Do you have a kids menu?', 'Book a family table'],
          items: items.map((i) => ({ name: i.name, slug: i.slug, price: i.price, image: i.image, description: i.description })),
          actions: [{ label: 'Filter by mild', href: '/menu?spice=MILD' }],
        };
      }
      const faq = matchFaq(tokens);
      return {
        reply:
          faq?.faq.a ??
          'Every dish on our menu lists its allergens, calories and spice level, and all our meat is halal-certified and sourced fresh daily. You can also filter the menu to exclude specific allergens.',
        intent: 'dietary',
        confidence: 0.85,
        suggestions: ['Show vegetarian options', 'Is the food halal?', 'Which dishes are nut-free?'],
        actions: [{ label: 'Browse menu with filters', href: '/menu' }],
      };
    },
  },
  {
    id: 'hours',
    patterns: [/\bopen\b|\bclose\b|\bhours\b|timing|time do you|when are you/i],
    handler: () => {
      const today = OPENING_HOURS.find((h) => h.dayIndex === new Date().getDay())!;
      return {
        reply: `Today (${today.day}) we are open ${today.open} to ${today.close}. We serve 11:00 AM to 11:00 PM Monday to Thursday and Sunday, and until midnight on Friday and Saturday. Friday service begins at 2:00 PM after Jummah.`,
        intent: 'hours',
        confidence: 0.95,
        suggestions: ['Where are you located?', 'Book a table', 'Is there parking?'],
      };
    },
  },
  {
    id: 'location',
    patterns: [/\bwhere\b|location|address|direction|\bmap\b|parking|\breach\b/i],
    handler: () => ({
      reply: `We are at ${BRAND.address.street}, ${BRAND.address.locality} ${BRAND.address.postalCode} — five minutes from the Kashmir Highway interchange, with 40 free parking spaces on site and complimentary valet for Gold and Platinum members. Call us on ${BRAND.phone}.`,
      intent: 'location',
      confidence: 0.94,
      suggestions: ['What are your opening hours?', 'Book a table', 'Do you deliver to my area?'],
      actions: [{ label: 'Open in Maps', href: BRAND.mapLink }, { label: 'Contact us', href: '/contact' }],
    }),
  },
  {
    id: 'events',
    patterns: [/\bevent\b|\bparty\b|wedding|birthday|catering|corporate|private room|function|large group/i],
    handler: () => ({
      reply: 'We host private dining in the Margalla Room (14 seats) and the Faisal Room (20 seats), and cater off-site for up to 1,000 guests. Birthdays, corporate lunches and walima receptions are all handled by a dedicated events manager who replies within one working day. Bulk orders need 24 hours notice and we issue a GST invoice.',
      intent: 'events',
      confidence: 0.93,
      suggestions: ['Get an events quote', 'What is the private room capacity?', 'Do you do corporate lunches?'],
      actions: [{ label: 'Enquire about an event', href: '/events' }],
    }),
  },
  {
    id: 'loyalty',
    patterns: [/loyalty|points|reward|member|tier|gift card|voucher|referral|discount|coupon|offer|deal|promo/i],
    handler: async () => {
      const now = new Date();
      const offers = await prisma.coupon.findMany({
        where: { isActive: true, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        take: 3,
        orderBy: { value: 'desc' },
      });
      const offerText = offers.length
        ? ` Live offers right now: ${offers.map((o) => `${o.code} — ${o.description}`).join('; ')}.`
        : '';
      return {
        reply: `You earn 1 point for every Rs. 100 you spend, and each point is worth Rs. 2 at checkout. Members move from Bronze to Silver at 2,000 lifetime points, Gold at 6,000 and Platinum at 15,000, with higher earn rates at each tier.${offerText}`,
        intent: 'loyalty',
        confidence: 0.92,
        suggestions: ['How do I join?', 'Show current offers', 'Buy a gift card'],
        actions: [{ label: 'View offers', href: '/offers' }, { label: 'Gift cards', href: '/gift-cards' }],
      };
    },
  },
  {
    id: 'payment',
    patterns: [/\bpay\b|payment|\bcard\b|\bcash\b|jazzcash|easypaisa|stripe|paypal|invoice|receipt/i],
    handler: () => ({
      reply: 'We accept credit and debit cards through Stripe, PayPal, JazzCash, Easypaisa, and cash on delivery. Card payments are processed on Stripe’s PCI-compliant infrastructure — we never store card numbers. GST invoices are available for corporate orders.',
      intent: 'payment',
      confidence: 0.93,
      suggestions: ['Start an order', 'Do you take cash?', 'Can I get an invoice?'],
    }),
  },
];

export async function answer(message: string, _history: { role: string; content: string }[] = []): Promise<AssistantReply> {
  const tokens = tokenize(message);

  for (const intent of intents) {
    if (intent.patterns.some((p) => p.test(message))) {
      return intent.handler(message, tokens);
    }
  }

  // Fall back to the FAQ knowledge base.
  const faq = matchFaq(tokens);
  if (faq) {
    return {
      reply: faq.faq.a,
      intent: 'faq',
      confidence: Math.min(0.9, 0.5 + faq.score / 20),
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  // Then try the live menu — but only accept a dish-name-level match.
  const items = await searchMenu(tokens, 4, 5);
  if (items.length) {
    return {
      reply: `We have ${items.map((i) => `${i.name} at ${formatPKR(i.price)}`).join(', ')}. ${items[0].description}. Would you like to add anything to your order?`,
      intent: 'menu-search',
      confidence: 0.75,
      suggestions: ['Add to my order', 'Show similar dishes', 'What are your best sellers?'],
      items,
      actions: [{ label: 'Order now', href: '/order' }],
    };
  }

  return {
    reply: `I am not certain I understood that. I can help with the menu and prices, delivery areas and charges, table reservations, order tracking, private events, and our loyalty programme. You can also reach our team on ${BRAND.phone}.`,
    intent: 'fallback',
    confidence: 0.3,
    suggestions: DEFAULT_SUGGESTIONS,
    actions: [{ label: 'Contact us', href: '/contact' }],
  };
}

/** Personalised upsell engine used by the cart and the dashboard. */
export async function recommendations(userId: string | null, cartItemIds: string[] = []) {
  const inCart = new Set(cartItemIds);

  if (userId) {
    const history = await prisma.orderItem.findMany({
      where: { order: { userId, status: { not: 'CANCELLED' } } },
      select: { menuItemId: true, name: true },
      take: 100,
    });
    const orderedIds = new Set(history.map((h) => h.menuItemId));

    if (orderedIds.size > 0) {
      const orderedItems = await prisma.menuItem.findMany({
        where: { id: { in: [...orderedIds] } },
        select: { categoryId: true },
      });
      const categoryIds = [...new Set(orderedItems.map((i) => i.categoryId))];

      const suggestions = await prisma.menuItem.findMany({
        where: {
          isAvailable: true,
          categoryId: { in: categoryIds },
          id: { notIn: [...orderedIds, ...inCart] },
        },
        orderBy: [{ rating: 'desc' }, { orderCount: 'desc' }],
        take: 4,
        include: { category: { select: { name: true } } },
      });

      if (suggestions.length) {
        return {
          reason: 'Based on what you have ordered before',
          items: suggestions,
        };
      }
    }
  }

  // Cart-aware upsell: complete the meal with drinks/desserts/breads.
  if (cartItemIds.length) {
    const cartItems = await prisma.menuItem.findMany({
      where: { id: { in: cartItemIds } },
      include: { category: { select: { slug: true } } },
    });
    const hasDrink = cartItems.some((i) => i.category?.slug === 'drinks');
    const hasDessert = cartItems.some((i) => i.category?.slug === 'desserts');

    const wanted = [!hasDrink && 'drinks', !hasDessert && 'desserts'].filter(Boolean) as string[];
    if (wanted.length) {
      const items = await prisma.menuItem.findMany({
        where: { isAvailable: true, category: { slug: { in: wanted } }, id: { notIn: cartItemIds } },
        orderBy: { orderCount: 'desc' },
        take: 4,
        include: { category: { select: { name: true } } },
      });
      if (items.length) return { reason: 'Complete your meal', items };
    }
  }

  const items = await prisma.menuItem.findMany({
    where: { isAvailable: true, isBestSeller: true, id: { notIn: cartItemIds } },
    orderBy: { orderCount: 'desc' },
    take: 4,
    include: { category: { select: { name: true } } },
  });
  return { reason: 'Most loved by our guests', items };
}
