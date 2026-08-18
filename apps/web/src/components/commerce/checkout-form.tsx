'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, CreditCard, Loader2, Lock, ShieldCheck, Sparkles, Tag, Wallet } from 'lucide-react';
import { DELIVERY_ZONES, PAYMENT_METHOD_META, POINT_VALUE, checkoutSchema } from '@islamabad/shared';
import { ApiError, api, type Order, type Quote } from '@/lib/api';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/primitives';
import { cn, formatPKR } from '@/lib/utils';

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  CARD_STRIPE: CreditCard,
  PAYPAL: Wallet,
  JAZZCASH: Wallet,
  EASYPAISA: Wallet,
  COD: Wallet,
};

export function CheckoutForm() {
  const router = useRouter();
  const { lines, type, zoneId, couponCode, redeemPoints, setZone, setCoupon, setRedeemPoints, clear } = useCart();
  const user = useAuth((s) => s.user);

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '', tableNumber: '' });
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [couponInput, setCouponInput] = useState(couponCode ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [addressId, setAddressId] = useState<string>('');

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone || '' }));
    }
  }, [user]);

  const { data: addressData } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<{ addresses: { id: string; label: string; line1: string; city: string; zoneId: string; isDefault: boolean }[] }>('/api/auth/addresses'),
    enabled: Boolean(user),
  });

  useEffect(() => {
    const def = addressData?.addresses.find((a) => a.isDefault);
    if (def && !addressId) {
      setAddressId(def.id);
      setZone(def.zoneId);
    }
  }, [addressData, addressId, setZone]);

  const { data: quoteData, isFetching: quoting } = useQuery({
    queryKey: ['checkout-quote', lines.map((l) => `${l.menuItemId}x${l.quantity}`).join(','), type, zoneId, couponCode, redeemPoints],
    queryFn: () =>
      api.post<{ quote: Quote }>('/api/orders/quote', {
        items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        type,
        zoneId,
        couponCode,
        redeemPoints,
      }),
    enabled: lines.length > 0,
  });

  const quote = quoteData?.quote;
  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId);
  const maxRedeemable = useMemo(
    () => (user ? Math.min(user.points, Math.floor(((quote?.subtotal ?? 0) * 0.5) / POINT_VALUE)) : 0),
    [user, quote],
  );

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    setCoupon(code || null);
    if (code) toast.info(`Checking ${code}…`);
  }

  useEffect(() => {
    if (quote?.couponError) toast.error(quote.couponError);
    else if (quote?.couponCode) toast.success(`${quote.couponCode} applied`);
    // Only react to a change in the coupon result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.couponCode, quote?.couponError]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const payload = {
      type,
      items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, notes: l.notes })),
      customerName: form.name,
      customerPhone: form.phone,
      customerEmail: form.email || undefined,
      addressId: addressId || undefined,
      address: type === 'DELIVERY' ? form.address || undefined : undefined,
      zoneId: type === 'DELIVERY' ? zoneId ?? undefined : undefined,
      paymentMethod,
      couponCode: couponCode || undefined,
      redeemPoints: redeemPoints || undefined,
      notes: form.notes || undefined,
      tableNumber: type === 'DINE_IN' ? form.tableNumber || undefined : undefined,
    };

    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? 'form')] = issue.message;
      setErrors(fieldErrors);
      toast.error('Please check the highlighted fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ order: Order; payment: { redirectUrl?: string; instructions?: string } }>(
        '/api/orders',
        parsed.data,
      );
      clear();
      toast.success(`Order ${res.order.orderNumber} placed`);
      router.push(`/track/${res.order.trackingToken}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        toast.error(err.message);
      } else {
        toast.error('Could not place the order. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-black/15 py-20 text-center">
        <p className="font-display text-3xl">Your cart is empty</p>
        <p className="mt-2 text-black/55">Add a few dishes and come back.</p>
        <Button asChild variant="primary" className="mt-6">
          <Link href="/order">Browse the Menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_23rem]">
      <div className="space-y-7">
        {/* contact */}
        <fieldset className="rounded-sm border border-black/10 bg-white p-6">
          <legend className="px-2 font-display text-2xl">Your details</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.customerName}
              autoComplete="name"
            />
            <Input
              label="Mobile number"
              required
              type="tel"
              placeholder="0306 4650507"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              error={errors.customerPhone}
              autoComplete="tel"
              hint="We will call if the rider cannot find you"
            />
            <Input
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.customerEmail}
              autoComplete="email"
              className="sm:col-span-2"
              hint="For your receipt and tracking link"
            />
          </div>

          {!user && (
            <p className="mt-4 rounded-sm bg-saffron-100 p-3 text-sm text-obsidian/75">
              <Link href="/login" className="font-semibold underline">
                Sign in
              </Link>{' '}
              to earn loyalty points, save this address and reorder in one tap.
            </p>
          )}
        </fieldset>

        {/* delivery */}
        {type === 'DELIVERY' && (
          <fieldset className="rounded-sm border border-black/10 bg-white p-6">
            <legend className="px-2 font-display text-2xl">Delivery address</legend>

            {addressData && addressData.addresses.length > 0 && (
              <div className="mb-4 mt-4 space-y-2">
                {addressData.addresses.map((a) => (
                  <label
                    key={a.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-sm border p-3.5 transition',
                      addressId === a.id ? 'border-ember-500 bg-ember-50' : 'border-black/12 hover:border-black/30',
                    )}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === a.id}
                      onChange={() => {
                        setAddressId(a.id);
                        setZone(a.zoneId);
                      }}
                      className="mt-1 accent-ember-500"
                    />
                    <span className="text-sm">
                      <strong>{a.label}</strong>
                      <span className="block text-black/55">
                        {a.line1}, {a.city}
                      </span>
                    </span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-black/12 p-3.5 text-sm hover:border-black/30">
                  <input
                    type="radio"
                    name="address"
                    checked={addressId === ''}
                    onChange={() => setAddressId('')}
                    className="accent-ember-500"
                  />
                  Use a different address
                </label>
              </div>
            )}

            {!addressId && (
              <div className="mt-4 grid gap-4">
                <Textarea
                  label="Street address"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  error={errors.address}
                  placeholder="House / flat number, street, sector"
                  rows={2}
                />
                <Select
                  label="Delivery area"
                  required
                  value={zoneId ?? ''}
                  onChange={(e) => setZone(e.target.value || null)}
                  error={errors.zoneId}
                >
                  <option value="">Select your area…</option>
                  {DELIVERY_ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — {formatPKR(z.fee)}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </fieldset>
        )}

        {type === 'DINE_IN' && (
          <fieldset className="rounded-sm border border-black/10 bg-white p-6">
            <legend className="px-2 font-display text-2xl">Table</legend>
            <Input
              label="Table number"
              className="mt-4 sm:max-w-xs"
              value={form.tableNumber}
              onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
              placeholder="e.g. 14"
            />
          </fieldset>
        )}

        {/* payment */}
        <fieldset className="rounded-sm border border-black/10 bg-white p-6">
          <legend className="px-2 font-display text-2xl">Payment</legend>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {Object.entries(PAYMENT_METHOD_META).map(([key, meta]) => {
              const Icon = METHOD_ICONS[key] ?? CreditCard;
              return (
                <label
                  key={key}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition',
                    paymentMethod === key ? 'border-ember-500 bg-ember-50' : 'border-black/12 hover:border-black/30',
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={key}
                    checked={paymentMethod === key}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1 accent-ember-500"
                  />
                  <Icon className="mt-0.5 size-4 shrink-0 text-black/45" />
                  <span className="text-sm">
                    <strong className="block">{meta.label}</strong>
                    <span className="text-xs text-black/50">{meta.description}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-black/45">
            <Lock className="size-3.5" />
            Card details are handled by Stripe. We never see or store your card number.
          </p>
        </fieldset>

        <fieldset className="rounded-sm border border-black/10 bg-white p-6">
          <legend className="px-2 font-display text-2xl">Anything else?</legend>
          <Textarea
            className="mt-4"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Allergies, gate code, landmark, or a message for the kitchen"
            rows={3}
          />
        </fieldset>
      </div>

      {/* summary */}
      <aside className="lg:sticky lg:top-28 lg:h-fit">
        <div className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="mb-4 font-display text-2xl">Order summary</h2>

          <ul className="mb-4 max-h-56 space-y-3 overflow-y-auto border-b border-black/8 pb-4">
            {lines.map((l) => (
              <li key={l.menuItemId} className="flex gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-black/5">
                  <Image src={l.image} alt="" fill sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="text-xs text-black/45">Qty {l.quantity}</p>
                </div>
                <span className="shrink-0 text-sm tabular-nums">{formatPKR(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>

          {/* coupon */}
          <div className="mb-4">
            <label htmlFor="coupon" className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-black/60">
              <Tag className="size-3.5" /> Coupon code
            </label>
            <div className="flex gap-2">
              <input
                id="coupon"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="WELCOME15"
                className="h-11 flex-1 rounded-sm border border-black/12 px-3 text-sm uppercase outline-none focus:border-saffron-400"
              />
              <Button type="button" variant="dark" size="sm" onClick={applyCoupon} className="shrink-0">
                Apply
              </Button>
            </div>
          </div>

          {/* loyalty */}
          {user && user.points > 0 && maxRedeemable > 0 && (
            <div className="mb-4 rounded-sm bg-saffron-100 p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-obsidian/80">
                  <Sparkles className="size-4 text-saffron-600" />
                  {user.points} points available
                </span>
                <span className="text-xs text-obsidian/55">1 pt = {formatPKR(POINT_VALUE)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={maxRedeemable}
                step={10}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(Number(e.target.value))}
                className="mt-2.5 w-full accent-ember-500"
                aria-label="Points to redeem"
              />
              <p className="mt-1 text-xs text-obsidian/65">
                Redeeming <strong>{redeemPoints}</strong> points — saves {formatPKR(redeemPoints * POINT_VALUE)}
              </p>
            </div>
          )}

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between text-black/60">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatPKR(quote?.subtotal ?? 0)}</dd>
            </div>
            {quote && quote.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Coupon {quote.couponCode}</dt>
                <dd className="tabular-nums">−{formatPKR(quote.discount)}</dd>
              </div>
            )}
            {quote && quote.pointsDiscount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Points ({quote.pointsRedeemed})</dt>
                <dd className="tabular-nums">−{formatPKR(quote.pointsDiscount)}</dd>
              </div>
            )}
            {quote && quote.packaging > 0 && (
              <div className="flex justify-between text-black/60">
                <dt>Packaging</dt>
                <dd className="tabular-nums">{formatPKR(quote.packaging)}</dd>
              </div>
            )}
            {type === 'DELIVERY' && quote && (
              <div className="flex justify-between text-black/60">
                <dt>Delivery{zone ? ` · ${zone.etaMin}–${zone.etaMax} min` : ''}</dt>
                <dd className="tabular-nums">
                  {quote.deliveryFee === 0 ? <span className="text-emerald-700">Free</span> : formatPKR(quote.deliveryFee)}
                </dd>
              </div>
            )}
            <div className="flex justify-between text-black/60">
              <dt>Sales tax (16%)</dt>
              <dd className="tabular-nums">{formatPKR(quote?.tax ?? 0)}</dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-2.5 font-display text-2xl">
              <dt>Total</dt>
              <dd className="tabular-nums text-ember-500">
                {quoting ? <Loader2 className="size-5 animate-spin" /> : formatPKR(quote?.total ?? 0)}
              </dd>
            </div>
          </dl>

          {quote && quote.pointsEarned > 0 && (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-saffron-600">
              <Sparkles className="size-3.5" />
              You will earn {quote.pointsEarned} points
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="mt-5 w-full" loading={submitting}>
            Place Order · {formatPKR(quote?.total ?? 0)}
          </Button>

          <ul className="mt-4 space-y-1.5 text-xs text-black/45">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600" /> Secure checkout, PCI-compliant
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-600" /> Free cancellation before the kitchen starts
            </li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
