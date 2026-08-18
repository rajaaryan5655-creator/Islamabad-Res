import { Router } from 'express';
import { categorySchema, menuItemSchema, menuQuerySchema } from '@islamabad/shared';
import { prisma } from '../lib/prisma.js';
import { cache, cached, CACHE_KEYS } from '../lib/cache.js';
import { parseList, stringifyList } from '../lib/json.js';
import {
  asyncHandler,
  authenticate,
  notFound,
  requireManager,
  requireStaff,
  validate,
  param,
} from '../middleware/index.js';
import { audit } from '../services/audit.js';

export const menuRouter = Router();

type MenuRow = Awaited<ReturnType<typeof prisma.menuItem.findMany>>[number];

function serialize(item: MenuRow & { category?: { name: string; slug: string } | null }) {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    price: item.price,
    compareAtPrice: item.compareAtPrice,
    categoryId: item.categoryId,
    category: item.category?.name ?? null,
    categorySlug: item.category?.slug ?? null,
    image: item.image,
    gallery: parseList(item.gallery),
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    spiceLevel: item.spiceLevel,
    allergens: parseList(item.allergens),
    tags: parseList(item.tags),
    isVegetarian: item.isVegetarian,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    isBestSeller: item.isBestSeller,
    prepMinutes: item.prepMinutes,
    serves: item.serves,
    rating: item.rating,
    ratingCount: item.ratingCount,
    orderCount: item.orderCount,
  };
}

const invalidateMenu = async () => {
  await cache.delPrefix(CACHE_KEYS.menu);
  await cache.del(CACHE_KEYS.categories);
};

/* -------------------------------- public --------------------------------- */

menuRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await cached(CACHE_KEYS.categories, 300, async () => {
      const rows = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { items: true } } },
      });
      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        image: c.image,
        itemCount: c._count.items,
      }));
    });
    res.json({ categories });
  }),
);

menuRouter.get(
  '/',
  validate(menuQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.validated as import('zod').infer<typeof menuQuerySchema>;
    const key = `${CACHE_KEYS.menu}${JSON.stringify(q)}`;

    const payload = await cached(key, 120, async () => {
      const where: Record<string, unknown> = {};
      if (q.available !== false) where.isAvailable = true;
      if (q.category && q.category !== 'all') where.category = { slug: q.category };
      if (q.vegetarian) where.isVegetarian = true;
      if (q.spice) where.spiceLevel = q.spice.toUpperCase();
      if (q.minPrice || q.maxPrice) {
        where.price = {
          ...(q.minPrice ? { gte: q.minPrice } : {}),
          ...(q.maxPrice ? { lte: q.maxPrice } : {}),
        };
      }
      if (q.search) {
        where.OR = [
          { name: { contains: q.search } },
          { description: { contains: q.search } },
        ];
      }

      const orderBy =
        q.sort === 'price-asc'
          ? { price: 'asc' as const }
          : q.sort === 'price-desc'
            ? { price: 'desc' as const }
            : q.sort === 'rating'
              ? { rating: 'desc' as const }
              : q.sort === 'name'
                ? { name: 'asc' as const }
                : q.sort === 'popular'
                  ? { orderCount: 'desc' as const }
                  : { sortOrder: 'asc' as const };

      const [rows, total] = await Promise.all([
        prisma.menuItem.findMany({
          where,
          orderBy,
          include: { category: { select: { name: true, slug: true } } },
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        }),
        prisma.menuItem.count({ where }),
      ]);

      let items = rows.map(serialize);

      // Allergen exclusion is applied post-query because allergens are stored
      // as a JSON string for cross-provider compatibility.
      if (q.excludeAllergens) {
        const excluded = q.excludeAllergens.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);
        items = items.filter((i) => !i.allergens.some((a) => excluded.includes(a.toLowerCase())));
      }

      return {
        items,
        total,
        page: q.page,
        pageSize: q.pageSize,
        totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      };
    });

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(payload);
  }),
);

menuRouter.get(
  '/featured',
  asyncHandler(async (_req, res) => {
    const items = await cached(`${CACHE_KEYS.menu}featured`, 300, async () => {
      const rows = await prisma.menuItem.findMany({
        where: { isAvailable: true, OR: [{ isFeatured: true }, { isBestSeller: true }] },
        include: { category: { select: { name: true, slug: true } } },
        orderBy: [{ isBestSeller: 'desc' }, { orderCount: 'desc' }],
        take: 8,
      });
      return rows.map(serialize);
    });
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    res.json({ items });
  }),
);

menuRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const item = await prisma.menuItem.findUnique({
      where: { slug: param(req, 'slug') },
      include: {
        category: { select: { name: true, slug: true } },
        reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!item) throw notFound('That dish is not on our menu');

    const related = await prisma.menuItem.findMany({
      where: { categoryId: item.categoryId, id: { not: item.id }, isAvailable: true },
      include: { category: { select: { name: true, slug: true } } },
      take: 4,
    });

    res.json({
      item: serialize(item),
      reviews: item.reviews,
      related: related.map(serialize),
    });
  }),
);

/* --------------------------- admin: menu items --------------------------- */

menuRouter.post(
  '/',
  authenticate,
  requireManager,
  validate(menuItemSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('zod').infer<typeof menuItemSchema>;
    const slug = input.slug ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const item = await prisma.menuItem.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        price: input.price,
        compareAtPrice: input.compareAtPrice ?? null,
        categoryId: input.categoryId,
        image: input.image,
        calories: input.calories ?? null,
        protein: input.protein ?? null,
        spiceLevel: input.spiceLevel ?? 'MEDIUM',
        allergens: stringifyList(input.allergens),
        isVegetarian: input.isVegetarian ?? false,
        isAvailable: input.isAvailable ?? true,
        isFeatured: input.isFeatured ?? false,
        isBestSeller: input.isBestSeller ?? false,
        prepMinutes: input.prepMinutes ?? 20,
        serves: input.serves ?? 1,
        sortOrder: input.sortOrder ?? 0,
      },
      include: { category: { select: { name: true, slug: true } } },
    });
    await invalidateMenu();
    await audit(req.user!.sub, 'menu.create', 'MenuItem', item.id, req);
    res.status(201).json({ item: serialize(item) });
  }),
);

menuRouter.patch(
  '/:id',
  authenticate,
  requireManager,
  validate(menuItemSchema.partial()),
  asyncHandler(async (req, res) => {
    const input = req.body as Partial<import('zod').infer<typeof menuItemSchema>>;
    const item = await prisma.menuItem.update({
      where: { id: param(req, 'id') },
      data: {
        ...input,
        allergens: input.allergens ? stringifyList(input.allergens) : undefined,
      },
      include: { category: { select: { name: true, slug: true } } },
    });
    await invalidateMenu();
    await audit(req.user!.sub, 'menu.update', 'MenuItem', item.id, req);
    res.json({ item: serialize(item) });
  }),
);

/** Staff can toggle 86'd items without full menu-management rights. */
menuRouter.patch(
  '/:id/availability',
  authenticate,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { isAvailable } = req.body as { isAvailable: boolean };
    const item = await prisma.menuItem.update({
      where: { id: param(req, 'id') },
      data: { isAvailable: Boolean(isAvailable) },
      include: { category: { select: { name: true, slug: true } } },
    });
    await invalidateMenu();
    await audit(req.user!.sub, 'menu.availability', 'MenuItem', item.id, req, { isAvailable });
    res.json({ item: serialize(item) });
  }),
);

menuRouter.delete(
  '/:id',
  authenticate,
  requireManager,
  asyncHandler(async (req, res) => {
    await prisma.menuItem.delete({ where: { id: param(req, 'id') } });
    await invalidateMenu();
    await audit(req.user!.sub, 'menu.delete', 'MenuItem', param(req, 'id'), req);
    res.json({ ok: true });
  }),
);

/* ---------------------------- admin: categories -------------------------- */

menuRouter.post(
  '/categories',
  authenticate,
  requireManager,
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const input = req.body as import('zod').infer<typeof categorySchema>;
    const category = await prisma.category.create({
      data: {
        ...input,
        slug: input.slug ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      },
    });
    await invalidateMenu();
    res.status(201).json({ category });
  }),
);

menuRouter.patch(
  '/categories/:id',
  authenticate,
  requireManager,
  validate(categorySchema.partial()),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.update({ where: { id: param(req, 'id') }, data: req.body });
    await invalidateMenu();
    res.json({ category });
  }),
);

menuRouter.delete(
  '/categories/:id',
  authenticate,
  requireManager,
  asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: param(req, 'id') } });
    await invalidateMenu();
    res.json({ ok: true });
  }),
);

export { serialize as serializeMenuItem };
