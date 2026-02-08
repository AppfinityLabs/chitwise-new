import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();
    const { id } = await params;

    try {
        const userDetail = await User.findById(id).select('-password');
        if (!userDetail) {
            return withCors(NextResponse.json({ error: 'User not found' }, { status: 404 }), origin);
        }
        return withCors(NextResponse.json(userDetail), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 }), origin);
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const origin = request.headers.get('origin');
    const requester = await verifyApiAuth(request);
    if (!requester) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (requester.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();
    const { id } = await params;

    try {
        const userToUpdate = await User.findById(id);
        if (!userToUpdate) {
            return withCors(NextResponse.json({ error: 'User not found' }, { status: 404 }), origin);
        }

        // PROTECTION: Cannot edit Super Admin
        if (userToUpdate.role === 'SUPER_ADMIN') {
            return withCors(NextResponse.json({ error: 'Super Admin cannot be modified.' }, { status: 403 }), origin);
        }

        const body = await request.json();
        const { name, email, role, status, password } = body;

        // Update fields
        if (name) userToUpdate.name = name;
        if (email) userToUpdate.email = email;

        // PROTECTION: Cannot promote to Super Admin
        if (role && role === 'SUPER_ADMIN' && userToUpdate.role !== 'SUPER_ADMIN') {
            return withCors(NextResponse.json({ error: 'Cannot promote user to Super Admin.' }, { status: 403 }), origin);
        }
        if (role) userToUpdate.role = role;

        if (body.organisationId) userToUpdate.organisationId = body.organisationId;

        if (status) userToUpdate.status = status;

        // Update password only if provided
        if (password && password.trim() !== '') {
            userToUpdate.password = await hashPassword(password);
        }

        await userToUpdate.save();

        const { password: _, ...updatedUser } = userToUpdate.toObject();
        return withCors(NextResponse.json(updatedUser), origin);

    } catch (error: any) {
        return withCors(NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 }), origin);
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const origin = request.headers.get('origin');
    const requester = await verifyApiAuth(request);
    if (!requester) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (requester.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();
    const { id } = await params;

    try {
        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            return withCors(NextResponse.json({ error: 'User not found' }, { status: 404 }), origin);
        }

        // PROTECTION: Cannot delete Super Admin
        if (userToDelete.role === 'SUPER_ADMIN') {
            return withCors(NextResponse.json({ error: 'Super Admin cannot be deleted.' }, { status: 403 }), origin);
        }

        await User.findByIdAndDelete(id);

        return withCors(NextResponse.json({ message: 'User deleted successfully' }), origin);

    } catch (error: any) {
        return withCors(NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 }), origin);
    }
}
