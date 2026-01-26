import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Winner from '@/models/Winner';
import ChitGroup from '@/models/ChitGroup';
import GroupMember from '@/models/GroupMember'; // To verify subscription
import { verifyApiAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const groupMemberId = searchParams.get('groupMemberId');
    const memberId = searchParams.get('memberId');

    const query: any = {};

    // Filter by Organisation
    if (user.role === 'ORG_ADMIN' && user.organisationId) {
        // Find all groups for this organisation
        const orgGroups = await ChitGroup.find({ organisationId: user.organisationId }).select('_id');
        const orgGroupIds = orgGroups.map(g => g._id);
        query.groupId = { $in: orgGroupIds };
    }

    if (groupId) {
        if (query.groupId) {
            query.groupId = { $in: query.groupId['$in'].filter((id: any) => id.toString() === groupId) };
        } else {
            query.groupId = groupId;
        }
    }
    if (groupMemberId) query.groupMemberId = groupMemberId;
    if (memberId) query.memberId = memberId;

    try {
        const winners = await Winner.find(query)
            .populate('memberId', 'name')
            .populate({
                path: 'groupId',
                select: 'groupName',
                populate: { path: 'organisationId', select: 'name code' }
            })
            .sort({ createdAt: -1 });
        return NextResponse.json(winners);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch winners' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        const body = await request.json();
        const {
            groupId,
            groupMemberId,
            memberId,
            basePeriodNumber,
            winningUnits,
            prizeAmount,
            commissionEarned,
            selectionMethod,
            status,
            payoutDate,
            remarks
        } = body;

        // Basic validations
        if (!groupId || !groupMemberId || !memberId || !basePeriodNumber || !winningUnits || !prizeAmount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate Organisation Scope
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            const group = await ChitGroup.findById(groupId);
            if (!group || group.organisationId.toString() !== user.organisationId.toString()) {
                return NextResponse.json({ error: 'Group does not belong to your organisation' }, { status: 403 });
            }
        }

        // Verify that the GroupMember exists and belongs to the group
        const subscription = await GroupMember.findOne({ _id: groupMemberId, groupId, memberId });
        if (!subscription) {
            return NextResponse.json({ error: 'Invalid GroupMember subscription' }, { status: 400 });
        }

        // Create Winner
        const newWinner = await Winner.create({
            groupId,
            groupMemberId,
            memberId,
            basePeriodNumber,
            winningUnits,
            prizeAmount,
            commissionEarned: commissionEarned || 0,
            selectionMethod: selectionMethod || 'LOTTERY',
            status: status || 'PENDING',
            payoutDate: payoutDate || undefined,
            remarks
        });

        return NextResponse.json(newWinner, { status: 201 });

    } catch (error: any) {
        console.error('Error creating winner:', error);
        return NextResponse.json({ error: error.message || 'Failed to create winner' }, { status: 500 });
    }
}
