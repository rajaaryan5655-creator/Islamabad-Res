import Image from 'next/image';
import { Building2, Cake, Heart, PartyPopper, UtensilsCrossed, Users } from 'lucide-react';
import { PageHero } from '@/components/layout/page-hero';
import { EventEnquiryForm } from '@/components/forms/event-enquiry-form';
import { SectionHead } from '@/components/home/sections';
import { Faq } from '@/components/layout/faq';
import { JsonLd, breadcrumbSchema, buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Private Events, Catering & Weddings',
  description:
    'Private dining for 14 or 20 guests in the Margalla and Faisal Rooms, corporate lunches, birthdays, and off-site wedding catering for up to 1,000 guests in Islamabad.',
  path: '/events',
  image: '/images/event-private-dining.jpg',
  keywords: ['private dining Islamabad', 'wedding catering Islamabad', 'corporate lunch Islamabad', 'birthday party restaurant Islamabad'],
});

const SPACES = [
  { name: 'The Margalla Room', seats: 14, image: '/images/event-private-dining.jpg', description: 'Our chef’s table. A single long table under carved lattice screens, with a dedicated server and a tasting menu built with Chef Imran.', from: 'From Rs. 4,500 per head' },
  { name: 'The Faisal Room', seats: 20, image: '/images/interior-hall.jpg', description: 'The larger private room, with its own entrance and AV for presentations. The usual choice for corporate dinners and board lunches.', from: 'From Rs. 3,800 per head' },
  { name: 'The Courtyard', seats: 60, image: '/images/interior-courtyard.jpg', description: 'Outdoor seating under string lights with the Margalla hills behind. Available for exclusive hire on weeknights.', from: 'From Rs. 3,200 per head' },
];

const TYPES = [
  { Icon: Building2, title: 'Corporate dining', body: 'Board lunches, client dinners and team celebrations, with GST invoices and 24-hour turnaround.' },
  { Icon: Heart, title: 'Weddings & walima', body: 'Off-site catering for up to 1,000 guests, with a dedicated events manager and full service staff.' },
  { Icon: Cake, title: 'Birthdays', body: 'Cake service, decorated tables and a set menu for parties from 10 to 60 guests.' },
  { Icon: UtensilsCrossed, title: 'Bulk catering', body: 'Office lunches and family functions delivered hot in insulated deghs, minimum 20 covers.' },
];

const FAQ_ITEMS = [
  { q: 'How far in advance should we book a private room?', a: 'Two weeks is comfortable for the Margalla and Faisal Rooms, and four to six weeks for weekends. We can sometimes accommodate a corporate lunch with 48 hours notice — call us and we will tell you honestly.' },
  { q: 'Do you require a deposit?', a: 'For private rooms we take 25% of the estimated bill to confirm the date, refundable up to seven days before. Off-site catering requires 50%.' },
  { q: 'Can we bring our own cake or decorations?', a: 'Yes to both. There is no cakeage charge, and our floor team will help set up decorations an hour before your guests arrive.' },
  { q: 'Do you cater for dietary requirements at events?', a: 'Always. Tell us the numbers for vegetarian, allergy and low-spice covers when you confirm, and the kitchen will prepare and label them separately.' },
  { q: 'What is included in the per-head price?', a: 'A set multi-course menu, soft drinks and chai, service, table setting and room hire. Live BBQ stations and dessert counters are priced separately.' },
];

export default function EventsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Events', path: '/events' }])} />

      <PageHero
        eyebrow="Private Events"
        title="Your occasion,"
        accent="our kitchen"
        description="Two private rooms, an exclusive-hire courtyard, and off-site catering for up to 1,000 guests."
        image="/images/event-wedding.jpg"
        breadcrumbs={[{ label: 'Events', href: '/events' }]}
      />

      {/* event types */}
      <section className="border-b border-black/8 bg-white py-14">
        <div className="container-luxe grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TYPES.map(({ Icon, title, body }, i) => (
            <div key={title} className="reveal" style={{ transitionDelay: `${i * 70}ms` }}>
              <span className="mb-4 flex size-11 items-center justify-center rounded-sm bg-saffron-400/12 text-saffron-600">
                <Icon className="size-5" />
              </span>
              <h2 className="mb-1.5 font-display text-xl">{title}</h2>
              <p className="text-sm leading-relaxed text-black/55">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* spaces */}
      <section className="py-20">
        <div className="container-luxe">
          <SectionHead
            eyebrow="The Spaces"
            title="Three rooms,"
            accent="three moods"
            description="Every private booking comes with a dedicated events manager from first call to final invoice."
          />

          <div className="mt-12 space-y-8">
            {SPACES.map((space, i) => (
              <article
                key={space.name}
                className={`reveal grid items-center gap-8 lg:grid-cols-2 ${i % 2 === 1 ? 'lg:[&>figure]:order-2' : ''}`}
              >
                <figure className="relative aspect-16/10 overflow-hidden rounded-sm">
                  <Image
                    src={space.image}
                    alt={space.name}
                    fill
                    sizes="(max-width:1024px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                </figure>
                <div>
                  <p className="flex items-center gap-2 text-sm text-saffron-600">
                    <Users className="size-4" />
                    Seats {space.seats}
                  </p>
                  <h3 className="mt-1.5 font-display text-3xl">{space.name}</h3>
                  <p className="mt-3 leading-relaxed text-black/60">{space.description}</p>
                  <p className="mt-4 font-display text-xl text-ember-500">{space.from}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* enquiry */}
      <section className="bg-obsidian py-20 grain">
        <div className="container-luxe grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <span className="mb-5 flex size-12 items-center justify-center rounded-full border border-saffron-400/40 text-saffron-400">
              <PartyPopper className="size-5" />
            </span>
            <p className="eyebrow mb-3">Enquire</p>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] font-semibold leading-tight text-cream">
              Tell us about your <span className="script-accent">occasion</span>
            </h2>
            <p className="mt-4 text-cream/65">
              Our events manager replies within one working day with availability, a suggested menu and a written
              quotation. No obligation, no deposit until you are ready.
            </p>

            <dl className="mt-8 space-y-4 border-t border-white/10 pt-7 text-sm">
              <div>
                <dt className="text-[0.65rem] uppercase tracking-widest text-saffron-400">Response time</dt>
                <dd className="text-cream/75">Within one working day</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] uppercase tracking-widest text-saffron-400">Minimum notice</dt>
                <dd className="text-cream/75">48 hours for catering, 7 days for weddings</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] uppercase tracking-widest text-saffron-400">Capacity</dt>
                <dd className="text-cream/75">14 to 1,000 guests</dd>
              </div>
            </dl>
          </div>

          <EventEnquiryForm />
        </div>
      </section>

      <Faq items={FAQ_ITEMS} title="Event questions" />
    </>
  );
}
