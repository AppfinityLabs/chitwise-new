import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Winner from '@/models/Winner';
import ChitGroup from '@/models/ChitGroup';
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
        const winner = await Winner.findById(id)
            .populate('memberId', 'name phone')
            .populate({
                path: 'groupId',
                select: 'groupName organisationId',
                populate: { path: 'organisationId', select: 'name code' }
            })
            .populate('groupMemberId');

        if (!winner) {
            return withCors(NextResponse.json({ error: 'Winner not found' }, { status: 404 }), origin);
        }

        // Org scope check
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            const group = await ChitGroup.findById(winner.groupId);
            if (!group || group.organisationId.toString() !== user.organisationId.toString()) {
                return withCors(NextResponse.json({ error: 'Access denied' }, { status: 403 }), origin);
            }
        }

        return withCors(NextResponse.json(winner), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch winner' }, { status: 500 }), origin);
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

        const winner = await Winner.findById(id);
        if (!winner) {
            return withCors(NextResponse.json({ error: 'Winner not found' }, { status: 404 }), origin);
        }

        // Org scope check
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            const group = await ChitGroup.findById(winner.groupId);
            if (!group || group.organisationId.toString() !== user.organisationId.toString()) {
                return withCors(NextResponse.json({ error: 'Access denied' }, { status: 403 }), origin);
            }
        }

        // Update allowed fields
        const allowedUpdates = ['status', 'payoutDate', 'remarks', 'prizeAmount'];
        allowedUpdates.forEach(field => {
            if (body[field] !== undefined) {
                (winner as any)[field] = body[field];
            }
        });

        await winner.save();

        return withCors(NextResponse.json({
            message: 'Winner updated successfully',
            winner
        }), origin);
    } catch (error: any) {
        console.error('Winner Update Error:', error);
        return withCors(NextResponse.json({
            error: 'Failed to update winner',
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

        const winner = await Winner.findById(id);
        if (!winner) {
            return withCors(NextResponse.json({ error: 'Winner not found' }, { status: 404 }), origin);
        }

        // Org scope check
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            const group = await ChitGroup.findById(winner.groupId);
            if (!group || group.organisationId.toString() !== user.organisationId.toString()) {
                return withCors(NextResponse.json({ error: 'Access denied' }, { status: 403 }), origin);
            }
        }

        // Only allow deleting PENDING winners
        if (winner.status === 'PAID') {
            return withCors(NextResponse.json({
                error: 'Cannot delete a winner that has already been paid out'
            }, { status: 400 }), origin);
        }

        await Winner.findByIdAndDelete(id);

        return withCors(NextResponse.json({
            message: 'Winner deleted successfully',
            deletedWinnerId: id
        }), origin);
    } catch (error: any) {
        console.error('Winner Delete Error:', error);
        return withCors(NextResponse.json({
            error: 'Failed to delete winner',
            details: error.message
        }, { status: 500 }), origin);
    }
}
