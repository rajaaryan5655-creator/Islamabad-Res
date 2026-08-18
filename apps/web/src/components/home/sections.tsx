import Image from 'next/image';
import Link from 'next/link';
import {
  Award,
  Bike,
  CalendarCheck,
  ChefHat,
  Flame,
  Quote,
  Star,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { BRAND, CHEFS, TESTIMONIALS, GALLERY, TIMELINE } from '@islamabad/shared';
import { Button } from '@/components/ui/button';
import { formatPKR } from '@/lib/utils';

/* ------------------------------ section head ------------------------------ */

export function SectionHead({
  eyebrow,
  title,
  accent,
  description,
  align = 'center',
  light = false,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
  align?: 'center' | 'left';
  light?: boolean;
}) {
  return (
    <div className={`reveal max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h2
        className={`font-display text-[clamp(2.1rem,4.6vw,3.4rem)] font-semibold leading-[1.05] text-balance ${light ? 'text-cream' : ''}`}
      >
        {title} {accent && <span className="script-accent">{accent}</span>}
      </h2>
      {description && (
        <p className={`mt-4 text-[0.98rem] leading-relaxed text-pretty ${light ? 'text-cream/65' : 'text-black/58'}`}>
          {description}
        </p>
      )}
    </div>
  );
}

/* ------------------------------ value strip ------------------------------- */

const VALUES = [
  { Icon: Flame, title: 'Charcoal, never gas', body: 'Every kebab is cooked over lump charcoal at an open counter you can watch from the floor.' },
  { Icon: Truck, title: 'Bought fresh at 5 AM', body: 'Mutton, beef and chicken from the Bhara Kahu abattoir daily. Nothing frozen, ever.' },
  { Icon: UtensilsCrossed, title: 'Degh-cooked in batches', body: 'Three deghs of biryani a day, ninety minutes on dum. When it is gone, it is gone.' },
  { Icon: Bike, title: '45-minute delivery', body: 'No-contact delivery across Islamabad and Rawalpindi, with live tracking on every order.' },
];

export function ValueStrip() {
  return (
    <section className="border-y border-black/8 bg-white py-14">
      <div className="container-luxe grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
        {VALUES.map(({ Icon, title, body }, i) => (
          <div key={title} className="reveal group" style={{ transitionDelay: `${i * 80}ms` }}>
            <span className="mb-4 flex size-12 items-center justify-center rounded-sm bg-ember-500/8 text-ember-500 transition-all duration-500 group-hover:bg-ember-500 group-hover:text-white">
              <Icon className="size-5" />
            </span>
            <h3 className="mb-1.5 font-display text-xl">{title}</h3>
            <p className="text-sm leading-relaxed text-black/55">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- about ----------------------------------- */

export function AboutPreview() {
  return (
    <section className="overflow-hidden py-24">
      <div className="container-luxe grid items-center gap-14 lg:grid-cols-2">
        <div className="reveal relative">
          <div className="relative aspect-4/5 overflow-hidden rounded-sm">
            <Image
              src="/images/interior-hall.jpg"
              alt="The main dining hall at Islamabad Restaurant"
              fill
              sizes="(max-width:1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-7 -right-4 hidden aspect-square w-52 overflow-hidden rounded-sm border-8 border-cream shadow-2xl md:block lg:-right-8 lg:w-60">
            <Image src="/images/interior-bbq-counter.jpg" alt="The charcoal BBQ counter" fill sizes="240px" className="object-cover" />
          </div>
          <div className="absolute -left-4 top-8 hidden rounded-sm bg-ember-500 px-6 py-5 text-center text-white shadow-xl lg:block">
            <p className="font-display text-4xl font-semibold leading-none">27</p>
            <p className="mt-1 text-[0.6rem] uppercase tracking-[0.2em]">Years</p>
          </div>
        </div>

        <div>
          <SectionHead
            eyebrow="Our Story"
            title="It began with one degh"
            accent="and one rule"
            align="left"
          />
          <div className="reveal mt-6 space-y-4 text-[0.98rem] leading-relaxed text-black/62">
            <p>
              In 1998 Haji Abdul Rahman opened a nine-table dhaba on the old Margalla Road. He cooked a single degh of
              chicken biryani each morning and closed when it ran out.
            </p>
            <p>
              Twenty-seven years later the degh has become a 260-cover dining room, a live BBQ counter and a delivery
              kitchen serving the twin cities. The rule has not changed: nothing is reheated, nothing is frozen, and
              the kitchen closes when the last order is served — not before.
            </p>
          </div>

          <ul className="reveal mt-7 grid gap-3 sm:grid-cols-2">
            {BRAND.usp.slice(0, 4).map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-black/68">
                <span className="mt-1.5 size-1.5 shrink-0 rotate-45 bg-saffron-400" />
                {point}
              </li>
            ))}
          </ul>

          <div className="reveal mt-9 flex flex-wrap gap-3">
            <Button asChild variant="dark" size="lg">
              <Link href="/about">Read Our Story</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/about#chefs">Meet the Chefs</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- offers ----------------------------------- */

export function OffersBanner({ offers }: { offers: { code: string; description: string; type: string; value: number; minOrder: number }[] }) {
  if (!offers.length) return null;

  return (
    <section className="relative overflow-hidden bg-obsidian py-20 grain">
      <Image src="/images/banner-spices.jpg" alt="" fill sizes="100vw" className="object-cover opacity-15" />
      <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/92 to-obsidian/70" />

      <div className="container-luxe relative">
        <SectionHead
          eyebrow="Limited Time"
          title="This week at"
          accent="our table"
          description="Live offers, applied automatically at checkout. No small print beyond the minimum spend."
          light
        />

        <div className="mt-11 grid gap-5 md:grid-cols-3">
          {offers.slice(0, 3).map((offer, i) => (
            <div
              key={offer.code}
              className="reveal group relative overflow-hidden rounded-sm border border-saffron-400/25 bg-white/5 p-7 backdrop-blur-sm transition-all duration-500 hover:border-saffron-400/70 hover:bg-white/8"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="absolute -right-8 -top-8 size-24 rounded-full bg-ember-500/15 blur-2xl transition-all duration-700 group-hover:bg-ember-500/30" />
              <p className="font-display text-5xl font-semibold text-saffron-400">
                {offer.type === 'PERCENT' ? `${offer.value}%` : offer.type === 'FREE_DELIVERY' ? 'Free' : formatPKR(offer.value)}
              </p>
              <p className="mt-1 text-[0.7rem] uppercase tracking-[0.2em] text-cream/45">
                {offer.type === 'FREE_DELIVERY' ? 'Delivery' : 'Off'}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-cream/75">{offer.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <code className="rounded-sm bg-saffron-400 px-3 py-1 text-xs font-bold tracking-widest text-obsidian">
                  {offer.code}
                </code>
                {offer.minOrder > 0 && <span className="text-[0.68rem] text-cream/45">Min {formatPKR(offer.minOrder)}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="reveal mt-10 text-center">
          <Button asChild variant="gold" size="lg">
            <Link href="/order">Start an Order</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ reservation ------------------------------- */

export function ReservationCta() {
  return (
    <section className="relative overflow-hidden py-24">
      <Image src="/images/interior-courtyard.jpg" alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-obsidian/78" />

      <div className="container-luxe relative text-center">
        <div className="reveal mx-auto max-w-2xl">
          <span className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full border border-saffron-400/40 text-saffron-400">
            <CalendarCheck className="size-6" />
          </span>
          <p className="eyebrow mb-3">Reservations</p>
          <h2 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.05] text-cream text-balance">
            The courtyard fills first <span className="script-accent">on a Friday</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-cream/68 text-pretty">
            Live availability against our real floor plan — every slot you can select is genuinely free. Confirmation
            code arrives instantly, and changes are free up to two hours before.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="primary" size="lg">
              <Link href="/reservations">Check Availability</Link>
            </Button>
            <Button asChild variant="outlineGold" size="lg">
              <a href={`tel:${BRAND.phoneRaw}`}>Call {BRAND.phone}</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ testimonials ------------------------------ */

export function Testimonials() {
  return (
    <section className="bg-white py-24">
      <div className="container-luxe">
        <SectionHead
          eyebrow="Guest Book"
          title="What our guests"
          accent="say"
          description="2,847 reviews across Google and TripAdvisor, averaging 4.8 out of 5."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={t.id}
              className="reveal flex flex-col rounded-sm border border-black/8 bg-cream p-7 transition-all duration-500 hover:border-saffron-400/50 hover:shadow-xl"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <Quote className="mb-4 size-7 text-saffron-400/45" />
              <blockquote className="flex-1 text-[0.93rem] leading-relaxed text-black/68">“{t.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-black/8 pt-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ember-500 font-display text-lg text-white">
                  {t.name[0]}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.name}</p>
                  <p className="truncate text-xs text-black/45">{t.role}</p>
                </div>
                <span className="ml-auto flex shrink-0 gap-0.5">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} className="size-3.5 fill-saffron-400 text-saffron-400" />
                  ))}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- chefs ---------------------------------- */

export function ChefSection() {
  return (
    <section id="chefs" className="bg-obsidian py-24 grain">
      <div className="container-luxe">
        <SectionHead
          eyebrow="The Kitchen"
          title="The people at"
          accent="the pass"
          description="Between them, seventy-eight years over flame. Three of the four have been here more than a decade."
          light
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CHEFS.map((chef, i) => (
            <article
              key={chef.id}
              className="reveal group relative overflow-hidden rounded-sm"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="relative aspect-3/4 overflow-hidden bg-charcoal-2">
                <Image
                  src={chef.image}
                  alt={chef.name}
                  fill
                  sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                  className="object-cover grayscale-[0.35] transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/25 to-transparent" />
              </div>

              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-saffron-400">{chef.role}</p>
                <h3 className="mt-1 font-display text-2xl text-cream">{chef.name}</h3>
                <p className="mt-1 text-xs text-cream/50">
                  {chef.years} years · {chef.specialty}
                </p>
                <p className="mt-3 max-h-0 overflow-hidden text-[0.82rem] leading-relaxed text-cream/70 opacity-0 transition-all duration-500 group-hover:max-h-40 group-hover:opacity-100">
                  {chef.bio}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- gallery --------------------------------- */

export function GalleryPreview() {
  const images = GALLERY.slice(0, 8);
  return (
    <section className="py-24">
      <div className="container-luxe">
        <SectionHead eyebrow="Gallery" title="A look inside" accent="the room" />

        <div className="mt-11 grid auto-rows-[13rem] grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((img, i) => (
            <Link
              key={img.src}
              href="/gallery"
              className={`reveal group relative overflow-hidden rounded-sm bg-black/5 ${
                i === 0 || i === 5 ? 'row-span-2' : ''
              } ${i === 2 ? 'col-span-2' : ''}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width:768px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-108"
              />
              <div className="absolute inset-0 bg-obsidian/0 transition-colors duration-500 group-hover:bg-obsidian/45" />
              <span className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.2em] text-cream opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                View gallery
              </span>
            </Link>
          ))}
        </div>

        <div className="reveal mt-9 text-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/gallery">See the Full Gallery</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- awards --------------------------------- */

export function AwardsStrip() {
  return (
    <section className="border-y border-black/8 bg-white py-12">
      <div className="container-luxe">
        <p className="reveal mb-8 text-center text-[0.66rem] uppercase tracking-[0.3em] text-black/35">
          Recognised by
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {[
            'Twin Cities Hospitality Awards',
            'Islamabad Food Guide',
            'TripAdvisor Travellers’ Choice',
            'IFA Grade A Certified',
          ].map((name, i) => (
            <div key={name} className="reveal flex items-center gap-2.5 text-black/45" style={{ transitionDelay: `${i * 70}ms` }}>
              <Award className="size-5 text-saffron-500" />
              <span className="font-display text-lg">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- location --------------------------------- */

export function LocationSection() {
  return (
    <section className="bg-cream-dark/40 py-24">
      <div className="container-luxe grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHead
            eyebrow="Find Us"
            title="Five minutes from"
            accent="Kashmir Highway"
            align="left"
            description="Plot 14, Main Margalla Road, Margalla Town. Forty free parking spaces on site, with complimentary valet for Gold and Platinum members."
          />

          <dl className="reveal mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-[0.66rem] uppercase tracking-[0.2em] text-black/40">Address</dt>
              <dd className="mt-1 text-sm leading-relaxed">
                {BRAND.address.street}
                <br />
                {BRAND.address.locality} {BRAND.address.postalCode}
              </dd>
            </div>
            <div>
              <dt className="text-[0.66rem] uppercase tracking-[0.2em] text-black/40">Reservations</dt>
              <dd className="mt-1 text-sm">
                <a href={`tel:${BRAND.phoneRaw}`} className="hover:text-ember-500">
                  {BRAND.phone}
                </a>
                <br />
                <a href={`mailto:${BRAND.email}`} className="hover:text-ember-500">
                  {BRAND.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[0.66rem] uppercase tracking-[0.2em] text-black/40">Mon – Thu, Sun</dt>
              <dd className="mt-1 text-sm">11:00 AM – 11:00 PM</dd>
            </div>
            <div>
              <dt className="text-[0.66rem] uppercase tracking-[0.2em] text-black/40">Fri – Sat</dt>
              <dd className="mt-1 text-sm">
                11:00 AM – 12:00 AM
                <span className="block text-xs text-black/45">Friday from 2:00 PM</span>
              </dd>
            </div>
          </dl>

          <div className="reveal mt-8 flex flex-wrap gap-3">
            <Button asChild variant="dark">
              <a href={BRAND.mapLink} target="_blank" rel="noreferrer">
                Get Directions
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>

        <div className="reveal overflow-hidden rounded-sm border border-black/10 shadow-xl">
          <iframe
            src={BRAND.mapEmbed}
            title={`Map showing ${BRAND.name} in Margalla Town, Islamabad`}
            width="100%"
            height="440"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ border: 0 }}
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- timeline -------------------------------- */

export function TimelineStrip() {
  return (
    <section className="overflow-hidden bg-obsidian py-16">
      <div className="flex gap-16 whitespace-nowrap animate-marquee will-change-transform">
        {[...TIMELINE, ...TIMELINE].map((m, i) => (
          <div key={`${m.year}-${i}`} className="flex shrink-0 items-center gap-4">
            <span className="font-display text-5xl font-semibold text-ember-500/85">{m.year}</span>
            <span className="text-sm uppercase tracking-[0.2em] text-cream/45">{m.title}</span>
            <ChefHat className="size-4 text-saffron-400/45" />
          </div>
        ))}
      </div>
    </section>
  );
}
