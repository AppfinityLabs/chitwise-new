import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import GroupMember from '@/models/GroupMember';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { hashPassword } from '@/lib/auth';

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
        const member = await Member.findById(id);
        if (!member) {
            return withCors(NextResponse.json({ error: 'Member not found' }, { status: 404 }), origin);
        }

        // Org scope check: ORG_ADMIN can only view their own org's members
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            if (member.organisationId.toString() !== user.organisationId.toString()) {
                return withCors(NextResponse.json({ error: 'Access denied: Member does not belong to your organisation' }, { status: 403 }), origin);
            }
        }

        return withCors(NextResponse.json(member), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 }), origin);
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

        const member = await Member.findById(id);
        if (!member) {
            return withCors(NextResponse.json({ error: 'Member not found' }, { status: 404 }), origin);
        }

        // Org scope check
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            if (member.organisationId.toString() !== user.organisationId.toString()) {
                return withCors(NextResponse.json({ error: 'Access denied: Member does not belong to your organisation' }, { status: 403 }), origin);
            }
        }

        // Update allowed fields
        const allowedUpdates = ['name', 'phone', 'email', 'address', 'status', 'kycVerified'];
        allowedUpdates.forEach(field => {
            if (body[field] !== undefined) {
                (member as any)[field] = body[field];
            }
        });

        // Hash PIN if provided
        if (body.pin) {
            if (body.pin.length !== 4 || !/^\d{4}$/.test(body.pin)) {
                return withCors(NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 }), origin);
            }
            member.pin = await hashPassword(body.pin);
        }

        await member.save();

        return withCors(NextResponse.json({
            message: 'Member updated successfully',
            member
        }), origin);
    } catch (error: any) {
        console.error('Member Update Error:', error);
        return withCors(NextResponse.json({
            error: 'Failed to update member',
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

        const member = await Member.findById(id);
        if (!member) {
            return withCors(NextResponse.json({ error: 'Member not found' }, { status: 404 }), origin);
        }

        // Org scope check
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            if (member.organisationId.toString() !== user.organisationId.toString()) {
                return withCors(NextResponse.json({ error: 'Access denied: Member does not belong to your organisation' }, { status: 403 }), origin);
            }
        }

        // Check for active subscriptions
        const activeSubscriptions = await GroupMember.countDocuments({ memberId: id, status: 'ACTIVE' });
        if (activeSubscriptions > 0) {
            // Soft delete — set to INACTIVE
            member.status = 'INACTIVE';
            await member.save();
            return withCors(NextResponse.json({
                message: 'Member has active group subscriptions. Status set to INACTIVE (soft delete).',
                member,
                warning: `${activeSubscriptions} active subscription(s) exist.`
            }), origin);
        }

        // No active subscriptions — soft delete
        member.status = 'INACTIVE';
        await member.save();

        return withCors(NextResponse.json({
            message: 'Member deactivated successfully',
            member
        }), origin);
    } catch (error: any) {
        console.error('Member Delete Error:', error);
        return withCors(NextResponse.json({
            error: 'Failed to delete member',
            details: error.message
        }, { status: 500 }), origin);
    }
}
