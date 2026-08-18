import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/dashboard', '/dashboard/', '/checkout', '/track/', '/api/'],
      },
      // Give the major crawlers explicit clearance on the commercial pages.
      { userAgent: 'Googlebot', allow: ['/', '/menu/', '/blog/'], disallow: ['/admin', '/dashboard', '/checkout'] },
      { userAgent: 'Bingbot', allow: '/', disallow: ['/admin', '/dashboard', '/checkout'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
