import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgInvoice from '@/models/OrgInvoice';
import OrgSubscription from '@/models/OrgSubscription';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { getOrCreateCurrentInvoice } from '@/lib/subscriptionGate';
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
        // Parse optional months parameter from body
        let months = 1;
        try {
            const body = await request.json();
            months = Math.min(Math.max(Math.floor(Number(body.months) || 1), 1), 12);
        } catch { /* no body or invalid JSON — default 1 month */ }

        // Get or create invoice for current month
        const invoice = await getOrCreateCurrentInvoice(user.organisationId);

        if (!invoice) {
            return withCors(NextResponse.json({ error: 'No invoice to pay. No active groups found.' }, { status: 400 }), origin);
        }

        if (invoice.status === 'PAID' && months === 1) {
            return withCors(NextResponse.json({ error: 'Invoice already paid' }, { status: 400 }), origin);
        }

        const totalAmount = invoice.totalAmount * months;

        // If order already exists for single month and is still valid, return it
        if (months === 1 && invoice.razorpayOrderId) {
            return withCors(NextResponse.json({
                orderId: invoice.razorpayOrderId,
                amount: invoice.totalAmount * 100, // paise
                currency: 'INR',
                invoiceId: invoice._id,
                months: 1,
                key: process.env.RAZORPAY_KEY_ID,
            }), origin);
        }

        // Create Razorpay order
        const order = await getRazorpay().orders.create({
            amount: totalAmount * 100, // Razorpay uses paise
            currency: 'INR',
            receipt: `inv_${invoice._id}_${months}m`,
            notes: {
                organisationId: user.organisationId.toString(),
                invoiceId: invoice._id.toString(),
                billingMonth: invoice.billingMonth.toISOString(),
                months: months.toString(),
            },
        });

        // Save order ID to invoice (for single month)
        if (months === 1) {
            invoice.razorpayOrderId = order.id;
            await invoice.save();
        }

        return withCors(NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            invoiceId: invoice._id,
            months,
            monthlyAmount: invoice.totalAmount,
            key: process.env.RAZORPAY_KEY_ID,
        }), origin);
    } catch (error: any) {
        console.error('Create order error:', error);
        return withCors(NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 }), origin);
    }
}
