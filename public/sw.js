const CACHE_NAME = 'niveshak-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/logo.png',
  '/iim-shillong-logo.png',
  '/pwa-icon.png',
  '/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const payload = event.data.json();
      const origin = self.location.origin;
      const options = {
        body: payload.body,
        icon: origin + '/pwa-icon.png?v=2',
        badge: origin + '/pwa-icon.png?v=2',
        vibrate: [100, 50, 100],
        data: {
          url: payload.url || '/'
        }
      };
      event.waitUntil(
        self.registration.showNotification(payload.title, options)
      );
    } catch (e) {
      const text = event.data.text();
      const origin = self.location.origin;
      event.waitUntil(
        self.registration.showNotification('Niveshak Update', {
          body: text,
          icon: origin + '/pwa-icon.png?v=2',
          badge: origin + '/pwa-icon.png?v=2'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});
