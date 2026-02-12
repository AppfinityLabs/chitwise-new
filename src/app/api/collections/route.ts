import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Collection from '@/models/Collection';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { calculateCurrentPeriod } from '@/lib/utils';
import mongoose from 'mongoose';
import { notifyPaymentConfirmation } from '@/lib/eventNotifications';

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
    const groupMemberId = searchParams.get('groupMemberId');
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

    if (groupMemberId) query.groupMemberId = groupMemberId;
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
        const collections = await Collection.find(query)
            .sort({ collectedAt: -1 })
            .populate('memberId', 'name')
            .populate({
                path: 'groupId',
                select: 'groupName organisationId',
                populate: { path: 'organisationId', select: 'name code' }
            })
            .populate('groupMemberId');
        return withCors(NextResponse.json(collections), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 }), origin);
    }
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const body = await request.json();
        const { groupMemberId, basePeriodNumber, amountPaid, paymentMode, remarks, periodDate } = body;

        // 1. Fetch Subscription
        const subscription = await GroupMember.findById(groupMemberId).populate('groupId');
        if (!subscription) {
            throw new Error('Subscription not found');
        }

        const group = subscription.groupId;

        // Reject collection if group hasn't started yet
        // @ts-ignore
        if (group.startDate && new Date(group.startDate) > new Date()) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({
                error: 'Cannot collect payments before the group start date.'
            }, { status: 400 }), origin);
        }

        // Validate basePeriodNumber range
        // @ts-ignore
        if (!basePeriodNumber || basePeriodNumber < 1 || basePeriodNumber > group.totalPeriods) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({
                // @ts-ignore
                error: `Period number must be between 1 and ${group.totalPeriods}`
            }, { status: 400 }), origin);
        }

        // Prevent payment for future periods that haven't arrived yet
        // @ts-ignore
        const currentPeriod = calculateCurrentPeriod(group);
        if (basePeriodNumber > currentPeriod) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({
                error: `Cannot collect for period ${basePeriodNumber}. Current period is ${currentPeriod}.`
            }, { status: 400 }), origin);
        }

        // @ts-ignore
        const contributionPerPeriod = group.contributionAmount * subscription.units;
        const amountDuePerCollection = contributionPerPeriod / subscription.collectionFactor;

        // 2. Determine Sequence
        const existingCollectionsCount = await Collection.countDocuments({
            groupMemberId,
            basePeriodNumber
        });

        if (existingCollectionsCount >= subscription.collectionFactor) {
            throw new Error(`All ${subscription.collectionFactor} collections for period ${basePeriodNumber} are already recorded.`);
        }

        const collectionSequence = existingCollectionsCount + 1;

        // 3. Create Collection
        const newCollection = await Collection.create([{
            groupMemberId,
            groupId: subscription.groupId._id,
            memberId: subscription.memberId,
            basePeriodNumber,
            collectionSequence,
            periodDate: periodDate || new Date(),
            amountDue: amountDuePerCollection,
            amountPaid,
            paymentMode,
            collectedBy: user.userId, // Track who collected
            remarks,
            status: 'PAID'
        }], { session });

        // 4. Update Subscription Totals
        subscription.totalCollected += amountPaid;
        subscription.pendingAmount -= amountPaid;

        // Check if fully paid (optional logic here)
        if (subscription.pendingAmount <= 0) {
            subscription.status = 'CLOSED';
        }

        await subscription.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Fire-and-forget: notify member of payment confirmation
        const memberDoc = await (await import('@/models/Member')).default.findById(subscription.memberId).select('name').lean();
        if (memberDoc) {
            notifyPaymentConfirmation({
                memberId: subscription.memberId.toString(),
                memberName: (memberDoc as any).name,
                // @ts-ignore
                groupName: group.groupName,
                groupId: subscription.groupId._id.toString(),
                amountPaid,
                periodNumber: basePeriodNumber,
            }).catch(() => {}); // non-blocking
        }

        return withCors(NextResponse.json(newCollection[0], { status: 201 }), origin);

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        return withCors(NextResponse.json({ error: error.message || 'Failed to record collection' }, { status: 400 }), origin);
    }
}
