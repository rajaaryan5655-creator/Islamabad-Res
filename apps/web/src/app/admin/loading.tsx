import { Skeleton } from '@/components/ui/primitives';

export default function AdminLoading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <Skeleton className="h-12 w-56" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
