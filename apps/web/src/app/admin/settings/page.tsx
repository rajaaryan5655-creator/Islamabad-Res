'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Megaphone, Settings2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Skeleton, Textarea } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

interface RestaurantSettings {
  acceptingOrders: boolean;
  acceptingReservations: boolean;
  autoApproveReservations: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  prepTimeMinutes: number;
  announcement: string;
}

const TOGGLES: { key: keyof RestaurantSettings; label: string; help: string; danger?: boolean }[] = [
  {
    key: 'acceptingOrders',
    label: 'Accepting online orders',
    help: 'Turn this off to stop all new orders immediately — use it when the kitchen is overwhelmed.',
    danger: true,
  },
  {
    key: 'acceptingReservations',
    label: 'Accepting reservations',
    help: 'Turn this off to close the online booking form. Walk-ins and phone bookings are unaffected.',
    danger: true,
  },
  {
    key: 'autoApproveReservations',
    label: 'Auto-approve reservations',
    help: 'When off, every booking waits for a manager to approve or reject it. Recommended for large parties.',
  },
  { key: 'deliveryEnabled', label: 'Delivery', help: 'Offer delivery at checkout.' },
  { key: 'pickupEnabled', label: 'Pickup', help: 'Offer collection at checkout.' },
];

function Toggle({
  checked,
  onChange,
  label,
  help,
  danger,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  help: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-black/8 py-4 last:border-0">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium">
          {label}
          {danger && !checked && <AlertTriangle className="size-4 text-ember-500" aria-hidden />}
        </p>
        <p className="mt-0.5 text-sm text-black/55">{help}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-emerald-600' : 'bg-black/20',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RestaurantSettings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<{ settings: RestaurantSettings }>('/api/admin/settings'),
  });

  useEffect(() => {
    if (data?.settings) setDraft(data.settings);
  }, [data]);

  const save = useMutation({
    mutationFn: (patch: Partial<RestaurantSettings>) =>
      api.patch<{ settings: RestaurantSettings }>('/api/admin/settings', patch),
    onSuccess: (res) => {
      setDraft(res.settings);
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const flushCache = useMutation({
    mutationFn: () => api.post('/api/admin/cache/flush'),
    onSuccess: () => toast.success('Cache cleared — the site will rebuild its menu on the next request'),
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !draft) return <Skeleton className="h-96" />;

  const dirty = JSON.stringify(draft) !== JSON.stringify(data?.settings);

  return (
    <div className="max-w-3xl">
      <header className="mb-7">
        <h1 className="font-display text-4xl">Settings</h1>
        <p className="mt-1 text-black/55">Operational switches that take effect within a minute, without a deploy</p>
      </header>

      {!draft.acceptingOrders && (
        <div className="mb-6 flex items-start gap-3 rounded-sm border border-ember-500/30 bg-ember-500/6 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-ember-500" aria-hidden />
          <div>
            <p className="font-medium">Online ordering is switched off</p>
            <p className="mt-0.5 text-sm text-black/60">
              Customers cannot place orders on the site right now. Remember to switch it back on.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-sm border border-black/12 bg-white p-6">
        <h2 className="mb-2 flex items-center gap-2 font-display text-2xl">
          <Settings2 className="size-5 text-ember-500" />
          Service
        </h2>
        {TOGGLES.map((toggle) => (
          <Toggle
            key={toggle.key}
            label={toggle.label}
            help={toggle.help}
            danger={toggle.danger}
            checked={Boolean(draft[toggle.key])}
            onChange={(value) => setDraft({ ...draft, [toggle.key]: value })}
          />
        ))}

        <div className="mt-5">
          <Input
            label="Kitchen prep time (minutes)"
            type="number"
            min={5}
            max={180}
            value={String(draft.prepTimeMinutes)}
            onChange={(e) => setDraft({ ...draft, prepTimeMinutes: Number(e.target.value) })}
            hint="Added to every delivery estimate. Raise it when the kitchen is busy."
            className="max-w-xs"
          />
        </div>
      </section>

      <section className="mt-6 rounded-sm border border-black/12 bg-white p-6">
        <h2 className="mb-2 flex items-center gap-2 font-display text-2xl">
          <Megaphone className="size-5 text-ember-500" />
          Site announcement
        </h2>
        <p className="mb-4 text-sm text-black/55">
          Shown as a banner across the site. Leave empty to hide it.
        </p>
        <Textarea
          label="Message"
          rows={2}
          maxLength={240}
          value={draft.announcement}
          onChange={(e) => setDraft({ ...draft, announcement: e.target.value })}
          placeholder="e.g. Closed for Eid on 10 April — deliveries resume 11 April."
        />
      </section>

      <div className="sticky bottom-4 mt-6 flex flex-wrap items-center gap-3 rounded-sm border border-black/12 bg-white p-4 shadow-lg">
        <Button variant="primary" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate(draft)}>
          Save changes
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setDraft(data!.settings)}>
            Discard
          </Button>
        )}
        <Button variant="ghost" className="ml-auto" loading={flushCache.isPending} onClick={() => flushCache.mutate()}>
          <Trash2 className="size-4" />
          Clear cache
        </Button>
      </div>
    </div>
  );
}
