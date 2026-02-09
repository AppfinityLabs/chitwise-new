import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { isPushConfigured } from '@/lib/pushService';
import { sendNotificationToTargets } from '../../notifications/route';

// Cron endpoint to send scheduled notifications
// Secured by CRON_SECRET in Authorization header
// Call via: GET /api/cron/notifications (with Bearer token)
// Set up as Vercel Cron or external cron hitting this endpoint every minute

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isInternal = request.headers.get('x-internal-cron') === 'true';

    // Allow internal calls (from admin page polling) or with correct CRON_SECRET
    if (!isInternal) {
        if (!cronSecret) {
            return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
        }
        const token = authHeader?.replace('Bearer ', '');
        if (token !== cronSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    if (!isPushConfigured()) {
        return NextResponse.json({ error: 'Push not configured' }, { status: 500 });
    }

    await dbConnect();

    try {
        // Find all scheduled notifications whose time has come
        const now = new Date();
        const dueNotifications = await Notification.find({
            status: 'SCHEDULED',
            scheduledAt: { $lte: now },
        });

        if (dueNotifications.length === 0) {
            return NextResponse.json({ message: 'No scheduled notifications due', processed: 0 });
        }

        let processed = 0;
        let totalSent = 0;
        let totalFailed = 0;

        for (const notification of dueNotifications) {
            try {
                const result = await sendNotificationToTargets(notification);
                notification.status = 'SENT';
                notification.successCount = result.sent;
                notification.failCount = result.failed;
                notification.sentAt = new Date();
                await notification.save();

                processed++;
                totalSent += result.sent;
                totalFailed += result.failed;

                console.log(`📤 Scheduled notification sent: "${notification.title}" (${result.sent} delivered, ${result.failed} failed)`);
            } catch (error) {
                console.error(`Failed to send scheduled notification ${notification._id}:`, error);
                notification.status = 'FAILED';
                await notification.save();
            }
        }

        return NextResponse.json({
            message: `Processed ${processed} scheduled notifications`,
            processed,
            totalSent,
            totalFailed,
        });
    } catch (error: any) {
        console.error('Cron notification error:', error);
        return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
    }
}
