'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Keeps a failed dashboard panel inside the dashboard shell. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[dashboard] unhandled error:', error);
  }, [error]);

  return (
    <div className="rounded-sm border border-ember-500/25 bg-ember-500/5 p-8 text-center">
      <AlertTriangle className="mx-auto mb-3 size-7 text-ember-500" />
      <h2 className="font-display text-3xl">We could not load this page</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-black/60">
        {error.message || 'Something went wrong on our side. Please try again.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}
