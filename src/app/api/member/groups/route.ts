import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import Member from '@/models/Member';
import GroupMember from '@/models/GroupMember';
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
        const subscriptions = await GroupMember.find({ memberId: memberPayload.memberId })
            .populate('groupId', 'groupName frequency contributionAmount currentPeriod totalPeriods status startDate endDate totalUnits commissionValue')
            .sort({ createdAt: -1 });

        // Calculate dynamic overdue for each subscription
        const now = new Date();
        const subscriptionsWithDue = subscriptions.map(sub => {
            const group = sub.groupId as any;
            // If group hasn't started yet, no overdue
            const groupStarted = group?.startDate ? new Date(group.startDate) <= now : true;
            const effectivePeriod = groupStarted ? (group?.currentPeriod || 0) : 0;
            const expectedAmount = group ? effectivePeriod * group.contributionAmount * sub.units : 0;
            const overdueAmount = Math.max(0, expectedAmount - sub.totalCollected);

            return {
                ...sub.toObject(),
                overdueAmount,
            };
        });

        return withCors(NextResponse.json(subscriptionsWithDue), origin);
    } catch (error) {
        console.error('Member groups error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 }), origin);
    }
}
