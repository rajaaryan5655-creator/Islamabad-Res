import Image from 'next/image';
import Link from 'next/link';
import { BLOG_POSTS } from '@islamabad/shared';
import { PageHero } from '@/components/layout/page-hero';
import { JsonLd, breadcrumbSchema, buildMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/utils';

export const metadata = buildMetadata({
  title: 'The Journal — Food Writing from Our Kitchen',
  description:
    'Essays from the Islamabad Restaurant kitchen: how a degh biryani is really cooked, a guide to Pakistani BBQ cuts, our daily sourcing run, and the Kashmiri chai ritual.',
  path: '/blog',
  keywords: ['Pakistani food blog', 'biryani guide', 'Pakistani BBQ guide', 'food writing Islamabad'],
});

export default function BlogPage() {
  const [lead, ...rest] = BLOG_POSTS;

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Journal', path: '/blog' }])} />

      <PageHero
        eyebrow="The Journal"
        title="Notes from"
        accent="the kitchen"
        description="How we cook, what we buy, and why we do it the slow way."
        image="/images/banner-spices.jpg"
        breadcrumbs={[{ label: 'Journal', href: '/blog' }]}
      />

      <div className="container-luxe py-16">
        {/* lead article */}
        <article className="reveal mb-14">
          <Link href={`/blog/${lead.slug}`} className="group grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="relative aspect-16/10 overflow-hidden rounded-sm">
              <Image
                src={lead.image}
                alt={lead.title}
                fill
                priority
                sizes="(max-width:1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute left-4 top-4 rounded-full bg-ember-500 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-widest text-white">
                Latest
              </span>
            </div>
            <div>
              <p className="eyebrow mb-3">{lead.category}</p>
              <h2 className="font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-tight transition-colors group-hover:text-ember-500">
                {lead.title}
              </h2>
              <p className="mt-4 leading-relaxed text-black/60">{lead.excerpt}</p>
              <p className="mt-5 text-sm text-black/45">
                {lead.author} · {formatDate(lead.date)} · {lead.readMinutes} min read
              </p>
            </div>
          </Link>
        </article>

        {/* grid */}
        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, i) => (
            <article key={post.slug} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <Link href={`/blog/${post.slug}`} className="group block">
                <div className="relative aspect-4/3 overflow-hidden rounded-sm">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="(max-width:768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-107"
                  />
                </div>
                <p className="eyebrow mt-4 mb-2">{post.category}</p>
                <h3 className="font-display text-2xl leading-tight transition-colors group-hover:text-ember-500">
                  {post.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-black/55">{post.excerpt}</p>
                <p className="mt-3 text-xs text-black/40">
                  {formatDate(post.date)} · {post.readMinutes} min read
                </p>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
