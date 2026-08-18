'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays, Users } from 'lucide-react';
import { RESERVATION_STATUSES, TOTAL_COVERS } from '@islamabad/shared';
import { api, type Reservation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { cn, formatTime, todayISO } from '@/lib/utils';

export default function AdminReservationsPage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reservations', date, status],
    queryFn: () => api.get<{ reservations: Reservation[]; covers: number; count: number }>(`/api/reservations?date=${date}&status=${status}`),
    refetchInterval: 60_000,
  });

  const { data: calendar } = useQuery({
    queryKey: ['reservation-calendar', date.slice(0, 7)],
    queryFn: () => api.get<{ days: { date: string; covers: number; bookings: number }[] }>(`/api/reservations/calendar/${date.slice(0, 7)}`),
  });

  const update = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) => api.patch(`/api/reservations/${id}/status`, { status: next }),
    onSuccess: () => {
      toast.success('Reservation updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-reservations'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const reservations = data?.reservations ?? [];
  const utilisation = data ? Math.round((data.covers / TOTAL_COVERS) * 100) : 0;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-4xl">Reservations</h1>
        <p className="mt-1 text-sm text-cream/50">Floor plan capacity {TOTAL_COVERS} covers</p>
      </header>

      {/* stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Bookings', value: data?.count ?? 0, Icon: CalendarDays },
          { label: 'Covers booked', value: data?.covers ?? 0, Icon: Users },
          { label: 'Capacity used', value: `${utilisation}%`, Icon: Users },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-sm border border-white/8 bg-obsidian p-5">
            <Icon className="mb-2 size-5 text-saffron-400" />
            <p className="font-display text-3xl">{value}</p>
            <p className="text-[0.65rem] uppercase tracking-widest text-cream/40">{label}</p>
          </div>
        ))}
      </div>

      {/* month heat strip */}
      {calendar && calendar.days.length > 0 && (
        <section className="mb-6 rounded-sm border border-white/8 bg-obsidian p-5">
          <h2 className="mb-3 text-xs uppercase tracking-widest text-cream/45">
            {new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} at a glance
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {calendar.days
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((d) => {
                const pct = Math.min(100, (d.covers / TOTAL_COVERS) * 100);
                return (
                  <button
                    key={d.date}
                    onClick={() => setDate(d.date)}
                    title={`${d.date}: ${d.bookings} bookings, ${d.covers} covers`}
                    className={cn(
                      'flex size-11 flex-col items-center justify-center rounded-sm border text-[0.65rem] transition-colors',
                      d.date === date ? 'border-saffron-400 bg-saffron-400/15' : 'border-white/8 hover:border-white/25',
                    )}
                    style={{ background: d.date === date ? undefined : `rgba(200,16,46,${(pct / 100) * 0.55})` }}
                  >
                    <span className="font-semibold">{Number(d.date.slice(-2))}</span>
                    <span className="text-cream/50">{d.covers}</span>
                  </button>
                );
              })}
          </div>
        </section>
      )}

      {/* filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Reservation date"
          className="h-11 rounded-sm border border-white/10 bg-obsidian px-4 text-sm text-cream outline-none focus:border-saffron-400"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatus('all')}
            className={cn('rounded-sm px-3.5 py-2 text-xs transition-colors', status === 'all' ? 'bg-ember-500 text-white' : 'bg-white/5 text-cream/60 hover:bg-white/10')}
          >
            All
          </button>
          {RESERVATION_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn('rounded-sm px-3.5 py-2 text-xs capitalize transition-colors', status === s ? 'bg-ember-500 text-white' : 'bg-white/5 text-cream/60 hover:bg-white/10')}
            >
              {s.replace('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <p className="rounded-sm border border-dashed border-white/12 py-16 text-center text-cream/45">
          No reservations for that day.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-white/8">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-obsidian text-left text-[0.65rem] uppercase tracking-widest text-cream/45">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Party</th>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 bg-charcoal-2">
              {reservations.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-white/3">
                  <td className="px-4 py-3 font-medium">{formatTime(r.time)}</td>
                  <td className="px-4 py-3">
                    <p>{r.name}</p>
                    <p className="text-xs text-cream/45">{r.phone}</p>
                    {r.occasion && <p className="text-xs text-saffron-400">{r.occasion}</p>}
                    {r.requests && <p className="text-xs italic text-cream/40">“{r.requests}”</p>}
                  </td>
                  <td className="px-4 py-3">{r.guests}</td>
                  <td className="px-4 py-3 text-cream/65">{r.table?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === 'CONFIRMED' ? 'success' : r.status === 'WAITLIST' ? 'gold' : 'muted'}>
                      {r.status.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {r.status === 'CONFIRMED' && (
                        <Button size="sm" variant="gold" onClick={() => update.mutate({ id: r.id, next: 'SEATED' })}>
                          Seat
                        </Button>
                      )}
                      {r.status === 'SEATED' && (
                        <Button size="sm" variant="outlineGold" onClick={() => update.mutate({ id: r.id, next: 'COMPLETED' })}>
                          Complete
                        </Button>
                      )}
                      {['PENDING', 'CONFIRMED'].includes(r.status) && (
                        <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, next: 'NO_SHOW' })}>
                          No show
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
