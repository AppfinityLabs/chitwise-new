import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { verifyMemberAuth } from '@/lib/memberAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const memberPayload = await verifyMemberAuth(request);

    if (!memberPayload) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const skip = (page - 1) * limit;

        // Show SENT notifications targeted at ALL or member's organisation
        const query: any = {
            status: 'SENT',
            $or: [
                { targetType: 'ALL' },
            ],
        };

        // Also show notifications for the member's org
        if (memberPayload.organisationId) {
            query.$or.push({
                targetType: 'ORGANISATION',
                targetId: memberPayload.organisationId,
            });
        }

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ sentAt: -1 })
                .select('title body image url priority sentAt targetType')
                .skip(skip)
                .limit(limit),
            Notification.countDocuments(query),
        ]);

        return withCors(NextResponse.json({
            notifications,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        }), origin);
    } catch (error) {
        console.error('Member notifications error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 }), origin);
    }
}
