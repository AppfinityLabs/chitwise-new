import { NextRequest, NextResponse } from 'next/server';

// CORS allowed origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'https://chitwise-pwa.vercel.app',
    process.env.NEXT_PUBLIC_PWA_URL,
    process.env.NEXT_PUBLIC_MEMBER_PWA_URL,
].filter(Boolean) as string[];

// Get CORS headers based on request origin
export function getCorsHeaders(origin: string | null): Record<string, string> {
    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Cookie',
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

// Handle OPTIONS preflight request
export function handleCorsOptions(request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');
    const headers = new Headers();
    const corsHeaders = getCorsHeaders(origin);

    Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
    });

    return new NextResponse(null, { status: 204, headers });
}

// Add CORS headers to a response
export function withCors(response: NextResponse, origin: string | null): NextResponse {
    const corsHeaders = getCorsHeaders(origin);

    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}
