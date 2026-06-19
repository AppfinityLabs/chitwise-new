import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Otp from '@/models/Otp';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { hashPassword } from '@/lib/auth';
import { generateOtp, getOtpExpiry, sendOtpViaMSG91, getActiveProvider } from '@/lib/otp';
import { checkRateLimit } from '@/lib/rateLimit';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    await dbConnect();

    try {
        const { phone } = await request.json();

        if (!phone || typeof phone !== 'string') {
            return withCors(NextResponse.json({ error: 'Phone number is required' }, { status: 400 }), origin);
        }

        // Rate limit OTP requests per phone (max 3 / 10 min)
        const rl = checkRateLimit(`member-otp:${phone}`, 3, 10 * 60 * 1000);
        if (!rl.allowed) {
            return withCors(NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 }), origin);
        }

        const member = await Member.findOne({ phone });

        // Generic response — do not reveal whether the phone exists
        const genericResponse = {
            message: 'If an account exists for this number, an OTP has been sent.',
        };

        if (!member || member.status !== 'ACTIVE') {
            return withCors(NextResponse.json(genericResponse), origin);
        }

        const otp = generateOtp();
        const hashedOtp = await hashPassword(otp);
        const provider = getActiveProvider();

        // Replace any existing OTP for this phone
        await Otp.deleteMany({ phone });
        await Otp.create({
            phone,
            otp: hashedOtp,
            provider,
            expiresAt: getOtpExpiry(),
            verified: false,
            attempts: 0,
        });

        // Attempt delivery (MSG91 sends our generated OTP via template)
        await sendOtpViaMSG91(phone, otp).catch(() => false);

        const payload: Record<string, unknown> = { ...genericResponse };
        // Expose OTP only in non-production for testing convenience
        if (process.env.NODE_ENV !== 'production') {
            payload.devOtp = otp;
        }

        return withCors(NextResponse.json(payload), origin);
    } catch (error) {
        console.error('Member forgot-pin send-otp error:', error);
        return withCors(NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 }), origin);
    }
}
