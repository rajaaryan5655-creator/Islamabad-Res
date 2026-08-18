'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { BRAND } from '@islamabad/shared';
import { Button } from '@/components/ui/button';

/**
 * Root error boundary. Anything that throws during rendering lands here rather
 * than showing the browser's default failure page.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production this is where Sentry.captureException(error) belongs.
    console.error('[app] unhandled error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-32">
      <div className="max-w-lg text-center">
        <span className="mx-auto mb-6 flex size-14 items-center justify-center rounded-sm bg-ember-500">
          <AlertTriangle className="size-7 text-white" />
        </span>

        <h1 className="font-display text-5xl">Something went wrong</h1>
        <p className="mt-4 text-black/60">
          Sorry — that did not work. The problem has been logged and our team will look at it. Your cart and any order
          you have already placed are safe.
        </p>

        {error.digest && <p className="mt-3 font-mono text-xs text-black/35">Reference: {error.digest}</p>}

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button variant="primary" size="lg" onClick={reset}>
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Back to the homepage</Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-black/50">
          Need to order right now? Call us on{' '}
          <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`} className="font-semibold text-ember-500 hover:underline">
            {BRAND.phone}
          </a>
        </p>
      </div>
    </main>
  );
}
