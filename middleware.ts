import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, getTokenFromCookies } from '@/lib/auth';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/login'];
    const publicApiRoutes = ['/api/auth/login', '/api/seed'];

    // Check if the route is public
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));

    // Get token from cookies for checking authentication
    const cookieHeader = request.headers.get('cookie');
    const token = getTokenFromCookies(cookieHeader);
    const decoded = token ? verifyToken(token) : null;

    // If user is authenticated and trying to access login page, redirect to dashboard
    if (isPublicRoute && decoded && pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Allow public API routes
    if (isPublicApiRoute) {
        return NextResponse.next();
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
                { status: 401 }
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
                { status: 401 }
            );
        }
        
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Token is valid - allow the request
    return NextResponse.next();
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
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
