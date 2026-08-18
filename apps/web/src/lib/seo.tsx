import type { Metadata } from 'next';
import { BRAND, OPENING_HOURS, FAQS } from '@islamabad/shared';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://islamabadrestaurant.pk';

/** Local-SEO keyword set (Phase 10). */
export const LOCAL_KEYWORDS = [
  'restaurant in Islamabad',
  'best biryani Islamabad',
  'BBQ restaurant Islamabad',
  'Pakistani restaurant Margalla Town',
  'food delivery Islamabad',
  'karahi Islamabad',
  'family restaurant Islamabad',
  'private dining Islamabad',
  'halal restaurant Islamabad',
  'iftar buffet Islamabad',
  'wedding catering Islamabad',
  'restaurant near F-10',
];

export function buildMetadata({
  title,
  description,
  path = '',
  image = '/images/hero-main.jpg',
  keywords = [],
  type = 'website',
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  type?: 'website' | 'article';
}): Metadata {
  const url = `${SITE_URL}${path}`;
  const fullTitle = path === '' ? title : `${title} | ${BRAND.name}`;

  return {
    title: fullTitle,
    description,
    keywords: [...LOCAL_KEYWORDS, ...keywords],
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: BRAND.name,
      locale: 'en_PK',
      type,
      images: [{ url: `${SITE_URL}${image}`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [`${SITE_URL}${image}`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  };
}

/* ----------------------------- structured data ---------------------------- */

export function restaurantSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${SITE_URL}/#restaurant`,
    name: BRAND.name,
    legalName: BRAND.legalName,
    description: BRAND.mission,
    url: SITE_URL,
    telephone: BRAND.phone,
    email: BRAND.email,
    image: [`${SITE_URL}/images/hero-main.jpg`, `${SITE_URL}/images/interior-hall.jpg`],
    logo: `${SITE_URL}/favicon.svg`,
    priceRange: BRAND.priceRange,
    currenciesAccepted: 'PKR',
    paymentAccepted: 'Cash, Credit Card, Debit Card, JazzCash, Easypaisa, PayPal',
    servesCuisine: [...BRAND.servesCuisine],
    foundingDate: String(BRAND.established),
    address: {
      '@type': 'PostalAddress',
      streetAddress: BRAND.address.street,
      addressLocality: BRAND.address.locality,
      addressRegion: BRAND.address.region,
      postalCode: BRAND.address.postalCode,
      addressCountry: BRAND.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: BRAND.geo.lat, longitude: BRAND.geo.lng },
    hasMap: BRAND.mapLink,
    openingHoursSpecification: OPENING_HOURS.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${h.day}`,
      opens: h.open,
      closes: h.close,
    })),
    acceptsReservations: 'True',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '2847', bestRating: '5' },
    sameAs: Object.values(BRAND.social),
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Free parking', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Private dining rooms', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Outdoor seating', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Wheelchair accessible', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Halal certified', value: true },
    ],
    potentialAction: [
      {
        '@type': 'OrderAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/order`, actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'] },
        deliveryMethod: ['https://schema.org/OnSitePickup', 'https://schema.org/ParcelService'],
      },
      {
        '@type': 'ReserveAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/reservations` },
        result: { '@type': 'FoodEstablishmentReservation', name: 'Table reservation' },
      },
    ],
  };
}

export function faqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function menuSchema(items: { name: string; description: string; price: number; category: string | null; image: string; isVegetarian: boolean; calories: number | null }[]) {
  const byCategory = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.category ?? 'Menu';
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: `${BRAND.name} Menu`,
    url: `${SITE_URL}/menu`,
    hasMenuSection: [...byCategory.entries()].map(([name, sectionItems]) => ({
      '@type': 'MenuSection',
      name,
      hasMenuItem: sectionItems.map((item) => ({
        '@type': 'MenuItem',
        name: item.name,
        description: item.description,
        image: `${SITE_URL}${item.image}`,
        offers: { '@type': 'Offer', price: item.price, priceCurrency: 'PKR' },
        suitableForDiet: item.isVegetarian ? 'https://schema.org/VegetarianDiet' : undefined,
        nutrition: item.calories ? { '@type': 'NutritionInformation', calories: `${item.calories} cal` } : undefined,
      })),
    })),
  };
}

export function articleSchema(post: { title: string; excerpt: string; date: string; author: string; image: string; slug: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: `${SITE_URL}${post.image}`,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: BRAND.name,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
  };
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is generated from trusted server-side constants.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
