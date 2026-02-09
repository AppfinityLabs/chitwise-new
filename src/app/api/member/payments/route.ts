import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Collection from '@/models/Collection';
import ChitGroup from '@/models/ChitGroup';
import GroupMember from '@/models/GroupMember';
import Member from '@/models/Member';
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
        const { searchParams } = new URL(request.url);
        const groupId = searchParams.get('groupId');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '50')));
        const skip = (page - 1) * limit;

        const query: any = { memberId: memberPayload.memberId };
        if (groupId) query.groupId = groupId;

        const [payments, total] = await Promise.all([
            Collection.find(query)
                .sort({ collectedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('groupId', 'groupName frequency')
                .populate('groupMemberId', 'units'),
            Collection.countDocuments(query),
        ]);

        return withCors(NextResponse.json({
            payments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        }), origin);
    } catch (error) {
        console.error('Member payments error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 }), origin);
    }
}
