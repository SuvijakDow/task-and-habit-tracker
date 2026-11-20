// Minimal, network-first PWA service worker for standalone installability.
// Intentionally avoids caching Firebase Auth / Firestore requests so live sync & sign-in always stay fresh.

const SHELL_CACHE = 'task-habit-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        cache.addAll([
          '/manifest.webmanifest',
          '/icons/icon-192x192.png',
          '/icons/icon-512x512.png',
        ])
      )
      .catch(() => undefined)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always prefer network so deployed updates and auth redirects work cleanly
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((res) => res || Response.error()))
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((res) => res || Response.error()))
  );
});
