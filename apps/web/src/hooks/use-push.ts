'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

/** Browsers hand VAPID keys to the Push API as a Uint8Array, not base64. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type PushStatus = 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on' | 'loading';

interface UsePush {
  status: PushStatus;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  sendTest: () => Promise<number>;
}

/**
 * Web Push subscription lifecycle.
 *
 * Reports a specific status rather than a boolean so the UI can distinguish
 * "your browser cannot do this", "the restaurant has not configured it" and
 * "you previously blocked us" — three problems with three different fixes.
 */
export function usePush(enabled = true): UsePush {
  const [status, setStatus] = useState<PushStatus>('loading');

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function detect() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!cancelled) setStatus('unsupported');
        return;
      }

      try {
        const { enabled: configured } = await api.get<{ enabled: boolean; publicKey: string | null }>(
          '/api/customer/push/key',
        );
        if (cancelled) return;

        if (!configured) {
          setStatus('unconfigured');
          return;
        }
        if (Notification.permission === 'denied') {
          setStatus('denied');
          return;
        }

        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled) setStatus(subscription ? 'on' : 'off');
      } catch {
        if (!cancelled) setStatus('unconfigured');
      }
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const enable = useCallback(async () => {
    setStatus('loading');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus(permission === 'denied' ? 'denied' : 'off');
      throw new Error(
        permission === 'denied'
          ? 'Notifications are blocked for this site. Enable them in your browser settings to continue.'
          : 'Notification permission was not granted.',
      );
    }

    const { publicKey } = await api.get<{ enabled: boolean; publicKey: string | null }>('/api/customer/push/key');
    if (!publicKey) {
      setStatus('unconfigured');
      throw new Error('Push notifications are not configured yet.');
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
    await api.post('/api/customer/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
    setStatus('on');
  }, []);

  const disable = useCallback(async () => {
    setStatus('loading');
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();

    if (subscription) {
      await api.post('/api/customer/push/unsubscribe', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
    setStatus('off');
  }, []);

  const sendTest = useCallback(async () => {
    const { delivered } = await api.post<{ delivered: number }>('/api/customer/push/test');
    return delivered;
  }, []);

  return { status, enable, disable, sendTest };
}
