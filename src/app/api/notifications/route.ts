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

// Get all notifications
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    // Only SUPER_ADMIN can manage notifications
    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();

    try {
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email')
            .limit(100);

        return withCors(NextResponse.json(notifications), origin);
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
        const { title, body: notificationBody, url, targetType, targetId, sendNow } = body;

        if (!title || !notificationBody) {
            return withCors(
                NextResponse.json({ error: 'Title and body are required' }, { status: 400 }),
                origin
            );
        }

        // Create notification record
        const notification = await Notification.create({
            title,
            body: notificationBody,
            url: url || '/',
            targetType: targetType || 'ALL',
            targetId,
            status: sendNow ? 'SENT' : 'DRAFT',
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
async function sendNotificationToTargets(notification: any): Promise<{ sent: number; failed: number }> {
    let query: any = {};

    if (notification.targetType === 'ORGANISATION' && notification.targetId) {
        query.organisationId = notification.targetId;
    } else if (notification.targetType === 'USER' && notification.targetId) {
        query.userId = notification.targetId;
    }
    // For 'ALL', no filter needed

    const subscriptions = await PushSubscription.find(query);

    const payload: PushPayload = {
        title: notification.title,
        body: notification.body,
        url: notification.url || '/',
        tag: `notification-${notification._id}`
    };

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
        try {
            const success = await sendToSubscription(sub.subscription, payload);
            if (success) {
                sent++;
            } else {
                failed++;
            }
        } catch {
            failed++;
        }
    }

    return { sent, failed };
}
