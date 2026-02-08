import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyUserFromRequest } from '@/lib/auth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    await dbConnect();

    try {
        // Verify token from cookies
        const cookieHeader = request.headers.get('cookie');
        const decoded = await verifyUserFromRequest(cookieHeader);

        if (!decoded) {
            return withCors(
                NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
                origin
            );
        }

        // Find user by ID
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return withCors(
                NextResponse.json({ error: 'User not found' }, { status: 404 }),
                origin
            );
        }

        // Check if user is active
        if (user.status !== 'ACTIVE') {
            return withCors(
                NextResponse.json({ error: 'Account is inactive' }, { status: 403 }),
                origin
            );
        }

        return withCors(
            NextResponse.json({
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt
            }),
            origin
        );
    } catch (error) {
        console.error('Get user error:', error);
        return withCors(
            NextResponse.json({ error: 'An error occurred while fetching user data' }, { status: 500 }),
            origin
        );
    }
}
