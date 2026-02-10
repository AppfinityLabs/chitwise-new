import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';
import Collection from '@/models/Collection';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

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
        const subscription = await GroupMember.findById(id)
            .populate('memberId', 'name phone')
            .populate('groupId', 'groupName frequency contributionAmount currentPeriod totalPeriods startDate');

        if (!subscription) {
            return withCors(NextResponse.json({ error: 'Subscription not found' }, { status: 404 }), origin);
        }

        return withCors(NextResponse.json(subscription), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 }), origin);
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
    try {
        const { id } = await params;
        const body = await request.json();

        const subscription = await GroupMember.findById(id);
        if (!subscription) {
            return withCors(NextResponse.json({ error: 'Subscription not found' }, { status: 404 }), origin);
        }

        // Org scope check
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            const group = await ChitGroup.findById(subscription.groupId);
            if (!group || group.organisationId.toString() !== user.organisationId.toString()) {
                return withCors(NextResponse.json({ error: 'Access denied' }, { status: 403 }), origin);
            }
        }

        const group = await ChitGroup.findById(subscription.groupId);
        if (!group) {
            return withCors(NextResponse.json({ error: 'Group not found' }, { status: 404 }), origin);
        }

        // If units or collectionPattern change, recalculate derived values
        if (body.units !== undefined || body.collectionPattern !== undefined) {
            const newUnits = body.units !== undefined ? body.units : subscription.units;
            const newPattern = body.collectionPattern !== undefined ? body.collectionPattern : subscription.collectionPattern;

            // Recalculate collection factor
            let collectionFactor = 1;
            if (group.frequency === 'MONTHLY') {
                if (newPattern === 'DAILY') collectionFactor = 30;
                else if (newPattern === 'WEEKLY') collectionFactor = 4;
                else collectionFactor = 1;
            } else if (group.frequency === 'WEEKLY') {
                if (newPattern === 'DAILY') collectionFactor = 7;
                else collectionFactor = 1;
            }

            // Validate unit capacity if units changed
            if (body.units !== undefined && body.units !== subscription.units) {
                const existingSubscriptions = await GroupMember.find({
                    groupId: subscription.groupId,
                    status: 'ACTIVE',
                    _id: { $ne: id } // Exclude current subscription
                });
                const totalAllocatedUnits = existingSubscriptions.reduce((sum: number, sub: any) => sum + sub.units, 0);
                if (totalAllocatedUnits + newUnits > group.totalUnits) {
                    const availableUnits = group.totalUnits - totalAllocatedUnits;
                    return withCors(NextResponse.json({
                        error: `Cannot allocate ${newUnits} unit(s). Only ${availableUnits} unit(s) available.`
                    }, { status: 400 }), origin);
                }
            }

            // Recalculate totalDue and pendingAmount
            const newTotalDue = group.contributionAmount * group.totalPeriods * newUnits;
            const newPendingAmount = newTotalDue - subscription.totalCollected;

            subscription.units = newUnits;
            subscription.collectionPattern = newPattern;
            subscription.collectionFactor = collectionFactor;
            subscription.totalDue = newTotalDue;
            subscription.pendingAmount = Math.max(0, newPendingAmount);
        }

        // Update status if provided
        if (body.status !== undefined) {
            subscription.status = body.status;
        }

        await subscription.save();

        return withCors(NextResponse.json({
            message: 'Subscription updated successfully',
            subscription
        }), origin);
    } catch (error: any) {
        console.error('Subscription Update Error:', error);
        return withCors(NextResponse.json({
            error: 'Failed to update subscription',
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
    try {
        const { id } = await params;

        const subscription = await GroupMember.findById(id);
        if (!subscription) {
            return withCors(NextResponse.json({ error: 'Subscription not found' }, { status: 404 }), origin);
        }

        // Org scope check
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            const group = await ChitGroup.findById(subscription.groupId);
            if (!group || group.organisationId.toString() !== user.organisationId.toString()) {
                return withCors(NextResponse.json({ error: 'Access denied' }, { status: 403 }), origin);
            }
        }

        // Check for existing collections
        const existingCollections = await Collection.countDocuments({ groupMemberId: id });
        if (existingCollections > 0) {
            // Soft delete — set status to CLOSED
            subscription.status = 'CLOSED';
            await subscription.save();
            return withCors(NextResponse.json({
                message: 'Subscription has payment history. Status set to CLOSED (soft delete).',
                subscription,
                warning: `${existingCollections} collection(s) exist for this subscription.`
            }), origin);
        }

        // No collections — hard delete
        await GroupMember.findByIdAndDelete(id);

        return withCors(NextResponse.json({
            message: 'Subscription removed successfully',
            deletedSubscriptionId: id
        }), origin);
    } catch (error: any) {
        console.error('Subscription Delete Error:', error);
        return withCors(NextResponse.json({
            error: 'Failed to delete subscription',
            details: error.message
        }, { status: 500 }), origin);
    }
}
