import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgSubscription from '@/models/OrgSubscription';
import SubscriptionPlan from '@/models/SubscriptionPlan';
import Organisation from '@/models/Organisation';

/**
 * GET /api/org-subscription/payment-link/callback
 * 
 * Razorpay redirects here after payment link is paid.
 * Activates the plan for the org and shows a success page.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const organisationId = searchParams.get('org');
    const planName = searchParams.get('plan');
    const razorpayPaymentId = searchParams.get('razorpay_payment_id');
    const razorpayPaymentLinkId = searchParams.get('razorpay_payment_link_id');
    const razorpayPaymentLinkStatus = searchParams.get('razorpay_payment_link_status');

    if (!organisationId || !planName) {
        return new NextResponse(renderHTML('Error', 'Invalid payment link callback. Missing parameters.'), {
            headers: { 'Content-Type': 'text/html' },
        });
    }

    // If payment was successful, activate the plan
    if (razorpayPaymentLinkStatus === 'paid' && razorpayPaymentId) {
        try {
            await dbConnect();

            const plan = await SubscriptionPlan.findOne({ name: planName, status: 'ACTIVE' });
            if (plan) {
                await OrgSubscription.findOneAndUpdate(
                    { organisationId },
                    {
                        planId: plan._id,
                        planName: plan.name,
                        pricePerGroup: plan.pricePerGroup,
                        maxGroups: plan.maxGroups,
                        status: 'ACTIVE',
                        startDate: new Date(),
                    },
                    { upsert: false }
                );

                await Organisation.findByIdAndUpdate(organisationId, {
                    subscriptionPlan: plan.name,
                    subscriptionStatus: 'ACTIVE',
                });
            }

            return new NextResponse(
                renderHTML('Payment Successful!', `Your ${planName} plan has been activated. You can now continue using ChitWise.`),
                { headers: { 'Content-Type': 'text/html' } }
            );
        } catch (error) {
            console.error('Payment link callback error:', error);
            return new NextResponse(
                renderHTML('Payment Received', 'Payment was received. Your plan will be activated shortly. If not, please contact support.'),
                { headers: { 'Content-Type': 'text/html' } }
            );
        }
    }

    return new NextResponse(
        renderHTML('Payment Status', 'Payment processing. If you completed the payment, your plan will be activated shortly.'),
        { headers: { 'Content-Type': 'text/html' } }
    );
}

function renderHTML(title: string, message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChitWise - ${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f23; color: #e2e8f0; 
            display: flex; align-items: center; justify-content: center; 
            min-height: 100vh; padding: 20px;
        }
        .card {
            background: #1a1a2e; border-radius: 20px; padding: 40px;
            max-width: 440px; width: 100%; text-align: center;
            border: 1px solid rgba(99, 102, 241, 0.2);
        }
        .icon { font-size: 48px; margin-bottom: 16px; }
        h1 { font-size: 24px; margin-bottom: 12px; color: #fff; }
        p { color: #94a3b8; line-height: 1.6; font-size: 15px; }
        .success .icon { color: #10b981; }
        .error .icon { color: #ef4444; }
    </style>
</head>
<body>
    <div class="card ${title.includes('Successful') ? 'success' : ''}">
        <div class="icon">${title.includes('Successful') ? '✅' : title.includes('Error') ? '❌' : '⏳'}</div>
        <h1>${title}</h1>
        <p>${message}</p>
    </div>
</body>
</html>`;
}
