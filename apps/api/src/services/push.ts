import { createRequire } from 'node:module';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

/**
 * Web Push notifications.
 *
 * Requires a VAPID key pair. Without one the module is inert: subscriptions are
 * still accepted and stored, and sends become no-ops, so enabling push later is
 * purely a configuration change with no code path to re-test.
 */

export const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

type WebPush = typeof import('web-push');
let client: WebPush | null = null;

function getClient(): WebPush | null {
  if (!pushEnabled) return null;
  if (client) return client;
  try {
    const require = createRequire(import.meta.url);
    client = require('web-push') as WebPush;
    client.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    return client;
  } catch (err) {
    console.warn('[push] web-push unavailable:', (err as Error).message);
    return null;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Sends to every device registered by a user. Never throws. */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  const push = getClient();
  if (!push) return 0;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  let delivered = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await push.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        delivered += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 mean the browser has permanently discarded the subscription.
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        } else {
          console.warn('[push] delivery failed:', (err as Error).message);
        }
      }
    }),
  );

  return delivered;
}

/** Broadcast to a segment — used by the admin campaign tool. */
export async function broadcastPush(payload: PushPayload, userIds?: string[]): Promise<number> {
  const subs = await prisma.pushSubscription.findMany({
    where: userIds ? { userId: { in: userIds } } : {},
    select: { userId: true },
    distinct: ['userId'],
  });
  const results = await Promise.all(subs.map((s) => sendPush(s.userId, payload)));
  return results.reduce((a, b) => a + b, 0);
}
