import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const user = await verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    try {
        // Return all users but exclude password
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN or ADMIN can create users (optional restriction)
    // For now, let's allow anyone with valid token to create, or add role check if needed.
    if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    try {
        const body = await request.json();
        const { name, email, password, role } = body;

        // Basic validation
        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const userRole = role || 'ORG_ADMIN';

        // Validation: Org Admin must belong to an Organization
        if (userRole === 'ORG_ADMIN' && !body.organisationId) {
            return NextResponse.json({ error: 'Organisation is required for Organisation Admin' }, { status: 400 });
        }

        // Check duplicate
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
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

        return NextResponse.json(userWithoutPass, { status: 201 });

    } catch (error: any) {
        console.error('Create user error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
    }
}
