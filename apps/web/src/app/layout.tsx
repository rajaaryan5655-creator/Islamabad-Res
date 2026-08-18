import type { Metadata, Viewport } from 'next';
import { cormorant, dancing, inter } from '@/lib/fonts';
import { BRAND } from '@islamabad/shared';
import { Providers } from '@/components/providers';
import { SiteChrome } from '@/components/layout/chrome';
import { RevealProvider } from '@/components/layout/reveal-provider';
import { JsonLd, restaurantSchema, SITE_URL } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline} | Fine Dining, BBQ & Biryani in Islamabad`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    'Award-winning Pakistani fine dining in Margalla Town, Islamabad. Degh-cooked biryani, charcoal BBQ and karahi since 1998. Book a table, order online, delivered across the twin cities in 45 minutes.',
  applicationName: BRAND.name,
  authors: [{ name: BRAND.legalName }],
  creator: BRAND.legalName,
  publisher: BRAND.legalName,
  formatDetection: { telephone: true, address: true, email: true },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },
  category: 'restaurant',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: SITE_URL,
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      'Award-winning Pakistani fine dining in Margalla Town, Islamabad. Degh-cooked biryani, charcoal BBQ and karahi since 1998.',
    images: [
      { url: '/images/hero-main.jpg', width: 1200, height: 630, alt: `${BRAND.name} — a Pakistani feast` },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: 'Order Pakistani fine dining, book a table and track deliveries across Islamabad.',
    images: ['/images/hero-main.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  verification: {
    // Replace with the real property token when the Google Business Profile is linked.
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-PK" className={`${cormorant.variable} ${inter.variable} ${dancing.variable}`}>
      <head>
        <JsonLd data={restaurantSchema()} />
      </head>
      <body>
        <Providers>
          <RevealProvider />
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
