import type { NextResponse } from 'next/server';

/**
 * Firebase Hosting (in front of Cloud Run) forwards only the "__session"
 * cookie, so the admin and member tokens share it:
 *   __session=token=<jwt>&member_token=<jwt>
 */
export const SESSION_COOKIE = '__session';

export type SessionKey = 'token' | 'member_token';

function parseSession(cookieHeader: string | null): URLSearchParams {
    const raw = cookieHeader
        ?.split(';')
        .map(c => c.trim())
        .find(c => c.startsWith(`${SESSION_COOKIE}=`));
    return new URLSearchParams(raw ? decodeURIComponent(raw.slice(SESSION_COOKIE.length + 1)) : '');
}

export function getSessionToken(cookieHeader: string | null, key: SessionKey): string | null {
    return parseSession(cookieHeader).get(key) || null;
}

/**
 * Set (or clear, when value is null) one token in the session cookie,
 * keeping the other token from the incoming request intact.
 */
export function setSessionToken(
    response: NextResponse,
    cookieHeader: string | null,
    key: SessionKey,
    value: string | null
) {
    const session = parseSession(cookieHeader);
    if (value) session.set(key, value);
    else session.delete(key);

    const encoded = session.toString();
    response.cookies.set(SESSION_COOKIE, encoded, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: encoded ? 60 * 60 * 24 * 7 : 0, // 7 days
        path: '/',
    });
}
