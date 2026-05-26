import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SubscriptionPlan from '@/models/SubscriptionPlan';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        let plans = await SubscriptionPlan.find({ status: 'ACTIVE' }).sort({ pricePerGroup: 1 });

        // Seed default plans if none exist
        if (plans.length === 0) {
            await SubscriptionPlan.create([
                {
                    name: 'BASIC',
                    displayName: 'Basic Plan',
                    pricePerGroup: 200,
                    maxGroups: 10,
                    maxAdmins: 1,
                    features: [
                        'Create chit groups (max 10)',
                        'Add & manage members',
                        'Monthly collection tracking',
                        'Payment status management',
                        'Basic reports',
                        'Due reminders',
                    ],
                },
                {
                    name: 'PREMIUM',
                    displayName: 'Premium Plan',
                    pricePerGroup: 500,
                    maxGroups: null,
                    maxAdmins: 5,
                    features: [
                        'Unlimited chit groups',
                        'Add & manage members',
                        'Monthly collection tracking',
                        'Payment status management',
                        'Advanced reports & analytics',
                        'Export reports (PDF/Excel)',
                        'Automated notifications (SMS/Push)',
                        'Payment history tracking',
                        'Multiple admin access (up to 5)',
                        'Priority support',
                        'Enhanced security',
                    ],
                },
            ]);
            plans = await SubscriptionPlan.find({ status: 'ACTIVE' }).sort({ pricePerGroup: 1 });
        }

        return withCors(NextResponse.json(plans), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 }), origin);
    }
}
