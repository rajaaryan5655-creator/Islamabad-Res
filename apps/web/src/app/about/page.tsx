import Image from 'next/image';
import Link from 'next/link';
import { Award, Quote } from 'lucide-react';
import { AWARDS, BRAND, CHEFS, PERSONAS, TIMELINE } from '@islamabad/shared';
import { PageHero } from '@/components/layout/page-hero';
import { SectionHead, ChefSection, AwardsStrip } from '@/components/home/sections';
import { Button } from '@/components/ui/button';
import { JsonLd, breadcrumbSchema, buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Our Story — 27 Years of Pakistani Cooking',
  description:
    'From a nine-table dhaba on the old Margalla Road in 1998 to a 260-cover restaurant. Meet Haji Abdul Rahman, our chefs, and read how Islamabad Restaurant sources and cooks.',
  path: '/about',
  image: '/images/chef-rahman.jpg',
  keywords: ['about Islamabad Restaurant', 'restaurant history Islamabad', 'Pakistani chefs Islamabad'],
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'About', path: '/about' }])} />

      <PageHero
        eyebrow="Since 1998"
        title="One degh,"
        accent="one rule"
        description="Nothing reheated, nothing frozen, and the kitchen closes when the last order is served."
        image="/images/interior-bbq-counter.jpg"
        breadcrumbs={[{ label: 'About', href: '/about' }]}
      />

      {/* founder story */}
      <section className="py-24">
        <div className="container-luxe grid gap-14 lg:grid-cols-2 lg:items-center">
          <div className="reveal relative aspect-4/5 overflow-hidden rounded-sm">
            <Image
              src="/images/chef-rahman.jpg"
              alt="Haji Abdul Rahman, founder of Islamabad Restaurant"
              fill
              sizes="(max-width:1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-obsidian to-transparent p-7">
              <p className="font-display text-2xl text-cream">Haji Abdul Rahman</p>
              <p className="text-sm text-saffron-400">Founder &amp; Master of the Degh</p>
            </div>
          </div>

          <div>
            <SectionHead eyebrow="The Founder" title="He closed when the biryani" accent="ran out" align="left" />
            <div className="reveal mt-6 space-y-4 leading-relaxed text-black/65">
              <p>{BRAND.story}</p>
              <p>
                Haji sahib still grinds the house masala every Sunday — coriander seed, cumin, black cardamom, mace,
                and a small amount of stone flower that most kitchens have stopped using because it is expensive. It is
                the ingredient guests cannot name but always notice.
              </p>
              <p>
                He tastes every batch of biryani before it leaves the kitchen. At seventy-one, he has not missed a
                service in four years.
              </p>
            </div>

            <blockquote className="reveal mt-8 border-l-2 border-saffron-400 pl-6">
              <Quote className="mb-2 size-5 text-saffron-400/50" />
              <p className="font-display text-2xl leading-snug">
                “We would rather disappoint you at nine o&rsquo;clock than serve you something reheated at ten.”
              </p>
              <footer className="mt-2 text-sm text-black/50">— Haji Abdul Rahman, 1998</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* mission & vision */}
      <section className="bg-obsidian py-20 grain">
        <div className="container-luxe grid gap-10 md:grid-cols-2">
          <div className="reveal">
            <p className="eyebrow mb-3">Our Mission</p>
            <p className="font-display text-2xl leading-snug text-cream md:text-3xl">{BRAND.mission}</p>
          </div>
          <div className="reveal">
            <p className="eyebrow mb-3">Our Vision</p>
            <p className="font-display text-2xl leading-snug text-cream md:text-3xl">{BRAND.vision}</p>
          </div>
        </div>
      </section>

      {/* timeline */}
      <section className="py-24">
        <div className="container-luxe">
          <SectionHead eyebrow="The Journey" title="Twenty-seven years," accent="in seven moments" />

          <ol className="relative mt-14 space-y-10 before:absolute before:left-[7.5rem] before:top-2 before:hidden before:h-[calc(100%-1rem)] before:w-px before:bg-black/12 md:before:block">
            {TIMELINE.map((m, i) => (
              <li key={m.year} className="reveal grid gap-4 md:grid-cols-[7rem_auto_1fr] md:gap-8" style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="font-display text-3xl font-semibold text-ember-500 md:text-right">{m.year}</span>
                <span className="relative hidden md:block">
                  <span className="absolute left-1/2 top-3 size-3 -translate-x-1/2 rotate-45 bg-saffron-400" />
                </span>
                <div>
                  <h3 className="font-display text-xl">{m.title}</h3>
                  <p className="mt-1 text-black/58">{m.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ChefSection />

      {/* awards */}
      <section className="py-24">
        <div className="container-luxe">
          <SectionHead eyebrow="Recognition" title="Awards &" accent="achievements" />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {AWARDS.map((a, i) => (
              <div
                key={a.title}
                className="reveal flex gap-4 rounded-sm border border-black/10 bg-white p-6 transition-all hover:border-saffron-400/60 hover:shadow-lg"
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <Award className="size-6 shrink-0 text-saffron-500" />
                <div>
                  <p className="text-xs font-semibold text-ember-500">{a.year}</p>
                  <h3 className="font-display text-lg leading-tight">{a.title}</h3>
                  <p className="mt-0.5 text-sm text-black/50">{a.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* who we serve */}
      <section className="bg-white py-24">
        <div className="container-luxe">
          <SectionHead
            eyebrow="Who We Cook For"
            title="Five kinds of guest,"
            accent="one kitchen"
            description="We designed the room, the menu and this website around the people who actually walk through the door."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PERSONAS.map((p, i) => (
              <article key={p.id} className="reveal rounded-sm border border-black/10 p-6" style={{ transitionDelay: `${i * 70}ms` }}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="font-display text-xl">{p.segment}</h3>
                  <span className="font-display text-2xl text-saffron-500">{p.share}%</span>
                </div>
                <p className="text-sm text-black/55">{p.designResponse}</p>
                <ul className="mt-4 space-y-1.5 border-t border-black/8 pt-3 text-xs text-black/50">
                  {p.goals.slice(0, 3).map((g) => (
                    <li key={g} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rotate-45 bg-ember-500" />
                      {g}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <AwardsStrip />

      <section className="bg-cream-dark/40 py-20">
        <div className="container-luxe text-center">
          <h2 className="reveal font-display text-4xl">Come and taste the difference</h2>
          <div className="reveal mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="primary" size="lg">
              <Link href="/reservations">Book a Table</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/menu">See the Menu</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
