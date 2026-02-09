import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// Get notification history for org users (PWA inbox)
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const skip = (page - 1) * limit;

        // Build query: show SENT notifications targeted at ALL or user's organisation
        const query: any = {
            status: 'SENT',
            $or: [
                { targetType: 'ALL' },
            ]
        };

        // If user has an organisationId, also show notifications for their org
        if (user.organisationId) {
            query.$or.push({
                targetType: 'ORGANISATION',
                targetId: user.organisationId,
            });
        }

        // Also show notifications targeted directly at the user
        query.$or.push({
            targetType: 'USER',
            targetId: user.userId,
        });

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ sentAt: -1 })
                .select('title body image url priority sentAt targetType')
                .skip(skip)
                .limit(limit),
            Notification.countDocuments(query)
        ]);

        return withCors(NextResponse.json({
            notifications,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        }), origin);
    } catch (error) {
        console.error('Notification history error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 }), origin);
    }
}
