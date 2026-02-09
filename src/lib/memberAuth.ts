import { NextRequest } from 'next/server';
import { verifyToken } from './auth';

export interface MemberJWTPayload {
    memberId: string;
    phone: string;
    role: 'MEMBER';
    organisationId: string;
    [key: string]: any;
}

/**
 * Verify authentication for member API routes.
 * Returns the decoded JWT payload only if role === 'MEMBER'.
 */
export async function verifyMemberAuth(request: NextRequest): Promise<MemberJWTPayload | null> {
    // 1. Try Cookie
    const cookieHeader = request.headers.get('cookie');
    let token: string | null = null;

    if (cookieHeader) {
        const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('member_token='));
        if (tokenCookie) {
            token = tokenCookie.split('=')[1];
        }
    }

    // 2. Try Authorization Header (Bearer)
    if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    if (!token) return null;

    const decoded = await verifyToken(token);
    if (!decoded) return null;

    // Ensure this is a MEMBER token
    if (decoded.role !== 'MEMBER') return null;

    return decoded as unknown as MemberJWTPayload;
}
