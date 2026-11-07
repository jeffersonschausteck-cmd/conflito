// Minimal service worker — exists only to satisfy PWA installability
// criteria (Chrome requires a registered SW with a fetch handler). No
// caching strategy: every request passes straight through to the
// network, so deploys are always picked up immediately.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
