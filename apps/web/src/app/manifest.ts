import type { MetadataRoute } from 'next';
import { BRAND } from '@islamabad/shared';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.tagline}`,
    short_name: BRAND.shortName,
    description:
      'Order Pakistani fine dining, book a table and track deliveries from Islamabad Restaurant, Margalla Town.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    orientation: 'portrait',
    categories: ['food', 'restaurant', 'shopping'],
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    shortcuts: [
      { name: 'Order online', url: '/order', description: 'Start a delivery or pickup order' },
      { name: 'Book a table', url: '/reservations', description: 'Check live table availability' },
      { name: 'View menu', url: '/menu', description: 'Browse the full menu' },
    ],
  };
}
