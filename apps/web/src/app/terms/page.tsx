import { BRAND, FREE_DELIVERY_THRESHOLD, TAX_RATE } from '@islamabad/shared';
import { PageHero } from '@/components/layout/page-hero';
import { buildMetadata } from '@/lib/seo';
import { formatPKR } from '@/lib/utils';

export const metadata = buildMetadata({
  title: 'Terms of Service',
  description: 'The terms that apply when you order, reserve a table or buy a gift card from Islamabad Restaurant.',
  path: '/terms',
});

const SECTIONS = [
  {
    title: 'Ordering',
    body: [
      'An order is accepted when we confirm it, not when you submit it. If a dish has sold out — our deghs are cooked in limited batches — we will call you and either substitute it with your agreement or refund that line in full.',
      `All prices are shown before tax. Government sales tax of ${Math.round(TAX_RATE * 100)}% is added at checkout and shown as a separate line on your receipt.`,
      `Delivery charges depend on your zone and are shown before you pay. Delivery is free on orders above ${formatPKR(FREE_DELIVERY_THRESHOLD)}. Minimum order values apply per zone.`,
    ],
  },
  {
    title: 'Cancellations and refunds',
    body: [
      'You can cancel an order free of charge until the kitchen begins preparing it — in practice, while the order shows as Pending or Confirmed. After that, call us and we will do what we reasonably can.',
      'If food arrives cold, late beyond our stated window, or is not what you ordered, tell us within two hours and we will refund or remake it. Refunds return to the original payment method within 5 to 10 working days.',
      'Loyalty points redeemed on a cancelled order are returned to your account automatically.',
    ],
  },
  {
    title: 'Reservations',
    body: [
      'Reservations are free and require no deposit, except private rooms and events, which require 25% of the estimated bill.',
      'We hold your table for 15 minutes past the booked time. After that we may release it to waiting guests.',
      'Changes and cancellations are free up to two hours before your booking. Repeated no-shows may result in us asking for a card guarantee on future bookings.',
    ],
  },
  {
    title: 'Loyalty programme',
    body: [
      'You earn 1 point for every Rs. 100 spent, excluding tax, delivery and packaging. Points are credited when an order is delivered, not when it is placed.',
      'Each point is worth Rs. 2 at checkout. You may redeem points against a maximum of 50% of any single bill.',
      'Points have no cash value, cannot be transferred, and expire after 24 months of account inactivity. We may vary the earn rate with 30 days notice.',
    ],
  },
  {
    title: 'Gift cards',
    body: [
      'Gift cards are valid for 12 months from purchase and are redeemable on dine-in, delivery and pickup. Unused balances remain on the card until expiry. Gift cards are not refundable for cash and are void if reported as fraudulently obtained.',
    ],
  },
  {
    title: 'Allergens and food safety',
    body: [
      'We label the allergens in every dish and will always answer questions honestly. However, our kitchen handles nuts, dairy, gluten, egg, sesame, soy, mustard and fish, and we cannot guarantee the absence of trace cross-contact.',
      'If you have a severe allergy, please tell us at the time of ordering or booking so the kitchen can take additional precautions.',
      'All our meat is halal-certified. We hold a Grade A certificate from the Islamabad Food Authority.',
    ],
  },
  {
    title: 'Accounts',
    body: [
      'You are responsible for keeping your password confidential. Tell us immediately if you suspect unauthorised use. We may suspend an account that is used fraudulently, abusively, or to place repeated false orders.',
    ],
  },
  {
    title: 'Liability and governing law',
    body: [
      'Nothing in these terms limits our liability for death or personal injury caused by our negligence, or for fraud. Otherwise our liability for any order is limited to the amount you paid for it.',
      'These terms are governed by the laws of the Islamic Republic of Pakistan, and the courts of Islamabad have exclusive jurisdiction.',
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        description={`Last updated ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`}
        breadcrumbs={[{ label: 'Terms', href: '/terms' }]}
      />

      <div className="container-luxe max-w-3xl py-16">
        <p className="mb-10 leading-relaxed text-black/68">
          These terms apply when you order food, reserve a table, buy a gift card or create an account with{' '}
          {BRAND.legalName}. Please read them — placing an order means you accept them.
        </p>

        {SECTIONS.map((section, i) => (
          <section key={section.title} className="mb-10">
            <h2 className="mb-3 font-display text-3xl">
              <span className="mr-3 text-saffron-500">{String(i + 1).padStart(2, '0')}</span>
              {section.title}
            </h2>
            {section.body.map((p, j) => (
              <p key={j} className="mb-3 leading-relaxed text-black/68">
                {p}
              </p>
            ))}
          </section>
        ))}

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="mb-2 font-display text-2xl">Questions about these terms</h2>
          <p className="text-black/65">
            {BRAND.supportEmail} · {BRAND.phone}
          </p>
        </section>
      </div>
    </>
  );
}
