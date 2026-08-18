'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { formatDate, formatPKR, initials } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tier: string;
  points: number;
  lifetimePoints: number;
  createdAt: string;
  lastLoginAt: string | null;
  marketingOptIn: boolean;
  totalSpend: number;
  _count: { orders: number; reservations: number };
}

const TIER_VARIANT: Record<string, 'muted' | 'outline' | 'gold' | 'ember'> = {
  BRONZE: 'muted',
  SILVER: 'outline',
  GOLD: 'gold',
  PLATINUM: 'ember',
};

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: () => api.get<{ customers: Customer[]; total: number }>(`/api/admin/customers?pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  });

  const customers = data?.customers ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-4xl">Customers</h1>
        <p className="mt-1 text-sm text-cream/50">{data?.total ?? 0} registered customers</p>
      </header>

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cream/35" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or phone…"
          aria-label="Search customers"
          className="h-11 w-full rounded-sm border border-white/10 bg-obsidian pl-10 pr-4 text-sm text-cream outline-none placeholder:text-cream/30 focus:border-saffron-400"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : customers.length === 0 ? (
        <p className="rounded-sm border border-dashed border-white/12 py-16 text-center text-cream/45">
          No customers found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-white/8">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-obsidian text-left text-[0.65rem] uppercase tracking-widest text-cream/45">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Lifetime spend</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Marketing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 bg-charcoal-2">
              {customers.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-white/3">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ember-500 text-xs font-semibold text-white">
                        {initials(c.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="truncate text-xs text-cream/45">{c.email}</p>
                        {c.phone && <p className="text-xs text-cream/35">{c.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={TIER_VARIANT[c.tier] ?? 'muted'}>{c.tier.toLowerCase()}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {c._count.orders}
                    <span className="ml-1 text-xs text-cream/35">/ {c._count.reservations} bookings</span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-saffron-400">{formatPKR(c.totalSpend)}</td>
                  <td className="px-4 py-3 tabular-nums">{c.points.toLocaleString()}</td>
                  <td className="px-4 py-3 text-cream/55">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    {c.marketingOptIn ? (
                      <span className="text-emerald-400">Opted in</span>
                    ) : (
                      <span className="text-cream/30">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
