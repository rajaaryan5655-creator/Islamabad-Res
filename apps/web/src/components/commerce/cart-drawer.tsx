'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD } from '@islamabad/shared';
import { useCart } from '@/store/cart';
import { api, type Quote } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatPKR } from '@/lib/utils';

export function CartDrawer() {
  const { lines, isOpen, close, setQuantity, remove, type, zoneId, couponCode } = useCart();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const { data } = useQuery({
    queryKey: ['quote', lines.map((l) => `${l.menuItemId}x${l.quantity}`).join(','), type, zoneId, couponCode],
    queryFn: () =>
      api.post<{ quote: Quote }>('/api/orders/quote', {
        items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        type,
        zoneId,
        couponCode,
      }),
    enabled: isOpen && lines.length > 0,
    staleTime: 10_000,
  });

  const quote = data?.quote;
  const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const toFreeDelivery = FREE_DELIVERY_THRESHOLD - subtotal;
  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-110 bg-black/65 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-label="Shopping cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed right-0 top-0 z-120 flex h-dvh w-[min(94vw,27rem)] flex-col bg-cream shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-black/8 bg-obsidian px-5 py-4 text-cream">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="size-5 text-saffron-400" />
                <h2 className="font-display text-xl">Your Order</h2>
                <span className="rounded-full bg-ember-500 px-2 py-0.5 text-[0.65rem] font-bold">
                  {lines.reduce((n, l) => n + l.quantity, 0)}
                </span>
              </div>
              <button
                onClick={close}
                aria-label="Close cart"
                className="flex size-9 items-center justify-center rounded-sm transition-colors hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="flex size-20 items-center justify-center rounded-full bg-black/5">
                  <ShoppingBag className="size-8 text-black/25" />
                </div>
                <div>
                  <p className="font-display text-2xl">Your cart is empty</p>
                  <p className="mt-1 text-sm text-black/55">
                    Start with the mix grill — it settles the argument at the table.
                  </p>
                </div>
                <Button asChild variant="primary" onClick={close}>
                  <Link href="/menu">Browse the Menu</Link>
                </Button>
              </div>
            ) : (
              <>
                {type === 'DELIVERY' && toFreeDelivery > 0 && (
                  <div className="border-b border-black/8 bg-saffron-100 px-5 py-3">
                    <p className="text-xs font-medium text-obsidian/80">
                      Add <strong>{formatPKR(toFreeDelivery)}</strong> more for free delivery
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10">
                      <motion.div
                        className="h-full rounded-full bg-saffron-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <ul className="space-y-4">
                    <AnimatePresence initial={false}>
                      {lines.map((line) => (
                        <motion.li
                          key={line.menuItemId}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          className="flex gap-3 overflow-hidden"
                        >
                          <div className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-black/5">
                            <Image src={line.image} alt={line.name} fill sizes="80px" className="object-cover" />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                href={`/menu/${line.slug}`}
                                onClick={close}
                                className="font-display text-lg leading-tight hover:text-ember-500"
                              >
                                {line.name}
                              </Link>
                              <button
                                onClick={() => remove(line.menuItemId)}
                                aria-label={`Remove ${line.name}`}
                                className="shrink-0 p-1 text-black/30 transition-colors hover:text-ember-500"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                            {line.notes && <p className="truncate text-xs italic text-black/50">“{line.notes}”</p>}
                            <div className="mt-auto flex items-center justify-between pt-1.5">
                              <div className="flex items-center rounded-sm border border-black/12">
                                <button
                                  onClick={() => setQuantity(line.menuItemId, line.quantity - 1)}
                                  aria-label={`Decrease ${line.name}`}
                                  className="flex size-7 items-center justify-center transition-colors hover:bg-black/5"
                                >
                                  <Minus className="size-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                                <button
                                  onClick={() => setQuantity(line.menuItemId, line.quantity + 1)}
                                  aria-label={`Increase ${line.name}`}
                                  className="flex size-7 items-center justify-center transition-colors hover:bg-black/5"
                                >
                                  <Plus className="size-3" />
                                </button>
                              </div>
                              <span className="font-semibold text-ember-500 tabular-nums">
                                {formatPKR(line.price * line.quantity)}
                              </span>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>

                <footer className="border-t border-black/8 bg-white px-5 py-4">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-black/60">Subtotal</dt>
                      <dd className="tabular-nums">{formatPKR(quote?.subtotal ?? subtotal)}</dd>
                    </div>
                    {quote && quote.discount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <dt>Discount {quote.couponCode && `(${quote.couponCode})`}</dt>
                        <dd className="tabular-nums">−{formatPKR(quote.discount)}</dd>
                      </div>
                    )}
                    {quote && (
                      <>
                        {quote.packaging > 0 && (
                          <div className="flex justify-between text-black/60">
                            <dt>Packaging</dt>
                            <dd className="tabular-nums">{formatPKR(quote.packaging)}</dd>
                          </div>
                        )}
                        {type === 'DELIVERY' && (
                          <div className="flex justify-between text-black/60">
                            <dt>Delivery{zone ? ` — ${zone.name.split(' (')[0]}` : ''}</dt>
                            <dd className="tabular-nums">
                              {quote.deliveryFee === 0 ? (
                                <span className="font-semibold text-emerald-700">Free</span>
                              ) : (
                                formatPKR(quote.deliveryFee)
                              )}
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between text-black/60">
                          <dt>Sales tax (16%)</dt>
                          <dd className="tabular-nums">{formatPKR(quote.tax)}</dd>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between border-t border-black/10 pt-2 font-display text-xl">
                      <dt>Total</dt>
                      <dd className="tabular-nums text-ember-500">{formatPKR(quote?.total ?? subtotal)}</dd>
                    </div>
                  </dl>

                  {quote && quote.pointsEarned > 0 && (
                    <p className="mt-2 text-center text-xs text-saffron-600">
                      You will earn {quote.pointsEarned} loyalty points on this order
                    </p>
                  )}

                  <Button asChild variant="primary" size="lg" className="mt-3 w-full" onClick={close}>
                    <Link href="/checkout">Proceed to Checkout</Link>
                  </Button>
                  <button
                    onClick={close}
                    className="mt-2 w-full text-center text-xs uppercase tracking-widest text-black/45 transition-colors hover:text-black"
                  >
                    Continue browsing
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
