'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChefHat, Facebook, Instagram, Mail, MapPin, Phone, Send, Youtube } from 'lucide-react';
import { BRAND, OPENING_HOURS } from '@islamabad/shared';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { href: '/menu', label: 'Full Menu' },
      { href: '/order', label: 'Order Online' },
      { href: '/reservations', label: 'Book a Table' },
      { href: '/gallery', label: 'Gallery' },
      { href: '/blog', label: 'Journal' },
    ],
  },
  {
    title: 'Restaurant',
    links: [
      { href: '/about', label: 'Our Story' },
      { href: '/about#chefs', label: 'Meet the Chefs' },
      { href: '/events', label: 'Private Events' },
      { href: '/gift-cards', label: 'Gift Cards' },
      { href: '/contact', label: 'Contact Us' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/dashboard', label: 'My Dashboard' },
      { href: '/dashboard/orders', label: 'Order History' },
      { href: '/dashboard/loyalty', label: 'Loyalty & Rewards' },
      { href: '/offers', label: 'Current Offers' },
      { href: '/track', label: 'Track an Order' },
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>('/api/marketing/newsletter', { email, source: 'footer' });
      toast.success(res.message);
      setEmail('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <footer className="relative overflow-hidden bg-obsidian text-cream/70">
      <div className="pointer-events-none absolute -left-40 top-0 size-[30rem] rounded-full bg-ember-700/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-[24rem] rounded-full bg-saffron-600/8 blur-3xl" />

      {/* newsletter */}
      <div className="relative border-b border-white/8">
        <div className="container-luxe grid gap-8 py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow mb-2">Stay in touch</p>
            <h2 className="font-display text-3xl text-cream md:text-4xl">
              Thursday offers, new dishes, <span className="script-accent">and first refusal on events</span>
            </h2>
            <p className="mt-2 max-w-lg text-sm">
              One email a week. Seasonal menus, Ramadan sittings and member-only pricing. No noise, unsubscribe anytime.
            </p>
          </div>
          <form onSubmit={subscribe} className="flex gap-2">
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-12 flex-1 rounded-sm border border-white/15 bg-white/5 px-4 text-sm text-cream outline-none transition placeholder:text-cream/35 focus:border-saffron-400 focus:bg-white/10"
            />
            <Button type="submit" variant="gold" loading={loading} className="shrink-0">
              <Send className="size-4" />
              Join
            </Button>
          </form>
        </div>
      </div>

      {/* main */}
      <div className="container-luxe relative grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="mb-5 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-sm bg-ember-500">
              <ChefHat className="size-6 text-white" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-xl font-semibold text-cream">Islamabad</span>
              <span className="text-[0.58rem] font-semibold uppercase tracking-[0.36em] text-saffron-400">Restaurant</span>
            </span>
          </Link>
          <p className="max-w-sm text-sm leading-relaxed">
            Serving the honest, fire-cooked food of Pakistan since {BRAND.established}. Nothing frozen, nothing
            reheated — the kitchen closes when the last order is served.
          </p>

          <div className="mt-6 space-y-2.5 text-sm">
            <a href={BRAND.mapLink} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 transition-colors hover:text-saffron-400">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ember-500" />
              <span>
                {BRAND.address.street}
                <br />
                {BRAND.address.locality} {BRAND.address.postalCode}
              </span>
            </a>
            <a href={`tel:${BRAND.phoneRaw}`} className="flex items-center gap-2.5 transition-colors hover:text-saffron-400">
              <Phone className="size-4 shrink-0 text-ember-500" />
              {BRAND.phone}
            </a>
            <a href={`mailto:${BRAND.email}`} className="flex items-center gap-2.5 transition-colors hover:text-saffron-400">
              <Mail className="size-4 shrink-0 text-ember-500" />
              {BRAND.email}
            </a>
          </div>

          <div className="mt-6 flex gap-2">
            {[
              { href: BRAND.social.instagram, Icon: Instagram, label: 'Instagram' },
              { href: BRAND.social.facebook, Icon: Facebook, label: 'Facebook' },
              { href: BRAND.social.youtube, Icon: Youtube, label: 'YouTube' },
            ].map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex size-10 items-center justify-center rounded-sm border border-white/12 transition-all hover:border-saffron-400 hover:bg-saffron-400 hover:text-obsidian"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-saffron-400">{col.title}</h3>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="transition-colors hover:text-cream hover:underline underline-offset-4">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* hours strip */}
      <div className="relative border-t border-white/8">
        <div className="container-luxe flex flex-wrap items-center justify-center gap-x-7 gap-y-2 py-5 text-[0.72rem] uppercase tracking-[0.14em]">
          {OPENING_HOURS.map((h) => (
            <span key={h.day} className="flex items-center gap-2">
              <span className="text-cream/45">{h.day.slice(0, 3)}</span>
              <span className="text-saffron-400/90">
                {h.open}–{h.close}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* legal */}
      <div className="relative border-t border-white/8">
        <div className="container-luxe flex flex-col items-center justify-between gap-3 py-6 text-xs text-cream/45 md:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/privacy" className="transition-colors hover:text-saffron-400">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-saffron-400">
              Terms of Service
            </Link>
            <Link href="/sitemap.xml" className="transition-colors hover:text-saffron-400">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
