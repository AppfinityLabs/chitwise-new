import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, getTokenFromCookies } from '@/lib/auth';

// CORS allowed origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://chitwise-pwa.vercel.app',
    process.env.NEXT_PUBLIC_PWA_URL, // Add PWA URL in .env.local if needed
    process.env.NEXT_PUBLIC_MEMBER_PWA_URL, // Member PWA URL
].filter(Boolean);

// CORS headers helper
function getCorsHeaders(origin: string | null) {
    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
    };

    // Allow localhost origins (for development) or specified origins
    if (origin) {
        const isLocalhost = origin.startsWith('http://localhost:');
        const isAllowed = allowedOrigins.includes(origin);

        if (isLocalhost || isAllowed) {
            headers['Access-Control-Allow-Origin'] = origin;
        }
    }

    return headers;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const origin = request.headers.get('origin');

    console.log(`[Middleware] ${request.method} ${pathname} from origin: ${origin}`);

    // Handle preflight OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
        console.log('[Middleware] Handling OPTIONS preflight');
        const headers = new Headers();
        const corsHeaders = getCorsHeaders(origin);

        // Set all CORS headers on the Headers object
        Object.entries(corsHeaders).forEach(([key, value]) => {
            headers.set(key, value);
        });

        console.log('[Middleware] Returning CORS headers:', Object.fromEntries(headers.entries()));
        return new NextResponse(null, { status: 204, headers });
    }

    // Public routes that don't require authentication
    const publicRoutes = ['/login'];
    const publicApiRoutes = ['/api/auth/login', '/api/seed', '/api/push/vapid-key', '/api/member/auth/login', '/api/member/auth/logout'];

    // Allow cron routes authenticated with CRON_SECRET (external cron services)
    if (pathname.startsWith('/api/cron/')) {
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        const isInternalCron = request.headers.get('x-internal-cron') === 'true';
        const hasCronSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

        if (hasCronSecret || isInternalCron) {
            console.log(`[Middleware] Allowing cron route: ${pathname}`);
            const response = NextResponse.next();
            return response;
        }
        // If no valid cron auth, fall through to normal JWT auth flow
    }

    // Check if the route is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));

    // Get token from cookies or Authorization header
    const cookieHeader = request.headers.get('cookie');
    let token = getTokenFromCookies(cookieHeader);

    // Fallback to Bearer token
    if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }
    let decoded = null;
    if (token) {
        try {
            console.log(`[Middleware] Verifying token: ${token.substring(0, 10)}...`);
            decoded = await verifyToken(token);
            console.log(`[Middleware] Verification result: ${decoded ? 'Success' : 'Failed'}`);
        } catch (e) {
            console.error('[Middleware] Unexpected error verifying token:', e);
        }
    } else {
        console.log('[Middleware] No token found in Cookie or Authorization header');
    }

    // If user is authenticated and trying to access login page, redirect to dashboard
    if (isPublicRoute && decoded && pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Allow public API routes with CORS headers
    if (isPublicApiRoute) {
        const response = NextResponse.next();
        const corsHeaders = getCorsHeaders(origin);
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        return response;
    }

    // Allow login page for unauthenticated users
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // No token found - redirect to login or return 401 for API routes
    if (!token) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Unauthorized - Please login' },
                { status: 401, headers: getCorsHeaders(origin) }
            );
        }

        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (!decoded) {
        // Invalid token - redirect to login or return 401 for API routes
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Unauthorized - Invalid token' },
                { status: 401, headers: getCorsHeaders(origin) }
            );
        }

        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Token is valid - allow the request with CORS headers for API routes
    const response = NextResponse.next();
    if (pathname.startsWith('/api/')) {
        const corsHeaders = getCorsHeaders(origin);
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
    }
    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public directory)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|yaml)$).*)',
    ],
};
