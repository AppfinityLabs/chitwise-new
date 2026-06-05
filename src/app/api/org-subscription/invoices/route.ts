import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrgInvoice from '@/models/OrgInvoice';
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

    // Allow SUPER_ADMIN to query any org's invoices
    const queryOrgId = request.nextUrl.searchParams.get('organisationId');
    const targetOrgId = (user.role === 'SUPER_ADMIN' && queryOrgId) ? queryOrgId : user.organisationId;

    if (!targetOrgId) {
        return withCors(NextResponse.json({ error: 'No organisation linked to user' }, { status: 400 }), origin);
    }

    await dbConnect();

    try {
        const invoices = await OrgInvoice.find({ organisationId: targetOrgId })
            .sort({ billingMonth: -1 })
            .limit(12); // Last 12 months

        return withCors(NextResponse.json(invoices), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 }), origin);
    }
}
