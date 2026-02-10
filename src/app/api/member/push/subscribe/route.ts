import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import PushSubscription from '@/models/PushSubscription';
import Member from '@/models/Member';
import { verifyMemberAuth } from '@/lib/memberAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// Subscribe a member device to push notifications
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const auth = await verifyMemberAuth(request);
    if (!auth) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    try {
        await dbConnect();
        const body = await request.json();
        const { subscription, userAgent } = body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return withCors(NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 }), origin);
        }

        const member = await Member.findById(auth.memberId);
        if (!member) {
            return withCors(NextResponse.json({ error: 'Member not found' }, { status: 404 }), origin);
        }

        // Upsert: update if endpoint exists, create if not
        const result = await PushSubscription.findOneAndUpdate(
            { 'subscription.endpoint': subscription.endpoint },
            {
                memberId: auth.memberId,
                organisationId: member.organisationId,
                subscription: {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: subscription.keys.p256dh,
                        auth: subscription.keys.auth,
                    },
                },
                userAgent,
                lastUsed: new Date(),
            },
            { upsert: true, new: true }
        );

        return withCors(NextResponse.json({ success: true, message: 'Subscription saved', id: result._id }), origin);
    } catch (error: any) {
        console.error('Member push subscribe error:', error);
        return withCors(NextResponse.json({ error: error.message || 'Failed to save subscription' }, { status: 500 }), origin);
    }
}

// Unsubscribe a member device
export async function DELETE(request: NextRequest) {
    const origin = request.headers.get('origin');
    const auth = await verifyMemberAuth(request);
    if (!auth) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    try {
        await dbConnect();
        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return withCors(NextResponse.json({ error: 'Endpoint required' }, { status: 400 }), origin);
        }

        await PushSubscription.deleteOne({
            memberId: auth.memberId,
            'subscription.endpoint': endpoint,
        });

        return withCors(NextResponse.json({ success: true, message: 'Unsubscribed successfully' }), origin);
    } catch (error: any) {
        console.error('Member push unsubscribe error:', error);
        return withCors(NextResponse.json({ error: error.message || 'Failed to unsubscribe' }, { status: 500 }), origin);
    }
}
