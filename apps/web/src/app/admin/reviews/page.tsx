'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, MessageSquareReply, Star, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge, Skeleton, Textarea } from '@/components/ui/primitives';
import { cn, formatDate } from '@/lib/utils';

interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  isApproved: boolean;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; tier: string } | null;
  menuItem: { id: string; name: string; slug: string } | null;
}

interface ReviewAnalytics {
  average: number;
  approvedCount: number;
  totalCount: number;
  pendingCount: number;
  distribution: { rating: number; count: number }[];
  last30Days: { count: number; average: number };
}

type Filter = 'pending' | 'approved' | 'all';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn('size-4', n <= rating ? 'fill-saffron-400 text-saffron-400' : 'text-black/15')}
        />
      ))}
    </span>
  );
}

function Analytics({ data }: { data: ReviewAnalytics }) {
  const max = Math.max(1, ...data.distribution.map((d) => d.count));

  return (
    <section className="mb-7 grid gap-5 rounded-sm border border-black/12 bg-white p-6 lg:grid-cols-[auto_1fr_auto]">
      <div className="text-center lg:pr-8 lg:text-left">
        <p className="font-display text-6xl leading-none">{data.average.toFixed(1)}</p>
        <div className="mt-2 flex justify-center lg:justify-start">
          <Stars rating={Math.round(data.average)} />
        </div>
        <p className="mt-2 text-sm text-black/50">{data.approvedCount} published reviews</p>
      </div>

      <div className="space-y-1.5 lg:border-x lg:border-black/8 lg:px-8">
        {data.distribution.map((row) => (
          <div key={row.rating} className="flex items-center gap-3 text-xs">
            <span className="w-3 tabular-nums text-black/50">{row.rating}</span>
            <Star className="size-3 fill-saffron-400 text-saffron-400" aria-hidden />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/6">
              <div
                className="h-full rounded-full bg-saffron-400"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right tabular-nums text-black/50">{row.count}</span>
          </div>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm lg:grid-cols-1 lg:pl-2">
        <div>
          <dt className="text-black/50">Awaiting moderation</dt>
          <dd className="font-display text-2xl">{data.pendingCount}</dd>
        </div>
        <div>
          <dt className="text-black/50">Last 30 days</dt>
          <dd className="font-display text-2xl">
            {data.last30Days.count}
            {data.last30Days.count > 0 && (
              <span className="ml-2 text-sm font-normal text-black/50">avg {data.last30Days.average.toFixed(1)}</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('pending');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', filter],
    queryFn: () => api.get<{ reviews: AdminReview[]; pending: number; total: number }>(`/api/admin/reviews?status=${filter}`),
  });

  const { data: analytics } = useQuery({
    queryKey: ['admin-review-analytics'],
    queryFn: () => api.get<ReviewAnalytics>('/api/admin/reviews/analytics'),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-review-analytics'] });
  };

  const moderate = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { isApproved?: boolean; reply?: string } }) =>
      api.patch(`/api/admin/reviews/${id}`, patch),
    onSuccess: (_res, vars) => {
      toast.success(vars.patch.reply !== undefined ? 'Reply published' : vars.patch.isApproved ? 'Review published' : 'Review hidden');
      setReplyingTo(null);
      setReplyText('');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/reviews/${id}`),
    onSuccess: () => {
      toast.success('Review deleted');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reviews = data?.reviews ?? [];

  return (
    <div>
      <header className="mb-7">
        <h1 className="font-display text-4xl">Reviews</h1>
        <p className="mt-1 text-black/55">
          Nothing appears on the site until it is approved here
          {data?.pending ? ` · ${data.pending} waiting` : ''}
        </p>
      </header>

      {analytics && <Analytics data={analytics} />}

      <div className="mb-5 flex gap-2" role="tablist" aria-label="Filter reviews">
        {(['pending', 'approved', 'all'] as Filter[]).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-sm border px-4 py-2 text-sm capitalize transition-colors',
              filter === value ? 'border-obsidian bg-obsidian text-cream' : 'border-black/15 hover:border-black/35',
            )}
          >
            {value}
            {value === 'pending' && data?.pending ? ` (${data.pending})` : ''}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-sm border border-dashed border-black/15 py-16 text-center">
          <Star className="mx-auto mb-3 size-8 text-black/20" />
          <p className="font-display text-2xl">
            {filter === 'pending' ? 'Nothing to moderate' : 'No reviews here'}
          </p>
          <p className="mt-2 text-sm text-black/55">
            {filter === 'pending' ? 'Every review has been dealt with.' : 'Try another filter.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-sm border border-black/12 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Stars rating={review.rating} />
                    <span className="font-medium">{review.user?.name ?? 'Guest'}</span>
                    {review.user && <Badge variant="muted">{review.user.tier}</Badge>}
                    {review.isApproved ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="ember">Pending</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-black/45">
                    {formatDate(review.createdAt)}
                    {review.menuItem && ` · on ${review.menuItem.name}`}
                    {review.user && ` · ${review.user.email}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {!review.isApproved && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => moderate.mutate({ id: review.id, patch: { isApproved: true } })}
                    >
                      <Check className="size-4" />
                      Approve
                    </Button>
                  )}
                  {review.isApproved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moderate.mutate({ id: review.id, patch: { isApproved: false } })}
                    >
                      <X className="size-4" />
                      Hide
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(replyingTo === review.id ? null : review.id);
                      setReplyText(review.reply ?? '');
                    }}
                    aria-label="Reply to this review"
                  >
                    <MessageSquareReply className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete this review"
                    onClick={() => {
                      if (window.confirm('Delete this review permanently?')) remove.mutate(review.id);
                    }}
                  >
                    <Trash2 className="size-4 text-ember-500" />
                  </Button>
                </div>
              </div>

              {review.title && <p className="mt-3 font-display text-lg">{review.title}</p>}
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-black/70">{review.body}</p>

              {review.reply && replyingTo !== review.id && (
                <div className="mt-4 border-l-2 border-ember-500/40 bg-black/2 py-3 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-black/45">
                    Our reply {review.repliedAt && `· ${formatDate(review.repliedAt)}`}
                  </p>
                  <p className="mt-1 text-sm text-black/70">{review.reply}</p>
                </div>
              )}

              {replyingTo === review.id && (
                <div className="mt-4 space-y-3 border-t border-black/8 pt-4">
                  <Textarea
                    label="Your reply"
                    rows={3}
                    maxLength={600}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Thank the guest by name and answer anything specific they raised."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={moderate.isPending}
                      onClick={() => moderate.mutate({ id: review.id, patch: { reply: replyText.trim() } })}
                    >
                      {review.reply ? 'Update reply' : 'Publish reply'}
                    </Button>
                    {review.reply && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moderate.mutate({ id: review.id, patch: { reply: '' } })}
                      >
                        Remove reply
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
