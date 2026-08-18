import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { BLOG_POSTS } from '@islamabad/shared';
import { Button } from '@/components/ui/button';
import { JsonLd, articleSchema, breadcrumbSchema, buildMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/utils';

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return buildMetadata({ title: 'Article not found', description: 'This article does not exist.' });

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.image,
    keywords: post.keywords,
    type: 'article',
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <JsonLd data={articleSchema(post)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Journal', path: '/blog' },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />

      <article className="pt-[7.5rem]">
        {/* header */}
        <header className="container-luxe max-w-3xl py-12 text-center">
          <p className="eyebrow mb-3">{post.category}</p>
          <h1 className="font-display text-[clamp(2.2rem,5.4vw,3.8rem)] font-semibold leading-[1.05] text-balance">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-black/58 text-pretty">{post.excerpt}</p>
          <p className="mt-6 text-sm text-black/45">
            By {post.author} · {formatDate(post.date)} · {post.readMinutes} min read
          </p>
        </header>

        <div className="container-luxe max-w-5xl">
          <div className="relative aspect-16/9 overflow-hidden rounded-sm">
            <Image src={post.image} alt={post.title} fill priority sizes="100vw" className="object-cover" />
          </div>
        </div>

        {/* body */}
        <div className="container-luxe max-w-2xl py-14">
          {post.body.map((paragraph, i) => (
            <p
              key={i}
              className={`mb-6 leading-[1.85] text-black/72 ${i === 0 ? 'text-lg first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-6xl first-letter:leading-[0.85] first-letter:text-ember-500' : ''}`}
            >
              {paragraph}
            </p>
          ))}

          <div className="mt-12 border-t border-black/10 pt-8">
            <Button asChild variant="outline">
              <Link href="/blog">
                <ArrowLeft />
                All articles
              </Link>
            </Button>
          </div>
        </div>

        {/* related */}
        <section className="border-t border-black/8 bg-white py-16">
          <div className="container-luxe">
            <h2 className="mb-8 font-display text-3xl">Keep reading</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group block">
                  <div className="relative aspect-4/3 overflow-hidden rounded-sm">
                    <Image src={r.image} alt={r.title} fill sizes="33vw" className="object-cover transition-transform duration-700 group-hover:scale-107" />
                  </div>
                  <p className="eyebrow mt-3 mb-1">{r.category}</p>
                  <h3 className="font-display text-xl leading-tight transition-colors group-hover:text-ember-500">{r.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
