'use client';

import { useEffect } from 'react';

/**
 * Registers the member PWA service worker (scoped to /m/).
 * The SW file is served statically from /m/sw.js so its default scope is /m/.
 */
export default function MemberServiceWorker() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;
        if (process.env.NODE_ENV !== 'production') return; // avoid caching during dev

        const register = () => {
            navigator.serviceWorker
                .register('/m/sw.js', { scope: '/m/' })
                .catch((err) => console.warn('[PWA] SW registration failed', err));
        };

        if (document.readyState === 'complete') register();
        else window.addEventListener('load', register);

        return () => window.removeEventListener('load', register);
    }, []);

    return null;
}
