import Link from 'next/link';
import { Clock, Tag } from 'lucide-react';
import { LOYALTY_TIERS } from '@islamabad/shared';
import { api, type Offer } from '@/lib/api';
import { PageHero } from '@/components/layout/page-hero';
import { SectionHead } from '@/components/home/sections';
import { Button } from '@/components/ui/button';
import { CopyCode } from '@/components/commerce/copy-code';
import { JsonLd, breadcrumbSchema, buildMetadata } from '@/lib/seo';
import { formatDate, formatPKR } from '@/lib/utils';

export const revalidate = 120;

export const metadata = buildMetadata({
  title: 'Offers, Deals & Loyalty Rewards',
  description:
    'Current discount codes at Islamabad Restaurant — student deals, happy hour, family offers and free delivery. Plus our four-tier loyalty programme.',
  path: '/offers',
  keywords: ['restaurant deals Islamabad', 'food discount codes Islamabad', 'happy hour Islamabad', 'student food deals'],
});

async function getOffers(): Promise<Offer[]> {
  try {
    const res = await api.get<{ offers: Offer[] }>('/api/marketing/offers', { revalidate: 120 });
    return res.offers;
  } catch {
    return [];
  }
}

export default async function OffersPage() {
  const offers = await getOffers();

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Offers', path: '/offers' }])} />

      <PageHero
        eyebrow="Save"
        title="Offers &"
        accent="rewards"
        description="Live codes, applied at checkout. Plus points on every rupee you spend."
        image="/images/banner-spices.jpg"
        breadcrumbs={[{ label: 'Offers', href: '/offers' }]}
      />

      {/* live offers */}
      <section className="py-16">
        <div className="container-luxe">
          <SectionHead eyebrow="Live Now" title="This week's" accent="offers" />

          {offers.length === 0 ? (
            <p className="mt-12 text-center text-black/50">No offers are running right now — check back on Thursday.</p>
          ) : (
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer, i) => (
                <article
                  key={offer.code}
                  className="reveal group relative overflow-hidden rounded-sm border border-black/10 bg-white p-7 transition-all hover:border-ember-500 hover:shadow-xl"
                  style={{ transitionDelay: `${i * 70}ms` }}
                >
                  <div className="absolute -right-6 -top-6 size-20 rounded-full bg-ember-500/6 transition-transform duration-500 group-hover:scale-150" />

                  <Tag className="mb-4 size-5 text-ember-500" />
                  <p className="font-display text-5xl font-semibold text-ember-500">
                    {offer.type === 'PERCENT' ? `${offer.value}%` : offer.type === 'FREE_DELIVERY' ? 'Free' : formatPKR(offer.value)}
                  </p>
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-black/40">
                    {offer.type === 'FREE_DELIVERY' ? 'Delivery' : 'Discount'}
                  </p>

                  <p className="mt-4 text-[0.95rem] leading-relaxed text-black/65">{offer.description}</p>

                  <dl className="mt-4 space-y-1 text-xs text-black/45">
                    {offer.minOrder > 0 && (
                      <div className="flex justify-between">
                        <dt>Minimum order</dt>
                        <dd>{formatPKR(offer.minOrder)}</dd>
                      </div>
                    )}
                    {offer.maxDiscount && (
                      <div className="flex justify-between">
                        <dt>Maximum saving</dt>
                        <dd>{formatPKR(offer.maxDiscount)}</dd>
                      </div>
                    )}
                    {offer.expiresAt && (
                      <div className="flex justify-between">
                        <dt className="flex items-center gap-1">
                          <Clock className="size-3" /> Expires
                        </dt>
                        <dd>{formatDate(offer.expiresAt)}</dd>
                      </div>
                    )}
                  </dl>

                  <CopyCode code={offer.code} />
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* loyalty */}
      <section className="bg-obsidian py-20 grain">
        <div className="container-luxe">
          <SectionHead
            eyebrow="Loyalty"
            title="Four tiers,"
            accent="one card"
            description="Earn 1 point for every Rs. 100 you spend. Each point is worth Rs. 2 at checkout. Higher tiers earn faster."
            light
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {LOYALTY_TIERS.map((tier, i) => (
              <div
                key={tier.id}
                className="reveal rounded-sm border border-white/12 bg-white/4 p-6 transition-all hover:border-saffron-400/60 hover:bg-white/8"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <p className="font-display text-2xl text-saffron-400">{tier.name}</p>
                <p className="mt-1 text-xs text-cream/45">
                  {tier.minPoints === 0 ? 'From your first order' : `${tier.minPoints.toLocaleString()} lifetime points`}
                </p>
                <p className="mt-4 font-display text-4xl text-cream">{tier.multiplier}×</p>
                <p className="text-[0.65rem] uppercase tracking-widest text-cream/40">Earn rate</p>
                <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm text-cream/70">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rotate-45 bg-saffron-400" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="reveal mt-11 text-center">
            <Button asChild variant="gold" size="lg">
              <Link href="/register">Join — 250 Points Free</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
