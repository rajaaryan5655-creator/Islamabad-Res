import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function PageHero({
  eyebrow,
  title,
  accent,
  description,
  image = '/images/banner-spices.jpg',
  breadcrumbs = [],
  children,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  description?: string;
  image?: string;
  breadcrumbs?: { label: string; href: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative flex min-h-[52vh] items-end overflow-hidden bg-obsidian pb-14 pt-40 grain">
      <Image src={image} alt="" fill priority sizes="100vw" className="object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/80 to-obsidian/60" />

      <div className="container-luxe relative">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-cream/50">
              <li>
                <Link href="/" className="transition-colors hover:text-saffron-400">
                  Home
                </Link>
              </li>
              {breadcrumbs.map((crumb, i) => (
                <li key={crumb.href} className="flex items-center gap-1.5">
                  <ChevronRight className="size-3" />
                  {i === breadcrumbs.length - 1 ? (
                    <span className="text-saffron-400">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="transition-colors hover:text-saffron-400">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="max-w-3xl font-display text-[clamp(2.4rem,6vw,4.2rem)] font-semibold leading-[1.02] text-cream text-balance">
          {title} {accent && <span className="script-accent">{accent}</span>}
        </h1>
        {description && <p className="mt-4 max-w-2xl text-cream/65 text-pretty">{description}</p>}
        {children}
      </div>
    </section>
  );
}
