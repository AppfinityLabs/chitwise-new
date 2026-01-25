import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';
import Member from '@/models/Member'; // Ensure model is registered

export async function GET(request: Request) {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const memberId = searchParams.get('memberId');

    const query: any = {};
    if (groupId) query.groupId = groupId;
    if (memberId) query.memberId = memberId;

    try {
        const subscriptions = await GroupMember.find(query)
            .populate('memberId', 'name phone')
            .populate('groupId', 'groupName frequency contributionAmount currentPeriod');

        // Calculate dynamic overdue amount
        const subscriptionsWithDue = subscriptions.map(sub => {
            const group = sub.groupId;
            // Expected: Current Period * Contribution * Units
            // Note: If currentPeriod is 1, and we are in period 1, we expect 1 payment? Yes.
            const expectedAmount = group.currentPeriod * group.contributionAmount * sub.units;
            const overdueAmount = Math.max(0, expectedAmount - sub.totalCollected);

            return {
                ...sub.toObject(),
                overdueAmount
            };
        });

        return NextResponse.json(subscriptionsWithDue);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    await dbConnect();
    try {
        const body = await request.json();
        const { groupId, memberId, units, collectionPattern, joinDate } = body;

        // 1. Fetch Group Details
        const group = await ChitGroup.findById(groupId);
        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // 2. Calculate Total Due
        const totalDue = group.contributionAmount * group.totalPeriods * units;

        // 3. Determine Collection Factor
        let collectionFactor = 1;
        const baseFreq = group.frequency;
        const pattern = collectionPattern;

        if (baseFreq === 'MONTHLY') {
            if (pattern === 'DAILY') collectionFactor = 30;
            else if (pattern === 'WEEKLY') collectionFactor = 4;
            else collectionFactor = 1;
        } else if (baseFreq === 'WEEKLY') {
            if (pattern === 'DAILY') collectionFactor = 7;
            else collectionFactor = 1;
        } else if (baseFreq === 'DAILY') {
            collectionFactor = 1; // Can't go more granular than daily usually
        }

        // 4. Create Subscription
        const subscription = await GroupMember.create({
            groupId,
            memberId,
            units,
            collectionPattern,
            collectionFactor,
            joinDate: joinDate || new Date(),
            totalDue,
            totalCollected: 0,
            pendingAmount: totalDue,
            status: 'ACTIVE'
        });

        return NextResponse.json(subscription, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create subscription', details: error }, { status: 400 });
    }
}
