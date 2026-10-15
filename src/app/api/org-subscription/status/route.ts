import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgSubscription from '@/models/OrgSubscription';
import ChitGroup from '@/models/ChitGroup';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { getOrCreateCurrentInvoicesForOrg } from '@/lib/subscriptionGate';

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

        // Free access granted by Super Admin: nothing to pay, collections always allowed
        if (subscription.isFree) {
            return withCors(NextResponse.json({
                status: 'ACTIVE',
                isFree: true,
                isCollectionAllowed: true,
                isTrialActive: false,
                trialDaysRemaining: 0,
                planName: null,
                pricePerGroup: 0,
                maxGroups: null,
                activeGroupCount,
                groupInvoices: [],
                totalDue: 0,
                unpaidGroupCount: 0,
            }), origin);
        }

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
                groupInvoices: [],
                totalDue: 0,
                unpaidGroupCount: 0,
            }), origin);
        }

        // Active/Expired subscription — auto-generate this month's per-group invoices
        const invoices = await getOrCreateCurrentInvoicesForOrg(targetOrgId);

        const groupInvoices = invoices.map((invoice) => {
            const isSettled = invoice.status === 'PAID' || invoice.status === 'WAIVED';
            return {
                id: invoice._id,
                groupId: invoice.groupId,
                groupName: invoice.groupName,
                billingMonth: invoice.billingMonth,
                pricePerGroup: invoice.pricePerGroup,
                totalAmount: invoice.totalAmount,
                status: invoice.status,
                dueDate: invoice.dueDate,
                graceEndDate: invoice.graceEndDate,
                paidAt: invoice.paidAt,
                // Collections for a group are allowed while its own invoice is settled
                // or still inside the grace period.
                isCollectionAllowed: isSettled || now <= new Date(invoice.graceEndDate),
            };
        });

        const unpaid = groupInvoices.filter((i) => i.status !== 'PAID' && i.status !== 'WAIVED');

        return withCors(NextResponse.json({
            status: subscription.status,
            // Org-level flag kept for back-compat: true when at least one group can collect.
            isCollectionAllowed: groupInvoices.length === 0 || groupInvoices.some((i) => i.isCollectionAllowed),
            isTrialActive: false,
            trialDaysRemaining: 0,
            planName: subscription.planName,
            pricePerGroup: subscription.pricePerGroup,
            maxGroups: subscription.maxGroups,
            activeGroupCount,
            groupInvoices,
            totalDue: unpaid.reduce((sum, i) => sum + i.totalAmount, 0),
            unpaidGroupCount: unpaid.length,
        }), origin);
    } catch (error: any) {
        console.error('Subscription status error:', error?.message || error);
        return withCors(NextResponse.json({ error: 'Failed to fetch subscription status', details: error?.message }, { status: 500 }), origin);
    }
}
