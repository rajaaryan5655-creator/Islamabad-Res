'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Dark-theme error state matching the admin shell. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin] unhandled error:', error);
  }, [error]);

  return (
    <div className="rounded-sm border border-ember-500/30 bg-ember-500/8 p-8 text-center">
      <AlertTriangle className="mx-auto mb-3 size-7 text-ember-500" />
      <h2 className="font-display text-3xl">This panel failed to load</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-cream/60">
        {error.message || 'Something went wrong. If it keeps happening, check the API logs.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="gold" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}
