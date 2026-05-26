import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgInvoice from '@/models/OrgInvoice';
import OrgSubscription from '@/models/OrgSubscription';
import Organisation from '@/models/Organisation';
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

        return NextResponse.json({ status: 'ignored', event: eventType });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
