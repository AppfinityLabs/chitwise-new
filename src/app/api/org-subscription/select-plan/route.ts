import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SubscriptionPlan from '@/models/SubscriptionPlan';
import OrgSubscription from '@/models/OrgSubscription';
import Organisation from '@/models/Organisation';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (!user.organisationId) {
        return withCors(NextResponse.json({ error: 'No organisation linked to user' }, { status: 400 }), origin);
    }

    await dbConnect();

    try {
        const { planId } = await request.json();

        if (!planId) {
            return withCors(NextResponse.json({ error: 'planId is required' }, { status: 400 }), origin);
        }

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan || plan.status !== 'ACTIVE') {
            return withCors(NextResponse.json({ error: 'Invalid or inactive plan' }, { status: 400 }), origin);
        }

        // Update or create subscription
        const subscription = await OrgSubscription.findOneAndUpdate(
            { organisationId: user.organisationId },
            {
                planId: plan._id,
                planName: plan.name,
                pricePerGroup: plan.pricePerGroup,
                maxGroups: plan.maxGroups,
                status: 'ACTIVE',
                startDate: new Date(),
            },
            { new: true, upsert: false }
        );

        if (!subscription) {
            return withCors(NextResponse.json({ error: 'No subscription record found. Contact support.' }, { status: 404 }), origin);
        }

        // Update denormalized fields on Organisation
        await Organisation.findByIdAndUpdate(user.organisationId, {
            subscriptionPlan: plan.name,
            subscriptionStatus: 'ACTIVE',
        });

        return withCors(NextResponse.json({
            message: 'Plan selected successfully',
            subscription,
        }), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to select plan' }, { status: 500 }), origin);
    }
}
