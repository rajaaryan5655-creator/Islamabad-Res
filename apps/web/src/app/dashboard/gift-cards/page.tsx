'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Gift } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { formatDate, formatPKR } from '@/lib/utils';

interface GiftCard {
  id: string;
  code: string;
  amount: number;
  balance: number;
  recipientName: string;
  recipientEmail: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function GiftCardsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-gift-cards'],
    queryFn: () => api.get<{ giftCards: GiftCard[] }>('/api/customer/gift-cards'),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  const cards = data?.giftCards ?? [];

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Gift cards</h1>
          <p className="mt-1 text-black/55">Cards you have purchased</p>
        </div>
        <Button asChild variant="primary">
          <Link href="/gift-cards">
            <Gift />
            Buy a gift card
          </Link>
        </Button>
      </header>

      {cards.length === 0 ? (
        <div className="rounded-sm border border-dashed border-black/15 py-16 text-center">
          <Gift className="mx-auto mb-3 size-8 text-black/20" />
          <p className="font-display text-2xl">No gift cards yet</p>
          <p className="mt-1 text-sm text-black/50">
            A gift card is delivered by email with a unique code, valid for 12 months.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <li key={card.id} className="relative overflow-hidden rounded-sm bg-obsidian p-6 text-cream">
              <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-saffron-400/12 blur-2xl" />
              <div className="relative">
                <div className="mb-4 flex items-start justify-between">
                  <Gift className="size-6 text-saffron-400" />
                  <Badge variant={card.status === 'ACTIVE' ? 'gold' : 'muted'}>{card.status.toLowerCase()}</Badge>
                </div>
                <p className="font-display text-4xl">{formatPKR(card.balance)}</p>
                <p className="text-xs text-cream/45">of {formatPKR(card.amount)} remaining</p>
                <code className="mt-4 block font-mono text-sm tracking-widest text-saffron-400">{card.code}</code>
                <dl className="mt-4 space-y-0.5 border-t border-white/10 pt-3 text-xs text-cream/55">
                  <div className="flex justify-between">
                    <dt>For</dt>
                    <dd>{card.recipientName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Expires</dt>
                    <dd>{formatDate(card.expiresAt)}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
