importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE_NAME = "pwabuilder-page";
const OFFLINE_FALLBACK_PAGE = "index.html";
const CACHE_ASSETS = [
  OFFLINE_FALLBACK_PAGE,
  'music/noti.mp3',
  'icons/icon-512x512.png'
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_ASSETS))
  );
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_FALLBACK_PAGE);
          return cachedResponse;
        }
      })()
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request);
        })
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const title = data.title || 'Default Title';
  const options = {
    body: data.body || 'Default Body',
    icon: data.icon || 'icons/icon-512x512.png',
    badge: data.badge || 'icons/icon-512x512.png'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          const client = clientList[0];
          client.focus();
          return client.navigate(event.notification.data.url || '/');
        } else {
          return clients.openWindow(event.notification.data.url || '/');
        }
      })
  );
});
