'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays, Clock, MapPin, Users, X } from 'lucide-react';
import { api, type Reservation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { formatDate, formatTime } from '@/lib/utils';

function ReservationCard({ r, onCancel, cancelling }: { r: Reservation; onCancel?: () => void; cancelling?: boolean }) {
  return (
    <li className="rounded-sm border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-display text-2xl">
              {formatDate(`${r.date}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <Badge variant={r.status === 'CONFIRMED' ? 'success' : r.status === 'WAITLIST' ? 'gold' : 'muted'}>
              {r.status.toLowerCase()}
            </Badge>
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-black/60">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-ember-500" />
              {formatTime(r.time)}
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-ember-500" />
              {r.guests} guests
            </div>
            {r.table && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-ember-500" />
                {r.table.name}
              </div>
            )}
            <div className="font-mono text-xs">{r.code}</div>
          </dl>
          {r.occasion && <p className="mt-2 text-sm text-saffron-600">{r.occasion}</p>}
          {r.requests && <p className="mt-1 text-xs italic text-black/45">“{r.requests}”</p>}
          {r.waitlistPos && (
            <p className="mt-2 text-xs text-amber-700">Position {r.waitlistPos} on the waiting list</p>
          )}
        </div>

        {onCancel && (
          <Button variant="ghost" size="sm" className="text-ember-500" onClick={onCancel} loading={cancelling}>
            <X />
            Cancel
          </Button>
        )}
      </div>
    </li>
  );
}

export default function ReservationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => api.get<{ upcoming: Reservation[]; past: Reservation[] }>('/api/reservations/mine'),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/api/reservations/${id}/cancel`),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      void queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];

  return (
    <div className="space-y-9">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Your reservations</h1>
          <p className="mt-1 text-black/55">Manage upcoming tables and review past visits</p>
        </div>
        <Button asChild variant="primary">
          <Link href="/reservations">
            <CalendarDays />
            Book a table
          </Link>
        </Button>
      </header>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-sm border border-dashed border-black/15 py-12 text-center">
            <p className="text-black/50">No upcoming reservations.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((r) => (
              <ReservationCard
                key={r.id}
                r={r}
                onCancel={() => cancel.mutate(r.id)}
                cancelling={cancel.isPending && cancel.variables === r.id}
              />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Past visits</h2>
          <ul className="space-y-3 opacity-70">
            {past.slice(0, 10).map((r) => (
              <ReservationCard key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
