import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Collection from '@/models/Collection';
import GroupMember from '@/models/GroupMember';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { calculateCurrentPeriod } from '@/lib/utils';
import mongoose from 'mongoose';
import { notifyPaymentConfirmation } from '@/lib/eventNotifications';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

/**
 * POST /api/collections/bulk
 *
 * Settle multiple overdue installments in a single transaction.
 *
 * Request body:
 * {
 *   groupMemberId: string,
 *   paymentMode: 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER',
 *   remarks?: string,
 *   installments: Array<{ basePeriodNumber: number }>
 * }
 *
 * Each installment creates a separate Collection doc with:
 *   amountPaid = (contributionAmount × units) / collectionFactor
 *   collectionSequence = auto-incremented per basePeriodNumber
 */
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
        const { groupMemberId, paymentMode, remarks, installments } = body;

        // Validate input
        if (!groupMemberId || !Array.isArray(installments) || installments.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({
                error: 'groupMemberId and a non-empty installments array are required'
            }, { status: 400 }), origin);
        }

        if (!paymentMode) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({
                error: 'paymentMode is required'
            }, { status: 400 }), origin);
        }

        // 1. Fetch Subscription
        const subscription = await GroupMember.findById(groupMemberId).populate('groupId').session(session);
        if (!subscription) {
            throw new Error('Subscription not found');
        }

        const group = subscription.groupId as any;

        // Reject if group hasn't started
        if (group.startDate && new Date(group.startDate) > new Date()) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({
                error: 'Cannot collect payments before the group start date.'
            }, { status: 400 }), origin);
        }

        const currentPeriod = calculateCurrentPeriod(group);
        const contributionPerPeriod = group.contributionAmount * subscription.units;
        const amountPerInstallment = contributionPerPeriod / subscription.collectionFactor;

        // Sort installments by basePeriodNumber for consistent ordering
        const sortedInstallments = [...installments].sort(
            (a, b) => a.basePeriodNumber - b.basePeriodNumber
        );

        const createdCollections: any[] = [];
        let totalSettled = 0;

        // 2. Process each installment
        for (const inst of sortedInstallments) {
            const { basePeriodNumber } = inst;

            // Validate period range
            if (!basePeriodNumber || basePeriodNumber < 1 || basePeriodNumber > group.totalPeriods) {
                throw new Error(`Period number ${basePeriodNumber} must be between 1 and ${group.totalPeriods}`);
            }

            // Prevent future periods
            if (basePeriodNumber > currentPeriod) {
                throw new Error(`Cannot collect for period ${basePeriodNumber}. Current period is ${currentPeriod}.`);
            }

            // Check existing collections for this period
            const existingCount = await Collection.countDocuments({
                groupMemberId,
                basePeriodNumber
            }).session(session);

            if (existingCount >= subscription.collectionFactor) {
                throw new Error(`All ${subscription.collectionFactor} collections for period ${basePeriodNumber} are already recorded.`);
            }

            const collectionSequence = existingCount + 1;
            const amountPaid = Math.round(amountPerInstallment * 100) / 100;

            // Create Collection doc
            const [newCollection] = await Collection.create([{
                groupMemberId,
                groupId: group._id,
                memberId: subscription.memberId,
                basePeriodNumber,
                collectionSequence,
                periodDate: new Date(),
                amountDue: amountPerInstallment,
                amountPaid,
                paymentMode,
                collectedBy: user.userId,
                remarks: remarks || `Bulk settle — installment ${basePeriodNumber}.${collectionSequence}`,
                status: 'PAID'
            }], { session });

            createdCollections.push(newCollection);
            totalSettled += amountPaid;
        }

        // 3. Update Subscription Totals (once, not per iteration)
        subscription.totalCollected += totalSettled;
        subscription.pendingAmount -= totalSettled;

        if (subscription.pendingAmount <= 0) {
            subscription.status = 'CLOSED';
        }

        await subscription.save({ session });

        await session.commitTransaction();
        session.endSession();

        // 4. Fire-and-forget: send a single summary notification
        const memberDoc = await (await import('@/models/Member')).default
            .findById(subscription.memberId).select('name').lean();
        if (memberDoc) {
            notifyPaymentConfirmation({
                memberId: subscription.memberId.toString(),
                memberName: (memberDoc as any).name,
                groupName: group.groupName,
                groupId: group._id.toString(),
                amountPaid: totalSettled,
                periodNumber: sortedInstallments[0].basePeriodNumber,
            }).catch(() => {}); // non-blocking
        }

        return withCors(NextResponse.json({
            collections: createdCollections,
            totalSettled,
            count: createdCollections.length,
        }, { status: 201 }), origin);

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        return withCors(NextResponse.json({
            error: error.message || 'Failed to settle overdue collections'
        }, { status: 400 }), origin);
    }
}
