import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { comparePassword, signToken } from '@/lib/auth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    await dbConnect();

    try {
        const { email, password } = await request.json();

        // Validate input
        if (!email || !password) {
            return withCors(
                NextResponse.json({ error: 'Email and password are required' }, { status: 400 }),
                origin
            );
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return withCors(
                NextResponse.json({ error: 'Invalid email or password' }, { status: 401 }),
                origin
            );
        }

        // Check if user is active
        if (user.status !== 'ACTIVE') {
            return withCors(
                NextResponse.json({ error: 'Your account has been deactivated. Please contact administrator.' }, { status: 403 }),
                origin
            );
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            return withCors(
                NextResponse.json({ error: 'Invalid email or password' }, { status: 401 }),
                origin
            );
        }

        // Generate JWT token
        const token = await signToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            organisationId: user.organisationId?.toString()
        });

        // Create response with user data (excluding password)
        const userData = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status
        };

        const response = NextResponse.json(
            {
                message: 'Login successful',
                user: userData
            },
            { status: 200 }
        );

        // Set httpOnly cookie with token
        // sameSite: 'none' is required for cross-origin requests (PWA on different domain)
        // secure: true is required when sameSite is 'none'
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
        });

        // Add CORS headers to the response
        return withCors(response, origin);
    } catch (error) {
        console.error('Login error:', error);
        return withCors(
            NextResponse.json({ error: 'An error occurred during login' }, { status: 500 }),
            origin
        );
    }
}
