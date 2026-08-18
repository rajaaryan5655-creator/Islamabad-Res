'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Flame } from 'lucide-react';
import { ORDER_STATUS_FLOW, ORDER_STATUS_META, type OrderStatus } from '@islamabad/shared';
import { api, type Order } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { cn, relativeTime } from '@/lib/utils';

const COLUMNS: { status: OrderStatus; tone: string }[] = [
  { status: 'PENDING', tone: 'border-amber-500/40' },
  { status: 'CONFIRMED', tone: 'border-blue-500/40' },
  { status: 'PREPARING', tone: 'border-ember-500/50' },
  { status: 'READY', tone: 'border-emerald-500/40' },
];

/** Kitchen display system — a live ticket board for the pass. */
export default function KitchenBoardPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-queue'],
    queryFn: () => api.get<{ orders: Order[] }>('/api/orders/kitchen/queue'),
    refetchInterval: 12_000,
  });

  const transition = useMutation({
    mutationFn: ({ id, next }: { id: string; next: OrderStatus }) =>
      api.patch(`/api/orders/${id}/status`, { status: next }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
    );
  }

  const orders = data?.orders ?? [];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Kitchen board</h1>
          <p className="mt-1 text-sm text-cream/50">
            {orders.length} live tickets · refreshes every 12 seconds
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const tickets = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="rounded-sm border border-white/8 bg-obsidian">
              <header className={cn('flex items-center justify-between border-b-2 px-4 py-3', col.tone)}>
                <h2 className="font-display text-lg">{ORDER_STATUS_META[col.status].label}</h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold">{tickets.length}</span>
              </header>

              <ul className="max-h-[70vh] space-y-2.5 overflow-y-auto p-3">
                {tickets.length === 0 && (
                  <li className="py-8 text-center text-xs text-cream/30">No tickets</li>
                )}
                {tickets.map((order) => {
                  const waiting = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000);
                  const late = waiting > 30;
                  const nexts = (ORDER_STATUS_FLOW[order.status as OrderStatus] ?? []).filter((s) => s !== 'CANCELLED');

                  return (
                    <li
                      key={order.id}
                      className={cn(
                        'rounded-sm border bg-charcoal-2 p-3.5',
                        late ? 'border-ember-500/60' : 'border-white/8',
                      )}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{order.orderNumber.split('-').pop()}</p>
                          <p className="truncate text-[0.68rem] text-cream/45">{order.customerName}</p>
                        </div>
                        <span
                          className={cn(
                            'flex shrink-0 items-center gap-1 text-[0.68rem]',
                            late ? 'font-semibold text-ember-400' : 'text-cream/40',
                          )}
                        >
                          <Clock className="size-3" />
                          {waiting}m
                        </span>
                      </div>

                      <span className="mb-2 inline-block rounded-sm bg-white/8 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-cream/60">
                        {order.type.replace('_', ' ')}
                      </span>

                      <ul className="space-y-1 border-t border-white/8 pt-2 text-xs">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            <span className="font-semibold text-saffron-400">{item.quantity}×</span> {item.name}
                            {item.notes && (
                              <span className="mt-0.5 flex items-start gap-1 text-[0.68rem] italic text-ember-300">
                                <Flame className="mt-0.5 size-2.5 shrink-0" />
                                {item.notes}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>

                      {order.notes && (
                        <p className="mt-2 rounded-sm bg-ember-500/12 p-2 text-[0.68rem] text-ember-200">
                          Order note: {order.notes}
                        </p>
                      )}

                      {nexts.length > 0 && (
                        <Button
                          size="sm"
                          variant="gold"
                          className="mt-3 w-full"
                          loading={transition.isPending && transition.variables?.id === order.id}
                          onClick={() => transition.mutate({ id: order.id, next: nexts[0] })}
                        >
                          → {ORDER_STATUS_META[nexts[0]].label}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
