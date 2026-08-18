import { Skeleton } from '@/components/ui/primitives';

export default function DashboardLoading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
