import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    organisationId?: string;
    [key: string]: any; // Allow other properties from jwtVerify
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a JWT token
 */
export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    const secret = new TextEncoder().encode(JWT_SECRET);
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(JWT_EXPIRES_IN)
        .sign(secret);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        return payload as unknown as JWTPayload;
    } catch (error) {
        console.error('verifyToken failed:', error);
        return null;
    }
}

/**
 * Extract token from request cookies
 */
export function getTokenFromCookies(cookies: string | null): string | null {
    if (!cookies) return null;

    const tokenCookie = cookies
        .split(';')
        .find(c => c.trim().startsWith('token='));

    if (!tokenCookie) return null;

    return tokenCookie.split('=')[1];
}

/**
 * Verify user from request cookies
 */
export async function verifyUserFromRequest(cookieHeader: string | null): Promise<JWTPayload | null> {
    const token = getTokenFromCookies(cookieHeader);
    if (!token) return null;

    return verifyToken(token);
}
