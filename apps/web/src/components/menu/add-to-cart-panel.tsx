'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import type { MenuItem } from '@/lib/api';
import { useCart } from '@/store/cart';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/primitives';
import { formatPKR } from '@/lib/utils';

export function AddToCartPanel({ item }: { item: MenuItem }) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.open);

  function handleAdd() {
    add(item, quantity, notes.trim() || undefined);
    toast.success(`${quantity} × ${item.name} added`, {
      description: formatPKR(item.price * quantity),
      action: { label: 'View cart', onClick: openCart },
    });
    setQuantity(1);
    setNotes('');
  }

  if (!item.isAvailable) {
    return (
      <div className="mt-7 rounded-sm border border-black/12 bg-black/3 p-5 text-center">
        <p className="font-display text-xl">Sold out for today</p>
        <p className="mt-1 text-sm text-black/55">
          Our deghs are cooked in limited batches. Try again tomorrow from 11:00 AM.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-7 space-y-4">
      <Textarea
        label="Notes for the kitchen"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. less spice, extra raita, no coriander"
        maxLength={240}
        rows={2}
      />

      <div className="flex gap-3">
        <div className="flex items-center rounded-sm border border-black/15 bg-white">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="flex size-12 items-center justify-center transition-colors hover:bg-black/5"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-12 text-center font-semibold tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            aria-label="Increase quantity"
            className="flex size-12 items-center justify-center transition-colors hover:bg-black/5"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <Button variant="primary" size="lg" className="flex-1" onClick={handleAdd}>
          <ShoppingBag />
          Add {formatPKR(item.price * quantity)}
        </Button>
      </div>
    </div>
  );
}
