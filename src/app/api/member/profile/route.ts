import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { verifyMemberAuth } from '@/lib/memberAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// Get member profile
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const memberPayload = await verifyMemberAuth(request);

    if (!memberPayload) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        const member = await Member.findById(memberPayload.memberId)
            .select('-pin')
            .populate('organisationId', 'name code');

        if (!member) {
            return withCors(NextResponse.json({ error: 'Member not found' }, { status: 404 }), origin);
        }

        return withCors(NextResponse.json(member), origin);
    } catch (error) {
        console.error('Member profile error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 }), origin);
    }
}

// Update member profile (limited fields)
export async function PUT(request: NextRequest) {
    const origin = request.headers.get('origin');
    const memberPayload = await verifyMemberAuth(request);

    if (!memberPayload) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        const body = await request.json();

        // Only allow updating limited fields
        const allowedFields: Record<string, any> = {};
        if (body.name) allowedFields.name = body.name;
        if (body.email !== undefined) allowedFields.email = body.email;
        if (body.address !== undefined) allowedFields.address = body.address;

        if (Object.keys(allowedFields).length === 0) {
            return withCors(NextResponse.json({ error: 'No valid fields to update' }, { status: 400 }), origin);
        }

        const member = await Member.findByIdAndUpdate(
            memberPayload.memberId,
            allowedFields,
            { new: true, select: '-pin' }
        ).populate('organisationId', 'name code');

        if (!member) {
            return withCors(NextResponse.json({ error: 'Member not found' }, { status: 404 }), origin);
        }

        return withCors(NextResponse.json(member), origin);
    } catch (error) {
        console.error('Member profile update error:', error);
        return withCors(NextResponse.json({ error: 'Failed to update profile' }, { status: 500 }), origin);
    }
}
