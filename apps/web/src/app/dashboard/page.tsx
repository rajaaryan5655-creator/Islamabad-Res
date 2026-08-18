'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Heart, Receipt, Sparkles, TrendingUp } from 'lucide-react';
import { ORDER_STATUS_META, type OrderStatus } from '@islamabad/shared';
import { api, type Order, type Reservation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { formatDate, formatPKR, formatTime } from '@/lib/utils';

interface DashboardData {
  user: { name: string; points: number; lifetimePoints: number; referralCode: string; memberSince: string };
  loyalty: {
    tier: { name: string; multiplier: number; perks: string[] };
    nextTier: { name: string; minPoints: number } | null;
    pointsToNext: number;
    progressPct: number;
  };
  stats: { totalOrders: number; totalSpend: number; upcomingReservations: number };
  recentOrders: Order[];
  activeOrder: Order | null;
  upcomingReservations: Reservation[];
  favourites: { name: string; quantity: number }[];
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/api/customer/dashboard'),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { user, loyalty, stats, recentOrders, activeOrder, upcomingReservations, favourites } = data;

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-display text-4xl">Assalam-o-Alaikum, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 text-black/55">Member since {formatDate(user.memberSince, { month: 'long', year: 'numeric' })}</p>
      </header>

      {/* live order */}
      {activeOrder && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-sm border border-ember-500/40 bg-ember-50 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ember-600">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember-500 opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-ember-500" />
                </span>
                Live order
              </p>
              <p className="mt-1.5 font-display text-2xl">
                {ORDER_STATUS_META[activeOrder.status as OrderStatus].label} · {activeOrder.orderNumber}
              </p>
              <p className="text-sm text-black/60">{ORDER_STATUS_META[activeOrder.status as OrderStatus].description}</p>
            </div>
            <Button asChild variant="primary">
              <Link href={`/track/${activeOrder.trackingToken}`}>
                Track order
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}

      {/* stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total orders', value: stats.totalOrders, Icon: Receipt },
          { label: 'Lifetime spend', value: formatPKR(stats.totalSpend), Icon: TrendingUp },
          { label: 'Upcoming bookings', value: stats.upcomingReservations, Icon: CalendarDays },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-sm border border-black/10 bg-white p-5">
            <Icon className="mb-3 size-5 text-ember-500" />
            <p className="font-display text-3xl font-semibold">{value}</p>
            <p className="text-xs uppercase tracking-widest text-black/40">{label}</p>
          </div>
        ))}
      </div>

      {/* loyalty */}
      <section className="rounded-sm border border-black/10 bg-obsidian p-6 text-cream">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-saffron-400">
              <Sparkles className="size-3.5" />
              {loyalty.tier.name} member · {loyalty.tier.multiplier}× earn rate
            </p>
            <p className="mt-2 font-display text-5xl font-semibold">{user.points.toLocaleString()}</p>
            <p className="text-sm text-cream/55">points available · worth {formatPKR(user.points * 2)}</p>
          </div>
          <Button asChild variant="gold" size="sm">
            <Link href="/dashboard/loyalty">View rewards</Link>
          </Button>
        </div>

        {loyalty.nextTier && (
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-cream/60">
              <span>{loyalty.tier.name}</span>
              <span>
                {loyalty.pointsToNext.toLocaleString()} points to {loyalty.nextTier.name}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-saffron-300"
                initial={{ width: 0 }}
                animate={{ width: `${loyalty.progressPct}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* recent orders */}
        <section className="rounded-sm border border-black/10 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Recent orders</h2>
            <Link href="/dashboard/orders" className="text-xs uppercase tracking-widest text-ember-500 hover:underline">
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-black/50">You have not ordered yet.</p>
              <Button asChild variant="primary" size="sm" className="mt-4">
                <Link href="/order">Order now</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentOrders.slice(0, 4).map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 border-b border-black/6 pb-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{order.orderNumber}</p>
                    <p className="truncate text-xs text-black/45">
                      {order.items.length} item{order.items.length === 1 ? '' : 's'} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatPKR(order.total)}</p>
                    <Badge variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'muted' : 'ember'}>
                      {ORDER_STATUS_META[order.status as OrderStatus].label}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* reservations */}
        <section className="rounded-sm border border-black/10 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Upcoming tables</h2>
            <Link href="/dashboard/reservations" className="text-xs uppercase tracking-widest text-ember-500 hover:underline">
              View all
            </Link>
          </div>

          {upcomingReservations.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-black/50">No upcoming reservations.</p>
              <Button asChild variant="dark" size="sm" className="mt-4">
                <Link href="/reservations">Book a table</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingReservations.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-b border-black/6 pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(`${r.date}T12:00:00`, { weekday: 'short', day: 'numeric', month: 'short' })} at{' '}
                      {formatTime(r.time)}
                    </p>
                    <p className="text-xs text-black/45">
                      {r.guests} guests {r.table ? `· ${r.table.name}` : ''}
                    </p>
                  </div>
                  <Badge variant={r.status === 'CONFIRMED' ? 'success' : 'gold'}>{r.status.toLowerCase()}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* favourites */}
      {favourites.length > 0 && (
        <section className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl">
            <Heart className="size-5 text-ember-500" />
            Your usual
          </h2>
          <ul className="flex flex-wrap gap-2">
            {favourites.map((f) => (
              <li key={f.name} className="rounded-full bg-cream px-4 py-2 text-sm">
                {f.name}
                <span className="ml-2 text-xs text-black/40">×{f.quantity}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
