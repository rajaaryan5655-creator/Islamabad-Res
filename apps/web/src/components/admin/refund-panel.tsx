'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, Undo2 } from 'lucide-react';
import { api, type Order } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/primitives';
import { formatPKR } from '@/lib/utils';

interface RefundResult {
  refunded: number;
  totalRefunded: number;
  method: string;
  reference: string | null;
  manual: boolean;
}

/**
 * Refund control for a single order.
 *
 * Full and partial refunds share one path. The remaining balance is computed
 * here and re-checked by the API, so a stale screen cannot over-refund.
 */
export function RefundPanel({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const alreadyRefunded = order.refundedAmount ?? 0;
  const remaining = order.total - alreadyRefunded;
  const refundable = order.paymentStatus === 'PAID' || alreadyRefunded > 0;

  const refund = useMutation({
    mutationFn: () =>
      api.post<{ refund: RefundResult }>(`/api/admin/orders/${order.id}/refund`, {
        ...(amount ? { amount: Number(amount) } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }),
    onSuccess: ({ refund: result }) => {
      toast.success(`${formatPKR(result.refunded)} refunded`, {
        description: result.manual
          ? `${result.method} order — return the cash to the customer and note it in the day book.`
          : `Sent back to the original payment method${result.reference ? ` · ${result.reference}` : ''}.`,
        duration: 8000,
      });
      setOpen(false);
      setAmount('');
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!refundable) return null;

  if (remaining <= 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-cream/45">
        <Undo2 className="size-3.5" aria-hidden />
        Fully refunded ({formatPKR(alreadyRefunded)})
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Undo2 className="size-4" />
        {alreadyRefunded > 0 ? `Refund more (${formatPKR(remaining)} left)` : 'Refund'}
      </Button>
    );
  }

  const parsed = Number(amount);
  const invalid = amount !== '' && (!Number.isFinite(parsed) || parsed <= 0 || parsed > remaining);

  return (
    <div className="w-full space-y-3 rounded-sm border border-saffron-400/25 bg-black/25 p-4">
      <p className="flex items-center gap-2 font-medium text-cream">
        <Banknote className="size-4 text-saffron-400" aria-hidden />
        Refund order {order.orderNumber}
      </p>

      {alreadyRefunded > 0 && (
        <p className="text-xs text-cream/50">
          {formatPKR(alreadyRefunded)} already refunded · {formatPKR(remaining)} remaining
        </p>
      )}

      <Input
        label="Amount"
        type="number"
        min={1}
        max={remaining}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={String(remaining)}
        hint={`Leave empty to refund the full ${formatPKR(remaining)}`}
        error={invalid ? `Enter an amount between Rs. 1 and ${formatPKR(remaining)}` : undefined}
      />

      <Textarea
        label="Reason"
        rows={2}
        maxLength={240}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Biryani arrived cold — agreed with the customer on the phone"
      />

      <p className="text-xs text-cream/45">
        The customer is emailed automatically and any loyalty points earned on the refunded amount are reversed.
      </p>

      <div className="flex gap-2">
        <Button variant="gold" size="sm" loading={refund.isPending} disabled={invalid} onClick={() => refund.mutate()}>
          Refund {formatPKR(amount ? parsed : remaining)}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
