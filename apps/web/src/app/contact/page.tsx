import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { BRAND, FAQS, OPENING_HOURS } from '@islamabad/shared';
import { PageHero } from '@/components/layout/page-hero';
import { ContactForm } from '@/components/forms/contact-form';
import { Faq } from '@/components/layout/faq';
import { JsonLd, breadcrumbSchema, buildMetadata, faqSchema } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Contact & Location — Margalla Town, Islamabad',
  description:
    'Find Islamabad Restaurant at Plot 14, Main Margalla Road, Margalla Town. Call +92 306 4650507, get directions, opening hours and parking information.',
  path: '/contact',
  keywords: ['restaurant contact Islamabad', 'Margalla Town restaurant address', 'restaurant phone number Islamabad'],
});

const TILES = [
  { Icon: MapPin, title: 'Visit us', lines: [BRAND.address.street, `${BRAND.address.locality} ${BRAND.address.postalCode}`], href: BRAND.mapLink, cta: 'Get directions' },
  { Icon: Phone, title: 'Call us', lines: [BRAND.phone, 'Reservations & orders'], href: `tel:${BRAND.phoneRaw}`, cta: 'Call now' },
  { Icon: Mail, title: 'Email us', lines: [BRAND.email, 'Replies within one working day'], href: `mailto:${BRAND.email}`, cta: 'Send an email' },
  { Icon: Clock, title: 'Opening hours', lines: ['Mon–Thu, Sun · 11 AM – 11 PM', 'Fri–Sat · until midnight'], href: '#hours', cta: 'Full hours' },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={faqSchema()} />
      <JsonLd data={breadcrumbSchema([{ name: 'Contact', path: '/contact' }])} />

      <PageHero
        eyebrow="Get in Touch"
        title="Come and see us"
        description="Five minutes from the Kashmir Highway interchange, with forty free parking spaces on site."
        image="/images/interior-hall.jpg"
        breadcrumbs={[{ label: 'Contact', href: '/contact' }]}
      />

      {/* contact tiles */}
      <section className="border-b border-black/8 bg-white py-14">
        <div className="container-luxe grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map(({ Icon, title, lines, href, cta }, i) => (
            <a
              key={title}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noreferrer' : undefined}
              className="reveal group rounded-sm border border-black/10 p-6 transition-all hover:border-ember-500 hover:shadow-lg"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <span className="mb-4 flex size-11 items-center justify-center rounded-sm bg-ember-500/8 text-ember-500 transition-colors group-hover:bg-ember-500 group-hover:text-white">
                <Icon className="size-5" />
              </span>
              <h2 className="font-display text-xl">{title}</h2>
              {lines.map((l) => (
                <p key={l} className="text-sm text-black/55">
                  {l}
                </p>
              ))}
              <span className="mt-3 inline-block text-xs font-semibold uppercase tracking-widest text-ember-500">
                {cta} →
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* form + map */}
      <section className="py-16">
        <div className="container-luxe grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">Send a message</p>
            <h2 className="mb-2 font-display text-4xl">How can we help?</h2>
            <p className="mb-7 text-black/55">
              Feedback, a lost item, a large booking or a press enquiry — our team reads every message.
            </p>
            <ContactForm />
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-sm border border-black/10 shadow-lg">
              <iframe
                src={BRAND.mapEmbed}
                title={`Map showing ${BRAND.name}`}
                width="100%"
                height="380"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ border: 0 }}
                allowFullScreen
              />
            </div>

            <div id="hours" className="rounded-sm border border-black/10 bg-white p-6">
              <h3 className="mb-4 font-display text-2xl">Opening hours</h3>
              <dl className="space-y-2 text-sm">
                {OPENING_HOURS.map((h) => {
                  const isToday = new Date().getDay() === h.dayIndex;
                  return (
                    <div
                      key={h.day}
                      className={`flex justify-between border-b border-black/6 pb-2 ${isToday ? 'font-semibold text-ember-500' : 'text-black/65'}`}
                    >
                      <dt>
                        {h.day}
                        {isToday && <span className="ml-2 text-[0.65rem] uppercase tracking-widest">Today</span>}
                      </dt>
                      <dd className="tabular-nums">
                        {h.open} – {h.close}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-4 text-xs text-black/45">
                Friday service begins at 2:00 PM after Jummah prayers. Last seating is 90 minutes before close.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Faq items={[...FAQS]} />
    </>
  );
}
