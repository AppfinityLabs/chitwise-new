import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json(
        { message: 'Logout successful' },
        { status: 200 }
    );

    // Clear the token cookie
    response.cookies.set('token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 0,
        path: '/'
    });

    return response;
}
