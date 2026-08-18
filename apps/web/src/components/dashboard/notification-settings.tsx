'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BellRing, MailCheck, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { usePush } from '@/hooks/use-push';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';

/** Push notification controls and email-verification status. */
export function NotificationSettings() {
  const { user, refresh } = useAuth();
  const { status, enable, disable, sendTest } = usePush(Boolean(user));
  const [busy, setBusy] = useState(false);

  const resend = useMutation({
    mutationFn: () => api.post<{ sent: boolean; message: string }>('/api/auth/resend-verification'),
    onSuccess: (res) => toast[res.sent ? 'success' : 'info'](res.message),
    onError: (err: Error) => toast.error(err.message),
  });

  async function toggle() {
    setBusy(true);
    try {
      if (status === 'on') {
        await disable();
        toast.success('Push notifications turned off');
      } else {
        await enable();
        toast.success('Push notifications turned on');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    try {
      const delivered = await sendTest();
      if (delivered === 0) toast.info('No devices are registered for this account yet.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (!user) return null;

  return (
    <section className="rounded-sm border border-black/10 bg-white p-6">
      <h2 className="mb-5 flex items-center gap-2 font-display text-2xl">
        <BellRing className="size-5 text-ember-500" />
        Notifications
      </h2>

      {/* Email verification */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/8 pb-5">
        <div>
          <p className="flex items-center gap-2 font-medium">
            Email address
            {user.emailVerified ? (
              <Badge variant="success">Verified</Badge>
            ) : (
              <Badge variant="ember">Not verified</Badge>
            )}
          </p>
          <p className="mt-1 text-sm text-black/55">
            {user.emailVerified
              ? `Order receipts and booking confirmations go to ${user.email}.`
              : 'Verify your email to receive order receipts and booking confirmations.'}
          </p>
        </div>
        {user.emailVerified ? (
          <MailCheck className="size-6 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <Button variant="outline" size="sm" loading={resend.isPending} onClick={() => resend.mutate()}>
            Resend link
          </Button>
        )}
      </div>

      {/* Push */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-5">
        <div>
          <p className="font-medium">Push notifications</p>
          <p className="mt-1 max-w-md text-sm text-black/55">
            {status === 'unsupported'
              ? 'Your browser does not support push notifications. Try Chrome, Edge or Firefox on desktop, or add this site to your home screen on iOS.'
              : status === 'unconfigured'
                ? 'Push notifications are not switched on for this restaurant yet.'
                : status === 'denied'
                  ? 'You have blocked notifications for this site. Re-enable them in your browser settings, then reload.'
                  : 'Get a notification the moment your order is confirmed, cooked and on its way.'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {status === 'denied' && <ShieldAlert className="size-5 text-ember-500" aria-hidden />}
          {status === 'on' && (
            <Button variant="ghost" size="sm" onClick={test}>
              Send a test
            </Button>
          )}
          {(status === 'on' || status === 'off') && (
            <Button
              variant={status === 'on' ? 'outline' : 'primary'}
              size="sm"
              loading={busy}
              onClick={toggle}
            >
              {status === 'on' ? 'Turn off' : 'Turn on'}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
