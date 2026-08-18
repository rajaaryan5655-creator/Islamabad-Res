'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, Search } from 'lucide-react';
import { ORDER_STATUSES, ORDER_STATUS_FLOW, ORDER_STATUS_META, type OrderStatus } from '@islamabad/shared';
import { api, type Order } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { RefundPanel } from '@/components/admin/refund-panel';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { cn, formatDate, formatPKR, relativeTime } from '@/lib/utils';

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', status, search],
    queryFn: () =>
      api.get<{ orders: Order[]; total: number }>(
        `/api/orders?status=${status}&pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
    refetchInterval: 30_000,
  });

  const transition = useMutation({
    mutationFn: ({ id, next }: { id: string; next: OrderStatus }) =>
      api.patch(`/api/orders/${id}/status`, { status: next }),
    onSuccess: () => {
      toast.success('Order updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const orders = data?.orders ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-4xl">Orders</h1>
        <p className="mt-1 text-sm text-cream/50">{data?.total ?? 0} orders</p>
      </header>

      {/* filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cream/35" />
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order number, name or phone…"
            className="h-11 w-full rounded-sm border border-white/10 bg-obsidian pl-10 pr-4 text-sm text-cream outline-none placeholder:text-cream/30 focus:border-saffron-400"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatus('all')}
            className={cn(
              'rounded-sm px-3.5 py-2 text-xs transition-colors',
              status === 'all' ? 'bg-ember-500 text-white' : 'bg-white/5 text-cream/60 hover:bg-white/10',
            )}
          >
            All
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'rounded-sm px-3.5 py-2 text-xs transition-colors',
                status === s ? 'bg-ember-500 text-white' : 'bg-white/5 text-cream/60 hover:bg-white/10',
              )}
            >
              {ORDER_STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="rounded-sm border border-dashed border-white/12 py-16 text-center text-cream/45">
          No orders match those filters.
        </p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => {
            const meta = ORDER_STATUS_META[order.status as OrderStatus];
            const nexts = ORDER_STATUS_FLOW[order.status as OrderStatus] ?? [];
            const isOpen = expanded === order.id;

            return (
              <li key={order.id} className="overflow-hidden rounded-sm border border-white/8 bg-obsidian">
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/3"
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{order.orderNumber}</p>
                    <p className="truncate text-xs text-cream/45">
                      {order.customerName} · {order.customerPhone} · {relativeTime(order.createdAt)}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-xs capitalize text-cream/50 sm:block">
                    {order.type.replace('_', ' ').toLowerCase()}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatPKR(order.total)}</span>
                  <Badge variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'muted' : 'ember'}>
                    {meta.label}
                  </Badge>
                  <ChevronDown className={cn('size-4 shrink-0 text-cream/35 transition-transform', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className="border-t border-white/8 bg-charcoal-2 p-5">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <h3 className="mb-2 text-[0.62rem] uppercase tracking-widest text-cream/40">Items</h3>
                        <ul className="space-y-1.5 text-sm">
                          {order.items.map((item) => (
                            <li key={item.id}>
                              <div className="flex justify-between gap-3">
                                <span>
                                  <span className="text-cream/45">{item.quantity}×</span> {item.name}
                                </span>
                                <span className="tabular-nums text-cream/70">{formatPKR(item.total)}</span>
                              </div>
                              {item.options && item.options.length > 0 && (
                                <p className="text-xs text-cream/55">{item.options.map((o) => o.label).join(' · ')}</p>
                              )}
                              {item.notes && (
                                <p className="text-xs italic text-saffron-400/80">Kitchen note: {item.notes}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="mb-2 text-[0.62rem] uppercase tracking-widest text-cream/40">Details</h3>
                        <dl className="space-y-1 text-sm text-cream/65">
                          {order.addressText && (
                            <div>
                              <dt className="inline text-cream/40">Address: </dt>
                              <dd className="inline">{order.addressText}</dd>
                            </div>
                          )}
                          <div>
                            <dt className="inline text-cream/40">Payment: </dt>
                            <dd className="inline">
                              {order.paymentMethod.replace('_', ' ')} ({order.paymentStatus.toLowerCase()})
                            </dd>
                          </div>
                          <div>
                            <dt className="inline text-cream/40">Placed: </dt>
                            <dd className="inline">{formatDate(order.createdAt, { hour: '2-digit', minute: '2-digit' })}</dd>
                          </div>
                          <div>
                            <dt className="inline text-cream/40">Total: </dt>
                            <dd className="inline font-semibold text-saffron-400">{formatPKR(order.total)}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-white/8 pt-4">
                      <RefundPanel order={order} />
                    </div>

                    {nexts.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
                        <span className="self-center text-xs text-cream/40">Move to:</span>
                        {nexts.map((next) => (
                          <Button
                            key={next}
                            size="sm"
                            variant={next === 'CANCELLED' ? 'outline' : 'gold'}
                            loading={transition.isPending && transition.variables?.id === order.id && transition.variables?.next === next}
                            onClick={() => transition.mutate({ id: order.id, next })}
                          >
                            {ORDER_STATUS_META[next].label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
