
// ═══════════════════════════════════════════════════════════════
//  SERVICE WORKER — Dungeon Crawler PWA
//  Estrategia:
//    · Network-First para HTML/CSS/JS  (siempre trae lo último,
//      cae a la caché solo si no hay conexión)
//    · Stale-While-Revalidate para imágenes y fuentes
// ═══════════════════════════════════════════════════════════════

// ⚠️  Sube esta versión en cada despliegue para invalidar la caché vieja
const VERSION      = 'v2';
const STATIC_CACHE = `dungeon-static-${VERSION}`;

// Assets que siempre se pre-cachean (shell de la app)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/index.css',
  './js/game.js',
  './manifest.json',
  './docs/png/logo.png',
  './docs/png/logo/logo_180x180.png',
  './docs/png/logo/logo_192x192.png',
  './docs/png/logo/logo_512x512.png'
  // Fuentes de Google: se cachean en runtime
];

// Extensiones que queremos siempre frescas (network-first)
const FRESH_DESTINATIONS = ['document', 'script', 'style'];

// ── INSTALL: pre-cachear shell ───────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando', VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Pre-cacheando assets estáticos');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpiar caches viejas ─────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando', VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE)
          .map(k => {
            console.log('[SW] Eliminando cache obsoleta:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo GET
  if (request.method !== 'GET') return;

  // No interceptar peticiones a la API del juego
  if (url.pathname.startsWith('/login') ||
      url.pathname.startsWith('/item')  ||
      url.pathname.startsWith('/level')) {
    return; // pasa directo, sin cache
  }

  // No interceptar cross-origin salvo las fuentes de Google
  const isFont = url.hostname.includes('fonts.googleapis.com') ||
                 url.hostname.includes('fonts.gstatic.com');
  if (url.origin !== location.origin && !isFont) {
    return;
  }

  // HTML / CSS / JS → siempre lo más nuevo posible
  if (FRESH_DESTINATIONS.includes(request.destination)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Imágenes, fuentes y resto → rápido desde caché, revalidando
  event.respondWith(staleWhileRevalidate(request));
});

// ── Network-First: red primero, caché como respaldo ─────────────
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    return offlineResponse();
  }
}

// ── Stale-While-Revalidate: caché ya, red en segundo plano ───────
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then(async networkResponse => {
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  if (cachedResponse) return cachedResponse;

  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;

  if (request.mode === 'navigate') {
    const fallback = await caches.match('./index.html');
    if (fallback) return fallback;
  }
  return offlineResponse();
}

function offlineResponse() {
  return new Response('Sin conexión', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' },
  });
}
