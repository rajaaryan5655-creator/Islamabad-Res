import { prisma } from './prisma.js';

/** URL-safe slug: lowercase, ASCII, hyphen-separated. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

type SlugModel = 'category' | 'menuItem';

/**
 * Produces a slug that is unique within its table, appending -2, -3, … on
 * collision. Prevents a second "Chicken Karahi" from breaking /menu/[slug].
 */
export async function uniqueSlug(model: SlugModel, name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || 'item';
  const delegate = model === 'category' ? prisma.category : prisma.menuItem;

  for (let i = 1; i < 100; i += 1) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const existing = await (delegate as { findUnique: (a: unknown) => Promise<{ id: string } | null> }).findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}
