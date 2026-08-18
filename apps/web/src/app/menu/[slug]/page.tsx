import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Flame, Leaf, Star, Users } from 'lucide-react';
import { api, type MenuItem } from '@/lib/api';
import { AddToCartPanel } from '@/components/menu/add-to-cart-panel';
import { DishCard } from '@/components/menu/dish-card';
import { JsonLd, SITE_URL, breadcrumbSchema, buildMetadata } from '@/lib/seo';
import { formatPKR } from '@/lib/utils';

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

interface DishResponse {
  item: MenuItem;
  related: MenuItem[];
  reviews: { id: string; rating: number; title: string | null; body: string; createdAt: string }[];
}

async function getDish(slug: string): Promise<DishResponse | null> {
  try {
    return await api.get<DishResponse>(`/api/menu/${slug}`, { revalidate: 300 });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await getDish(slug);
  if (!data) return buildMetadata({ title: 'Dish not found', description: 'This dish is no longer on our menu.' });

  const { item } = data;
  return buildMetadata({
    title: `${item.name} — ${formatPKR(item.price)}`,
    description: `${item.description} ${item.calories ? `${item.calories} calories.` : ''} Order ${item.name} online for delivery across Islamabad.`,
    path: `/menu/${item.slug}`,
    image: item.image,
    keywords: [item.name, `${item.name} Islamabad`, `${item.name} price`, item.category ?? ''],
  });
}

export default async function DishPage({ params }: Props) {
  const { slug } = await params;
  const data = await getDish(slug);
  if (!data) notFound();

  const { item, related, reviews } = data;
  const spiceCount = { MILD: 0, MEDIUM: 1, HOT: 2, FIERY: 3 }[item.spiceLevel] ?? 0;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'MenuItem',
          name: item.name,
          description: item.description,
          image: `${SITE_URL}${item.image}`,
          offers: { '@type': 'Offer', price: item.price, priceCurrency: 'PKR', availability: item.isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
          nutrition: item.calories ? { '@type': 'NutritionInformation', calories: `${item.calories} cal`, proteinContent: item.protein ? `${item.protein} g` : undefined } : undefined,
          suitableForDiet: item.isVegetarian ? 'https://schema.org/VegetarianDiet' : undefined,
          aggregateRating: item.ratingCount > 0 ? { '@type': 'AggregateRating', ratingValue: item.rating, reviewCount: item.ratingCount } : undefined,
        }}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Menu', path: '/menu' },
          { name: item.name, path: `/menu/${item.slug}` },
        ])}
      />

      <div className="bg-cream pt-[7.5rem]">
        <div className="container-luxe py-10">
          <nav aria-label="Breadcrumb" className="mb-7 text-xs text-black/45">
            <Link href="/" className="hover:text-ember-500">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <Link href="/menu" className="hover:text-ember-500">
              Menu
            </Link>
            {item.categorySlug && (
              <>
                <span className="mx-1.5">/</span>
                <Link href={`/menu?category=${item.categorySlug}`} className="hover:text-ember-500">
                  {item.category}
                </Link>
              </>
            )}
            <span className="mx-1.5">/</span>
            <span className="text-black/70">{item.name}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-2">
            <div className="relative aspect-4/3 overflow-hidden rounded-sm bg-black/5">
              <Image
                src={item.image}
                alt={item.name}
                fill
                priority
                sizes="(max-width:1024px) 100vw, 50vw"
                className="object-cover"
              />
              {item.isBestSeller && (
                <span className="absolute left-4 top-4 rounded-full bg-ember-500 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-white">
                  Best Seller
                </span>
              )}
            </div>

            <div>
              {item.category && <p className="eyebrow mb-2">{item.category}</p>}
              <h1 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] font-semibold leading-tight">{item.name}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Star className="size-4 fill-saffron-400 text-saffron-400" />
                  <strong>{item.rating.toFixed(1)}</strong>
                  <span className="text-black/45">({item.ratingCount} reviews)</span>
                </span>
                {item.orderCount > 0 && <span className="text-black/45">{item.orderCount} ordered</span>}
              </div>

              <p className="mt-5 text-[1.02rem] leading-relaxed text-black/68 text-pretty">{item.description}</p>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-4xl font-semibold text-ember-500">{formatPKR(item.price)}</span>
                {item.compareAtPrice && (
                  <span className="text-lg text-black/35 line-through">{formatPKR(item.compareAtPrice)}</span>
                )}
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-black/10 py-5 sm:grid-cols-4">
                <div>
                  <dt className="flex items-center gap-1.5 text-[0.66rem] uppercase tracking-widest text-black/40">
                    <Clock className="size-3.5" /> Prep
                  </dt>
                  <dd className="mt-1 font-medium">{item.prepMinutes} min</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-[0.66rem] uppercase tracking-widest text-black/40">
                    <Users className="size-3.5" /> Serves
                  </dt>
                  <dd className="mt-1 font-medium">{item.serves}</dd>
                </div>
                {item.calories && (
                  <div>
                    <dt className="text-[0.66rem] uppercase tracking-widest text-black/40">Calories</dt>
                    <dd className="mt-1 font-medium">{item.calories} cal</dd>
                  </div>
                )}
                <div>
                  <dt className="flex items-center gap-1.5 text-[0.66rem] uppercase tracking-widest text-black/40">
                    <Flame className="size-3.5" /> Spice
                  </dt>
                  <dd className="mt-1 flex items-center gap-1 font-medium capitalize">
                    {item.spiceLevel.toLowerCase()}
                    {Array.from({ length: spiceCount }).map((_, i) => (
                      <Flame key={i} className="size-3 fill-ember-500 text-ember-500" />
                    ))}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                {item.isVegetarian && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-medium text-emerald-700">
                    <Leaf className="size-3.5" /> Vegetarian
                  </span>
                )}
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-black/5 px-3 py-1 text-xs capitalize text-black/60">
                    {tag}
                  </span>
                ))}
              </div>

              {item.allergens.length > 0 && (
                <div className="mt-5 rounded-sm border border-amber-300/60 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">Allergen information</p>
                  <p className="mt-1 text-sm capitalize text-amber-900/80">Contains {item.allergens.join(', ')}.</p>
                  <p className="mt-1 text-xs text-amber-900/60">
                    Prepared in a kitchen that handles nuts, dairy and gluten. Tell us about any allergy at checkout.
                  </p>
                </div>
              )}

              <AddToCartPanel item={item} />
            </div>
          </div>

          {reviews.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 font-display text-3xl">Guest reviews</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reviews.map((r) => (
                  <figure key={r.id} className="rounded-sm border border-black/8 bg-white p-5">
                    <div className="mb-2 flex gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="size-3.5 fill-saffron-400 text-saffron-400" />
                      ))}
                    </div>
                    <blockquote className="text-sm leading-relaxed text-black/68">“{r.body}”</blockquote>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 font-display text-3xl">
                More from <span className="script-accent">{item.category}</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((r) => (
                  <DishCard key={r.id} item={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
