import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import GroupMember from '@/models/GroupMember';
import Collection from '@/models/Collection';
import Winner from '@/models/Winner';
import { verifyApiAuth } from '@/lib/apiAuth';
import mongoose from 'mongoose';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const { id } = await params;
        let group = await ChitGroup.findById(id);
        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
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
                // Adjust for day of month? keeping simple for now
                calculatedPeriod = diffMonths + 1;
            }
        }

        // Cap at totalPeriods
        if (calculatedPeriod > group.totalPeriods) {
            calculatedPeriod = group.totalPeriods; // Or marked as completed
        }

        // Update if significantly different (and strictly forward)
        // We only move forward automatically, manually reverting is possible via edit if needed (not impl yet)
        if (calculatedPeriod > group.currentPeriod) {
            group.currentPeriod = calculatedPeriod;
            await group.save();
        }

        return NextResponse.json(group);
    } catch (error) {
        console.error("Group Fetch Error:", error);
        return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
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

        return NextResponse.json({ 
            message: 'Group and all related data deleted successfully',
            deletedGroupId: id 
        });

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error("Group Delete Error:", error);
        return NextResponse.json({ 
            error: 'Failed to delete group', 
            details: error.message 
        }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        const { id } = await params;
        const body = await request.json();

        // Check if group exists
        const group = await ChitGroup.findById(id);
        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
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

        return NextResponse.json({
            message: 'Group updated successfully',
            group
        });

    } catch (error: any) {
        console.error("Group Update Error:", error);
        return NextResponse.json({ 
            error: 'Failed to update group', 
            details: error.message 
        }, { status: 500 });
    }
}
