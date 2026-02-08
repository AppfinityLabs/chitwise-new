import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import GroupMember from '@/models/GroupMember';
import Collection from '@/models/Collection';
import Winner from '@/models/Winner';
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
        let group = await ChitGroup.findById(id);
        if (!group) {
            return withCors(NextResponse.json({ error: 'Group not found' }, { status: 404 }), origin);
        }

        // Auto-update currentPeriod based on dates
        const now = new Date();
        const start = new Date(group.startDate);
        let calculatedPeriod = 1;

        if (now >= start) {
            const diffTime = Math.abs(now.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (group.frequency === 'DAILY') {
                calculatedPeriod = diffDays + 1;
            } else if (group.frequency === 'WEEKLY') {
                calculatedPeriod = Math.floor(diffDays / 7) + 1;
            } else if (group.frequency === 'MONTHLY') {
                const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
                calculatedPeriod = diffMonths + 1;
            }
        }

        // Cap at totalPeriods
        if (calculatedPeriod > group.totalPeriods) {
            calculatedPeriod = group.totalPeriods;
        }

        // Update if significantly different (and strictly forward)
        if (calculatedPeriod > group.currentPeriod) {
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
