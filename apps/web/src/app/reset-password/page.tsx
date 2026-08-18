import { Suspense } from 'react';
import Image from 'next/image';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Spinner } from '@/components/ui/primitives';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Set a New Password',
  description: 'Choose a new password for your Islamabad Restaurant account.',
  path: '/reset-password',
  noIndex: true,
});

export default function Page() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-cream px-6 pb-14 pt-[8.5rem]">
        <Suspense fallback={<Spinner />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
      <div className="relative hidden lg:block">
        <Image src="/images/interior-hall.jpg" alt="" fill sizes="50vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/85 to-obsidian/25" />
        <blockquote className="absolute bottom-16 left-12 right-12 text-cream">
          <p className="font-display text-3xl leading-snug">
            &ldquo;Twenty-seven years on the same corner of Margalla Road, cooking the same way.&rdquo;
          </p>
          <footer className="mt-3 text-sm text-cream/60">Haji Abdul Rahman · Founder</footer>
        </blockquote>
      </div>
    </div>
  );
}
