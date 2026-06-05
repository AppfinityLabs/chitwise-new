import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgSubscription from '@/models/OrgSubscription';
import ChitGroup from '@/models/ChitGroup';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { getOrCreateCurrentInvoice } from '@/lib/subscriptionGate';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    // Allow SUPER_ADMIN to query any org's subscription
    const queryOrgId = request.nextUrl.searchParams.get('organisationId');
    const targetOrgId = (user.role === 'SUPER_ADMIN' && queryOrgId) ? queryOrgId : user.organisationId;

    if (!targetOrgId) {
        return withCors(NextResponse.json({ error: 'No organisation linked to user' }, { status: 400 }), origin);
    }

    await dbConnect();

    try {
        const subscription = await OrgSubscription.findOne({ organisationId: targetOrgId });

        if (!subscription) {
            return withCors(NextResponse.json({
                status: 'NONE',
                message: 'No subscription found',
                isCollectionAllowed: false,
                isTrialActive: false,
                trialDaysRemaining: 0,
            }), origin);
        }

        const now = new Date();
        const activeGroupCount = await ChitGroup.countDocuments({
            organisationId: targetOrgId,
            status: 'ACTIVE',
        });

        // Trial status
        if (subscription.status === 'TRIAL') {
            const trialEndsAt = new Date(subscription.trialEndDate);
            const daysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            const isTrialActive = now <= trialEndsAt;

            return withCors(NextResponse.json({
                status: 'TRIAL',
                isCollectionAllowed: isTrialActive,
                isTrialActive,
                trialDaysRemaining: daysRemaining,
                trialEndDate: trialEndsAt,
                trialEndsAt,
                daysRemaining,
                activeGroupCount,
                planName: subscription.planName,
                currentInvoice: null,
            }), origin);
        }

        // Active/Expired subscription — auto-generate invoice if needed
        const currentInvoice = await getOrCreateCurrentInvoice(targetOrgId);

        let isCollectionAllowed = true;
        if (currentInvoice && currentInvoice.status !== 'PAID' && currentInvoice.status !== 'WAIVED') {
            isCollectionAllowed = now <= new Date(currentInvoice.graceEndDate);
        }

        return withCors(NextResponse.json({
            status: subscription.status,
            isCollectionAllowed,
            isTrialActive: false,
            trialDaysRemaining: 0,
            planName: subscription.planName,
            pricePerGroup: subscription.pricePerGroup,
            maxGroups: subscription.maxGroups,
            activeGroupCount,
            currentInvoice: currentInvoice ? {
                id: currentInvoice._id,
                billingMonth: currentInvoice.billingMonth,
                activeGroupCount: currentInvoice.activeGroupCount,
                pricePerGroup: currentInvoice.pricePerGroup,
                totalAmount: currentInvoice.totalAmount,
                status: currentInvoice.status,
                dueDate: currentInvoice.dueDate,
                graceEndDate: currentInvoice.graceEndDate,
                paidAt: currentInvoice.paidAt,
            } : null,
        }), origin);
    } catch (error: any) {
        console.error('Subscription status error:', error?.message || error);
        return withCors(NextResponse.json({ error: 'Failed to fetch subscription status', details: error?.message }, { status: 500 }), origin);
    }
}
