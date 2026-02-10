import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import GroupMember from '@/models/GroupMember';
import Collection from '@/models/Collection';
import Winner from '@/models/Winner';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { calculateCurrentPeriod } from '@/lib/utils';
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
        let group = await ChitGroup.findById(id);
        if (!group) {
            return withCors(NextResponse.json({ error: 'Group not found' }, { status: 404 }), origin);
        }

        // Auto-update currentPeriod using shared utility
        const calculatedPeriod = calculateCurrentPeriod(group);

        // Update if changed (allow correction in both directions)
        if (calculatedPeriod !== group.currentPeriod) {
            group.currentPeriod = calculatedPeriod;
            await group.save();
        }

        return withCors(NextResponse.json(group), origin);
    } catch (error) {
        console.error("Group Fetch Error:", error);
        return withCors(NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 }), origin);
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

        // Check if group exists
        const group = await ChitGroup.findById(id).session(session);
        if (!group) {
            await session.abortTransaction();
            session.endSession();
            return withCors(NextResponse.json({ error: 'Group not found' }, { status: 404 }), origin);
        }

        // Org scope check: ORG_ADMIN can only delete their own org's groups
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            if (group.organisationId.toString() !== user.organisationId.toString()) {
                await session.abortTransaction();
                session.endSession();
                return withCors(NextResponse.json({ error: 'Access denied: Group does not belong to your organisation' }, { status: 403 }), origin);
            }
        }

        // Delete all collections related to this group
        await Collection.deleteMany({ groupId: id }, { session });

        // Delete all winners related to this group
        await Winner.deleteMany({ groupId: id }, { session });

        // Delete all group members (subscriptions) related to this group
        await GroupMember.deleteMany({ groupId: id }, { session });

        // Finally, delete the group itself
        await ChitGroup.findByIdAndDelete(id, { session });

        await session.commitTransaction();
        session.endSession();

        return withCors(NextResponse.json({
            message: 'Group and all related data deleted successfully',
            deletedGroupId: id
        }), origin);

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error("Group Delete Error:", error);
        return withCors(NextResponse.json({
            error: 'Failed to delete group',
            details: error.message
        }, { status: 500 }), origin);
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

        // Check if group exists
        const group = await ChitGroup.findById(id);
        if (!group) {
            return withCors(NextResponse.json({ error: 'Group not found' }, { status: 404 }), origin);
        }

        // Org scope check: ORG_ADMIN can only update their own org's groups
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            if (group.organisationId.toString() !== user.organisationId.toString()) {
                return withCors(NextResponse.json({ error: 'Access denied: Group does not belong to your organisation' }, { status: 403 }), origin);
            }
        }

        // Update allowed fields
        const allowedUpdates = [
            'groupName',
            'description',
            'frequency',
            'contributionAmount',
            'totalUnits',
            'totalPeriods',
            'commissionValue',
            'allowCustomCollectionPattern',
            'subscriptionAmount',
            'subscriptionFrequency',
            'startDate',
            'status'
        ];

        allowedUpdates.forEach(field => {
            if (body[field] !== undefined) {
                group[field] = body[field];
            }
        });

        await group.save();

        return withCors(NextResponse.json({
            message: 'Group updated successfully',
            group
        }), origin);

    } catch (error: any) {
        console.error("Group Update Error:", error);
        return withCors(NextResponse.json({
            error: 'Failed to update group',
            details: error.message
        }, { status: 500 }), origin);
    }
}
