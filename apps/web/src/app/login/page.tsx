import { Suspense } from 'react';
import Image from 'next/image';
import { AuthForm } from '@/components/auth/auth-form';
import { Spinner } from '@/components/ui/primitives';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Sign In',
  description: 'Sign in to your Islamabad Restaurant account to track orders, manage reservations and redeem loyalty points.',
  path: '/login',
});

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-cream px-6 pb-14 pt-[8.5rem]">
        <Suspense fallback={<Spinner />}>
          <AuthForm mode="login" />
        </Suspense>
      </div>
      <div className="relative hidden lg:block">
        <Image src="/images/interior-hall.jpg" alt="" fill sizes="50vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/85 to-obsidian/25" />
        <blockquote className="absolute bottom-16 left-12 right-12 text-cream">
          <p className="font-display text-3xl leading-snug">
            &ldquo;The mutton karahi is the closest thing to my grandmother&rsquo;s cooking I have found in Islamabad.&rdquo;
          </p>
          <footer className="mt-3 text-sm text-cream/60">Ayesha Khan · Regular guest, F-10</footer>
        </blockquote>
      </div>
    </div>
  );
}
