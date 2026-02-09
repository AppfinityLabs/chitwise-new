import { NextRequest, NextResponse } from 'next/server';
import { getVapidPublicKey, isPushConfigured } from '@/lib/pushService';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// Get VAPID public key for client-side subscription
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');

    if (!isPushConfigured()) {
        return withCors(
            NextResponse.json({
                error: 'Push notifications not configured',
                configured: false
            }, { status: 503 }),
            origin
        );
    }

    return withCors(
        NextResponse.json({
            publicKey: getVapidPublicKey(),
            configured: true
        }),
        origin
    );
}
