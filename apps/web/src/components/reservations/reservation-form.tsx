'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CalendarDays, CheckCircle2, Clock, Copy, PartyPopper, Users } from 'lucide-react';
import { reservationSchema } from '@islamabad/shared';
import { ApiError, api, type Reservation } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea, Spinner } from '@/components/ui/primitives';
import { addDaysISO, cn, formatDate, formatTime, todayISO } from '@/lib/utils';

interface Slot {
  time: string;
  available: boolean;
  peak: boolean;
  past: boolean;
  tableName: string | null;
}

const OCCASIONS = ['', 'Birthday', 'Anniversary', 'Business meal', 'Family gathering', 'Date night', 'Celebration'];
const SEATINGS = [
  { value: 'ANY', label: 'No preference' },
  { value: 'INDOOR', label: 'Indoor hall' },
  { value: 'OUTDOOR', label: 'Courtyard' },
  { value: 'PRIVATE', label: 'Private room' },
];

export function ReservationForm() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [date, setDate] = useState(todayISO());
  const [guests, setGuests] = useState(2);
  const [seating, setSeating] = useState('ANY');
  const [time, setTime] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', occasion: '', requests: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ reservation: Reservation; waitlisted: boolean; table: { name: string } | null } | null>(null);

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone || '' }));
    }
  }, [user]);

  const { data, isFetching } = useQuery({
    queryKey: ['availability', date, guests, seating],
    queryFn: () =>
      api.get<{ slots: Slot[]; anyAvailable: boolean }>(
        `/api/reservations/availability?date=${date}&guests=${guests}&seating=${seating}`,
      ),
    staleTime: 30_000,
  });

  // Clear a chosen time if it stops being available after a criteria change.
  useEffect(() => {
    if (time && data && !data.slots.find((s) => s.time === time && s.available)) setTime('');
  }, [data, time]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      date,
      time,
      guests,
      seating: seating as 'ANY',
      occasion: form.occasion || undefined,
      requests: form.requests || undefined,
    };

    const parsed = reservationSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? 'form')] = issue.message;
      setErrors(fieldErrors);
      toast.error(time ? 'Please check the highlighted fields' : 'Choose a time slot first');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ reservation: Reservation; waitlisted: boolean; table: { name: string } | null }>(
        '/api/reservations',
        parsed.data,
      );
      setConfirmed(res);
      toast.success(res.waitlisted ? 'You are on the waiting list' : 'Table confirmed');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        toast.error(err.message);
      } else {
        toast.error('Could not complete the booking. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    const r = confirmed.reservation;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl rounded-sm border border-black/10 bg-white p-9 text-center"
      >
        <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-100">
          {confirmed.waitlisted ? (
            <Clock className="size-7 text-amber-600" />
          ) : (
            <CheckCircle2 className="size-8 text-emerald-600" />
          )}
        </span>
        <h2 className="font-display text-3xl">
          {confirmed.waitlisted ? 'You are on the waiting list' : 'Your table is confirmed'}
        </h2>
        <p className="mt-2 text-black/60">
          {confirmed.waitlisted
            ? 'We will call you the moment a table frees up for that slot.'
            : `We look forward to seeing you. ${confirmed.table ? `You are at ${confirmed.table.name}.` : ''}`}
        </p>

        <dl className="mt-7 grid grid-cols-2 gap-4 rounded-sm bg-cream p-5 text-left text-sm">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-widest text-black/40">Confirmation code</dt>
            <dd className="flex items-center gap-2 font-mono font-semibold">
              {r.code}
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(r.code);
                  toast.success('Code copied');
                }}
                aria-label="Copy code"
                className="text-black/35 hover:text-ember-500"
              >
                <Copy className="size-3.5" />
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-[0.65rem] uppercase tracking-widest text-black/40">Party</dt>
            <dd>{r.guests} guests</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] uppercase tracking-widest text-black/40">Date</dt>
            <dd>{formatDate(`${r.date}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long' })}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] uppercase tracking-widest text-black/40">Time</dt>
            <dd>{formatTime(r.time)}</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-black/45">
          Changes and cancellations are free up to two hours before. Keep your code, or manage the booking from your
          dashboard.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="dark" onClick={() => router.push(user ? '/dashboard/reservations' : '/')}>
            {user ? 'View my reservations' : 'Back to home'}
          </Button>
          <Button variant="outline" onClick={() => setConfirmed(null)}>
            Book another table
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {/* criteria */}
        <fieldset className="rounded-sm border border-black/10 bg-white p-6">
          <legend className="px-2 font-display text-2xl">When are you coming?</legend>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="res-date" className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-black/60">
                <CalendarDays className="size-3.5" /> Date
              </label>
              <input
                id="res-date"
                type="date"
                value={date}
                min={todayISO()}
                max={addDaysISO(90)}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 w-full rounded-sm border border-black/12 bg-white px-3 text-sm outline-none focus:border-saffron-400"
              />
            </div>

            <div>
              <label htmlFor="res-guests" className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-black/60">
                <Users className="size-3.5" /> Guests
              </label>
              <select
                id="res-guests"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="h-12 w-full rounded-sm border border-black/12 bg-white px-3 text-sm outline-none focus:border-saffron-400"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'guest' : 'guests'}
                  </option>
                ))}
              </select>
            </div>

            <Select label="Seating" value={seating} onChange={(e) => setSeating(e.target.value)}>
              {SEATINGS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          {guests >= 20 && (
            <p className="mt-4 rounded-sm bg-saffron-100 p-3 text-sm text-obsidian/75">
              For parties of 20 or more, our events team can reserve the Faisal Room —{' '}
              <a href="/events" className="font-semibold underline">
                submit an enquiry
              </a>
              .
            </p>
          )}
        </fieldset>

        {/* slots */}
        <fieldset className="rounded-sm border border-black/10 bg-white p-6">
          <legend className="px-2 font-display text-2xl">Choose a time</legend>

          {isFetching ? (
            <div className="flex items-center justify-center gap-3 py-10 text-sm text-black/50">
              <Spinner className="size-5" />
              Checking the floor plan…
            </div>
          ) : !data?.slots.length ? (
            <p className="py-8 text-center text-sm text-black/50">We are closed on that date.</p>
          ) : !data.anyAvailable ? (
            <div className="py-8 text-center">
              <p className="font-display text-xl">Fully booked for {guests} guests</p>
              <p className="mt-1 text-sm text-black/50">
                Try another date, a smaller party, or join the waiting list by picking a slot below.
              </p>
            </div>
          ) : null}

          {data && data.slots.length > 0 && (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {data.slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={slot.past}
                    onClick={() => setTime(slot.time)}
                    aria-pressed={time === slot.time}
                    className={cn(
                      'relative rounded-sm border py-2.5 text-sm transition-all',
                      time === slot.time
                        ? 'border-ember-500 bg-ember-500 font-semibold text-white'
                        : slot.past
                          ? 'cursor-not-allowed border-black/8 bg-black/3 text-black/20'
                          : slot.available
                            ? 'border-black/12 bg-white hover:border-ember-500 hover:text-ember-500'
                            : 'border-dashed border-amber-300 bg-amber-50/50 text-amber-700 hover:border-amber-500',
                    )}
                    title={
                      slot.past
                        ? 'This slot has passed'
                        : slot.available
                          ? `Available${slot.tableName ? ` — ${slot.tableName}` : ''}`
                          : 'Fully booked — join the waiting list'
                    }
                  >
                    {formatTime(slot.time)}
                    {slot.peak && slot.available && (
                      <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-saffron-400" title="Peak time" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-black/45">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full border border-black/20" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full border border-dashed border-amber-400 bg-amber-50" /> Waiting list
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-saffron-400" /> Peak time
                </span>
              </div>
            </>
          )}
        </fieldset>

        {/* details */}
        <fieldset className="rounded-sm border border-black/10 bg-white p-6">
          <legend className="px-2 font-display text-2xl">Your details</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} autoComplete="name" />
            <Input label="Mobile number" required type="tel" placeholder="0306 4650507" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} autoComplete="tel" />
            <Input label="Email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} autoComplete="email" className="sm:col-span-2" hint="Your confirmation code is sent here" />
            <Select label="Occasion (optional)" value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} className="sm:col-span-2">
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>
                  {o || 'Just dinner'}
                </option>
              ))}
            </Select>
            <Textarea
              label="Special requests"
              className="sm:col-span-2"
              value={form.requests}
              onChange={(e) => setForm({ ...form, requests: e.target.value })}
              placeholder="High chair, wheelchair access, allergies, a quiet corner, birthday cake…"
              rows={3}
            />
          </div>
        </fieldset>
      </div>

      {/* summary */}
      <aside className="lg:sticky lg:top-28 lg:h-fit">
        <div className="rounded-sm border border-black/10 bg-white p-6">
          <h2 className="mb-5 font-display text-2xl">Your booking</h2>
          <dl className="space-y-3.5 text-sm">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-ember-500" />
              <div>
                <dt className="text-[0.65rem] uppercase tracking-widest text-black/40">Date</dt>
                <dd>{formatDate(`${date}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long' })}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-ember-500" />
              <div>
                <dt className="text-[0.65rem] uppercase tracking-widest text-black/40">Time</dt>
                <dd>{time ? formatTime(time) : <span className="text-black/35">Choose a slot</span>}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 size-4 shrink-0 text-ember-500" />
              <div>
                <dt className="text-[0.65rem] uppercase tracking-widest text-black/40">Party size</dt>
                <dd>{guests} guests</dd>
              </div>
            </div>
            {form.occasion && (
              <div className="flex items-start gap-3">
                <PartyPopper className="mt-0.5 size-4 shrink-0 text-ember-500" />
                <div>
                  <dt className="text-[0.65rem] uppercase tracking-widest text-black/40">Occasion</dt>
                  <dd>{form.occasion}</dd>
                </div>
              </div>
            )}
          </dl>

          <Button type="submit" variant="primary" size="lg" className="mt-6 w-full" loading={submitting} disabled={!time}>
            {time ? 'Confirm Booking' : 'Pick a time first'}
          </Button>

          <ul className="mt-4 space-y-1.5 text-xs text-black/45">
            <li>· Instant confirmation, no deposit</li>
            <li>· Free changes up to 2 hours before</li>
            <li>· We hold your table for 15 minutes</li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
