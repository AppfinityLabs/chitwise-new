import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgInvoice from '@/models/OrgInvoice';
import OrgSubscription from '@/models/OrgSubscription';
import Organisation from '@/models/Organisation';
import SubscriptionPlan from '@/models/SubscriptionPlan';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    await dbConnect();

    try {
        const body = await request.text();
        const signature = request.headers.get('x-razorpay-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
            .update(body)
            .digest('hex');

        if (expectedSignature !== signature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const event = JSON.parse(body);
        const eventType = event.event;

        if (eventType === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;

            if (!orderId) {
                return NextResponse.json({ status: 'ignored', reason: 'No order_id in payment' });
            }

            // Find invoice by razorpay order ID
            const invoice = await OrgInvoice.findOne({ razorpayOrderId: orderId });

            if (!invoice) {
                return NextResponse.json({ status: 'ignored', reason: 'No matching invoice' });
            }

            if (invoice.status === 'PAID') {
                return NextResponse.json({ status: 'already_processed' });
            }

            // Mark as paid
            invoice.status = 'PAID';
            invoice.paidAt = new Date();
            invoice.razorpayPaymentId = payment.id;
            await invoice.save();

            // Update org status
            await Organisation.findByIdAndUpdate(invoice.organisationId, {
                currentInvoiceStatus: 'PAID',
                subscriptionStatus: 'ACTIVE',
            });

            await OrgSubscription.findOneAndUpdate(
                { organisationId: invoice.organisationId },
                { status: 'ACTIVE' }
            );

            return NextResponse.json({ status: 'processed' });
        }

        if (eventType === 'payment.failed') {
            const payment = event.payload.payment.entity;
            const orderId = payment.order_id;

            if (orderId) {
                const invoice = await OrgInvoice.findOne({ razorpayOrderId: orderId });
                if (invoice && invoice.status !== 'PAID') {
                    invoice.status = 'OVERDUE';
                    await invoice.save();

                    await Organisation.findByIdAndUpdate(invoice.organisationId, {
                        currentInvoiceStatus: 'OVERDUE',
                    });
                }
            }

            return NextResponse.json({ status: 'processed' });
        }

        // Handle payment link paid events (for admin-created payment links)
        if (eventType === 'payment_link.paid') {
            const paymentLink = event.payload.payment_link.entity;
            const notes = paymentLink.notes || {};

            if (notes.type === 'subscription_activation' && notes.organisationId && notes.planName) {
                const plan = await SubscriptionPlan.findOne({ name: notes.planName, status: 'ACTIVE' });
                if (plan) {
                    const months = parseInt(notes.months || '1', 10);
                    const now = new Date();
                    const paidThroughDate = new Date(now.getFullYear(), now.getMonth() + months, 0);

                    await OrgSubscription.findOneAndUpdate(
                        { organisationId: notes.organisationId },
                        {
                            planId: plan._id,
                            planName: plan.name,
                            pricePerGroup: plan.pricePerGroup,
                            maxGroups: plan.maxGroups,
                            status: 'ACTIVE',
                            startDate: new Date(),
                            paidThroughDate,
                        },
                        { upsert: false }
                    );

                    await Organisation.findByIdAndUpdate(notes.organisationId, {
                        subscriptionPlan: plan.name,
                        subscriptionStatus: 'ACTIVE',
                    });

                    // Mark current + future invoices as PAID
                    for (let i = 0; i < months; i++) {
                        const billingMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
                        await OrgInvoice.findOneAndUpdate(
                            { organisationId: notes.organisationId, billingMonth },
                            { status: 'PAID', paidAt: new Date() },
                        );
                    }
                }

                return NextResponse.json({ status: 'processed', action: 'plan_activated' });
            }

            return NextResponse.json({ status: 'ignored', reason: 'payment_link without subscription notes' });
        }

        return NextResponse.json({ status: 'ignored', event: eventType });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
