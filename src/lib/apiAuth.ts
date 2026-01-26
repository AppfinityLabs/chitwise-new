import { NextRequest } from 'next/server';
import { verifyUserFromRequest } from './auth';

/**
 * Verify authentication for API routes
 * Returns the decoded JWT payload or null if unauthorized
 */
export function verifyApiAuth(request: NextRequest) {
    const cookieHeader = request.headers.get('cookie');
    const decoded = verifyUserFromRequest(cookieHeader);
    
    return decoded;
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
    return allowedRoles.includes(userRole);
}
