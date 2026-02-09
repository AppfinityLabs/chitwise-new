import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import '@/models/Organisation';
import { verifyMemberAuth } from '@/lib/memberAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

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

        return withCors(NextResponse.json({
            id: member._id,
            name: member.name,
            phone: member.phone,
            email: member.email,
            address: member.address,
            status: member.status,
            kycVerified: member.kycVerified,
            organisationId: member.organisationId._id || member.organisationId,
            organisationName: (member.organisationId as any)?.name || '',
            createdAt: member.createdAt,
        }), origin);
    } catch (error) {
        console.error('Member /me error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch member data' }, { status: 500 }), origin);
    }
}
