import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import PushSubscription from '@/models/PushSubscription';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { sendToSubscription, isPushConfigured, PushPayload } from '@/lib/pushService';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// Get all notifications (with pagination)
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
        const status = searchParams.get('status');
        const skip = (page - 1) * limit;

        const query: any = {};
        if (status) query.status = status;

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .populate('createdBy', 'name email')
                .skip(skip)
                .limit(limit),
            Notification.countDocuments(query)
        ]);

        return withCors(NextResponse.json({
            notifications,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        }), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 }), origin);
    }
}

// Create a new notification
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();

    try {
        const body = await request.json();
        const {
            title,
            body: notificationBody,
            url,
            image,
            priority,
            targetType,
            targetId,
            sendNow,
            scheduledAt,
            templateId,
        } = body;

        if (!title || !notificationBody) {
            return withCors(
                NextResponse.json({ error: 'Title and body are required' }, { status: 400 }),
                origin
            );
        }

        // Determine status
        let status: 'DRAFT' | 'SCHEDULED' | 'SENT' = 'DRAFT';
        if (sendNow) {
            status = 'SENT';
        } else if (scheduledAt) {
            const scheduledDate = new Date(scheduledAt);
            if (scheduledDate <= new Date()) {
                return withCors(
                    NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 }),
                    origin
                );
            }
            status = 'SCHEDULED';
        }

        // Create notification record
        const notification = await Notification.create({
            title,
            body: notificationBody,
            url: url || '/',
            image: image || undefined,
            priority: priority || 'normal',
            targetType: targetType || 'ALL',
            targetId,
            status,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            templateId: templateId || undefined,
            createdBy: user.userId
        });

        // If sendNow, send push notifications immediately
        if (sendNow && isPushConfigured()) {
            const result = await sendNotificationToTargets(notification);
            notification.successCount = result.sent;
            notification.failCount = result.failed;
            notification.sentAt = new Date();
            await notification.save();
        }

        return withCors(NextResponse.json(notification, { status: 201 }), origin);
    } catch (error: any) {
        console.error('Create notification error:', error);
        return withCors(
            NextResponse.json({ error: error.message || 'Failed to create notification' }, { status: 500 }),
            origin
        );
    }
}

// Helper function to send notifications to targets
export async function sendNotificationToTargets(notification: any): Promise<{ sent: number; failed: number }> {
    // For MEMBER and GROUP target types, use dedicated push service functions
    if (notification.targetType === 'MEMBER' && notification.targetId) {
        const { sendToMember } = await import('@/lib/pushService');
        const payload: PushPayload = {
            title: notification.title,
            body: notification.body,
            url: notification.url || '/',
            image: notification.image || undefined,
            priority: notification.priority || 'normal',
            tag: `notification-${notification._id}`
        };
        const result = await sendToMember(notification.targetId.toString(), payload);
        return result;
    }

    if (notification.targetType === 'GROUP' && notification.targetId) {
        const { sendToGroup } = await import('@/lib/pushService');
        const payload: PushPayload = {
            title: notification.title,
            body: notification.body,
            url: notification.url || '/',
            image: notification.image || undefined,
            priority: notification.priority || 'normal',
            tag: `notification-${notification._id}`
        };
        const result = await sendToGroup(notification.targetId.toString(), payload);
        return result;
    }

    let query: any = {};

    if (notification.targetType === 'ORGANISATION' && notification.targetId) {
        query.organisationId = notification.targetId;
    } else if (notification.targetType === 'USER' && notification.targetId) {
        query.userId = notification.targetId;
    }

    const subscriptions = await PushSubscription.find(query);

    const payload: PushPayload = {
        title: notification.title,
        body: notification.body,
        url: notification.url || '/',
        image: notification.image || undefined,
        priority: notification.priority || 'normal',
        tag: `notification-${notification._id}`
    };

    let sent = 0;
    let failed = 0;

    // Send in parallel batches of 10
    const batchSize = 10;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
        const batch = subscriptions.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map(sub => sendToSubscription(sub.subscription, payload))
        );
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                sent++;
            } else {
                failed++;
            }
        }
    }

    return { sent, failed };
}
