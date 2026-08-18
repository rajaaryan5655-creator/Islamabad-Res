'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { EVENT_TYPES, eventEnquirySchema } from '@islamabad/shared';
import { ApiError, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/primitives';
import { addDaysISO } from '@/lib/utils';

const LABELS: Record<string, string> = {
  PRIVATE_DINING: 'Private dining',
  CATERING: 'Off-site catering',
  BIRTHDAY: 'Birthday',
  CORPORATE: 'Corporate event',
  WEDDING: 'Wedding / walima',
};

export function EventEnquiryForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'PRIVATE_DINING',
    date: addDaysISO(14),
    guests: '20',
    budget: '',
    details: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = eventEnquirySchema.safeParse({
      ...form,
      guests: Number(form.guests),
      budget: form.budget ? Number(form.budget) : undefined,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      toast.error('Please check the highlighted fields');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message: string }>('/api/marketing/events/enquiry', parsed.data);
      setSent(true);
      toast.success(res.message);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-sm bg-white p-9 text-center">
        <CheckCircle2 className="mx-auto mb-4 size-10 text-emerald-600" />
        <h3 className="font-display text-3xl">Enquiry received</h3>
        <p className="mt-2 text-black/60">
          Thank you, {form.name.split(' ')[0]}. Our events manager will call you on {form.phone} within one working
          day with availability and a quotation.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
          Submit another enquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-sm bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Input label="Mobile" required type="tel" placeholder="0306 4650507" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
        <Input label="Email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} className="sm:col-span-2" />

        <Select label="Event type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {LABELS[t]}
            </option>
          ))}
        </Select>

        <div>
          <label htmlFor="event-date" className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-black/70">
            Preferred date
          </label>
          <input
            id="event-date"
            type="date"
            required
            min={addDaysISO(1)}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="h-12 w-full rounded-sm border border-black/15 bg-white px-4 text-[0.95rem] outline-none focus:border-saffron-400"
          />
        </div>

        <Input
          label="Number of guests"
          required
          type="number"
          min={1}
          max={1000}
          value={form.guests}
          onChange={(e) => setForm({ ...form, guests: e.target.value })}
          error={errors.guests}
        />
        <Input
          label="Budget (Rs., optional)"
          type="number"
          min={0}
          step={1000}
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: e.target.value })}
          placeholder="e.g. 150000"
        />
      </div>

      <Textarea
        label="Tell us more"
        rows={4}
        value={form.details}
        onChange={(e) => setForm({ ...form, details: e.target.value })}
        placeholder="Menu preferences, dietary requirements, timings, AV needs, decoration…"
      />

      <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
        Request a Quotation
      </Button>
    </form>
  );
}
