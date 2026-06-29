import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { getOrgSettings } from '@/lib/orgSettings';
import OrgSettings from '@/models/OrgSettings';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);

    const { searchParams } = new URL(request.url);
    const orgId = user.role === 'SUPER_ADMIN'
        ? (searchParams.get('orgId') || user.organisationId)
        : user.organisationId;

    if (!orgId) return withCors(NextResponse.json({ error: 'Organisation not found' }, { status: 400 }), origin);

    await dbConnect();
    try {
        const settings = await getOrgSettings(orgId);
        return withCors(NextResponse.json(settings), origin);
    } catch (error: any) {
        return withCors(NextResponse.json({ error: error.message || 'Failed to load settings' }, { status: 500 }), origin);
    }
}

export async function PUT(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    if (user.role !== 'ORG_ADMIN' && user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    const orgId = user.role === 'SUPER_ADMIN'
        ? ((await request.clone().json()).organisationId || user.organisationId)
        : user.organisationId;

    if (!orgId) return withCors(NextResponse.json({ error: 'Organisation not found' }, { status: 400 }), origin);

    await dbConnect();
    try {
        const body = await request.json();
        const settings = await getOrgSettings(orgId as string);

        const allowed = [
            'allowFractionalUnits',
            'maxUnitsPerMember',
            'defaultUnitsPerMember',
            'allowMultipleWinnersPerPeriod',
            'allowRepeatWinners',
            'winnerSelectionMode',
            'allowAdvancePayment',
            'allowPartialPayment',
            'gracePeriodDays',
            'commissionType',
            'defaultCommissionRate',
            'defaultFrequency',
            'defaultAllowCustomCollectionPattern',
            'sendPaymentReminders',
            'reminderDaysBefore',
            'sendOverdueAlerts',
            'sendWinnerAnnouncements',
        ] as const;

        for (const field of allowed) {
            if (body[field] !== undefined) {
                (settings as any)[field] = body[field];
            }
        }

        await settings.save();
        return withCors(NextResponse.json(settings), origin);
    } catch (error: any) {
        return withCors(NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 }), origin);
    }
}
