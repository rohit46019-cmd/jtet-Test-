// QuizFlash Service Worker v3.2 - Ultra-Resilient Low-Internet & Offline Engine
const STATIC_CACHE = 'quizflash-static-v3.2';
const API_CACHE = 'quizflash-api-v3.2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg',
  '/logo.jpg'
];

// Critical API endpoints that must be readable offline / in low internet
const OFFLINE_SAFE_APIS = [
  '/api/quizzes',
  '/api/categories',
  '/api/settings/quiz_config',
  '/api/health'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache non-fatal warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== API_CACHE) {
            console.log('Clearing old service worker cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Fetch with timeout for low internet resilience
function fetchWithTimeout(request, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // 1. Critical Read-Only API Endpoints: Network First with Cache Fallback for Low Internet & Offline
  const isOfflineSafeApi = OFFLINE_SAFE_APIS.some(apiPath => url.pathname.startsWith(apiPath));
  if (isOfflineSafeApi) {
    event.respondWith(
      fetchWithTimeout(event.request, 2000)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, copy));
          }
          return networkRes;
        })
        .catch(() => {
          // Fallback to cached API data
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Empty array fallback for list queries
            return new Response(JSON.stringify([]), {
              headers: { 'Content-Type': 'application/json', 'X-Offline-Fallback': 'true' }
            });
          });
        })
    );
    return;
  }

  // Skip any other mutating or non-safe APIs
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. HTML Navigation Requests (App Shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(event.request, 2500)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/index.html') || caches.match('/');
          });
        })
    );
    return;
  }

  // 3. Static Assets, Scripts, CDN Styles (Tailwind CDN, Fonts, Images)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Revalidate in background
        fetch(event.request)
          .then((networkRes) => {
            if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
              caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, networkRes));
            }
          })
          .catch(() => {});
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || (response.status !== 200 && response.type !== 'opaque')) {
            return response;
          }
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, copy).catch(() => {});
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        });
    })
  );
});
