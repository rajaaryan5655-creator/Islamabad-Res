import { Spinner } from '@/components/ui/primitives';

/** Route-level fallback shown while a server component streams in. */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <Spinner className="size-8" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
