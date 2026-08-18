import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { api, type MenuItem, type Offer } from '@/lib/api';
import { Hero } from '@/components/home/hero';
import {
  AboutPreview,
  AwardsStrip,
  ChefSection,
  GalleryPreview,
  LocationSection,
  OffersBanner,
  ReservationCta,
  SectionHead,
  Testimonials,
  TimelineStrip,
  ValueStrip,
} from '@/components/home/sections';
import { DishCard } from '@/components/menu/dish-card';
import { Button } from '@/components/ui/button';
import { JsonLd, faqSchema } from '@/lib/seo';

// Rebuild the landing page every 5 minutes so featured dishes and live offers
// stay current without paying a database round-trip on every request.
export const revalidate = 300;

async function getFeatured(): Promise<MenuItem[]> {
  try {
    const res = await api.get<{ items: MenuItem[] }>('/api/menu/featured', { revalidate: 300 });
    return res.items;
  } catch {
    return [];
  }
}

async function getOffers(): Promise<Offer[]> {
  try {
    const res = await api.get<{ offers: Offer[] }>('/api/marketing/offers', { revalidate: 300 });
    return res.offers;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featured, offers] = await Promise.all([getFeatured(), getOffers()]);

  return (
    <>
      <JsonLd data={faqSchema()} />

      <Hero />
      <ValueStrip />

      {/* featured dishes */}
      <section className="py-24">
        <div className="container-luxe">
          <SectionHead
            eyebrow="Signature Dishes"
            title="What the kitchen is"
            accent="known for"
            description="The dishes our regulars order without looking at the menu. Everything is cooked to order."
          />

          {featured.length > 0 ? (
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.slice(0, 8).map((item, i) => (
                <div key={item.id} className="reveal" style={{ transitionDelay: `${(i % 4) * 80}ms` }}>
                  <DishCard item={item} priority={i < 4} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-12 text-center text-black/50">
              Our menu is being updated. Please call {' '}
              <a href="tel:+923064650507" className="text-ember-500 underline">
                +92 306 4650507
              </a>
              .
            </p>
          )}

          <div className="reveal mt-11 text-center">
            <Button asChild variant="dark" size="lg">
              <Link href="/menu">
                View the Full Menu
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <OffersBanner offers={offers} />
      <AboutPreview />
      <TimelineStrip />
      <ReservationCta />
      <Testimonials />
      <ChefSection />
      <GalleryPreview />
      <AwardsStrip />
      <LocationSection />
    </>
  );
}
