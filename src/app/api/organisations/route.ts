import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organisation from '@/models/Organisation';
import OrgSubscription from '@/models/OrgSubscription';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();
    try {
        const organisations = await Organisation.find({}).sort({ name: 1 });
        return withCors(NextResponse.json(organisations), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch organisations' }, { status: 500 }), origin);
    }
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();
    try {
        const body = await request.json();
        const organisation = await Organisation.create({
            ...body,
            subscriptionPlan: 'TRIAL',
            subscriptionStatus: 'TRIAL',
            trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        });

        // Auto-create trial subscription record
        const trialStartDate = new Date();
        const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await OrgSubscription.create({
            organisationId: organisation._id,
            status: 'TRIAL',
            trialStartDate,
            trialEndDate,
        });

        return withCors(NextResponse.json(organisation, { status: 201 }), origin);
    } catch (error: any) {
        return withCors(NextResponse.json({
            error: 'Failed to create organisation',
            details: error.message
        }, { status: 400 }), origin);
    }
}
