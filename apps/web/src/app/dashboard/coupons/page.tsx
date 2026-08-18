'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, TicketPercent } from 'lucide-react';
import { api } from '@/lib/api';
import { useCart } from '@/store/cart';
import { Button } from '@/components/ui/button';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { cn, formatDate, formatPKR } from '@/lib/utils';

interface CustomerCoupon {
  code: string;
  description: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  expiresAt: string | null;
  timesUsed: number;
  perUserLimit: number | null;
  isUsable: boolean;
  unavailableReason: string | null;
}

function headline(coupon: CustomerCoupon): string {
  if (coupon.type === 'FREE_DELIVERY') return 'Free delivery';
  if (coupon.type === 'PERCENT') return `${coupon.value}% off`;
  return `${formatPKR(coupon.value)} off`;
}

function expiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const days = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
  return days > 0 && days <= 7;
}

function CouponCard({ coupon }: { coupon: CustomerCoupon }) {
  const [copied, setCopied] = useState(false);
  const setCoupon = useCart((s) => s.setCoupon);

  async function copy() {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast.success(`${coupon.code} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — please select the code manually.');
    }
  }

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-sm border bg-white',
        coupon.isUsable ? 'border-black/12' : 'border-black/8 opacity-60',
      )}
    >
      {/* Perforated left edge, the way a physical voucher reads. */}
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-1.5', coupon.isUsable ? 'bg-ember-500' : 'bg-black/20')}
      />

      <div className="p-6 pl-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-3xl leading-none">{headline(coupon)}</p>
            <p className="mt-2 text-sm text-black/60">{coupon.description}</p>
          </div>
          {expiringSoon(coupon.expiresAt) && coupon.isUsable && <Badge variant="gold">Ends soon</Badge>}
          {!coupon.isUsable && <Badge variant="muted">{coupon.unavailableReason}</Badge>}
        </div>

        <dl className="mt-5 space-y-1 text-xs text-black/50">
          {coupon.minOrder > 0 && (
            <div className="flex gap-1.5">
              <dt>Minimum order</dt>
              <dd className="font-medium text-black/70">{formatPKR(coupon.minOrder)}</dd>
            </div>
          )}
          {coupon.maxDiscount && (
            <div className="flex gap-1.5">
              <dt>Maximum saving</dt>
              <dd className="font-medium text-black/70">{formatPKR(coupon.maxDiscount)}</dd>
            </div>
          )}
          {coupon.expiresAt && (
            <div className="flex gap-1.5">
              <dt>Valid until</dt>
              <dd className="font-medium text-black/70">{formatDate(coupon.expiresAt)}</dd>
            </div>
          )}
          {coupon.perUserLimit && (
            <div className="flex gap-1.5">
              <dt>Used</dt>
              <dd className="font-medium text-black/70">
                {coupon.timesUsed} of {coupon.perUserLimit}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-black/12 pt-5">
          <code className="rounded-sm border border-dashed border-black/25 bg-black/3 px-3.5 py-2 font-mono text-sm font-semibold tracking-widest">
            {coupon.code}
          </code>

          {coupon.isUsable && (
            <>
              <Button variant="ghost" size="sm" onClick={copy} aria-label={`Copy ${coupon.code}`}>
                {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                asChild
                variant="primary"
                size="sm"
                className="ml-auto"
                onClick={() => setCoupon(coupon.code)}
              >
                <Link href="/order">Use this offer</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function CouponsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-coupons'],
    queryFn: () => api.get<{ available: CustomerCoupon[]; used: CustomerCoupon[] }>('/api/customer/coupons'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sm border border-ember-500/25 bg-ember-500/5 p-6 text-center">
        <p className="font-medium">We could not load your offers.</p>
        <p className="mt-1 text-sm text-black/55">{(error as Error).message}</p>
      </div>
    );
  }

  const available = data?.available ?? [];
  const used = data?.used ?? [];

  return (
    <div>
      <header className="mb-7">
        <h1 className="font-display text-4xl">My offers</h1>
        <p className="mt-1 text-black/55">
          {available.length > 0
            ? `${available.length} offer${available.length === 1 ? '' : 's'} you can use today`
            : 'Offers you can use will appear here'}
        </p>
      </header>

      {available.length === 0 ? (
        <div className="rounded-sm border border-dashed border-black/15 py-16 text-center">
          <TicketPercent className="mx-auto mb-3 size-8 text-black/20" />
          <p className="font-display text-2xl">No offers right now</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-black/55">
            We run seasonal offers and send them to members first. Keep an eye on your inbox — or browse the menu and
            earn points on every order instead.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/menu">Browse the menu</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {available.map((coupon) => (
            <CouponCard key={coupon.code} coupon={coupon} />
          ))}
        </div>
      )}

      {used.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl">Already used</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {used.map((coupon) => (
              <CouponCard key={coupon.code} coupon={coupon} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
