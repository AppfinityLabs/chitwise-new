/* ChitWise Member PWA service worker (scope: /m/) */
const CACHE_VERSION = 'chitwise-member-v1';
const APP_SHELL = ['/m/dashboard', '/m/groups', '/m/history', '/m/notifications', '/m/profile'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    // Only handle the member app scope.
    if (!url.pathname.startsWith('/m')) return;

    // Never cache API responses — always go to network.
    if (url.pathname.startsWith('/api/')) return;

    // Navigations: network-first with cache fallback (offline support).
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
                    return res;
                })
                .catch(() => caches.match(request).then((c) => c || caches.match('/m/dashboard')))
        );
        return;
    }

    // Static assets: cache-first.
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((res) => {
                if (res && res.status === 200 && res.type === 'basic') {
                    const copy = res.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
                }
                return res;
            });
        })
    );
});

/* Web push */
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
    const title = data.title || 'ChitWise';
    const options = {
        body: data.body || '',
        icon: '/icons/member-icon.svg',
        badge: '/icons/member-icon.svg',
        data: { url: data.url || '/m/dashboard' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || '/m/dashboard';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url.includes('/m') && 'focus' in client) return client.focus();
            }
            return self.clients.openWindow(target);
        })
    );
});
