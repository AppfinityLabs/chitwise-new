import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { hashPassword } from '@/lib/auth';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    // Only ORG_ADMIN or SUPER_ADMIN can reset PINs
    if (user.role !== 'ORG_ADMIN' && user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();

    try {
        const { id } = await params;
        const { pin } = await request.json();

        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            return withCors(NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 }), origin);
        }

        const member = await Member.findById(id);
        if (!member) {
            return withCors(NextResponse.json({ error: 'Member not found' }, { status: 404 }), origin);
        }

        // Verify org scope for ORG_ADMIN
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            if (member.organisationId.toString() !== user.organisationId) {
                return withCors(NextResponse.json({ error: 'Member not in your organisation' }, { status: 403 }), origin);
            }
        }

        const hashedPin = await hashPassword(pin);
        member.pin = hashedPin;
        await member.save();

        return withCors(NextResponse.json({ message: 'PIN reset successfully' }), origin);
    } catch (error) {
        console.error('Reset PIN error:', error);
        return withCors(NextResponse.json({ error: 'Failed to reset PIN' }, { status: 500 }), origin);
    }
}
