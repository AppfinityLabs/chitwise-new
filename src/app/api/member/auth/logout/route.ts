import { NextRequest, NextResponse } from 'next/server';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { setSessionToken } from '@/lib/sessionCookie';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    // Clear the member token cookie
    setSessionToken(response, request.headers.get('cookie'), 'member_token', null);

    return withCors(response, origin);
}
