// Service Worker — Parohia Stornești
// v1.0

const CACHE_NAME = 'parohia-stornesti-v1';
const OFFLINE_URL = '/';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,400;1,400&family=Lato:wght@300;400;700&display=swap'
];

// ── INSTALL ──
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_ASSETS).catch(function(err) {
        console.log('Cache addAll error (non-fatal):', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE ──
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── FETCH — Network first, cache fallback ──
self.addEventListener('fetch', function(e) {
  // Skip non-GET and Firebase requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('firestore.googleapis.com')) return;
  if (e.request.url.includes('firebase')) return;
  if (e.request.url.includes('googleapis.com/identitytoolkit')) return;

  e.respondWith(
    fetch(e.request).then(function(response) {
      // Cache successful responses for HTML/CSS/JS/fonts
      if (response.ok && (
        e.request.url.endsWith('.html') ||
        e.request.url.endsWith('.js') ||
        e.request.url.endsWith('.css') ||
        e.request.url.endsWith('.png') ||
        e.request.url.endsWith('.jpg') ||
        e.request.url.includes('fonts.googleapis.com') ||
        e.request.url.includes('fonts.gstatic.com')
      )) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      // Offline fallback
      return caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        // Return cached main page for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html').then(function(r) {
            return r || new Response('<h1>Offline</h1><p>Nu aveți conexiune la internet.</p>', {
              headers: {'Content-Type': 'text/html'}
            });
          });
        }
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', function(e) {
  var data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch(err) {
    data = { title: 'Parohia Stornești', body: e.data ? e.data.text() : 'Mesaj nou' };
  }

  var title = data.title || 'Parohia Stornești';
  var options = {
    body: data.body || 'Aveți un mesaj nou de la parohie.',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Deschide' },
      { action: 'close', title: 'Închide' }
    ],
    requireInteraction: false,
    tag: 'parohie-notif'
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';

  if (e.action === 'close') return;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Focus existing window if open
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// ── MESSAGE from page ──
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
