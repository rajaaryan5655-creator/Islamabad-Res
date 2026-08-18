'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Faq({ items, title = 'Questions, answered' }: { items: { q: string; a: string }[]; title?: string }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-cream-dark/40 py-20">
      <div className="container-luxe max-w-3xl">
        <div className="reveal mb-10 text-center">
          <p className="eyebrow mb-3">FAQ</p>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold">{title}</h2>
        </div>

        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={item.q} className="reveal overflow-hidden rounded-sm border border-black/10 bg-white">
              <h3>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-black/2"
                >
                  <span className="font-medium">{item.q}</span>
                  <Plus
                    className={cn(
                      'size-4 shrink-0 text-ember-500 transition-transform duration-300',
                      open === i && 'rotate-45',
                    )}
                  />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="border-t border-black/6 px-5 py-4 text-[0.92rem] leading-relaxed text-black/62">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
