import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Organisation from '@/models/Organisation';
import Otp from '@/models/Otp';
import { signToken, comparePassword } from '@/lib/auth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    await dbConnect();

    try {
        const { phone, otp, firebaseIdToken } = await request.json();

        if (!phone || (!otp && !firebaseIdToken)) {
            return withCors(
                NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 }),
                origin
            );
        }

        const normalizedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^0/, '')}`;

        // Find the user associated with this phone
        let user = await User.findOne({ phone: normalizedPhone, status: 'ACTIVE' });

        if (!user) {
            const org = await Organisation.findOne({ phone: normalizedPhone, status: 'ACTIVE' });
            if (org) {
                user = await User.findOne({ organisationId: org._id, role: 'ORG_ADMIN', status: 'ACTIVE' });
            }
        }

        if (!user) {
            return withCors(
                NextResponse.json({ error: 'This mobile number is not registered' }, { status: 404 }),
                origin
            );
        }

        let verified = false;

        // Method 1: Firebase ID token verification (client-side Firebase Auth)
        if (firebaseIdToken) {
            verified = await verifyFirebaseToken(firebaseIdToken, normalizedPhone);
        }

        // Method 2: OTP code verification (MSG91 or self-generated)
        if (!verified && otp) {
            const otpRecord = await Otp.findOne({
                phone: normalizedPhone,
                verified: false,
                expiresAt: { $gt: new Date() },
            }).sort({ createdAt: -1 });

            if (!otpRecord) {
                return withCors(
                    NextResponse.json({ error: 'OTP expired or not found. Please request a new one.' }, { status: 400 }),
                    origin
                );
            }

            // Check max attempts
            if (otpRecord.attempts >= 3) {
                return withCors(
                    NextResponse.json({ error: 'Too many incorrect attempts. Please request a new OTP.' }, { status: 429 }),
                    origin
                );
            }

            const isOtpValid = await comparePassword(otp, otpRecord.otp);
            if (!isOtpValid) {
                await Otp.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
                return withCors(
                    NextResponse.json({ error: 'Invalid OTP' }, { status: 401 }),
                    origin
                );
            }

            // Mark OTP as verified
            await Otp.updateOne({ _id: otpRecord._id }, { verified: true });
            verified = true;
        }

        if (!verified) {
            return withCors(
                NextResponse.json({ error: 'OTP verification failed' }, { status: 401 }),
                origin
            );
        }

        // Generate JWT token
        const token = await signToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            organisationId: user.organisationId?.toString()
        });

        const userData = {
            id: user._id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            status: user.status
        };

        const response = NextResponse.json(
            { message: 'Login successful', token, user: userData },
            { status: 200 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        });

        return withCors(response, origin);
    } catch (error) {
        console.error('Verify OTP error:', error);
        return withCors(
            NextResponse.json({ error: 'OTP verification failed' }, { status: 500 }),
            origin
        );
    }
}

/**
 * Verify Firebase ID token server-side
 * This validates that the user actually verified their phone via Firebase Auth
 */
async function verifyFirebaseToken(idToken: string, expectedPhone: string): Promise<boolean> {
    const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
    if (!FIREBASE_PROJECT_ID) return false;

    try {
        // Verify token with Firebase Auth REST API
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_WEB_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            }
        );

        const data = await response.json();
        if (data.users && data.users.length > 0) {
            const firebaseUser = data.users[0];
            // Ensure the phone number matches what we expect
            return firebaseUser.phoneNumber === expectedPhone;
        }
        return false;
    } catch (error) {
        console.error('[OTP] Firebase token verification failed:', error);
        return false;
    }
}
