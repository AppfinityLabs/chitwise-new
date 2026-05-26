import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgInvoice from '@/models/OrgInvoice';
import OrgSubscription from '@/models/OrgSubscription';
import Organisation from '@/models/Organisation';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import crypto from 'crypto';

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
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await request.json();

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return withCors(NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 }), origin);
        }

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return withCors(NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 }), origin);
        }

        // Find invoice by order ID
        const invoice = await OrgInvoice.findOne({
            organisationId: user.organisationId,
            razorpayOrderId,
        });

        if (!invoice) {
            return withCors(NextResponse.json({ error: 'Invoice not found for this order' }, { status: 404 }), origin);
        }

        if (invoice.status === 'PAID') {
            return withCors(NextResponse.json({ message: 'Payment already verified', invoice }), origin);
        }

        // Mark invoice as paid
        invoice.status = 'PAID';
        invoice.paidAt = new Date();
        invoice.razorpayPaymentId = razorpayPaymentId;
        invoice.razorpaySignature = razorpaySignature;
        await invoice.save();

        // Update organisation denormalized status
        await Organisation.findByIdAndUpdate(user.organisationId, {
            currentInvoiceStatus: 'PAID',
            subscriptionStatus: 'ACTIVE',
        });

        // Ensure subscription is active
        await OrgSubscription.findOneAndUpdate(
            { organisationId: user.organisationId },
            { status: 'ACTIVE' }
        );

        return withCors(NextResponse.json({
            message: 'Payment verified successfully',
            invoice: {
                id: invoice._id,
                status: invoice.status,
                paidAt: invoice.paidAt,
                totalAmount: invoice.totalAmount,
            },
        }), origin);
    } catch (error: any) {
        console.error('Verify payment error:', error);
        return withCors(NextResponse.json({ error: 'Payment verification failed' }, { status: 500 }), origin);
    }
}
