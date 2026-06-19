import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rateLimit';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

/**
 * Member login — Step 1 (pre-check before Firebase OTP).
 *
 * Firebase Phone Auth sends the OTP client-side, so we gate it here: the client
 * only triggers Firebase if this returns ok. This enforces "OTP is sent ONLY if
 * the number belongs to an existing, active member".
 */
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    await dbConnect();

    try {
        const { phone } = await request.json();

        if (!phone || typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim())) {
            return withCors(NextResponse.json({ error: 'Enter a valid 10-digit phone number' }, { status: 400 }), origin);
        }

        const normalizedPhone = phone.trim();

        // Rate limit membership checks per phone (max 5 / 10 min)
        const rl = checkRateLimit(`member-otp-check:${normalizedPhone}`, 5, 10 * 60 * 1000);
        if (!rl.allowed) {
            return withCors(NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 }), origin);
        }

        const member = await Member.findOne({ phone: normalizedPhone });

        if (!member) {
            return withCors(NextResponse.json({ error: 'This number is not registered. Please contact your chit organisation.' }, { status: 404 }), origin);
        }

        if (member.status !== 'ACTIVE') {
            return withCors(NextResponse.json({ error: 'Your account has been deactivated. Please contact your organisation.' }, { status: 403 }), origin);
        }

        return withCors(NextResponse.json({ ok: true }), origin);
    } catch (error) {
        console.error('Member otp check error:', error);
        return withCors(NextResponse.json({ error: 'Something went wrong' }, { status: 500 }), origin);
    }
}
