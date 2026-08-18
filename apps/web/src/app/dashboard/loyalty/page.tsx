'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Copy, Gift, Sparkles, Users } from 'lucide-react';
import { POINT_VALUE } from '@islamabad/shared';
import { api } from '@/lib/api';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { cn, formatDate, formatPKR } from '@/lib/utils';

interface LoyaltyData {
  points: number;
  lifetimePoints: number;
  tier: { id: string; name: string; multiplier: number; perks: string[] };
  nextTier: { name: string; minPoints: number } | null;
  allTiers: { id: string; name: string; minPoints: number; multiplier: number; perks: string[] }[];
  ledger: { id: string; delta: number; reason: string; balance: number; createdAt: string }[];
  referralCode: string;
  referralCount: number;
}

export default function LoyaltyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => api.get<LoyaltyData>('/api/customer/loyalty'),
  });

  if (isLoading || !data) return <Skeleton className="h-96" />;

  const currentFloor = data.allTiers.find((t) => t.id === data.tier.id)?.minPoints ?? 0;
  const progress = data.nextTier
    ? Math.min(
        100,
        Math.round(((data.lifetimePoints - currentFloor) / Math.max(1, data.nextTier.minPoints - currentFloor)) * 100),
      )
    : 100;

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-display text-4xl">Loyalty &amp; rewards</h1>
        <p className="mt-1 text-black/55">Earn 1 point per Rs. 100 · each point is worth {formatPKR(POINT_VALUE)}</p>
      </header>

      {/* balance card */}
      <section className="relative overflow-hidden rounded-sm bg-obsidian p-8 text-cream">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-saffron-400/12 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-saffron-400">
              <Sparkles className="size-3.5" />
              {data.tier.name} · {data.tier.multiplier}× earn rate
            </p>
            <p className="mt-3 font-display text-6xl font-semibold">{data.points.toLocaleString()}</p>
            <p className="text-cream/55">points · worth {formatPKR(data.points * POINT_VALUE)} at checkout</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-cream/40">Lifetime earned</p>
            <p className="font-display text-3xl">{data.lifetimePoints.toLocaleString()}</p>
          </div>
        </div>

        {data.nextTier && (
          <div className="relative mt-8">
            <div className="mb-2 flex justify-between text-xs text-cream/60">
              <span>{data.tier.name}</span>
              <span>
                {(data.nextTier.minPoints - data.lifetimePoints).toLocaleString()} points to {data.nextTier.name}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-saffron-300"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        )}
      </section>

      {/* tiers */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Membership tiers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.allTiers.map((tier) => {
            const current = tier.id === data.tier.id;
            const unlocked = data.lifetimePoints >= tier.minPoints;
            return (
              <div
                key={tier.id}
                className={cn(
                  'rounded-sm border p-5 transition-all',
                  current ? 'border-saffron-400 bg-saffron-100' : unlocked ? 'border-black/12 bg-white' : 'border-black/8 bg-white opacity-55',
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-display text-xl">{tier.name}</p>
                  {current && <Badge variant="gold">Current</Badge>}
                </div>
                <p className="text-xs text-black/45">
                  {tier.minPoints === 0 ? 'From day one' : `${tier.minPoints.toLocaleString()} points`}
                </p>
                <p className="mt-3 font-display text-2xl text-ember-500">{tier.multiplier}×</p>
                <ul className="mt-3 space-y-1 border-t border-black/8 pt-3 text-xs text-black/58">
                  {tier.perks.map((p) => (
                    <li key={p} className="flex gap-1.5">
                      <span className="mt-1.5 size-1 shrink-0 rotate-45 bg-saffron-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* referral */}
      <section className="rounded-sm border border-black/10 bg-white p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-2xl">
          <Users className="size-5 text-ember-500" />
          Refer a friend
        </h2>
        <p className="mb-4 text-sm text-black/55">
          They get 250 points to start; you get 500 when they place their first order.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(data.referralCode);
              toast.success('Referral code copied');
            }}
            className="flex items-center gap-3 rounded-sm border-2 border-dashed border-ember-500/40 px-5 py-3 transition-colors hover:border-ember-500 hover:bg-ember-50"
          >
            <code className="font-mono text-lg font-bold tracking-widest text-ember-500">{data.referralCode}</code>
            <Copy className="size-4 text-black/35" />
          </button>
          <p className="text-sm text-black/50">
            {data.referralCount} friend{data.referralCount === 1 ? '' : 's'} referred
          </p>
        </div>
      </section>

      {/* ledger */}
      <section className="rounded-sm border border-black/10 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-2xl">
          <Gift className="size-5 text-ember-500" />
          Points history
        </h2>
        {data.ledger.length === 0 ? (
          <p className="py-6 text-center text-sm text-black/45">No points activity yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.ledger.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 border-b border-black/6 pb-2.5 text-sm last:border-0">
                <div className="min-w-0">
                  <p className="truncate">{entry.reason}</p>
                  <p className="text-xs text-black/40">{formatDate(entry.createdAt)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn('font-semibold tabular-nums', entry.delta > 0 ? 'text-emerald-700' : 'text-ember-500')}>
                    {entry.delta > 0 ? '+' : ''}
                    {entry.delta}
                  </p>
                  <p className="text-xs text-black/40">balance {entry.balance}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
