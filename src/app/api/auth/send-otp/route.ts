import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Organisation from '@/models/Organisation';
import Otp from '@/models/Otp';
import { generateOtp, getOtpExpiry, sendOtpViaMSG91, getActiveProvider } from '@/lib/otp';
import { hashPassword } from '@/lib/auth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    await dbConnect();

    try {
        const { phone } = await request.json();

        if (!phone) {
            return withCors(
                NextResponse.json({ error: 'Phone number is required' }, { status: 400 }),
                origin
            );
        }

        // Normalize phone number (ensure +91 prefix for India)
        const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^0/, '')}`;

        // Check if this phone belongs to a registered org admin
        // First check User model for phone
        let user = await User.findOne({ phone: normalizedPhone, status: 'ACTIVE' });

        // If not found in User, check Organisation phone field
        if (!user) {
            const org = await Organisation.findOne({ phone: normalizedPhone, status: 'ACTIVE' });
            if (org) {
                // Find the ORG_ADMIN linked to this organisation
                user = await User.findOne({ organisationId: org._id, role: 'ORG_ADMIN', status: 'ACTIVE' });
            }
        }

        if (!user) {
            return withCors(
                NextResponse.json({ error: 'This mobile number is not registered with any organisation' }, { status: 404 }),
                origin
            );
        }

        // Rate limiting: max 5 OTPs per phone per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentOtps = await Otp.countDocuments({
            phone: normalizedPhone,
            createdAt: { $gte: oneHourAgo }
        });

        if (recentOtps >= 5) {
            return withCors(
                NextResponse.json({ error: 'Too many OTP requests. Please try again later.' }, { status: 429 }),
                origin
            );
        }

        // Generate and store OTP
        const otp = generateOtp();
        const provider = getActiveProvider();

        // Send OTP
        let sent = false;
        if (provider === 'msg91') {
            sent = await sendOtpViaMSG91(normalizedPhone, otp);
        }

        // If MSG91 fails or not configured, store OTP for Firebase client-side verification
        if (!sent && provider === 'firebase') {
            // Firebase OTP is sent client-side via Flutter SDK
            // We just store the session for verification tracking
            sent = true;
        }

        // Store hashed OTP in DB for verification
        const hashedOtp = await hashPassword(otp);
        await Otp.create({
            phone: normalizedPhone,
            otp: hashedOtp,
            provider,
            expiresAt: getOtpExpiry(),
        });

        return withCors(
            NextResponse.json({
                message: 'OTP sent successfully',
                provider, // Tell client which method to use
                phone: normalizedPhone.slice(0, 4) + '****' + normalizedPhone.slice(-2),
            }),
            origin
        );
    } catch (error) {
        console.error('Send OTP error:', error);
        return withCors(
            NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 }),
            origin
        );
    }
}
