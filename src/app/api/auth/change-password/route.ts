import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { comparePassword, hashPassword } from '@/lib/auth';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

/**
 * Change the password of the currently authenticated admin user.
 * Requires the current password for verification.
 */
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const decoded = await verifyApiAuth(request);
    if (!decoded) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return withCors(
                NextResponse.json({ error: 'Current and new password are required' }, { status: 400 }),
                origin
            );
        }

        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return withCors(
                NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 }),
                origin
            );
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            return withCors(NextResponse.json({ error: 'User not found' }, { status: 404 }), origin);
        }

        const isValid = await comparePassword(currentPassword, user.password);
        if (!isValid) {
            return withCors(
                NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 }),
                origin
            );
        }

        user.password = await hashPassword(newPassword);
        await user.save();

        return withCors(NextResponse.json({ message: 'Password updated successfully' }), origin);
    } catch (error: any) {
        return withCors(
            NextResponse.json({ error: error.message || 'Failed to change password' }, { status: 500 }),
            origin
        );
    }
}
