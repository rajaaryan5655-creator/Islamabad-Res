'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, ShieldCheck } from 'lucide-react';
import { ROLES } from '@islamabad/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Input, Select, Skeleton } from '@/components/ui/primitives';
import { cn, formatDate, initials, relativeTime } from '@/lib/utils';

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  position: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const EMPTY = { name: '', email: '', phone: '', role: 'STAFF', position: '', password: '' };

const ROLE_VARIANT: Record<string, 'ember' | 'gold' | 'outline'> = {
  SUPER_ADMIN: 'ember',
  MANAGER: 'gold',
  STAFF: 'outline',
};

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => api.get<{ staff: Staff[] }>('/api/admin/staff'),
  });

  const create = useMutation({
    mutationFn: (payload: typeof EMPTY) =>
      api.post<{ staff: Staff; temporaryPassword?: string }>('/api/admin/staff', {
        ...payload,
        phone: payload.phone || undefined,
        password: payload.password || undefined,
      }),
    onSuccess: (res) => {
      toast.success(
        res.temporaryPassword ? `Account created. Temporary password: ${res.temporaryPassword}` : 'Account created',
        { duration: 12_000 },
      );
      setShowForm(false);
      setForm(EMPTY);
      void queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Staff> }) => api.patch(`/api/admin/staff/${id}`, patch),
    onSuccess: () => {
      toast.success('Staff member updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const staff = data?.staff ?? [];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Staff &amp; permissions</h1>
          <p className="mt-1 text-sm text-cream/50">{staff.length} accounts with back-office access</p>
        </div>
        <Button variant="gold" onClick={() => setShowForm((v) => !v)}>
          <Plus />
          Add staff
        </Button>
      </header>

      {/* role legend */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { role: 'SUPER_ADMIN', desc: 'Full access, including staff management and audit logs' },
          { role: 'MANAGER', desc: 'Menu, customers, marketing, coupons and reporting' },
          { role: 'STAFF', desc: 'Orders, kitchen board, reservations and inbox' },
        ].map((r) => (
          <div key={r.role} className="rounded-sm border border-white/8 bg-obsidian p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <ShieldCheck className="size-4 text-saffron-400" />
              <Badge variant={ROLE_VARIANT[r.role]}>{r.role.replace('_', ' ').toLowerCase()}</Badge>
            </div>
            <p className="text-xs text-cream/50">{r.desc}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form);
          }}
          className="mb-6 rounded-sm border border-saffron-400/30 bg-obsidian p-6"
        >
          <h2 className="mb-4 font-display text-2xl">New staff account</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.filter((r) => r !== 'CUSTOMER').map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ')}
                </option>
              ))}
            </Select>
            <Input label="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Floor Manager" />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              hint="Leave blank to generate a temporary password"
            />
          </div>
          <div className="mt-5 flex gap-2">
            <Button type="submit" variant="gold" loading={create.isPending}>
              Create account
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-white/8">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-obsidian text-left text-[0.65rem] uppercase tracking-widest text-cream/45">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 bg-charcoal-2">
              {staff.map((s) => (
                <tr key={s.id} className={cn('transition-colors hover:bg-white/3', !s.isActive && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-saffron-400 text-xs font-semibold text-obsidian">
                        {initials(s.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-cream/45">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANT[s.role] ?? 'outline'}>{s.role.replace('_', ' ').toLowerCase()}</Badge>
                  </td>
                  <td className="px-4 py-3 text-cream/60">{s.position ?? '—'}</td>
                  <td className="px-4 py-3 text-cream/55">
                    {s.lastLoginAt ? relativeTime(s.lastLoginAt) : <span className="text-cream/30">Never</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => update.mutate({ id: s.id, patch: { isActive: !s.isActive } })}
                      role="switch"
                      aria-checked={s.isActive}
                      aria-label={`Toggle access for ${s.name}`}
                      className={cn('relative h-6 w-11 rounded-full transition-colors', s.isActive ? 'bg-emerald-600' : 'bg-white/15')}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 size-5 rounded-full bg-white transition-transform',
                          s.isActive ? 'translate-x-5.5' : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
