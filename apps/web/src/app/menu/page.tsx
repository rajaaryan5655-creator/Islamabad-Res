import { api, type MenuCategory, type MenuItem } from '@/lib/api';
import { PageHero } from '@/components/layout/page-hero';
import { MenuBrowser } from '@/components/menu/menu-browser';
import { JsonLd, breadcrumbSchema, buildMetadata, menuSchema } from '@/lib/seo';

export const revalidate = 300;

export const metadata = buildMetadata({
  title: 'Menu — Biryani, BBQ, Karahi & More',
  description:
    'The full Islamabad Restaurant menu: degh-cooked biryani, charcoal BBQ, karahi and handi, Chinese, desserts and drinks. Every dish lists calories, allergens and spice level. Order online for delivery across Islamabad.',
  path: '/menu',
  keywords: ['menu', 'biryani menu Islamabad', 'BBQ menu', 'karahi price Islamabad', 'restaurant menu with calories'],
});

async function getData() {
  try {
    const [menu, cats] = await Promise.all([
      api.get<{ items: MenuItem[] }>('/api/menu?pageSize=100&sort=popular', { revalidate: 300 }),
      api.get<{ categories: MenuCategory[] }>('/api/menu/categories', { revalidate: 600 }),
    ]);
    return { items: menu.items, categories: cats.categories };
  } catch {
    return { items: [], categories: [] };
  }
}

export default async function MenuPage() {
  const { items, categories } = await getData();

  return (
    <>
      <JsonLd data={menuSchema(items)} />
      <JsonLd data={breadcrumbSchema([{ name: 'Menu', path: '/menu' }])} />

      <PageHero
        eyebrow="Our Kitchen"
        title="The Menu"
        accent="in full"
        description="Everything is cooked to order. Calories, allergens and spice levels are listed on every dish — filter by what you can and cannot eat."
        image="/images/dish-mix-grill.jpg"
        breadcrumbs={[{ label: 'Menu', href: '/menu' }]}
      />

      <MenuBrowser initialItems={items} categories={categories} />
    </>
  );
}
