import { api, type MenuCategory, type MenuItem } from '@/lib/api';
import { PageHero } from '@/components/layout/page-hero';
import { OrderBrowser } from '@/components/commerce/order-browser';
import { JsonLd, breadcrumbSchema, buildMetadata } from '@/lib/seo';
import { DELIVERY_ZONES } from '@islamabad/shared';
import { formatPKR } from '@/lib/utils';

export const revalidate = 300;

export const metadata = buildMetadata({
  title: 'Order Online — Delivery Across Islamabad & Rawalpindi',
  description:
    'Order Pakistani food online from Islamabad Restaurant. Biryani, BBQ and karahi delivered in 30–45 minutes across the F, G and E sectors, Bahria Town, DHA and Rawalpindi. Card, JazzCash, Easypaisa or cash.',
  path: '/order',
  keywords: ['order food online Islamabad', 'food delivery Islamabad', 'biryani delivery', 'BBQ delivery Islamabad'],
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

export default async function OrderPage() {
  const { items, categories } = await getData();

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Order Online', path: '/order' }])} />

      <PageHero
        eyebrow="Delivery & Pickup"
        title="Order Online"
        accent="in 90 seconds"
        description="Cooked to order and dispatched hot. Live tracking from the kitchen to your door."
        image="/images/dish-chicken-biryani.jpg"
        breadcrumbs={[{ label: 'Order Online', href: '/order' }]}
      />

      {/* delivery zones */}
      <section className="border-b border-black/8 bg-white py-8">
        <div className="container-luxe">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            Delivery zones, charges &amp; times
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {DELIVERY_ZONES.map((z) => (
              <div key={z.id} className="rounded-sm border border-black/10 p-3.5">
                <p className="text-sm font-medium leading-tight">{z.name}</p>
                <p className="mt-1.5 text-xs text-black/50">
                  {formatPKR(z.fee)} · {z.etaMin}–{z.etaMax} min
                </p>
                <p className="text-xs text-black/40">Min order {formatPKR(z.minOrder)}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-emerald-700">Delivery is free on every order above Rs. 4,000.</p>
        </div>
      </section>

      <OrderBrowser items={items} categories={categories} />
    </>
  );
}
