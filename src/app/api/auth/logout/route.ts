import { NextRequest, NextResponse } from 'next/server';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { setSessionToken } from '@/lib/sessionCookie';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const response = NextResponse.json(
        { message: 'Logout successful' },
        { status: 200 }
    );

    // Clear the token cookie
    setSessionToken(response, request.headers.get('cookie'), 'token', null);

    return withCors(response, origin);
}
