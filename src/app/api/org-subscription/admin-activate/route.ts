import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgSubscription from '@/models/OrgSubscription';
import OrgInvoice from '@/models/OrgInvoice';
import SubscriptionPlan from '@/models/SubscriptionPlan';
import Organisation from '@/models/Organisation';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { syncOrgInvoiceStatus } from '@/lib/subscriptionGate';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

/**
 * POST /api/org-subscription/admin-activate
 * 
 * Super Admin endpoint to manually activate a subscription or waive an invoice.
 * Used when payment is received via cash/bank transfer outside Razorpay.
 * 
 * Body:
 * - organisationId (required)
 * - action: 'activate-plan' | 'waive-invoice' | 'mark-paid' | 'extend-trial' | 'set-free'
 * - planName: 'BASIC' | 'PREMIUM' (required for activate-plan)
 * - invoiceId: string (required for waive-invoice / mark-paid)
 * - paymentNote: string (optional, e.g. "Cash received on 5th June")
 * - free: boolean (required for set-free)
 */
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Only Super Admin can perform this action' }, { status: 403 }), origin);
    }

    await dbConnect();

    try {
        const { organisationId, action, planName, invoiceId, paymentNote, trialEndDate, additionalDays, free } = await request.json();

        if (!organisationId) {
            return withCors(NextResponse.json({ error: 'organisationId is required' }, { status: 400 }), origin);
        }

        if (!action || !['activate-plan', 'waive-invoice', 'mark-paid', 'extend-trial', 'set-free'].includes(action)) {
            return withCors(NextResponse.json({ error: 'Invalid action. Use: activate-plan, waive-invoice, mark-paid, extend-trial, or set-free' }, { status: 400 }), origin);
        }

        // Action: Activate a plan for the org (without Razorpay payment)
        if (action === 'activate-plan') {
            if (!planName || !['BASIC', 'PREMIUM'].includes(planName)) {
                return withCors(NextResponse.json({ error: 'planName must be BASIC or PREMIUM' }, { status: 400 }), origin);
            }

            const plan = await SubscriptionPlan.findOne({ name: planName, status: 'ACTIVE' });
            if (!plan) {
                return withCors(NextResponse.json({ error: `Plan ${planName} not found or inactive` }, { status: 404 }), origin);
            }

            const subscription = await OrgSubscription.findOneAndUpdate(
                { organisationId },
                {
                    planId: plan._id,
                    planName: plan.name,
                    pricePerGroup: plan.pricePerGroup,
                    maxGroups: plan.maxGroups,
                    status: 'ACTIVE',
                    startDate: new Date(),
                    isFree: false,
                },
                { new: true, upsert: false }
            );

            if (!subscription) {
                // Create subscription if it doesn't exist
                const newSub = await OrgSubscription.create({
                    organisationId,
                    planId: plan._id,
                    planName: plan.name,
                    pricePerGroup: plan.pricePerGroup,
                    maxGroups: plan.maxGroups,
                    status: 'ACTIVE',
                    trialStartDate: new Date(),
                    trialEndDate: new Date(), // trial already done
                    startDate: new Date(),
                });

                await Organisation.findByIdAndUpdate(organisationId, {
                    subscriptionPlan: plan.name,
                    subscriptionStatus: 'ACTIVE',
                });

                return withCors(NextResponse.json({
                    message: `Plan ${planName} activated for organisation`,
                    subscription: newSub,
                }), origin);
            }

            await Organisation.findByIdAndUpdate(organisationId, {
                subscriptionPlan: plan.name,
                subscriptionStatus: 'ACTIVE',
            });

            return withCors(NextResponse.json({
                message: `Plan ${planName} activated for organisation`,
                subscription,
            }), origin);
        }

        // Action: Waive an invoice (no payment needed)
        if (action === 'waive-invoice') {
            if (!invoiceId) {
                return withCors(NextResponse.json({ error: 'invoiceId is required for waive-invoice' }, { status: 400 }), origin);
            }

            const invoice = await OrgInvoice.findOneAndUpdate(
                { _id: invoiceId, organisationId },
                {
                    status: 'WAIVED',
                    paidAt: new Date(),
                    ...(paymentNote && { paymentNote }),
                },
                { new: true }
            );

            if (!invoice) {
                return withCors(NextResponse.json({ error: 'Invoice not found' }, { status: 404 }), origin);
            }

            // Also ensure subscription is ACTIVE
            await OrgSubscription.findOneAndUpdate(
                { organisationId },
                { status: 'ACTIVE' }
            );

            await syncOrgInvoiceStatus(organisationId);

            return withCors(NextResponse.json({
                message: 'Invoice waived successfully',
                invoice,
            }), origin);
        }

        // Action: Mark invoice as paid (cash/bank transfer)
        if (action === 'mark-paid') {
            if (!invoiceId) {
                return withCors(NextResponse.json({ error: 'invoiceId is required for mark-paid' }, { status: 400 }), origin);
            }

            const invoice = await OrgInvoice.findOneAndUpdate(
                { _id: invoiceId, organisationId },
                {
                    status: 'PAID',
                    paidAt: new Date(),
                    ...(paymentNote && { paymentNote }),
                },
                { new: true }
            );

            if (!invoice) {
                return withCors(NextResponse.json({ error: 'Invoice not found' }, { status: 404 }), origin);
            }

            // Ensure subscription is ACTIVE
            await OrgSubscription.findOneAndUpdate(
                { organisationId },
                { status: 'ACTIVE' }
            );

            await syncOrgInvoiceStatus(organisationId);

            return withCors(NextResponse.json({
                message: 'Invoice marked as paid (cash/manual)',
                invoice,
            }), origin);
        }

        // Action: Grant or revoke free access (org never pays, collections never gated)
        if (action === 'set-free') {
            if (typeof free !== 'boolean') {
                return withCors(NextResponse.json({ error: 'free (true/false) is required for set-free' }, { status: 400 }), origin);
            }
            const sub = await OrgSubscription.findOne({ organisationId });
            if (!sub) {
                return withCors(NextResponse.json({ error: 'Subscription not found' }, { status: 404 }), origin);
            }

            if (free) {
                sub.isFree = true;
                sub.status = 'ACTIVE';
                await sub.save();
                // Nothing already issued should stay payable
                const waived = await OrgInvoice.updateMany(
                    { organisationId, status: { $in: ['PENDING', 'OVERDUE'] } },
                    { status: 'WAIVED' }
                );
                await Organisation.findByIdAndUpdate(organisationId, {
                    subscriptionStatus: 'ACTIVE',
                    currentInvoiceStatus: null,
                });
                return withCors(NextResponse.json({
                    message: `Free access granted${waived.modifiedCount ? ` (${waived.modifiedCount} unpaid invoice(s) waived)` : ''}`,
                    subscription: sub,
                }), origin);
            }

            // Revoke: with a plan, normal billing resumes; without one, the org must pick a plan
            sub.isFree = false;
            if (!sub.planName) {
                sub.status = 'TRIAL';
                sub.trialEndDate = new Date();
            }
            await sub.save();
            await Organisation.findByIdAndUpdate(organisationId, {
                subscriptionStatus: sub.status,
                ...(sub.status === 'TRIAL' ? { trialEndsAt: sub.trialEndDate } : {}),
            });
            return withCors(NextResponse.json({
                message: sub.planName
                    ? `Free access removed. Billing resumes on the ${sub.planName} plan.`
                    : 'Free access removed. The organisation must select a plan (or extend its trial).',
                subscription: sub,
            }), origin);
        }

        // Action: Extend trial end date
        if (action === 'extend-trial') {
            let newTrialEnd: Date;
            if (trialEndDate) {
                newTrialEnd = new Date(trialEndDate);
            } else if (additionalDays && additionalDays > 0) {
                const sub = await OrgSubscription.findOne({ organisationId });
                const base = sub?.trialEndDate && new Date(sub.trialEndDate) > new Date()
                    ? new Date(sub.trialEndDate)
                    : new Date();
                newTrialEnd = new Date(base.getTime() + additionalDays * 24 * 60 * 60 * 1000);
            } else {
                return withCors(NextResponse.json({ error: 'Provide trialEndDate or additionalDays' }, { status: 400 }), origin);
            }

            const updated = await OrgSubscription.findOneAndUpdate(
                { organisationId },
                { status: 'TRIAL', trialEndDate: newTrialEnd },
                { new: true }
            );

            if (!updated) {
                return withCors(NextResponse.json({ error: 'Subscription not found' }, { status: 404 }), origin);
            }

            await Organisation.findByIdAndUpdate(organisationId, {
                subscriptionStatus: 'TRIAL',
                trialEndsAt: newTrialEnd,
            });

            return withCors(NextResponse.json({
                message: `Trial extended to ${newTrialEnd.toDateString()}`,
                trialEndDate: newTrialEnd,
            }), origin);
        }

    } catch (error: any) {
        console.error('Admin activate error:', error?.message || error);
        return withCors(NextResponse.json({ error: 'Failed to process admin action', details: error?.message }, { status: 500 }), origin);
    }
}
