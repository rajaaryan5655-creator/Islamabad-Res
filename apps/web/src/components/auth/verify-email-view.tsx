'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { BadgeCheck, MailWarning } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/primitives';

type State = 'verifying' | 'verified' | 'failed';

export function VerifyEmailView() {
  const token = useSearchParams().get('token') ?? '';
  const { user, refresh } = useAuth();
  const [state, setState] = useState<State>(token ? 'verifying' : 'failed');
  const [message, setMessage] = useState('This verification link is missing its token.');
  const [resending, setResending] = useState(false);
  // React 19 runs effects twice in dev; the token is single-use, so guard it.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    api
      .post('/api/auth/verify-email', { token })
      .then(async () => {
        setState('verified');
        await refresh().catch(() => undefined);
      })
      .catch((err: Error) => {
        setState('failed');
        setMessage(err.message);
      });
  }, [token, refresh]);

  async function resend() {
    setResending(true);
    try {
      const res = await api.post<{ sent: boolean; message: string }>('/api/auth/resend-verification');
      toast[res.sent ? 'success' : 'info'](res.message);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResending(false);
    }
  }

  if (state === 'verifying') {
    return (
      <div className="w-full max-w-md text-center">
        <Spinner className="mx-auto size-8" />
        <p className="mt-4 text-black/55">Confirming your email address…</p>
      </div>
    );
  }

  if (state === 'verified') {
    return (
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-sm bg-emerald-600">
          <BadgeCheck className="size-7 text-white" />
        </span>
        <h1 className="font-display text-4xl">Email verified</h1>
        <p className="mt-3 text-black/60">
          Thank you{user ? `, ${user.name.split(' ')[0]}` : ''}. You will now get order updates, booking confirmations
          and your loyalty statements by email.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/dashboard">
            <Button variant="primary" size="lg" className="w-full">
              Go to my dashboard
            </Button>
          </Link>
          <Link href="/menu" className="text-sm text-black/55 hover:text-ember-500 hover:underline">
            Browse the menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md text-center">
      <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-sm bg-ember-500">
        <MailWarning className="size-7 text-white" />
      </span>
      <h1 className="font-display text-4xl">We could not verify that link</h1>
      <p className="mt-3 text-black/60">{message}</p>

      <div className="mt-8 flex flex-col gap-3">
        {user ? (
          <Button variant="primary" size="lg" className="w-full" loading={resending} onClick={resend}>
            Send me a new link
          </Button>
        ) : (
          <Link href="/login">
            <Button variant="primary" size="lg" className="w-full">
              Sign in to resend
            </Button>
          </Link>
        )}
        <Link href="/" className="text-sm text-black/55 hover:text-ember-500 hover:underline">
          Back to the restaurant
        </Link>
      </div>
    </div>
  );
}
