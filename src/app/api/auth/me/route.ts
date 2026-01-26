import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    await dbConnect();

    try {
        // Verify token from cookies
        const cookieHeader = request.headers.get('cookie');
        const decoded = verifyUserFromRequest(cookieHeader);

        if (!decoded) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Find user by ID
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if user is active
        if (user.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Account is inactive' },
                { status: 403 }
            );
        }

        return NextResponse.json({
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt
        });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: 'An error occurred while fetching user data' },
            { status: 500 }
        );
    }
}
