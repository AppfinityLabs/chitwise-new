import { NextRequest } from 'next/server';
import { verifyUserFromRequest, verifyToken } from './auth';

/**
 * Verify authentication for API routes
 * Returns the decoded JWT payload or null if unauthorized
 */
export async function verifyApiAuth(request: NextRequest) {
    // 1. Try Cookie
    const cookieHeader = request.headers.get('cookie');
    let decoded = await verifyUserFromRequest(cookieHeader);

    // 2. Try Authorization Header (Bearer)
    if (!decoded) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            decoded = await verifyToken(token);
        }
    }

    return decoded;
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
    return allowedRoles.includes(userRole);
}
