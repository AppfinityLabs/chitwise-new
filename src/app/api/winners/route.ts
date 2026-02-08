import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Winner from '@/models/Winner';
import ChitGroup from '@/models/ChitGroup';
import GroupMember from '@/models/GroupMember'; // To verify subscription
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
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
        return withCors(NextResponse.json(winners), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch winners' }, { status: 500 }), origin);
    }
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
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
            return withCors(NextResponse.json({ error: 'Missing required fields' }, { status: 400 }), origin);
        }

        // Validate Organisation Scope
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            const group = await ChitGroup.findById(groupId);
            if (!group || group.organisationId.toString() !== user.organisationId.toString()) {
                return withCors(NextResponse.json({ error: 'Group does not belong to your organisation' }, { status: 403 }), origin);
            }
        }

        // Verify that the GroupMember exists and belongs to the group
        const subscription = await GroupMember.findOne({ _id: groupMemberId, groupId, memberId });
        if (!subscription) {
            return withCors(NextResponse.json({ error: 'Invalid GroupMember subscription' }, { status: 400 }), origin);
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

        return withCors(NextResponse.json(newWinner, { status: 201 }), origin);

    } catch (error: any) {
        console.error('Error creating winner:', error);
        return withCors(NextResponse.json({ error: error.message || 'Failed to create winner' }, { status: 500 }), origin);
    }
}
