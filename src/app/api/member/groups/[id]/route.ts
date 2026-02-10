import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';
import Collection from '@/models/Collection';
import Winner from '@/models/Winner';
import Member from '@/models/Member';
import { verifyMemberAuth } from '@/lib/memberAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const memberPayload = await verifyMemberAuth(request);

    if (!memberPayload) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        const { id: groupId } = await params;

        // Verify member belongs to this group
        const subscription = await GroupMember.findOne({
            memberId: memberPayload.memberId,
            groupId,
        });

        if (!subscription) {
            return withCors(NextResponse.json({ error: 'You are not enrolled in this group' }, { status: 403 }), origin);
        }

        // Get group details
        const group = await ChitGroup.findById(groupId)
            .populate('organisationId', 'name code');

        if (!group) {
            return withCors(NextResponse.json({ error: 'Group not found' }, { status: 404 }), origin);
        }

        // Get payment history for this member in this group
        const payments = await Collection.find({
            memberId: memberPayload.memberId,
            groupId,
        })
            .sort({ collectedAt: -1 })
            .limit(50);

        // Get winners for this group
        const winners = await Winner.find({ groupId })
            .populate('memberId', 'name phone')
            .sort({ basePeriodNumber: -1 });

        // Calculate overdue (no overdue if group hasn't started yet)
        const now = new Date();
        const groupStarted = group.startDate ? new Date(group.startDate) <= now : true;
        const effectivePeriod = groupStarted ? group.currentPeriod : 0;
        const expectedAmount = effectivePeriod * group.contributionAmount * subscription.units;
        const overdueAmount = Math.max(0, expectedAmount - subscription.totalCollected);

        // Pot value
        const potValue = group.contributionAmount * group.totalUnits;

        return withCors(NextResponse.json({
            group: {
                _id: group._id,
                groupName: group.groupName,
                description: group.description,
                frequency: group.frequency,
                contributionAmount: group.contributionAmount,
                totalUnits: group.totalUnits,
                totalPeriods: group.totalPeriods,
                currentPeriod: group.currentPeriod,
                status: group.status,
                startDate: group.startDate,
                endDate: group.endDate,
                commissionValue: group.commissionValue,
                potValue,
                organisationName: (group.organisationId as any)?.name || '',
            },
            subscription: {
                _id: subscription._id,
                units: subscription.units,
                collectionPattern: subscription.collectionPattern,
                collectionFactor: subscription.collectionFactor,
                joinDate: subscription.joinDate,
                totalDue: subscription.totalDue,
                totalCollected: subscription.totalCollected,
                pendingAmount: subscription.pendingAmount,
                overdueAmount,
                status: subscription.status,
            },
            payments,
            winners,
        }), origin);
    } catch (error) {
        console.error('Member group detail error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch group details' }, { status: 500 }), origin);
    }
}
