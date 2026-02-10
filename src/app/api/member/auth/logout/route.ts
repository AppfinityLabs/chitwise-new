import { NextRequest, NextResponse } from 'next/server';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    // Clear the member token cookie
    response.cookies.set('member_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
    });

    return withCors(response, origin);
}
