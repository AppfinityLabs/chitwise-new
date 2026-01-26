import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
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
export function signToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
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
export function verifyUserFromRequest(cookieHeader: string | null): JWTPayload | null {
    const token = getTokenFromCookies(cookieHeader);
    if (!token) return null;
    
    return verifyToken(token);
}
