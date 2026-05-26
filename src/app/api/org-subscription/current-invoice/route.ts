import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { getOrCreateCurrentInvoice } from '@/lib/subscriptionGate';
import OrgSubscription from '@/models/OrgSubscription';

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
        const subscription = await OrgSubscription.findOne({ organisationId: user.organisationId });

        if (!subscription) {
            return withCors(NextResponse.json({ error: 'No subscription found' }, { status: 404 }), origin);
        }

        // If still in trial, no invoice needed
        if (subscription.status === 'TRIAL') {
            const now = new Date();
            const trialEndsAt = new Date(subscription.trialEndDate);
            if (now <= trialEndsAt) {
                return withCors(NextResponse.json({
                    status: 'TRIAL',
                    message: 'You are in your free trial period. No payment required yet.',
                    trialEndsAt,
                }), origin);
            }
            // Trial expired but no plan selected
            if (!subscription.planName) {
                return withCors(NextResponse.json({
                    status: 'PLAN_REQUIRED',
                    message: 'Your trial has ended. Please select a plan to continue.',
                }), origin);
            }
        }

        const invoice = await getOrCreateCurrentInvoice(user.organisationId);

        if (!invoice) {
            return withCors(NextResponse.json({
                status: 'NO_INVOICE',
                message: 'No active groups found. No invoice needed.',
            }), origin);
        }

        return withCors(NextResponse.json({
            invoice: {
                id: invoice._id,
                billingMonth: invoice.billingMonth,
                activeGroupCount: invoice.activeGroupCount,
                pricePerGroup: invoice.pricePerGroup,
                totalAmount: invoice.totalAmount,
                status: invoice.status,
                dueDate: invoice.dueDate,
                graceEndDate: invoice.graceEndDate,
                paidAt: invoice.paidAt,
            },
        }), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to get current invoice' }, { status: 500 }), origin);
    }
}
