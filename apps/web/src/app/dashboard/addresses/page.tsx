'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { DELIVERY_ZONES, addressSchema } from '@islamabad/shared';
import { ApiError, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Input, Select, Skeleton, Textarea } from '@/components/ui/primitives';

interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  zoneId: string;
  notes: string | null;
  isDefault: boolean;
}

const EMPTY = { label: 'Home', line1: '', line2: '', city: 'Islamabad', zoneId: '', notes: '', isDefault: false };

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<{ addresses: Address[] }>('/api/auth/addresses'),
  });

  const create = useMutation({
    mutationFn: (payload: typeof EMPTY) => api.post('/api/auth/addresses', payload),
    onSuccess: () => {
      toast.success('Address saved');
      setShowForm(false);
      setForm(EMPTY);
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err) => {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      toast.error(err.message);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/auth/addresses/${id}`),
    onSuccess: () => {
      toast.success('Address removed');
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => api.patch(`/api/auth/addresses/${id}`, { isDefault: true }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = addressSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }
    create.mutate(form);
  }

  if (isLoading) return <Skeleton className="h-64" />;

  const addresses = data?.addresses ?? [];

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Saved addresses</h1>
          <p className="mt-1 text-black/55">Checkout in one tap next time</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm((v) => !v)}>
          <Plus />
          Add address
        </Button>
      </header>

      {showForm && (
        <form onSubmit={submit} className="mb-6 space-y-4 rounded-sm border border-black/10 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Label" required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} error={errors.label} placeholder="Home, Office…" />
            <Select label="Delivery zone" required value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} error={errors.zoneId}>
              <option value="">Select your area…</option>
              {DELIVERY_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </Select>
            <Input label="Address line 1" required className="sm:col-span-2" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} error={errors.line1} placeholder="House 42, Street 18, F-10/3" />
            <Input label="Address line 2 (optional)" className="sm:col-span-2" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
            <Input label="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} error={errors.city} />
          </div>
          <Textarea label="Notes for the rider" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Gate code, landmark, which floor…" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="size-4 accent-ember-500" />
            Make this my default address
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" loading={create.isPending}>
              Save address
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="rounded-sm border border-dashed border-black/15 py-16 text-center">
          <MapPin className="mx-auto mb-3 size-8 text-black/20" />
          <p className="font-display text-2xl">No saved addresses</p>
          <p className="mt-1 text-sm text-black/50">Add one and checkout becomes a single tap.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-sm border border-black/10 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-display text-xl">{a.label}</p>
                {a.isDefault && <Badge variant="gold">Default</Badge>}
              </div>
              <p className="text-sm text-black/60">
                {a.line1}
                {a.line2 && <>, {a.line2}</>}
                <br />
                {a.city}
              </p>
              <p className="mt-1 text-xs text-black/40">
                {DELIVERY_ZONES.find((z) => z.id === a.zoneId)?.name ?? a.zoneId}
              </p>
              {a.notes && <p className="mt-1 text-xs italic text-black/40">“{a.notes}”</p>}

              <div className="mt-4 flex gap-2 border-t border-black/8 pt-3">
                {!a.isDefault && (
                  <Button variant="ghost" size="sm" onClick={() => setDefault.mutate(a.id)}>
                    <Star />
                    Set default
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="ml-auto text-ember-500" onClick={() => remove.mutate(a.id)}>
                  <Trash2 />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
