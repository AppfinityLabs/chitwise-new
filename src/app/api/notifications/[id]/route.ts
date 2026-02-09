import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { isPushConfigured } from '@/lib/pushService';
import { sendNotificationToTargets } from '../route';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// Get single notification
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    const { id } = await params;
    await dbConnect();

    try {
        const notification = await Notification.findById(id).populate('createdBy', 'name email');
        if (!notification) {
            return withCors(NextResponse.json({ error: 'Notification not found' }, { status: 404 }), origin);
        }
        return withCors(NextResponse.json(notification), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 }), origin);
    }
}

// Update a DRAFT or SCHEDULED notification
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    const { id } = await params;
    await dbConnect();

    try {
        const notification = await Notification.findById(id);
        if (!notification) {
            return withCors(NextResponse.json({ error: 'Notification not found' }, { status: 404 }), origin);
        }

        if (!['DRAFT', 'SCHEDULED'].includes(notification.status)) {
            return withCors(
                NextResponse.json({ error: 'Only DRAFT or SCHEDULED notifications can be edited' }, { status: 400 }),
                origin
            );
        }

        const body = await request.json();
        const allowedFields = ['title', 'body', 'url', 'image', 'priority', 'targetType', 'targetId', 'scheduledAt'];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                if (field === 'scheduledAt') {
                    notification.scheduledAt = body[field] ? new Date(body[field]) : undefined;
                    notification.status = body[field] ? 'SCHEDULED' : 'DRAFT';
                } else {
                    (notification as any)[field] = body[field];
                }
            }
        }

        await notification.save();
        return withCors(NextResponse.json(notification), origin);
    } catch (error: any) {
        return withCors(
            NextResponse.json({ error: error.message || 'Failed to update notification' }, { status: 500 }),
            origin
        );
    }
}

// Delete a notification
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    const { id } = await params;
    await dbConnect();

    try {
        const notification = await Notification.findByIdAndDelete(id);
        if (!notification) {
            return withCors(NextResponse.json({ error: 'Notification not found' }, { status: 404 }), origin);
        }
        return withCors(NextResponse.json({ success: true, message: 'Notification deleted' }), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 }), origin);
    }
}

// POST with action=resend — clone and resend
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    const { id } = await params;
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action !== 'resend') {
            return withCors(
                NextResponse.json({ error: 'Invalid action. Use ?action=resend' }, { status: 400 }),
                origin
            );
        }

        const original = await Notification.findById(id);
        if (!original) {
            return withCors(NextResponse.json({ error: 'Notification not found' }, { status: 404 }), origin);
        }

        // Clone the notification
        const cloned = await Notification.create({
            title: original.title,
            body: original.body,
            url: original.url,
            image: original.image,
            priority: original.priority,
            targetType: original.targetType,
            targetId: original.targetId,
            status: 'SENT',
            createdBy: user.userId,
        });

        // Send immediately
        if (isPushConfigured()) {
            const result = await sendNotificationToTargets(cloned);
            cloned.successCount = result.sent;
            cloned.failCount = result.failed;
            cloned.sentAt = new Date();
            await cloned.save();
        }

        return withCors(NextResponse.json(cloned, { status: 201 }), origin);
    } catch (error: any) {
        console.error('Resend error:', error);
        return withCors(
            NextResponse.json({ error: error.message || 'Failed to resend' }, { status: 500 }),
            origin
        );
    }
}
