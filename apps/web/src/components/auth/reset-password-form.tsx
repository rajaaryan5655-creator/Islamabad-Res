'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { resetPasswordSchema } from '@islamabad/shared';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';

/** Live feedback against the same rules the API enforces. */
const RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'A number', test: (v: string) => /[0-9]/.test(v) },
];

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-sm bg-ember-500">
          <ShieldAlert className="size-7 text-white" />
        </span>
        <h1 className="font-display text-4xl">Link not valid</h1>
        <p className="mt-3 text-black/60">
          This reset link is missing its token. Please request a new one — links can only be used once.
        </p>
        <Button variant="primary" size="lg" className="mt-8 w-full" onClick={() => router.push('/forgot-password')}>
          Request a new link
        </Button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (password !== confirm) {
      setErrors({ confirm: 'The two passwords do not match' });
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', parsed.data);
      setDone(true);
      // Every session was revoked server-side, so the customer must sign in.
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-sm bg-emerald-600">
          <CheckCircle2 className="size-7 text-white" />
        </span>
        <h1 className="font-display text-4xl">Password updated</h1>
        <p className="mt-3 text-black/60">
          For your security we signed you out everywhere else. Taking you to the sign-in page…
        </p>
        <Link href="/login" className="mt-8 inline-block font-semibold text-ember-500 hover:underline">
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="font-display text-4xl">Choose a new password</h1>
        <p className="mt-2 text-black/55">
          Pick something you have not used here before. This will sign you out on all other devices.
        </p>
      </div>

      <form onSubmit={submit} noValidate className="space-y-4 rounded-sm border border-black/10 bg-white p-7">
        <Input
          label="New password"
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="new-password"
          autoFocus
        />

        <ul className="space-y-1.5 rounded-sm bg-black/3 p-3.5">
          {RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-2 text-xs ${met ? 'text-emerald-700' : 'text-black/45'}`}
              >
                <span
                  aria-hidden
                  className={`flex size-3.5 items-center justify-center rounded-full border text-[8px] ${
                    met ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-black/25'
                  }`}
                >
                  {met ? '✓' : ''}
                </span>
                {rule.label}
              </li>
            );
          })}
        </ul>

        <Input
          label="Confirm new password"
          required
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          autoComplete="new-password"
        />

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-black/55">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-ember-500 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
