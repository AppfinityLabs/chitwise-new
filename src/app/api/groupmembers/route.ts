import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';
import Member from '@/models/Member'; // Ensure model is registered
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
        // If specific groupId requested, ensure it belongs to the org
        if (query.groupId) {
            query.groupId = { $in: query.groupId['$in'].filter((id: any) => id.toString() === groupId) };
        } else {
            query.groupId = groupId;
        }
    }
    if (memberId) query.memberId = memberId;

    try {
        const subscriptions = await GroupMember.find(query)
            .populate('memberId', 'name phone')
            .populate('groupId', 'groupName frequency contributionAmount currentPeriod');

        // Calculate dynamic overdue amount
        const subscriptionsWithDue = subscriptions.map(sub => {
            const group = sub.groupId;
            // Expected: Current Period * Contribution * Units
            const expectedAmount = group.currentPeriod * group.contributionAmount * sub.units;
            const overdueAmount = Math.max(0, expectedAmount - sub.totalCollected);

            return {
                ...sub.toObject(),
                overdueAmount
            };
        });

        return withCors(NextResponse.json(subscriptionsWithDue), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 }), origin);
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
        const { groupId, memberId, units, collectionPattern, joinDate } = body;

        // 1. Fetch Group Details
        const group = await ChitGroup.findById(groupId);
        if (!group) {
            return withCors(NextResponse.json({ error: 'Group not found' }, { status: 404 }), origin);
        }

        // 2. Validate unit allocation - check total enrolled units won't exceed group capacity
        const existingSubscriptions = await GroupMember.find({ groupId, status: 'ACTIVE' });
        const totalAllocatedUnits = existingSubscriptions.reduce((sum: number, sub: any) => sum + sub.units, 0);
        if (totalAllocatedUnits + units > group.totalUnits) {
            const availableUnits = group.totalUnits - totalAllocatedUnits;
            return withCors(NextResponse.json({
                error: `Cannot allocate ${units} unit(s). Only ${availableUnits} unit(s) available out of ${group.totalUnits} total.`
            }, { status: 400 }), origin);
        }

        // 3. Calculate Total Due
        const totalDue = group.contributionAmount * group.totalPeriods * units;

        // 4. Determine Collection Factor
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

        // 5. Create Subscription
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

        return withCors(NextResponse.json(subscription, { status: 201 }), origin);

    } catch (error) {
        console.error(error);
        return withCors(NextResponse.json({ error: 'Failed to create subscription', details: error }, { status: 400 }), origin);
    }
}
