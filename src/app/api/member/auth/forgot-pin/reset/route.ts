import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Otp from '@/models/Otp';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { hashPassword, comparePassword } from '@/lib/auth';

const MAX_OTP_ATTEMPTS = 5;

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    await dbConnect();

    try {
        const { phone, otp, newPin } = await request.json();

        if (!phone || !otp || !newPin) {
            return withCors(NextResponse.json({ error: 'Phone, OTP and new PIN are required' }, { status: 400 }), origin);
        }

        if (!/^\d{4}$/.test(newPin)) {
            return withCors(NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 }), origin);
        }

        const otpRecord = await Otp.findOne({ phone }).sort({ createdAt: -1 });
        if (!otpRecord) {
            return withCors(NextResponse.json({ error: 'OTP expired or not found. Please request a new one.' }, { status: 400 }), origin);
        }

        if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
            await Otp.deleteMany({ phone });
            return withCors(NextResponse.json({ error: 'Too many invalid attempts. Please request a new OTP.' }, { status: 429 }), origin);
        }

        if (new Date() > otpRecord.expiresAt) {
            await Otp.deleteMany({ phone });
            return withCors(NextResponse.json({ error: 'OTP expired. Please request a new one.' }, { status: 400 }), origin);
        }

        const isOtpValid = await comparePassword(String(otp), otpRecord.otp);
        if (!isOtpValid) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            return withCors(NextResponse.json({ error: 'Invalid OTP' }, { status: 401 }), origin);
        }

        const member = await Member.findOne({ phone });
        if (!member || member.status !== 'ACTIVE') {
            return withCors(NextResponse.json({ error: 'Account not found' }, { status: 404 }), origin);
        }

        member.pin = await hashPassword(newPin);
        await member.save();

        // OTP consumed — remove all OTPs for this phone
        await Otp.deleteMany({ phone });

        return withCors(NextResponse.json({ message: 'PIN reset successfully. You can now log in.' }), origin);
    } catch (error) {
        console.error('Member forgot-pin reset error:', error);
        return withCors(NextResponse.json({ error: 'Failed to reset PIN' }, { status: 500 }), origin);
    }
}
