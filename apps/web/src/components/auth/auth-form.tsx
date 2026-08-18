'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ChefHat, Facebook, Sparkles } from 'lucide-react';
import { loginSchema, registerSchema } from '@islamabad/shared';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const { login, register, oauth } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const next = params.get('next');

  function redirect(role: string) {
    if (next) return router.push(next);
    router.push(role === 'CUSTOMER' ? '/dashboard' : '/admin');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const schema = mode === 'login' ? loginSchema : registerSchema;
    const payload = mode === 'login' ? { email: form.email, password: form.password } : form;
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const user =
        mode === 'login'
          ? await login(form.email, form.password)
          : await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      toast.success(mode === 'login' ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome — 250 points added');
      redirect(user.role);
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function social(provider: 'google' | 'facebook') {
    setLoading(true);
    try {
      const user = await oauth(provider);
      toast.success(`Signed in with ${provider}`);
      redirect(user.role);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-sm bg-ember-500">
          <ChefHat className="size-7 text-white" />
        </span>
        <h1 className="font-display text-4xl">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="mt-2 text-black/55">
          {mode === 'login'
            ? 'Sign in to track orders, manage bookings and spend your points.'
            : 'Join and get 250 points — worth Rs. 500 off your first order.'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-sm border border-black/10 bg-white p-7">
        {mode === 'register' && (
          <>
            <Input
              label="Full name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
              autoComplete="name"
            />
            <Input
              label="Mobile number"
              required
              type="tel"
              placeholder="0306 4650507"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              error={errors.phone}
              autoComplete="tel"
            />
          </>
        )}

        <Input
          label="Email"
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          autoComplete="email"
        />
        <Input
          label="Password"
          required
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          hint={mode === 'register' ? 'At least 8 characters, with an uppercase letter and a number' : undefined}
        />

        {mode === 'login' && (
          <div className="-mt-1 text-right">
            <Link href="/forgot-password" className="text-sm text-black/55 underline-offset-2 hover:text-ember-500 hover:underline">
              Forgot your password?
            </Link>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </Button>

        <div className="rule-gold my-5 text-[0.65rem] uppercase tracking-widest text-black/35">or</div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={() => social('google')} disabled={loading}>
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z" />
            </svg>
            Google
          </Button>
          <Button type="button" variant="outline" onClick={() => social('facebook')} disabled={loading}>
            <Facebook className="size-4 text-[#1877F2]" />
            Facebook
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-black/55">
        {mode === 'login' ? (
          <>
            New here?{' '}
            <Link href="/register" className="font-semibold text-ember-500 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-ember-500 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>

      {mode === 'register' && (
        <p className="mt-4 flex items-start gap-2 rounded-sm bg-saffron-100 p-3.5 text-xs text-obsidian/70">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-saffron-600" />
          By creating an account you agree to our{' '}
          <Link href="/terms" className="underline">
            terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>
          .
        </p>
      )}
    </div>
  );
}
