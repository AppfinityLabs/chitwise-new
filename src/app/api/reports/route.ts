import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { buildReportData } from '@/lib/reportData';

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

    try {
        const { searchParams } = new URL(request.url);
        const data = await buildReportData(user, {
            startDate: searchParams.get('startDate'),
            endDate: searchParams.get('endDate'),
            groupId: searchParams.get('groupId'),
            paymentMode: searchParams.get('paymentMode'),
        });

        return withCors(NextResponse.json(data), origin);
    } catch (error) {
        console.error('Reports API Error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 }), origin);
    }
}
