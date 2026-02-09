import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Winner from '@/models/Winner';
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

        const query: any = { memberId: memberPayload.memberId };
        if (groupId) query.groupId = groupId;

        const winners = await Winner.find(query)
            .populate('groupId', 'groupName contributionAmount totalUnits')
            .populate('groupMemberId', 'units')
            .sort({ createdAt: -1 });

        return withCors(NextResponse.json(winners), origin);
    } catch (error) {
        console.error('Member winners error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch winners' }, { status: 500 }), origin);
    }
}
