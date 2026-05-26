import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgInvoice from '@/models/OrgInvoice';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { getOrCreateCurrentInvoice } from '@/lib/subscriptionGate';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

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
        // Get or create invoice for current month
        const invoice = await getOrCreateCurrentInvoice(user.organisationId);

        if (!invoice) {
            return withCors(NextResponse.json({ error: 'No invoice to pay. No active groups found.' }, { status: 400 }), origin);
        }

        if (invoice.status === 'PAID') {
            return withCors(NextResponse.json({ error: 'Invoice already paid' }, { status: 400 }), origin);
        }

        // If order already exists and is still valid, return it
        if (invoice.razorpayOrderId) {
            return withCors(NextResponse.json({
                orderId: invoice.razorpayOrderId,
                amount: invoice.totalAmount * 100, // paise
                currency: 'INR',
                invoiceId: invoice._id,
            }), origin);
        }

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: invoice.totalAmount * 100, // Razorpay uses paise
            currency: 'INR',
            receipt: `inv_${invoice._id}`,
            notes: {
                organisationId: user.organisationId.toString(),
                invoiceId: invoice._id.toString(),
                billingMonth: invoice.billingMonth.toISOString(),
            },
        });

        // Save order ID to invoice
        invoice.razorpayOrderId = order.id;
        await invoice.save();

        return withCors(NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            invoiceId: invoice._id,
            key: process.env.RAZORPAY_KEY_ID, // Frontend needs this to open checkout
        }), origin);
    } catch (error: any) {
        console.error('Create order error:', error);
        return withCors(NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 }), origin);
    }
}
