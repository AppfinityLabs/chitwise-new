import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgSubscription from '@/models/OrgSubscription';
import OrgInvoice from '@/models/OrgInvoice';
import ChitGroup from '@/models/ChitGroup';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

function getCurrentBillingMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
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
        const subscription = await OrgSubscription.findOne({ organisationId: user.organisationId })
            .populate('planId');

        if (!subscription) {
            return withCors(NextResponse.json({
                status: 'NONE',
                message: 'No subscription found',
                isCollectionAllowed: false,
            }), origin);
        }

        const now = new Date();
        const activeGroupCount = await ChitGroup.countDocuments({
            organisationId: user.organisationId,
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
                trialEndsAt,
                daysRemaining,
                activeGroupCount,
                planName: null,
                currentInvoice: null,
            }), origin);
        }

        // Active subscription — check invoice
        const billingMonth = getCurrentBillingMonth();
        const currentInvoice = await OrgInvoice.findOne({
            organisationId: user.organisationId,
            billingMonth,
        });

        let isCollectionAllowed = true;
        if (currentInvoice && currentInvoice.status !== 'PAID' && currentInvoice.status !== 'WAIVED') {
            isCollectionAllowed = now <= new Date(currentInvoice.graceEndDate);
        }

        return withCors(NextResponse.json({
            status: subscription.status,
            isCollectionAllowed,
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
                paidAt: currentInvoice.paidAt,
            } : null,
        }), origin);
    } catch (error: any) {
        console.error('Subscription status error:', error?.message || error);
        return withCors(NextResponse.json({ error: 'Failed to fetch subscription status', details: error?.message }, { status: 500 }), origin);
    }
}
