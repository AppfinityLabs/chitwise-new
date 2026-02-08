import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, getTokenFromCookies } from '@/lib/auth';

// CORS allowed origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://chitwise-pwa.vercel.app',
    process.env.NEXT_PUBLIC_PWA_URL, // Add PWA URL in .env.local if needed
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

    // Handle preflight OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
        const headers = new Headers();
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        headers.set('Access-Control-Allow-Credentials', 'true');
        headers.set('Access-Control-Max-Age', '86400');

        // Set Allow-Origin for any localhost or allowed origins
        if (origin && (origin.startsWith('http://localhost:') || allowedOrigins.includes(origin))) {
            headers.set('Access-Control-Allow-Origin', origin);
        }

        return new NextResponse(null, { status: 204, headers });
    }

    // Public routes that don't require authentication
    const publicRoutes = ['/login'];
    const publicApiRoutes = ['/api/auth/login', '/api/seed'];

    // Check if the route is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));

    // Get token from cookies for checking authentication
    const cookieHeader = request.headers.get('cookie');
    const token = getTokenFromCookies(cookieHeader);
    const decoded = token ? await verifyToken(token) : null;

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
