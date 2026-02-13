const CACHE = "cqst-library-v1";

const OFFLINE_URL = "/offline";

const ASSETS = [
  "/",
  "/login",
  "/dashboard",
  "/pwa/manifest.json",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then((r) => r || caches.match("/"))
    )
  );
});
