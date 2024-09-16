importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js",
);

const CACHE_NAME = "chronoshere";
const OFFLINE_FALLBACK_PAGE = "/index.html";
const CACHE_ASSETS = [
  OFFLINE_FALLBACK_PAGE,
  "/css/style.css",
  "/js/main.js",
  "/",
  "music/noti.mp3",
  "icons/icon-512x512.png",
  "/manifest.json",
  "/sw.js",
  "icons/android-launchericon-192-192.png"
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_ASSETS)),
  );
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
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
      })(),
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request);
      }),
    );
  }
});

// Add periodic sync event listener
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCache());
  }
});

// Function to update cache
async function updateCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    for (const url of CACHE_ASSETS) {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) {
          await cache.put(url, response);
          console.log(`Updated cache for: ${url}`);
        }
      } catch (error) {
        console.error(`Failed to update cache for ${url}:`, error);
      }
    }
    console.log('Cache update completed');
  } catch (error) {
    console.error('Error updating cache:', error);
  }
}
