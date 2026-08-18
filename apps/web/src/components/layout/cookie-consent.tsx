'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';

const KEY = 'ir-cookie-consent';

/** GDPR / PECR consent gate (Phase 11). Analytics stay dormant until accepted. */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        const timer = setTimeout(() => setVisible(true), 1600);
        return () => clearTimeout(timer);
      }
    } catch {
      /* storage blocked — do not nag */
    }
  }, []);

  function decide(value: 'all' | 'essential') {
    try {
      localStorage.setItem(KEY, JSON.stringify({ value, at: new Date().toISOString() }));
    } catch {
      /* ignore */
    }
    // Signal consent to any analytics loaded later.
    window.dispatchEvent(new CustomEvent('cookie-consent', { detail: value }));
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          role="dialog"
          aria-label="Cookie preferences"
          className="no-print fixed bottom-5 left-5 z-90 w-[min(92vw,25rem)] rounded-lg bg-obsidian p-5 text-cream shadow-2xl"
        >
          <div className="mb-3 flex items-center gap-2.5">
            <Cookie className="size-5 text-saffron-400" />
            <h2 className="font-display text-lg">We use cookies</h2>
          </div>
          <p className="text-sm leading-relaxed text-cream/70">
            Essential cookies keep your cart and session working. With your consent we also measure which dishes and
            pages people look at, so we can improve the menu. Read our{' '}
            <Link href="/privacy" className="text-saffron-400 underline underline-offset-2">
              privacy policy
            </Link>
            .
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="gold" size="sm" className="flex-1" onClick={() => decide('all')}>
              Accept all
            </Button>
            <Button variant="outlineGold" size="sm" className="flex-1" onClick={() => decide('essential')}>
              Essential only
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
