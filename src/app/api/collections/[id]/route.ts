import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Collection from '@/models/Collection';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import mongoose from 'mongoose';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();
    try {
        const { id } = await params;
        const collection = await Collection.findById(id)
            .populate('memberId', 'name phone')
            .populate({
                path: 'groupId',
                select: 'groupName organisationId',
                populate: { path: 'organisationId', select: 'name code' }
            })
            .populate('groupMemberId')
            .populate('collectedBy', 'name email');

        if (!collection) {
            return withCors(NextResponse.json({ error: 'Collection not found' }, { status: 404 }), origin);
        }

        return withCors(NextResponse.json(collection), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 }), origin);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = await params;
        const body = await request.json();

        const collection = await Collection.findById(id).session(session);
        if (!collection) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({ error: 'Collection not found' }, { status: 404 }), origin);
        }

        // Org scope check
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            const group = await ChitGroup.findById(collection.groupId).session(session);
            if (!group || group.organisationId.toString() !== user.organisationId.toString()) {
                await session.abortTransaction();
                session.endSession();
                return withCors(NextResponse.json({ error: 'Access denied' }, { status: 403 }), origin);
            }
        }

        // Only allow editing collections within 7 days
        const daysSinceCreation = Math.ceil(
            (Date.now() - new Date(collection.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCreation > 7) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({
                error: 'Collections can only be edited within 7 days of creation'
            }, { status: 400 }), origin);
        }

        // Get the subscription to update totals
        const subscription = await GroupMember.findById(collection.groupMemberId).session(session);
        if (!subscription) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({ error: 'Subscription not found' }, { status: 404 }), origin);
        }

        // Reverse old amount from subscription
        const oldAmount = collection.amountPaid;
        subscription.totalCollected -= oldAmount;
        subscription.pendingAmount += oldAmount;

        // Apply new amount
        const newAmount = body.amountPaid !== undefined ? body.amountPaid : oldAmount;
        subscription.totalCollected += newAmount;
        subscription.pendingAmount -= newAmount;

        // Update subscription status
        if (subscription.pendingAmount <= 0) {
            subscription.status = 'CLOSED';
        } else if (subscription.status === 'CLOSED') {
            subscription.status = 'ACTIVE'; // Reopen if it was closed but now has pending
        }

        // Update collection fields
        if (body.amountPaid !== undefined) collection.amountPaid = body.amountPaid;
        if (body.paymentMode !== undefined) collection.paymentMode = body.paymentMode;
        if (body.remarks !== undefined) collection.remarks = body.remarks;
        if (body.status !== undefined) collection.status = body.status;

        await collection.save({ session });
        await subscription.save({ session });

        await session.commitTransaction();
        session.endSession();

        return withCors(NextResponse.json({
            message: 'Collection updated successfully',
            collection
        }), origin);
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error('Collection Update Error:', error);
        return withCors(NextResponse.json({
            error: 'Failed to update collection',
            details: error.message
        }, { status: 400 }), origin);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = await params;

        const collection = await Collection.findById(id).session(session);
        if (!collection) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({ error: 'Collection not found' }, { status: 404 }), origin);
        }

        // Org scope check
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            const group = await ChitGroup.findById(collection.groupId).session(session);
            if (!group || group.organisationId.toString() !== user.organisationId.toString()) {
                await session.abortTransaction();
                session.endSession();
                return withCors(NextResponse.json({ error: 'Access denied' }, { status: 403 }), origin);
            }
        }

        // Only allow voiding collections within 7 days
        const daysSinceCreation = Math.ceil(
            (Date.now() - new Date(collection.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCreation > 7) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({
                error: 'Collections can only be voided within 7 days of creation'
            }, { status: 400 }), origin);
        }

        // Reverse the amounts from the subscription
        const subscription = await GroupMember.findById(collection.groupMemberId).session(session);
        if (subscription) {
            subscription.totalCollected -= collection.amountPaid;
            subscription.pendingAmount += collection.amountPaid;

            // Reopen subscription if it was auto-closed
            if (subscription.status === 'CLOSED' && subscription.pendingAmount > 0) {
                subscription.status = 'ACTIVE';
            }

            await subscription.save({ session });
        }

        // Delete the collection
        await Collection.findByIdAndDelete(id, { session });

        await session.commitTransaction();
        session.endSession();

        return withCors(NextResponse.json({
            message: 'Collection voided and deleted successfully',
            deletedCollectionId: id
        }), origin);
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error('Collection Delete Error:', error);
        return withCors(NextResponse.json({
            error: 'Failed to void collection',
            details: error.message
        }, { status: 500 }), origin);
    }
}
