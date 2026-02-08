import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();

    try {
        // Return all users but exclude password
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        return withCors(NextResponse.json(users), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 }), origin);
    }
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    // Only SUPER_ADMIN can create users
    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();

    try {
        const body = await request.json();
        const { name, email, password, role } = body;

        // Basic validation
        if (!name || !email || !password) {
            return withCors(NextResponse.json({ error: 'Missing required fields' }, { status: 400 }), origin);
        }

        const userRole = role || 'ORG_ADMIN';

        // Validation: Org Admin must belong to an Organization
        if (userRole === 'ORG_ADMIN' && !body.organisationId) {
            return withCors(NextResponse.json({ error: 'Organisation is required for Organisation Admin' }, { status: 400 }), origin);
        }

        // Check duplicate
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return withCors(NextResponse.json({ error: 'User with this email already exists' }, { status: 400 }), origin);
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: userRole,
            organisationId: body.organisationId,
            status: 'ACTIVE'
        });

        // Return user without password
        const { password: _, ...userWithoutPass } = newUser.toObject();

        return withCors(NextResponse.json(userWithoutPass, { status: 201 }), origin);

    } catch (error: any) {
        console.error('Create user error:', error);
        return withCors(NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 }), origin);
    }
}
