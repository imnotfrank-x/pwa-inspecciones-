const CACHE_PREFIX = "labinspect-";
const CACHE_VERSION = "w03-v1";
const PRECACHE_NAME = `${CACHE_PREFIX}precache-${CACHE_VERSION}`;
const RUNTIME_NAME = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;
const ACTIVE_CACHE_NAMES = new Set([PRECACHE_NAME, RUNTIME_NAME]);

const OFFLINE_FALLBACK_URL = "/offline.html";
const PRECACHE_URLS = [
  "/",
  OFFLINE_FALLBACK_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

const SENSITIVE_QUERY_KEYS = /^(api[_-]?key|password|secret|token)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) &&
                !ACTIVE_CACHE_NAMES.has(cacheName)
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || isSensitiveRequest(request, url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticResource(url)) {
    event.respondWith(cacheFirst(request));
  }
});

function isSensitiveRequest(request, url) {
  if (url.pathname.startsWith("/api/")) {
    return true;
  }

  if (request.headers.has("authorization")) {
    return true;
  }

  return Array.from(url.searchParams.keys()).some((key) =>
    SENSITIVE_QUERY_KEYS.test(key)
  );
}

function isStaticResource(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

function isCacheable(response) {
  return (
    response &&
    response.ok &&
    (response.type === "basic" || response.type === "default")
  );
}

async function networkFirstNavigation(request) {
  const runtimeCache = await caches.open(RUNTIME_NAME);

  try {
    const response = await fetch(request);

    if (isCacheable(response)) {
      await runtimeCache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cachedResponse =
      (await caches.match(request)) ||
      (await caches.match("/")) ||
      (await caches.match(OFFLINE_FALLBACK_URL));

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (isCacheable(response)) {
    const runtimeCache = await caches.open(RUNTIME_NAME);
    await runtimeCache.put(request, response.clone());
  }

  return response;
}
