'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Inbox, Mail, PartyPopper } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { cn, formatDate, formatPKR, relativeTime } from '@/lib/utils';

interface Message {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  date: string;
  guests: number;
  budget: number | null;
  details: string | null;
  status: string;
  createdAt: string;
}

export default function AdminInboxPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'enquiries' | 'messages'>('enquiries');

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: () => api.get<{ messages: Message[] }>('/api/admin/messages'),
  });

  const { data: enquiries, isLoading: loadingEnquiries } = useQuery({
    queryKey: ['admin-enquiries'],
    queryFn: () => api.get<{ enquiries: Enquiry[] }>('/api/admin/enquiries'),
  });

  const updateMessage = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/api/admin/messages/${id}`, { status }),
    onSuccess: () => {
      toast.success('Message updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    },
  });

  const updateEnquiry = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/api/admin/enquiries/${id}`, { status }),
    onSuccess: () => {
      toast.success('Enquiry updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-enquiries'] });
    },
  });

  const newEnquiries = enquiries?.enquiries.filter((e) => e.status === 'NEW').length ?? 0;
  const newMessages = messages?.messages.filter((m) => m.status === 'NEW').length ?? 0;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-4xl">Inbox</h1>
        <p className="mt-1 text-sm text-cream/50">
          {newEnquiries} new enquiries · {newMessages} unread messages
        </p>
      </header>

      <div className="mb-5 flex gap-1.5">
        {([
          ['enquiries', PartyPopper, newEnquiries],
          ['messages', Mail, newMessages],
        ] as const).map(([t, Icon, count]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-2 rounded-sm px-4 py-2 text-sm capitalize transition-colors',
              tab === t ? 'bg-ember-500 text-white' : 'bg-white/5 text-cream/60 hover:bg-white/10',
            )}
          >
            <Icon className="size-4" />
            {t}
            {count > 0 && <span className="rounded-full bg-saffron-400 px-1.5 text-[0.6rem] font-bold text-obsidian">{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'enquiries' &&
        (loadingEnquiries ? (
          <Skeleton className="h-72" />
        ) : enquiries?.enquiries.length === 0 ? (
          <p className="rounded-sm border border-dashed border-white/12 py-16 text-center text-cream/45">
            No event enquiries yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {enquiries?.enquiries.map((e) => (
              <li key={e.id} className="rounded-sm border border-white/8 bg-obsidian p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{e.name}</p>
                      <Badge variant={e.status === 'NEW' ? 'ember' : e.status === 'WON' ? 'success' : 'muted'}>
                        {e.status.toLowerCase()}
                      </Badge>
                      <Badge variant="outline">{e.type.replace('_', ' ').toLowerCase()}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-cream/55">
                      {e.email} · {e.phone}
                    </p>
                    <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-cream/50">
                      <div>
                        <dt className="inline text-cream/35">Date: </dt>
                        <dd className="inline">{formatDate(`${e.date}T12:00:00`)}</dd>
                      </div>
                      <div>
                        <dt className="inline text-cream/35">Guests: </dt>
                        <dd className="inline">{e.guests}</dd>
                      </div>
                      {e.budget && (
                        <div>
                          <dt className="inline text-cream/35">Budget: </dt>
                          <dd className="inline text-saffron-400">{formatPKR(e.budget)}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="inline text-cream/35">Received: </dt>
                        <dd className="inline">{relativeTime(e.createdAt)}</dd>
                      </div>
                    </dl>
                    {e.details && <p className="mt-2 rounded-sm bg-white/5 p-3 text-sm text-cream/65">{e.details}</p>}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {['CONTACTED', 'QUOTED', 'WON', 'LOST'].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === 'WON' ? 'gold' : 'outline'}
                        onClick={() => updateEnquiry.mutate({ id: e.id, status: s })}
                        disabled={e.status === s}
                      >
                        {s.toLowerCase()}
                      </Button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'messages' &&
        (loadingMessages ? (
          <Skeleton className="h-72" />
        ) : messages?.messages.length === 0 ? (
          <p className="rounded-sm border border-dashed border-white/12 py-16 text-center text-cream/45">
            <Inbox className="mx-auto mb-3 size-8 opacity-40" />
            No messages.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages?.messages.map((m) => (
              <li key={m.id} className={cn('rounded-sm border bg-obsidian p-5', m.status === 'NEW' ? 'border-saffron-400/40' : 'border-white/8')}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{m.subject}</p>
                      <Badge variant={m.status === 'NEW' ? 'gold' : 'muted'}>{m.status.toLowerCase()}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-cream/55">
                      {m.name} · {m.email}
                      {m.phone && ` · ${m.phone}`} · {relativeTime(m.createdAt)}
                    </p>
                    <p className="mt-2 rounded-sm bg-white/5 p-3 text-sm text-cream/70">{m.message}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button asChild size="sm" variant="gold">
                      <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}>Reply</a>
                    </Button>
                    {['READ', 'REPLIED', 'ARCHIVED'].map((s) => (
                      <Button key={s} size="sm" variant="outline" onClick={() => updateMessage.mutate({ id: m.id, status: s })} disabled={m.status === s}>
                        {s.toLowerCase()}
                      </Button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
