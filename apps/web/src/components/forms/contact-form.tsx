'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Send } from 'lucide-react';
import { contactSchema } from '@islamabad/shared';
import { ApiError, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/primitives';

const SUBJECTS = ['General enquiry', 'Feedback', 'Large booking', 'Lost property', 'Careers', 'Press'];

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: SUBJECTS[0], message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message: string }>('/api/marketing/contact', parsed.data);
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
      <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-9 text-emerald-600" />
        <h3 className="font-display text-2xl text-emerald-900">Message received</h3>
        <p className="mt-1 text-sm text-emerald-800/75">
          Thank you, {form.name.split(' ')[0]}. Our team replies within one working day.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', subject: SUBJECTS[0], message: '' }); }}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-sm border border-black/10 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} autoComplete="name" />
        <Input label="Email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} autoComplete="email" />
        <Input label="Phone (optional)" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} autoComplete="tel" />
        <div>
          <label htmlFor="subject" className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-black/70">
            Subject
          </label>
          <select
            id="subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="h-12 w-full rounded-sm border border-black/15 bg-white px-4 text-[0.95rem] outline-none focus:border-saffron-400"
          >
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <Textarea
        label="Message"
        required
        rows={5}
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        error={errors.message}
        placeholder="Tell us how we can help…"
      />

      <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
        <Send />
        Send Message
      </Button>

      <p className="text-xs text-black/45">
        We use your details only to reply to this enquiry. See our privacy policy for how we handle your data.
      </p>
    </form>
  );
}
