'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, CalendarDays, Inbox, Receipt, TrendingUp, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { cn, formatPKR } from '@/lib/utils';

interface Overview {
  revenue: { today: number; month: number; prevMonthToDate: number; growthPct: number | null };
  orders: { today: number; month: number; active: number; avgTicket: number };
  customers: { total: number; new30: number };
  reservations: { today: number; upcoming: number };
  inbox: { enquiries: number; messages: number };
}

interface Report {
  revenue: number;
  orderCount: number;
  avgTicket: number;
  itemsSold: number;
  reservations: number;
  tax: number;
  discounts: number;
  growthPct: number | null;
  byType: Record<string, number>;
  topItems: { name: string; quantity: number; revenue: number }[];
}

const PIE_COLORS = ['#c8102e', '#f4b400', '#8f0a20'];

export default function AdminOverviewPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('monthly');
  const [range, setRange] = useState(30);

  const { data: overview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.get<Overview>('/api/admin/analytics/overview'),
    refetchInterval: 60_000,
  });

  const { data: series } = useQuery({
    queryKey: ['admin-revenue', range],
    queryFn: () => api.get<{ series: { date: string; revenue: number; orders: number; delivery: number; pickup: number; dineIn: number }[] }>(`/api/admin/analytics/revenue?days=${range}`),
  });

  const { data: report } = useQuery({
    queryKey: ['admin-report', period],
    queryFn: () => api.get<Report>(`/api/admin/analytics/report/${period}`),
  });

  if (!overview) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const growth = overview.revenue.growthPct;

  const kpis = [
    {
      label: 'Revenue this month',
      value: formatPKR(overview.revenue.month),
      sub: `${formatPKR(overview.revenue.today)} today`,
      growth,
      Icon: TrendingUp,
    },
    {
      label: 'Orders this month',
      value: overview.orders.month.toLocaleString(),
      sub: `${overview.orders.active} in progress`,
      Icon: Receipt,
    },
    {
      label: 'Average ticket',
      value: formatPKR(overview.orders.avgTicket),
      sub: `${overview.orders.today} orders today`,
      Icon: Receipt,
    },
    {
      label: 'Customers',
      value: overview.customers.total.toLocaleString(),
      sub: `${overview.customers.new30} new in 30 days`,
      Icon: Users,
    },
  ];

  const typeData = report
    ? [
        { name: 'Delivery', value: report.byType.DELIVERY ?? 0 },
        { name: 'Pickup', value: report.byType.PICKUP ?? 0 },
        { name: 'Dine in', value: report.byType.DINE_IN ?? 0 },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Overview</h1>
          <p className="mt-1 text-sm text-cream/50">Live trading position for Islamabad Restaurant</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outlineGold" size="sm">
            <Link href="/admin/kitchen">Kitchen board</Link>
          </Button>
          <Button asChild variant="gold" size="sm">
            <Link href="/admin/orders">Manage orders</Link>
          </Button>
        </div>
      </header>

      {/* alerts */}
      {(overview.inbox.enquiries > 0 || overview.inbox.messages > 0 || overview.orders.active > 0) && (
        <div className="flex flex-wrap gap-3">
          {overview.orders.active > 0 && (
            <Link href="/admin/kitchen" className="flex items-center gap-2 rounded-sm border border-ember-500/40 bg-ember-500/10 px-4 py-2 text-sm transition-colors hover:bg-ember-500/20">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember-500 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-ember-500" />
              </span>
              {overview.orders.active} orders in progress
            </Link>
          )}
          {overview.inbox.enquiries > 0 && (
            <Link href="/admin/inbox" className="flex items-center gap-2 rounded-sm border border-saffron-400/40 bg-saffron-400/10 px-4 py-2 text-sm transition-colors hover:bg-saffron-400/20">
              <Inbox className="size-4 text-saffron-400" />
              {overview.inbox.enquiries} new event enquiries
            </Link>
          )}
          {overview.reservations.today > 0 && (
            <Link href="/admin/reservations" className="flex items-center gap-2 rounded-sm border border-white/12 bg-white/5 px-4 py-2 text-sm transition-colors hover:bg-white/10">
              <CalendarDays className="size-4 text-cream/60" />
              {overview.reservations.today} tables booked today
            </Link>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, sub, growth: g, Icon }) => (
          <div key={label} className="rounded-sm border border-white/8 bg-obsidian p-5">
            <div className="mb-3 flex items-start justify-between">
              <Icon className="size-5 text-saffron-400" />
              {g !== undefined && g !== null && (
                <span className={cn('flex items-center gap-0.5 text-xs font-semibold', g >= 0 ? 'text-emerald-400' : 'text-ember-400')}>
                  {g >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {Math.abs(g)}%
                </span>
              )}
            </div>
            <p className="font-display text-3xl font-semibold">{value}</p>
            <p className="text-[0.68rem] uppercase tracking-widest text-cream/40">{label}</p>
            <p className="mt-1 text-xs text-cream/50">{sub}</p>
          </div>
        ))}
      </div>

      {/* revenue chart */}
      <section className="rounded-sm border border-white/8 bg-obsidian p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Revenue trend</h2>
          <div className="flex gap-1.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-xs transition-colors',
                  range === d ? 'bg-ember-500 text-white' : 'bg-white/5 text-cream/60 hover:bg-white/10',
                )}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>

        <div className="h-72">
          {series ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series.series} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8102e" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#c8102e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="rgba(244,241,236,0.35)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  minTickGap={28}
                />
                <YAxis
                  stroke="rgba(244,241,236,0.35)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  contentStyle={{ background: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 }}
                  labelStyle={{ color: '#f4b400' }}
                  formatter={(value: number, name: string) => [name === 'revenue' ? formatPKR(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                  labelFormatter={(d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
                />
                <Area type="monotone" dataKey="revenue" stroke="#c8102e" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-full" />
          )}
        </div>
      </section>

      {/* report */}
      <section className="rounded-sm border border-white/8 bg-obsidian p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Business report</h2>
          <div className="flex gap-1.5">
            {(['daily', 'weekly', 'monthly', 'annual'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-xs capitalize transition-colors',
                  period === p ? 'bg-saffron-400 text-obsidian' : 'bg-white/5 text-cream/60 hover:bg-white/10',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {report ? (
          <>
            <dl className="grid gap-4 border-b border-white/8 pb-5 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Revenue', value: formatPKR(report.revenue) },
                { label: 'Orders', value: report.orderCount.toLocaleString() },
                { label: 'Avg ticket', value: formatPKR(report.avgTicket) },
                { label: 'Items sold', value: report.itemsSold.toLocaleString() },
                { label: 'Tax collected', value: formatPKR(report.tax) },
                { label: 'Discounts', value: formatPKR(report.discounts) },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="text-[0.62rem] uppercase tracking-widest text-cream/40">{s.label}</dt>
                  <dd className="mt-0.5 font-display text-xl">{s.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <h3 className="mb-4 text-xs uppercase tracking-widest text-cream/45">Top sellers</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.topItems.slice(0, 7)} layout="vertical" margin={{ left: 4, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(244,241,236,0.35)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="rgba(244,241,236,0.5)" fontSize={11} tickLine={false} axisLine={false} width={125} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{ background: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 }}
                        formatter={(v: number) => [formatPKR(v), 'Revenue']}
                      />
                      <Bar dataKey="revenue" fill="#f4b400" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-xs uppercase tracking-widest text-cream/45">Order mix</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3}>
                        {typeData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#121212', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 }}
                        formatter={(v: number, n: string) => [`${v} orders`, n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 flex justify-center gap-4 text-xs text-cream/55">
                  {typeData.map((d, i) => (
                    <li key={d.name} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {d.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <Skeleton className="h-64" />
        )}
      </section>
    </div>
  );
}
