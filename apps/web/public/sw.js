/**
 * Service worker for Web Push.
 *
 * Deliberately minimal: it does not cache or intercept fetches, because a stale
 * menu or price is far worse than a slightly slower page. Its only job is to
 * show notifications and route the click.
 */

self.addEventListener('install', () => {
  // Take over immediately so the first subscription works without a reload.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Islamabad Restaurant', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Islamabad Restaurant', {
      body: payload.body || '',
      icon: '/images/icon-192.png',
      badge: '/images/icon-192.png',
      // A tag replaces an earlier notification for the same order rather than
      // stacking four alerts as a delivery moves through its statuses.
      tag: payload.tag || 'islamabad-restaurant',
      renotify: Boolean(payload.tag),
      data: { url: payload.url || '/dashboard' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab if the site is already open, rather than piling
      // up duplicate windows.
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
