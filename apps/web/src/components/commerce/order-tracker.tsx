'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bike, Check, ChefHat, ClipboardCheck, PackageCheck, Phone, Utensils, XCircle } from 'lucide-react';
import { BRAND, ORDER_STATUS_META, type OrderStatus } from '@islamabad/shared';
import { api, type Order } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/primitives';
import { cn, formatPKR, formatDate } from '@/lib/utils';

const STEPS: { status: OrderStatus; Icon: typeof Check }[] = [
  { status: 'PENDING', Icon: ClipboardCheck },
  { status: 'CONFIRMED', Icon: Check },
  { status: 'PREPARING', Icon: ChefHat },
  { status: 'READY', Icon: PackageCheck },
  { status: 'OUT_FOR_DELIVERY', Icon: Bike },
  { status: 'DELIVERED', Icon: Utensils },
];

export function OrderTracker({ token }: { token: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['track', token],
    queryFn: () => api.get<{ order: Order }>(`/api/orders/track/${token}`),
    // Poll while the order is live; stop once it reaches a terminal state.
    refetchInterval: (query) => {
      const status = query.state.data?.order.status;
      return status === 'DELIVERED' || status === 'CANCELLED' ? false : 15_000;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <Spinner className="size-8" />
        <p className="text-black/50">Finding your order…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-sm border border-dashed border-black/15 py-20 text-center">
        <XCircle className="mx-auto mb-4 size-9 text-black/20" />
        <p className="font-display text-3xl">We could not find that order</p>
        <p className="mt-2 text-black/55">Check the link in your confirmation email, or call us.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="dark">
            <a href={`tel:${BRAND.phoneRaw}`}>Call {BRAND.phone}</a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/order">Order again</Link>
          </Button>
        </div>
      </div>
    );
  }

  const order = data.order;
  const meta = ORDER_STATUS_META[order.status];
  const cancelled = order.status === 'CANCELLED';
  const relevantSteps = order.type === 'DELIVERY' ? STEPS : STEPS.filter((s) => s.status !== 'OUT_FOR_DELIVERY');
  const currentStep = meta.step;

  const eta = order.etaMinutes
    ? new Date(new Date(order.createdAt).getTime() + order.etaMinutes * 60_000)
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-2">Order {order.orderNumber}</p>
        <h1 className="font-display text-[clamp(2.2rem,5vw,3.2rem)] font-semibold">{meta.label}</h1>
        <p className="mt-2 text-black/60">{meta.description}</p>
        {eta && !cancelled && order.status !== 'DELIVERED' && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-saffron-100 px-4 py-1.5 text-sm font-medium text-obsidian/80">
            Estimated arrival by{' '}
            {eta.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' })}
          </p>
        )}
      </div>

      {/* progress */}
      {!cancelled ? (
        <div className="mb-10 rounded-sm border border-black/10 bg-white p-7">
          <ol className="relative flex justify-between">
            <div className="absolute left-0 right-0 top-5 -z-0 h-0.5 bg-black/8" />
            <motion.div
              className="absolute left-0 top-5 -z-0 h-0.5 bg-ember-500"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / (relevantSteps.length - 1)) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
            {relevantSteps.map((step, i) => {
              const stepMeta = ORDER_STATUS_META[step.status];
              const done = currentStep >= stepMeta.step;
              const active = currentStep === stepMeta.step;
              return (
                <li key={step.status} className="relative z-10 flex flex-1 flex-col items-center gap-2">
                  <span
                    className={cn(
                      'relative flex size-10 items-center justify-center rounded-full border-2 transition-all duration-500',
                      done ? 'border-ember-500 bg-ember-500 text-white' : 'border-black/12 bg-white text-black/25',
                      active && 'animate-pulse-ring',
                    )}
                  >
                    <step.Icon className="size-4" />
                  </span>
                  <span
                    className={cn(
                      'text-center text-[0.65rem] uppercase tracking-wider',
                      done ? 'font-semibold text-obsidian' : 'text-black/35',
                    )}
                  >
                    {stepMeta.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <div className="mb-10 rounded-sm border border-red-200 bg-red-50 p-6 text-center">
          <XCircle className="mx-auto mb-2 size-7 text-red-500" />
          <p className="font-display text-2xl text-red-900">This order was cancelled</p>
          <p className="mt-1 text-sm text-red-800/70">
            Any points you redeemed have been returned to your account.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="mb-4 font-display text-2xl">Your order</h2>
          <ul className="space-y-2.5 border-b border-black/8 pb-4 text-sm">
            {order.items.map((item) => (
              <li key={item.id}>
                <div className="flex justify-between gap-3">
                  <span>
                    <span className="text-black/45">{item.quantity}×</span> {item.name}
                  </span>
                  <span className="tabular-nums">{formatPKR(item.total)}</span>
                </div>
                {item.notes && <p className="text-xs italic text-black/45">“{item.notes}”</p>}
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-black/55">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatPKR(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Discount</dt>
                <dd className="tabular-nums">−{formatPKR(order.discount)}</dd>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-black/55">
                <dt>Delivery</dt>
                <dd className="tabular-nums">{formatPKR(order.deliveryFee)}</dd>
              </div>
            )}
            <div className="flex justify-between text-black/55">
              <dt>Tax</dt>
              <dd className="tabular-nums">{formatPKR(order.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-2 font-display text-xl">
              <dt>Total</dt>
              <dd className="tabular-nums text-ember-500">{formatPKR(order.total)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="mb-4 font-display text-2xl">Details</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[0.66rem] uppercase tracking-widest text-black/40">Type</dt>
              <dd className="capitalize">{order.type.replace('_', ' ').toLowerCase()}</dd>
            </div>
            {order.addressText && (
              <div>
                <dt className="text-[0.66rem] uppercase tracking-widest text-black/40">Delivering to</dt>
                <dd>{order.addressText}</dd>
              </div>
            )}
            <div>
              <dt className="text-[0.66rem] uppercase tracking-widest text-black/40">Contact</dt>
              <dd>
                {order.customerName} · {order.customerPhone}
              </dd>
            </div>
            <div>
              <dt className="text-[0.66rem] uppercase tracking-widest text-black/40">Payment</dt>
              <dd>
                {order.paymentMethod.replace('_', ' ')} ·{' '}
                <span className={order.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}>
                  {order.paymentStatus.toLowerCase()}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-[0.66rem] uppercase tracking-widest text-black/40">Placed</dt>
              <dd>
                {formatDate(order.createdAt)} at{' '}
                {new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </dd>
            </div>
          </dl>

          {order.events && order.events.length > 0 && (
            <>
              <h3 className="mb-3 mt-6 text-[0.66rem] uppercase tracking-widest text-black/40">History</h3>
              <ol className="space-y-2 border-l border-black/10 pl-4 text-xs">
                {order.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[1.31rem] top-1.5 size-1.5 rounded-full bg-ember-500" />
                    <span className="font-medium">{ORDER_STATUS_META[e.status as OrderStatus]?.label ?? e.status}</span>
                    <span className="ml-2 text-black/40">
                      {new Date(e.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`tel:${BRAND.phoneRaw}`}>
                <Phone className="size-3.5" />
                Call the restaurant
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/order">Order again</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
