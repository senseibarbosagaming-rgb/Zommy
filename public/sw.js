const CACHE_NAME = "zommy-shell-v4";
const STATIC_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-maskable.svg",
  "/icons/icon-monochrome.svg",
];

const cacheStaticAssets = async () => {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(STATIC_ASSETS);
};

self.addEventListener("install", (event) => {
  event.waitUntil(cacheStaticAssets().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
};

const networkFirstNavigation = async (request) => {
  try {
    return await fetch(request, { cache: "no-store" });
  } catch (_error) {
    return caches.match("/offline.html");
  }
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(request));
  }
});
