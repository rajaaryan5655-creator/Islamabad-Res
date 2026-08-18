'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Plus, Send, Tag, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Input, Select, Skeleton, Textarea } from '@/components/ui/primitives';
import { cn, formatDate, formatPKR } from '@/lib/utils';

interface Coupon {
  id: string;
  code: string;
  description: string;
  type: string;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  usageCount: number;
  usageLimit: number | null;
  isActive: boolean;
  expiresAt: string | null;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  recipients: number;
  opens: number;
  clicks: number;
  sentAt: string | null;
}

const EMPTY_COUPON = { code: '', description: '', type: 'PERCENT', value: 10, minOrder: 0, maxDiscount: 0, isActive: true };
const EMPTY_CAMPAIGN = { name: '', subject: '', body: '', segment: 'ALL' };

export default function AdminMarketingPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'coupons' | 'campaigns'>('coupons');
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [showForm, setShowForm] = useState(false);

  const { data: coupons, isLoading: loadingCoupons } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api.get<{ coupons: Coupon[] }>('/api/admin/coupons'),
  });

  const { data: campaigns } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: () => api.get<{ campaigns: Campaign[]; audience: number }>('/api/marketing/campaigns'),
  });

  const saveCoupon = useMutation({
    mutationFn: (payload: typeof EMPTY_COUPON) =>
      api.post('/api/admin/coupons', { ...payload, maxDiscount: payload.maxDiscount || null }),
    onSuccess: () => {
      toast.success('Coupon created');
      setCouponForm(EMPTY_COUPON);
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleCoupon = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/api/admin/coupons/${id}`, { isActive }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const removeCoupon = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/coupons/${id}`),
    onSuccess: () => {
      toast.success('Coupon deleted');
      void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  const saveCampaign = useMutation({
    mutationFn: (payload: typeof EMPTY_CAMPAIGN) => api.post('/api/marketing/campaigns', payload),
    onSuccess: () => {
      toast.success('Campaign drafted');
      setCampaignForm(EMPTY_CAMPAIGN);
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const sendCampaign = useMutation({
    mutationFn: (id: string) => api.post<{ dispatched: number }>(`/api/marketing/campaigns/${id}/send`),
    onSuccess: (res) => {
      toast.success(`Dispatched to ${res.dispatched} subscribers`);
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Marketing</h1>
          <p className="mt-1 text-sm text-cream/50">
            {campaigns?.audience ?? 0} newsletter subscribers · {coupons?.coupons.filter((c) => c.isActive).length ?? 0} live coupons
          </p>
        </div>
        <Button variant="gold" onClick={() => setShowForm((v) => !v)}>
          <Plus />
          New {tab === 'coupons' ? 'coupon' : 'campaign'}
        </Button>
      </header>

      <div className="mb-5 flex gap-1.5">
        {(['coupons', 'campaigns'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setShowForm(false);
            }}
            className={cn(
              'flex items-center gap-2 rounded-sm px-4 py-2 text-sm capitalize transition-colors',
              tab === t ? 'bg-ember-500 text-white' : 'bg-white/5 text-cream/60 hover:bg-white/10',
            )}
          >
            {t === 'coupons' ? <Tag className="size-4" /> : <Mail className="size-4" />}
            {t}
          </button>
        ))}
      </div>

      {showForm && tab === 'coupons' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveCoupon.mutate(couponForm);
          }}
          className="mb-6 rounded-sm border border-saffron-400/30 bg-obsidian p-6"
        >
          <h2 className="mb-4 font-display text-2xl">New coupon</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Code" required value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="SUMMER25" />
            <Select label="Type" value={couponForm.type} onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}>
              <option value="PERCENT">Percentage off</option>
              <option value="FIXED">Fixed amount off</option>
              <option value="FREE_DELIVERY">Free delivery</option>
            </Select>
            <Input label={couponForm.type === 'PERCENT' ? 'Percentage' : 'Amount (Rs.)'} type="number" min={0} value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })} />
            <Input label="Minimum order (Rs.)" type="number" min={0} value={couponForm.minOrder} onChange={(e) => setCouponForm({ ...couponForm, minOrder: Number(e.target.value) })} />
            <Input label="Maximum discount (Rs., 0 = none)" type="number" min={0} value={couponForm.maxDiscount} onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: Number(e.target.value) })} />
            <Input label="Description" required className="sm:col-span-2" value={couponForm.description} onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })} placeholder="25% off between 3 PM and 6 PM" />
          </div>
          <div className="mt-5 flex gap-2">
            <Button type="submit" variant="gold" loading={saveCoupon.isPending}>
              Create coupon
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {showForm && tab === 'campaigns' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveCampaign.mutate(campaignForm);
          }}
          className="mb-6 rounded-sm border border-saffron-400/30 bg-obsidian p-6"
        >
          <h2 className="mb-4 font-display text-2xl">New campaign</h2>
          <div className="grid gap-4">
            <Input label="Campaign name" required value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="Ramadan Iftar 2027" />
            <Input label="Subject line" required value={campaignForm.subject} onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })} />
            <Textarea label="Body" required rows={5} value={campaignForm.body} onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })} />
          </div>
          <div className="mt-5 flex gap-2">
            <Button type="submit" variant="gold" loading={saveCampaign.isPending}>
              Save draft
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {tab === 'coupons' &&
        (loadingCoupons ? (
          <Skeleton className="h-72" />
        ) : (
          <div className="overflow-x-auto rounded-sm border border-white/8">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-obsidian text-left text-[0.65rem] uppercase tracking-widest text-cream/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Conditions</th>
                  <th className="px-4 py-3 font-medium">Used</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6 bg-charcoal-2">
                {coupons?.coupons.map((c) => (
                  <tr key={c.id} className={cn('transition-colors hover:bg-white/3', !c.isActive && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <code className="font-mono font-semibold text-saffron-400">{c.code}</code>
                      <p className="text-xs text-cream/45">{c.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.type === 'PERCENT' ? `${c.value}%` : c.type === 'FREE_DELIVERY' ? 'Free delivery' : formatPKR(c.value)}
                    </td>
                    <td className="px-4 py-3 text-xs text-cream/55">
                      {c.minOrder > 0 && <>Min {formatPKR(c.minOrder)}</>}
                      {c.maxDiscount && <> · Max {formatPKR(c.maxDiscount)}</>}
                      {c.expiresAt && <> · Ends {formatDate(c.expiresAt)}</>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {c.usageCount}
                      {c.usageLimit && <span className="text-cream/35"> / {c.usageLimit}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleCoupon.mutate({ id: c.id, isActive: !c.isActive })}
                        role="switch"
                        aria-checked={c.isActive}
                        aria-label={`Toggle ${c.code}`}
                        className={cn('relative h-6 w-11 rounded-full transition-colors', c.isActive ? 'bg-emerald-600' : 'bg-white/15')}
                      >
                        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white transition-transform', c.isActive ? 'translate-x-5.5' : 'translate-x-0.5')} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => confirm(`Delete ${c.code}?`) && removeCoupon.mutate(c.id)}
                        aria-label={`Delete ${c.code}`}
                        className="rounded-sm p-2 text-cream/45 transition-colors hover:bg-ember-500/15 hover:text-ember-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === 'campaigns' && (
        <ul className="space-y-3">
          {campaigns?.campaigns.length === 0 && (
            <p className="rounded-sm border border-dashed border-white/12 py-16 text-center text-cream/45">
              No campaigns yet.
            </p>
          )}
          {campaigns?.campaigns.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-white/8 bg-obsidian p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{c.name}</p>
                  <Badge variant={c.status === 'SENT' ? 'success' : c.status === 'SCHEDULED' ? 'gold' : 'muted'}>
                    {c.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="truncate text-sm text-cream/50">{c.subject}</p>
                {c.status === 'SENT' && (
                  <p className="mt-1 text-xs text-cream/40">
                    {c.recipients} sent · {c.opens} opens (
                    {c.recipients ? Math.round((c.opens / c.recipients) * 100) : 0}%) · {c.clicks} clicks
                  </p>
                )}
              </div>
              {c.status !== 'SENT' && (
                <Button size="sm" variant="gold" loading={sendCampaign.isPending} onClick={() => sendCampaign.mutate(c.id)}>
                  <Send />
                  Send now
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
