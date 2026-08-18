'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { forgotPasswordSchema } from '@islamabad/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';
import { BRAND } from '@islamabad/shared';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email: parsed.data.email });
      // The API deliberately answers the same way whether or not the account
      // exists, so the confirmation screen must be equally non-committal.
      setSent(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-sm bg-saffron-500">
          <MailCheck className="size-7 text-obsidian" />
        </span>
        <h1 className="font-display text-4xl">Check your inbox</h1>
        <p className="mt-3 text-black/60">
          If an account exists for <span className="font-medium text-obsidian">{email}</span>, we have sent a link to
          reset your password. It expires in one hour.
        </p>
        <p className="mt-4 text-sm text-black/50">
          Nothing arrived? Check your spam folder, or call us on{' '}
          <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`} className="font-medium text-ember-500 hover:underline">
            {BRAND.phone}
          </a>
          .
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button variant="outline" onClick={() => setSent(false)}>
            Use a different email
          </Button>
          <Link href="/login" className="text-sm text-black/55 hover:text-ember-500 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-black/55 transition-colors hover:text-ember-500"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
        <h1 className="font-display text-4xl">Reset your password</h1>
        <p className="mt-2 text-black/55">
          Enter the email address on your account and we will send you a link to set a new password.
        </p>
      </div>

      <form onSubmit={submit} noValidate className="space-y-4 rounded-sm border border-black/10 bg-white p-7">
        <Input
          label="Email"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          autoComplete="email"
          autoFocus
        />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>
    </div>
  );
}
