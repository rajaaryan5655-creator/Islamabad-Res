'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy } from 'lucide-react';
import { useCart } from '@/store/cart';

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const setCoupon = useCart((s) => s.setCoupon);

  function apply() {
    void navigator.clipboard?.writeText(code).catch(() => undefined);
    setCoupon(code);
    setCopied(true);
    toast.success(`${code} copied and saved to your cart`);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <button
      onClick={apply}
      className="mt-5 flex w-full items-center justify-between gap-2 rounded-sm border-2 border-dashed border-ember-500/40 px-4 py-3 transition-colors hover:border-ember-500 hover:bg-ember-50"
      aria-label={`Copy coupon code ${code}`}
    >
      <code className="font-mono text-base font-bold tracking-widest text-ember-500">{code}</code>
      {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 text-black/35" />}
    </button>
  );
}
