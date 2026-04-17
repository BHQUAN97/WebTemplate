/*
 * Service Worker — PWA caching cho WebTemplate
 *
 * Chien luoc caching:
 *   - /api/*            -> network-first (uu tien data moi, fallback cache khi offline)
 *   - static assets     -> cache-first  (.js .css .png .jpg .jpeg .gif .svg .webp .woff2)
 *                         (load nhanh, it thay doi, revalidate ngam dinh khi version bump)
 *   - HTML pages        -> stale-while-revalidate (hien cache ngay, update ngam)
 *   - HTML khi offline  -> fallback /offline.html
 *
 * KHONG cache:
 *   - /admin/*          -> trang quan tri can data real-time
 *   - /api/auth/*       -> auth endpoints khong duoc cache
 *   - /auth/*           -> login/register pages
 *
 * Versioning: doi CACHE_NAME de force invalidate cache cu khi deploy version moi.
 */

const CACHE_NAME = 'wt-cache-v1';
const OFFLINE_URL = '/offline.html';

// Cac URL pre-cache luc install — chi lay offline fallback de dam bao luon co
const PRECACHE_URLS = [OFFLINE_URL];

// Regex phan loai request
const STATIC_ASSET_REGEX = /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|woff2|ico)$/i;
const API_REGEX = /\/api\//i;
const NO_CACHE_REGEX = /\/(admin|auth)(\/|$)|\/api\/auth\//i;

// Install: precache offline page + skip waiting de active ngay
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: xoa cac cache cu khac version + claim clients ngay
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Network-first: thu fetch truoc, cache lai response ok. Fail -> fallback cache.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

/**
 * Cache-first: tra cache neu co, neu khong moi fetch + luu cache.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Stale-while-revalidate: tra cache ngay (neu co), dong thoi fetch ngam dinh de update.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  return cached || networkPromise || fetch(request);
}

// Fetch handler chinh — dispatch theo loai request
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Chi xu ly GET — cac method khac (POST/PUT/DELETE) de nguyen
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bo qua cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Bo qua admin + auth endpoints — luon fetch tu network, khong cache
  if (NO_CACHE_REGEX.test(url.pathname)) return;

  // API requests: network-first
  if (API_REGEX.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: cache-first
  if (STATIC_ASSET_REGEX.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML navigations: stale-while-revalidate + offline fallback
  const isHTML =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    event.respondWith(
      staleWhileRevalidate(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const offline = await cache.match(OFFLINE_URL);
        return (
          offline ||
          new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        );
      }),
    );
    return;
  }

  // Default: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Cho phep client trigger skipWaiting de apply update ngay
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
