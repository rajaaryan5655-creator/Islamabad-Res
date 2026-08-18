import type { MetadataRoute } from 'next';
import { BLOG_POSTS } from '@islamabad/shared';
import { api, type MenuItem } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/menu`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: `${SITE_URL}/order`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: `${SITE_URL}/reservations`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/gallery`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/events`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/offers`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/gift-cards`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.75 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  let dishRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await api.get<{ items: MenuItem[] }>('/api/menu?pageSize=200', { revalidate: 3600 });
    dishRoutes = res.items.map((item) => ({
      url: `${SITE_URL}/menu/${item.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }));
  } catch {
    // The sitemap must still build if the API is briefly unavailable.
  }

  return [...staticRoutes, ...dishRoutes, ...blogRoutes];
}
