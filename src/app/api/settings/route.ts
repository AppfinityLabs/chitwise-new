import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AppSettings from '@/models/AppSettings';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

/**
 * Load the singleton settings document, creating it with defaults if missing.
 */
async function getOrCreateSettings() {
    let settings = await AppSettings.findOne({ key: 'GLOBAL' });
    if (!settings) {
        settings = await AppSettings.create({ key: 'GLOBAL' });
    }
    return settings;
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
        const settings = await getOrCreateSettings();
        return withCors(NextResponse.json(settings), origin);
    } catch (error: any) {
        return withCors(
            NextResponse.json({ error: error.message || 'Failed to load settings' }, { status: 500 }),
            origin
        );
    }
}

export async function PUT(request: NextRequest) {
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
        const settings = await getOrCreateSettings();

        // Only update known, whitelisted fields
        const allowed: (keyof typeof body)[] = [
            'emailEnabled',
            'smsEnabled',
            'pushEnabled',
            'notificationFromName',
            'notificationReplyTo',
            'currency',
            'currencySymbol',
            'dateFormat',
            'language',
            'timezone',
        ];

        for (const field of allowed) {
            if (body[field] !== undefined) {
                (settings as any)[field] = body[field];
            }
        }

        await settings.save();
        return withCors(NextResponse.json(settings), origin);
    } catch (error: any) {
        return withCors(
            NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 }),
            origin
        );
    }
}
