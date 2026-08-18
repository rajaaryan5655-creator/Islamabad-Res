import { Gift, Mail, ShieldCheck } from 'lucide-react';
import { PageHero } from '@/components/layout/page-hero';
import { GiftCardForm } from '@/components/forms/gift-card-form';
import { JsonLd, breadcrumbSchema, buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Gift Cards — From Rs. 1,000',
  description:
    'Buy an Islamabad Restaurant gift card from Rs. 1,000 to Rs. 100,000. Delivered by email with a unique code, valid 12 months, redeemable on dine-in, delivery and pickup.',
  path: '/gift-cards',
  keywords: ['restaurant gift card Islamabad', 'food voucher Pakistan', 'dining gift card'],
});

const POINTS = [
  { Icon: Mail, title: 'Delivered instantly', body: 'Sent by email with a unique code and your personal message, ready to forward or print.' },
  { Icon: ShieldCheck, title: 'Valid for 12 months', body: 'Redeemable against dine-in, delivery and pickup. Partial balances stay on the card.' },
  { Icon: Gift, title: 'Any amount', body: 'From Rs. 1,000 to Rs. 100,000 — enough for a chai for two or a full family table.' },
];

export default function GiftCardsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Gift Cards', path: '/gift-cards' }])} />

      <PageHero
        eyebrow="Gift Cards"
        title="Give someone"
        accent="a table"
        description="Valid for twelve months, redeemable on everything we serve."
        image="/images/dish-mix-grill.jpg"
        breadcrumbs={[{ label: 'Gift Cards', href: '/gift-cards' }]}
      />

      <section className="border-b border-black/8 bg-white py-12">
        <div className="container-luxe grid gap-8 md:grid-cols-3">
          {POINTS.map(({ Icon, title, body }, i) => (
            <div key={title} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <Icon className="mb-3 size-6 text-ember-500" />
              <h2 className="mb-1 font-display text-xl">{title}</h2>
              <p className="text-sm text-black/55">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="container-luxe max-w-2xl">
          <GiftCardForm />
        </div>
      </section>
    </>
  );
}
