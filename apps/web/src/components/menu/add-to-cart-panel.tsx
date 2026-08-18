'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Minus, Plus, ShoppingBag, Check } from 'lucide-react';
import type { MenuItem, MenuOptionGroup } from '@/lib/api';
import { useCart, type CartOption } from '@/store/cart';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/primitives';
import { formatPKR } from '@/lib/utils';
import { cn } from '@/lib/utils';

/** Selection state: group id → chosen choice ids. */
type Selection = Record<string, string[]>;

function defaultSelection(groups: MenuOptionGroup[]): Selection {
  const initial: Selection = {};
  for (const group of groups) {
    const preset = group.choices.filter((c) => c.isDefault).map((c) => c.id);
    if (preset.length > 0) {
      initial[group.id] = group.type === 'SINGLE' ? preset.slice(0, 1) : preset.slice(0, group.maxSelect);
    } else if (group.isRequired && group.type === 'SINGLE' && group.choices[0]) {
      // A required single-choice group must always resolve to something, or the
      // customer hits a validation error they did not cause.
      initial[group.id] = [group.choices[0].id];
    } else {
      initial[group.id] = [];
    }
  }
  return initial;
}

export function AddToCartPanel({ item }: { item: MenuItem }) {
  const groups = useMemo(() => item.optionGroups ?? [], [item.optionGroups]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(groups));
  const [attempted, setAttempted] = useState(false);

  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.open);

  const chosen: CartOption[] = useMemo(() => {
    const out: CartOption[] = [];
    for (const group of groups) {
      for (const choiceId of selection[group.id] ?? []) {
        const choice = group.choices.find((c) => c.id === choiceId);
        if (choice) {
          out.push({
            groupId: group.id,
            groupName: group.name,
            choiceId: choice.id,
            label: choice.label,
            priceDelta: choice.priceDelta,
          });
        }
      }
    }
    return out;
  }, [groups, selection]);

  const unitPrice = item.price + chosen.reduce((sum, o) => sum + o.priceDelta, 0);

  /** Groups the customer still has to answer before the dish can be added. */
  const missing = groups.filter((g) => g.isRequired && (selection[g.id]?.length ?? 0) === 0);

  function toggle(group: MenuOptionGroup, choiceId: string) {
    setSelection((prev) => {
      const current = prev[group.id] ?? [];

      if (group.type === 'SINGLE') {
        // Re-tapping the chosen option clears it, unless the group is required.
        const next = current.includes(choiceId) && !group.isRequired ? [] : [choiceId];
        return { ...prev, [group.id]: next };
      }

      if (current.includes(choiceId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== choiceId) };
      }
      if (current.length >= group.maxSelect) {
        toast.info(`Choose up to ${group.maxSelect} from ${group.name.toLowerCase()}`);
        return prev;
      }
      return { ...prev, [group.id]: [...current, choiceId] };
    });
  }

  function handleAdd() {
    setAttempted(true);
    if (missing.length > 0) {
      toast.error(`Please choose a ${missing[0]!.name.toLowerCase()}`);
      document.getElementById(`option-group-${missing[0]!.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    add(item, quantity, notes.trim() || undefined, chosen);
    toast.success(`${quantity} × ${item.name} added`, {
      description: chosen.length
        ? `${chosen.map((o) => o.label).join(', ')} — ${formatPKR(unitPrice * quantity)}`
        : formatPKR(unitPrice * quantity),
      action: { label: 'View cart', onClick: openCart },
    });

    setQuantity(1);
    setNotes('');
    setSelection(defaultSelection(groups));
    setAttempted(false);
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
    <div className="mt-7 space-y-6">
      {groups.map((group) => {
        const current = selection[group.id] ?? [];
        const unanswered = attempted && group.isRequired && current.length === 0;

        return (
          <fieldset key={group.id} id={`option-group-${group.id}`} className="space-y-3">
            <legend className="flex w-full items-baseline justify-between gap-3">
              <span className="font-display text-lg">
                {group.name}
                {group.isRequired && <span className="ml-1.5 text-ember" aria-hidden>*</span>}
              </span>
              <span className={cn('text-xs uppercase tracking-wider', unanswered ? 'text-ember' : 'text-black/45')}>
                {group.isRequired ? 'Required' : group.type === 'MULTI' ? `Up to ${group.maxSelect}` : 'Optional'}
              </span>
            </legend>

            <div
              role={group.type === 'SINGLE' ? 'radiogroup' : 'group'}
              aria-label={group.name}
              aria-required={group.isRequired}
              className={cn(
                'grid gap-2 sm:grid-cols-2',
                unanswered && 'rounded-sm p-2 ring-1 ring-ember/40',
              )}
            >
              {group.choices.map((choice) => {
                const active = current.includes(choice.id);
                return (
                  <button
                    key={choice.id}
                    type="button"
                    role={group.type === 'SINGLE' ? 'radio' : 'checkbox'}
                    aria-checked={active}
                    onClick={() => toggle(group, choice.id)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-sm border px-4 py-3 text-left text-sm transition-all',
                      active
                        ? 'border-ember bg-ember/6 font-medium text-ember'
                        : 'border-black/12 bg-white hover:border-black/30',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center border',
                          group.type === 'SINGLE' ? 'rounded-full' : 'rounded-[2px]',
                          active ? 'border-ember bg-ember text-white' : 'border-black/25',
                        )}
                        aria-hidden
                      >
                        {active && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      {choice.label}
                    </span>
                    {choice.priceDelta !== 0 && (
                      <span className="shrink-0 tabular-nums text-black/60">
                        {choice.priceDelta > 0 ? '+' : '−'}
                        {formatPKR(Math.abs(choice.priceDelta))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

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
            type="button"
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
            type="button"
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            aria-label="Increase quantity"
            className="flex size-12 items-center justify-center transition-colors hover:bg-black/5"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <Button variant="primary" size="lg" className="flex-1" onClick={handleAdd}>
          <ShoppingBag />
          Add {formatPKR(unitPrice * quantity)}
        </Button>
      </div>

      {unitPrice !== item.price && (
        <p className="text-center text-xs text-black/50">
          {formatPKR(item.price)} base
          {chosen
            .filter((o) => o.priceDelta !== 0)
            .map((o) => ` ${o.priceDelta > 0 ? '+' : '−'} ${formatPKR(Math.abs(o.priceDelta))} ${o.label.toLowerCase()}`)
            .join('')}
        </p>
      )}
    </div>
  );
}
