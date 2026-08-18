'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChefHat, Clock, MapPin, Menu, Phone, ShoppingBag, User, X } from 'lucide-react';
import { BRAND } from '@islamabad/shared';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/order', label: 'Order Online' },
  { href: '/reservations', label: 'Reservations' },
  { href: '/about', label: 'About' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/events', label: 'Events' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const openCart = useCart((s) => s.open);
  const user = useAuth((s) => s.user);

  // Hero pages start transparent; inner pages are solid from the top.
  const isHero = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const solid = scrolled || !isHero || mobileOpen;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-sm focus:bg-ember-500 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-100 transition-all duration-500',
          solid ? 'bg-obsidian/95 shadow-xl backdrop-blur-lg' : 'bg-gradient-to-b from-black/70 to-transparent',
        )}
      >
        {/* top info bar — collapses on scroll to reclaim viewport height */}
        <div
          className={cn(
            'hidden overflow-hidden border-b border-white/10 transition-all duration-500 lg:block',
            scrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100',
          )}
        >
          <div className="container-luxe flex h-11 items-center justify-between text-[0.7rem] tracking-wide text-cream/65">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-ember-500" />
                {BRAND.address.street}, {BRAND.address.locality}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-saffron-400" />
                11:00 AM – 11:00 PM
              </span>
            </div>
            <div className="flex items-center gap-5">
              <a href={`tel:${BRAND.phoneRaw}`} className="flex items-center gap-1.5 transition-colors hover:text-saffron-400">
                <Phone className="size-3.5" />
                {BRAND.phone}
              </a>
              <span className="text-cream/25">|</span>
              <Link href="/offers" className="font-semibold text-saffron-400 transition-colors hover:text-saffron-300">
                Today&rsquo;s Offers
              </Link>
            </div>
          </div>
        </div>

        {/* main navigation */}
        <nav className="container-luxe flex h-[4.5rem] items-center justify-between gap-4" aria-label="Primary">
          <Link href="/" className="group flex items-center gap-3" aria-label={`${BRAND.name} — home`}>
            <span className="flex size-11 items-center justify-center rounded-sm bg-ember-500 transition-transform duration-500 group-hover:rotate-[8deg]">
              <ChefHat className="size-6 text-white" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[1.35rem] font-semibold tracking-tight text-cream">Islamabad</span>
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.38em] text-saffron-400">Restaurant</span>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 xl:flex">
            {NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative px-3.5 py-2 text-[0.78rem] font-medium uppercase tracking-[0.13em] transition-colors',
                      active ? 'text-saffron-400' : 'text-cream/80 hover:text-cream',
                    )}
                  >
                    {item.label}
                    {active && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-3.5 -bottom-0.5 h-px bg-saffron-400"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <Link
              href={user ? (user.role === 'CUSTOMER' ? '/dashboard' : '/admin') : '/login'}
              className="flex size-10 items-center justify-center rounded-sm text-cream/85 transition-colors hover:bg-white/10 hover:text-saffron-400"
              aria-label={user ? 'My account' : 'Sign in'}
            >
              <User className="size-[18px]" />
            </Link>

            <button
              onClick={openCart}
              className="relative flex size-10 items-center justify-center rounded-sm text-cream/85 transition-colors hover:bg-white/10 hover:text-saffron-400"
              aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
            >
              <ShoppingBag className="size-[18px]" />
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 -top-0.5 flex size-[18px] items-center justify-center rounded-full bg-ember-500 text-[0.6rem] font-bold text-white"
                >
                  {count > 99 ? '99+' : count}
                </motion.span>
              )}
            </button>

            <Button asChild variant="gold" size="sm" className="ml-1 hidden md:inline-flex">
              <Link href="/reservations">Book a Table</Link>
            </Button>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex size-10 items-center justify-center rounded-sm text-cream transition-colors hover:bg-white/10 xl:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-90 bg-black/70 backdrop-blur-sm xl:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-95 flex h-dvh w-[min(88vw,22rem)] flex-col overflow-y-auto bg-charcoal pt-24 xl:hidden"
              aria-label="Mobile navigation"
            >
              <ul className="flex flex-col px-6">
                {NAV.map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                  >
                    <Link
                      href={item.href}
                      className="block border-b border-white/8 py-4 font-display text-2xl text-cream transition-colors hover:text-saffron-400"
                    >
                      {item.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-auto space-y-3 p-6">
                <Button asChild variant="gold" size="lg" className="w-full">
                  <Link href="/reservations">Book a Table</Link>
                </Button>
                <Button asChild variant="outlineGold" size="lg" className="w-full">
                  <Link href="/order">Order Online</Link>
                </Button>
                <a
                  href={`tel:${BRAND.phoneRaw}`}
                  className="flex items-center justify-center gap-2 pt-2 text-sm text-cream/70"
                >
                  <Phone className="size-4 text-ember-500" />
                  {BRAND.phone}
                </a>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
