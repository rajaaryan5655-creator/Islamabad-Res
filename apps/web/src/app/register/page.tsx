import { Suspense } from 'react';
import Image from 'next/image';
import { AuthForm } from '@/components/auth/auth-form';
import { Spinner } from '@/components/ui/primitives';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Create an Account',
  description: 'Join Islamabad Restaurant. Earn 250 welcome points, save your addresses, track orders and book tables faster.',
  path: '/register',
});

export default function RegisterPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-cream px-6 pb-14 pt-[8.5rem]">
        <Suspense fallback={<Spinner />}>
          <AuthForm mode="register" />
        </Suspense>
      </div>
      <div className="relative hidden lg:block">
        <Image src="/images/dish-mix-grill.jpg" alt="" fill sizes="50vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/85 to-obsidian/25" />
        <blockquote className="absolute bottom-16 left-12 right-12 text-cream">
          <p className="font-display text-3xl leading-snug">
            Members earn on every rupee, skip the queue for peak tables, and reorder in a single tap.
          </p>
          <footer className="mt-3 text-sm text-cream/60">250 points free when you join</footer>
        </blockquote>
      </div>
    </div>
  );
}
