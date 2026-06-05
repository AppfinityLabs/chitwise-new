import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgSubscription from '@/models/OrgSubscription';
import SubscriptionPlan from '@/models/SubscriptionPlan';
import Organisation from '@/models/Organisation';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import Razorpay from 'razorpay';

function getRazorpay() {
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
}

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

/**
 * POST /api/org-subscription/payment-link
 * 
 * Super Admin creates a Razorpay Payment Link for a specific org + plan.
 * Client pays via the link → webhook auto-activates the plan.
 * 
 * Body:
 * - organisationId (required)
 * - planName: 'BASIC' | 'PREMIUM' (required)
 * - description: string (optional)
 */
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Only Super Admin can create payment links' }, { status: 403 }), origin);
    }

    await dbConnect();

    try {
        const { organisationId, planName, description } = await request.json();

        if (!organisationId) {
            return withCors(NextResponse.json({ error: 'organisationId is required' }, { status: 400 }), origin);
        }

        if (!planName || !['BASIC', 'PREMIUM'].includes(planName)) {
            return withCors(NextResponse.json({ error: 'planName must be BASIC or PREMIUM' }, { status: 400 }), origin);
        }

        // Get the plan details
        const plan = await SubscriptionPlan.findOne({ name: planName, status: 'ACTIVE' });
        if (!plan) {
            return withCors(NextResponse.json({ error: `Plan ${planName} not found or inactive` }, { status: 404 }), origin);
        }

        // Get the org details
        const org = await Organisation.findById(organisationId);
        if (!org) {
            return withCors(NextResponse.json({ error: 'Organisation not found' }, { status: 404 }), origin);
        }

        // Get active group count to calculate amount
        const ChitGroup = (await import('@/models/ChitGroup')).default;
        const activeGroupCount = await ChitGroup.countDocuments({
            organisationId,
            status: 'ACTIVE',
        });

        // Calculate amount: pricePerGroup × activeGroups (minimum 1 group for activation)
        const groupCount = Math.max(activeGroupCount, 1);
        const amount = plan.pricePerGroup * groupCount;

        // Create Razorpay Payment Link
        const razorpay = getRazorpay();
        const paymentLink = await (razorpay as any).paymentLink.create({
            amount: amount * 100, // paise
            currency: 'INR',
            accept_partial: false,
            description: description || `ChitWise ${plan.displayName} Plan - ${org.name}`,
            customer: {
                name: org.name,
                email: org.email || undefined,
                contact: org.phone || undefined,
            },
            notify: {
                sms: !!org.phone,
                email: !!org.email,
            },
            reminder_enable: true,
            notes: {
                organisationId: organisationId.toString(),
                planName: planName,
                planId: plan._id.toString(),
                type: 'subscription_activation',
                activeGroupCount: groupCount.toString(),
            },
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chitwise-admin-2j4dk.ondigitalocean.app'}/api/org-subscription/payment-link/callback?org=${organisationId}&plan=${planName}`,
            callback_method: 'get',
        });

        return withCors(NextResponse.json({
            message: 'Payment link created successfully',
            paymentLink: {
                id: paymentLink.id,
                short_url: paymentLink.short_url,
                amount: amount,
                status: paymentLink.status,
                planName,
                orgName: org.name,
                groupCount,
            },
        }), origin);
    } catch (error: any) {
        console.error('Payment link creation error:', error?.message || error);
        return withCors(NextResponse.json({ 
            error: 'Failed to create payment link', 
            details: error?.message 
        }, { status: 500 }), origin);
    }
}
