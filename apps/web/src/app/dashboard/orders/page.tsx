'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, RotateCcw, X } from 'lucide-react';
import { ORDER_STATUS_META, type OrderStatus } from '@islamabad/shared';
import { api, type MenuItem, type Order } from '@/lib/api';
import { useCart } from '@/store/cart';
import { Button } from '@/components/ui/button';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { cn, formatDate, formatPKR } from '@/lib/utils';

interface ReorderLine {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
  slug: string;
  notes: string | null;
}

interface ReorderResponse {
  items: ReorderLine[];
  unavailable: string[];
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.open);

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get<{ orders: Order[] }>('/api/orders/mine'),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/api/orders/${id}/cancel`),
    onSuccess: () => {
      toast.success('Order cancelled');
      void queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const reorder = useMutation({
    mutationFn: (id: string) => api.post<ReorderResponse>(`/api/orders/${id}/reorder`),
    onSuccess: (res) => {
      for (const item of res.items) {
        add({ ...item, id: item.menuItemId } as unknown as MenuItem, item.quantity);
      }
      if (res.unavailable.length) {
        toast.warning(`Unavailable today: ${res.unavailable.join(', ')}`);
      } else {
        toast.success('Added back to your cart');
      }
      openCart();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const orders = data?.orders ?? [];

  return (
    <div>
      <h1 className="mb-1 font-display text-4xl">Your orders</h1>
      <p className="mb-7 text-black/55">{orders.length} orders placed with us</p>

      {orders.length === 0 ? (
        <div className="rounded-sm border border-dashed border-black/15 py-16 text-center">
          <p className="font-display text-2xl">No orders yet</p>
          <Button asChild variant="primary" className="mt-5">
            <Link href="/order">Start your first order</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const meta = ORDER_STATUS_META[order.status as OrderStatus];
            const isOpen = expanded === order.id;
            const canCancel = ['PENDING', 'CONFIRMED'].includes(order.status);

            return (
              <li key={order.id} className="overflow-hidden rounded-sm border border-black/10 bg-white">
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-black/2"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-black/45">
                      {formatDate(order.createdAt)} · {order.items.length} items · {order.type.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="font-semibold tabular-nums">{formatPKR(order.total)}</span>
                    <Badge variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'muted' : 'ember'}>
                      {meta.label}
                    </Badge>
                    <ChevronDown className={cn('size-4 text-black/35 transition-transform', isOpen && 'rotate-180')} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-black/8 bg-cream/50 p-5">
                    <ul className="mb-4 space-y-2 text-sm">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between">
                          <span>
                            <span className="text-black/45">{item.quantity}×</span> {item.name}
                            {item.notes && <span className="ml-2 text-xs italic text-black/40">“{item.notes}”</span>}
                          </span>
                          <span className="tabular-nums">{formatPKR(item.total)}</span>
                        </li>
                      ))}
                    </ul>

                    <dl className="mb-4 space-y-1 border-t border-black/8 pt-3 text-sm">
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
                      <div className="flex justify-between font-semibold">
                        <dt>Total paid</dt>
                        <dd className="tabular-nums">{formatPKR(order.total)}</dd>
                      </div>
                      {order.pointsEarned > 0 && order.status === 'DELIVERED' && (
                        <div className="flex justify-between text-saffron-600">
                          <dt>Points earned</dt>
                          <dd>+{order.pointsEarned}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/track/${order.trackingToken}`}>View tracking</Link>
                      </Button>
                      <Button
                        variant="dark"
                        size="sm"
                        loading={reorder.isPending}
                        onClick={() => reorder.mutate(order.id)}
                      >
                        <RotateCcw />
                        Order again
                      </Button>
                      {canCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-ember-500"
                          loading={cancel.isPending}
                          onClick={() => cancel.mutate(order.id)}
                        >
                          <X />
                          Cancel
                        </Button>
                      )}
                    </div>
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
