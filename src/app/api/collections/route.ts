import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Collection from '@/models/Collection';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const groupMemberId = searchParams.get('groupMemberId');
    const groupId = searchParams.get('groupId');
    const memberId = searchParams.get('memberId');

    const query: any = {};
    if (groupMemberId) query.groupMemberId = groupMemberId;
    if (groupId) query.groupId = groupId;
    if (memberId) query.memberId = memberId;

    try {
        const collections = await Collection.find(query)
            .sort({ collectedAt: -1 })
            .populate('memberId', 'name')
            .populate('groupId', 'groupName')
            .populate('groupMemberId');
        return NextResponse.json(collections);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
    }
}

import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            amountPaid, // Assuming exact match or capturing partial as paid
            paymentMode,
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

        return NextResponse.json(newCollection[0], { status: 201 });

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({ error: error.message || 'Failed to record collection' }, { status: 400 });
    }
}
