'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Gift } from 'lucide-react';
import { giftCardPurchaseSchema } from '@islamabad/shared';
import { ApiError, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/primitives';
import { cn, formatDate, formatPKR } from '@/lib/utils';

const PRESETS = [2000, 5000, 10000, 25000];

interface GiftCard {
  code: string;
  amount: number;
  recipientName: string;
  expiresAt: string;
}

export function GiftCardForm() {
  const [amount, setAmount] = useState(5000);
  const [form, setForm] = useState({ recipientName: '', recipientEmail: '', senderName: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<GiftCard | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = giftCardPurchaseSchema.safeParse({ ...form, amount });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      toast.error('Please check the highlighted fields');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ giftCard: GiftCard }>('/api/marketing/gift-cards', parsed.data);
      setCard(res.giftCard);
      toast.success('Gift card created');
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (card) {
    return (
      <div className="overflow-hidden rounded-sm bg-obsidian p-9 text-center text-cream">
        <Gift className="mx-auto mb-4 size-10 text-saffron-400" />
        <h2 className="font-display text-3xl">Gift card created</h2>
        <p className="mt-2 text-cream/60">
          We have emailed {card.recipientName} at {form.recipientEmail}.
        </p>

        <div className="mx-auto mt-7 max-w-sm rounded-sm border border-saffron-400/30 bg-white/5 p-6">
          <p className="font-display text-5xl text-saffron-400">{formatPKR(card.amount)}</p>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(card.code);
              toast.success('Code copied');
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-saffron-400/50 py-3 transition-colors hover:bg-white/5"
          >
            <code className="font-mono tracking-widest">{card.code}</code>
            <Copy className="size-3.5 opacity-60" />
          </button>
          <p className="mt-3 text-xs text-cream/45">Valid until {formatDate(card.expiresAt)}</p>
        </div>

        <Button variant="outlineGold" className="mt-7" onClick={() => setCard(null)}>
          Buy another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-sm border border-black/10 bg-white p-7">
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-black/70">Amount</legend>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={cn(
                'rounded-sm border py-3 text-sm font-medium transition',
                amount === p ? 'border-ember-500 bg-ember-500 text-white' : 'border-black/12 hover:border-black/35',
              )}
            >
              {formatPKR(p)}
            </button>
          ))}
        </div>
        <Input
          className="mt-3"
          type="number"
          min={1000}
          max={100000}
          step={500}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          error={errors.amount}
          hint="Between Rs. 1,000 and Rs. 100,000"
          label="Or enter a custom amount"
        />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Recipient's name" required value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} error={errors.recipientName} />
        <Input label="Recipient's email" required type="email" value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} error={errors.recipientEmail} />
        <Input label="Your name" required className="sm:col-span-2" value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} error={errors.senderName} />
      </div>

      <Textarea
        label="Personal message (optional)"
        rows={3}
        maxLength={300}
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        placeholder="Happy birthday — dinner is on me."
      />

      <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
        <Gift />
        Buy Gift Card · {formatPKR(amount)}
      </Button>
    </form>
  );
}
