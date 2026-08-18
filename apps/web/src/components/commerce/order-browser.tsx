'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bike, Search, ShoppingBag, Store, UtensilsCrossed } from 'lucide-react';
import { DELIVERY_ZONES } from '@islamabad/shared';
import { api, type MenuCategory, type MenuItem, type Quote } from '@/lib/api';
import { useCart, type OrderType } from '@/store/cart';
import { DishCard } from '@/components/menu/dish-card';
import { Button } from '@/components/ui/button';
import { cn, formatPKR } from '@/lib/utils';

const TYPES: { value: OrderType; label: string; Icon: typeof Bike; hint: string }[] = [
  { value: 'DELIVERY', label: 'Delivery', Icon: Bike, hint: '30–70 min' },
  { value: 'PICKUP', label: 'Pickup', Icon: Store, hint: 'Ready in 25 min' },
  { value: 'DINE_IN', label: 'Dine in', Icon: UtensilsCrossed, hint: 'Order at your table' },
];

export function OrderBrowser({ items, categories }: { items: MenuItem[]; categories: MenuCategory[] }) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const { lines, type, zoneId, couponCode, setType, setZone, open } = useCart();

  const filtered = useMemo(() => {
    let list = items;
    if (category !== 'all') list = list.filter((i) => i.categorySlug === category);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    return list;
  }, [items, category, search]);

  const { data: quoteData } = useQuery({
    queryKey: ['order-quote', lines.map((l) => `${l.menuItemId}x${l.quantity}`).join(','), type, zoneId, couponCode],
    queryFn: () =>
      api.post<{ quote: Quote }>('/api/orders/quote', {
        items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        type,
        zoneId,
        couponCode,
      }),
    enabled: lines.length > 0,
    staleTime: 10_000,
  });

  const { data: recs } = useQuery({
    queryKey: ['recommendations', lines.map((l) => l.menuItemId).join(',')],
    queryFn: () =>
      api.get<{ reason: string; items: MenuItem[] }>(
        `/api/assistant/recommendations?cart=${lines.map((l) => l.menuItemId).join(',')}`,
      ),
    staleTime: 60_000,
  });

  const quote = quoteData?.quote;
  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId);
  const belowMinimum = type === 'DELIVERY' && zone && (quote?.subtotal ?? 0) < zone.minOrder;

  return (
    <div className="container-luxe grid gap-8 py-12 lg:grid-cols-[1fr_21rem]">
      <div>
        {/* order type */}
        <div className="mb-6 grid gap-2 sm:grid-cols-3">
          {TYPES.map(({ value, label, Icon, hint }) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={cn(
                'flex items-center gap-3 rounded-sm border p-4 text-left transition-all',
                type === value ? 'border-ember-500 bg-ember-500 text-white' : 'border-black/12 bg-white hover:border-black/35',
              )}
              aria-pressed={type === value}
            >
              <Icon className="size-5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className={cn('block text-xs', type === value ? 'text-white/75' : 'text-black/45')}>{hint}</span>
              </span>
            </button>
          ))}
        </div>

        {type === 'DELIVERY' && (
          <div className="mb-6">
            <label htmlFor="zone" className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-black/60">
              Delivery area
            </label>
            <select
              id="zone"
              value={zoneId ?? ''}
              onChange={(e) => setZone(e.target.value || null)}
              className="h-12 w-full rounded-sm border border-black/12 bg-white px-4 text-sm outline-none focus:border-saffron-400 sm:max-w-md"
            >
              <option value="">Select your area…</option>
              {DELIVERY_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} — {formatPKR(z.fee)}, {z.etaMin}–{z.etaMax} min
                </option>
              ))}
            </select>
          </div>
        )}

        {/* search */}
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/35" />
          <label htmlFor="order-search" className="sr-only">
            Search dishes
          </label>
          <input
            id="order-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the menu…"
            className="h-12 w-full rounded-sm border border-black/12 bg-white pl-11 pr-4 text-sm outline-none focus:border-saffron-400"
          />
        </div>

        {/* categories */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setCategory('all')}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm transition',
              category === 'all' ? 'bg-obsidian text-cream' : 'bg-white hover:bg-black/5',
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.slug)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm transition',
                category === c.slug ? 'bg-obsidian text-cream' : 'bg-white hover:bg-black/5',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item, i) => (
            <DishCard key={item.id} item={item} priority={i < 3} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-16 text-center text-black/50">No dishes match that search.</p>
        )}
      </div>

      {/* sticky summary */}
      <aside className="lg:sticky lg:top-28 lg:h-fit">
        <div className="rounded-sm border border-black/10 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl">
            <ShoppingBag className="size-5 text-ember-500" />
            Your order
          </h2>

          {lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-black/45">
              Nothing yet. Add a dish and your total will appear here.
            </p>
          ) : (
            <>
              <ul className="mb-4 space-y-2.5 border-b border-black/8 pb-4">
                {lines.map((l) => (
                  <li key={l.menuItemId} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium text-black/50">{l.quantity}×</span> {l.name}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatPKR(l.price * l.quantity)}</span>
                  </li>
                ))}
              </ul>

              {quote && (
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-black/60">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">{formatPKR(quote.subtotal)}</dd>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <dt>Discount</dt>
                      <dd className="tabular-nums">−{formatPKR(quote.discount)}</dd>
                    </div>
                  )}
                  {quote.packaging > 0 && (
                    <div className="flex justify-between text-black/60">
                      <dt>Packaging</dt>
                      <dd className="tabular-nums">{formatPKR(quote.packaging)}</dd>
                    </div>
                  )}
                  {type === 'DELIVERY' && (
                    <div className="flex justify-between text-black/60">
                      <dt>Delivery</dt>
                      <dd className="tabular-nums">
                        {quote.deliveryFee === 0 ? <span className="text-emerald-700">Free</span> : formatPKR(quote.deliveryFee)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between text-black/60">
                    <dt>Sales tax (16%)</dt>
                    <dd className="tabular-nums">{formatPKR(quote.tax)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-black/10 pt-2 font-display text-xl">
                    <dt>Total</dt>
                    <dd className="tabular-nums text-ember-500">{formatPKR(quote.total)}</dd>
                  </div>
                </dl>
              )}

              {belowMinimum && (
                <p className="mt-3 rounded-sm bg-amber-50 p-2.5 text-xs text-amber-800">
                  Minimum order for {zone!.name} is {formatPKR(zone!.minOrder)}. Add{' '}
                  {formatPKR(zone!.minOrder - (quote?.subtotal ?? 0))} more.
                </p>
              )}

              {type === 'DELIVERY' && !zoneId && (
                <p className="mt-3 rounded-sm bg-amber-50 p-2.5 text-xs text-amber-800">
                  Choose your delivery area to see the charge and ETA.
                </p>
              )}

              <Button
                asChild={!belowMinimum}
                variant="primary"
                size="lg"
                className="mt-4 w-full"
                disabled={belowMinimum}
              >
                {belowMinimum ? <span>Minimum not met</span> : <Link href="/checkout">Checkout</Link>}
              </Button>
              <button onClick={open} className="mt-2 w-full text-xs uppercase tracking-widest text-black/45 hover:text-black">
                Edit cart
              </button>
            </>
          )}
        </div>

        {/* AI upsell */}
        {recs && recs.items.length > 0 && (
          <div className="mt-4 rounded-sm border border-black/10 bg-white p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-saffron-600">{recs.reason}</p>
            <ul className="space-y-3">
              {recs.items.slice(0, 3).map((r) => (
                <li key={r.id}>
                  <Link href={`/menu/${r.slug}`} className="flex items-center gap-3 group">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-sm">
                      <Image src={r.image} alt="" fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium group-hover:text-ember-500">{r.name}</p>
                      <p className="text-xs font-semibold text-ember-500">{formatPKR(r.price)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
