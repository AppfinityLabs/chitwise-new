import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { verifyApiAuth } from '@/lib/apiAuth';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    try {
        const userDetail = await User.findById(id).select('-password');
        if (!userDetail) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json(userDetail);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const requester = verifyApiAuth(request);
    if (!requester) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requester.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    try {
        const userToUpdate = await User.findById(id);
        if (!userToUpdate) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // PROTECTION: Cannot edit Super Admin
        if (userToUpdate.role === 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Super Admin cannot be modified.' }, { status: 403 });
        }

        const body = await request.json();
        const { name, email, role, status, password } = body;

        // Update fields
        if (name) userToUpdate.name = name;
        if (email) userToUpdate.email = email;

        // PROTECTION: Cannot promote to Super Admin
        if (role && role === 'SUPER_ADMIN' && userToUpdate.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Cannot promote user to Super Admin.' }, { status: 403 });
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
        return NextResponse.json(updatedUser);

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const requester = verifyApiAuth(request);
    if (!requester) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (requester.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    try {
        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // PROTECTION: Cannot delete Super Admin
        if (userToDelete.role === 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Super Admin cannot be deleted.' }, { status: 403 });
        }

        await User.findByIdAndDelete(id);

        return NextResponse.json({ message: 'User deleted successfully' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
    }
}
