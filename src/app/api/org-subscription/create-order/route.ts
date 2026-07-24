import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { getOrCreateGroupInvoice } from '@/lib/subscriptionGate';
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
        let groupId: string | undefined;
        try {
            const body = await request.json();
            groupId = body?.groupId;
        } catch { /* no body or invalid JSON */ }

        if (!groupId) {
            return withCors(NextResponse.json({ error: 'groupId is required' }, { status: 400 }), origin);
        }

        // Get or create this group's invoice for the current month
        const invoice = await getOrCreateGroupInvoice(user.organisationId, groupId);

        if (!invoice) {
            return withCors(NextResponse.json({ error: 'No invoice to pay for this group.' }, { status: 400 }), origin);
        }

        if (invoice.status === 'PAID' || invoice.status === 'WAIVED') {
            return withCors(NextResponse.json({ error: 'Invoice already paid' }, { status: 400 }), origin);
        }

        // Reuse an existing order for this invoice
        if (invoice.razorpayOrderId) {
            return withCors(NextResponse.json({
                orderId: invoice.razorpayOrderId,
                amount: invoice.totalAmount * 100, // paise
                currency: 'INR',
                invoiceId: invoice._id,
                groupId: invoice.groupId,
                groupName: invoice.groupName,
                key: process.env.RAZORPAY_KEY_ID,
            }), origin);
        }

        // Create Razorpay order
        const order = await getRazorpay().orders.create({
            amount: invoice.totalAmount * 100, // Razorpay uses paise
            currency: 'INR',
            receipt: `inv_${invoice._id}`,
            notes: {
                organisationId: user.organisationId.toString(),
                invoiceId: invoice._id.toString(),
                groupId: invoice.groupId.toString(),
                billingMonth: invoice.billingMonth.toISOString(),
            },
        });

        invoice.razorpayOrderId = order.id;
        await invoice.save();

        return withCors(NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            invoiceId: invoice._id,
            groupId: invoice.groupId,
            groupName: invoice.groupName,
            monthlyAmount: invoice.totalAmount,
            key: process.env.RAZORPAY_KEY_ID,
        }), origin);
    } catch (error: any) {
        console.error('Create order error:', error);
        return withCors(NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 }), origin);
    }
}
