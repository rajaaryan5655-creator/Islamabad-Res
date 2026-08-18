'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Clock, Star, UtensilsCrossed } from 'lucide-react';
import { BRAND } from '@islamabad/shared';
import { Button } from '@/components/ui/button';

const STATS = [
  { value: '27', label: 'Years of service' },
  { value: '4.8', label: 'Google rating', icon: true },
  { value: '260', label: 'Covers nightly' },
  { value: '45', label: 'Min delivery' },
];

export function Hero() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, reduced ? 0 : 130]);
  const opacity = useTransform(scrollY, [0, 480], [1, 0]);

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-obsidian grain">
      {/* backdrop */}
      <motion.div style={{ y }} className="absolute inset-0 -z-10 scale-110">
        <Image
          src="/images/hero-main.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          quality={82}
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/85 to-obsidian/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-obsidian/70" />
      </motion.div>

      <div className="container-luxe relative z-10 pb-16 pt-32 md:pt-36">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-saffron-400/30 bg-saffron-400/10 px-4 py-1.5 backdrop-blur-sm"
          >
            <Star className="size-3.5 fill-saffron-400 text-saffron-400" />
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-saffron-400">
              Restaurant of the Year 2025 — Twin Cities
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 font-script text-3xl text-saffron-400 md:text-4xl"
          >
            Since {BRAND.established}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[clamp(2.9rem,8.2vw,5.6rem)] font-semibold leading-[0.94] text-cream text-balance"
          >
            The True Taste
            <br />
            of <span className="text-ember-500">Pakistan</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-xl text-base leading-relaxed text-cream/70 md:text-lg text-pretty"
          >
            Degh-cooked biryani in limited batches. A charcoal counter you can watch from your table. Meat bought at
            the Bhara Kahu abattoir at five every morning — never frozen, never reheated.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Button asChild variant="primary" size="lg">
              <Link href="/order">
                <UtensilsCrossed />
                Order Online
              </Link>
            </Button>
            <Button asChild variant="outlineGold" size="lg">
              <Link href="/reservations">
                Reserve a Table
                <ArrowRight />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.44 }}
            className="mt-10 flex items-center gap-2 text-sm text-cream/55"
          >
            <Clock className="size-4 text-emerald-400" />
            <span>
              Open today until 11:00 PM · Delivery across Islamabad &amp; Rawalpindi
            </span>
          </motion.div>
        </div>

        {/* stats */}
        <motion.dl
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-7 border-t border-white/10 pt-8 md:grid-cols-4"
        >
          {STATS.map((s) => (
            <div key={s.label}>
              <dd className="flex items-baseline gap-1 font-display text-4xl font-semibold text-cream">
                {s.value}
                {s.icon && <Star className="size-4 fill-saffron-400 text-saffron-400" />}
              </dd>
              <dt className="mt-0.5 text-[0.68rem] uppercase tracking-[0.18em] text-cream/45">{s.label}</dt>
            </div>
          ))}
        </motion.dl>
      </div>

      {/* scroll cue */}
      <motion.div
        style={{ opacity }}
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
      >
        <span className="text-[0.6rem] uppercase tracking-[0.3em] text-cream/40">Scroll</span>
        <motion.div
          animate={{ y: [0, 9, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          className="h-10 w-px bg-gradient-to-b from-saffron-400 to-transparent"
        />
      </motion.div>
    </section>
  );
}
