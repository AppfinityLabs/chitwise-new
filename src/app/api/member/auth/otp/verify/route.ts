import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import '@/models/Organisation';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { signToken } from '@/lib/auth';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

/** Reduce any phone format (+91…, 0…, spaces) to the last 10 digits. */
function last10(phone: string): string {
    return (phone || '').replace(/\D/g, '').slice(-10);
}

/**
 * Member login — Step 2: verify the Firebase ID token (obtained after the user
 * completed Firebase Phone Auth on the client) and issue a session.
 *
 * The phone in the verified token MUST match an existing, active member.
 */
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    await dbConnect();

    try {
        const { firebaseIdToken } = await request.json();

        if (!firebaseIdToken || typeof firebaseIdToken !== 'string') {
            return withCors(NextResponse.json({ error: 'Verification token is required' }, { status: 400 }), origin);
        }

        const admin = getFirebaseAdmin();
        if (!admin) {
            return withCors(NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 }), origin);
        }

        // Verify the token server-side. Throws if invalid/expired/tampered.
        let decoded;
        try {
            decoded = await admin.auth().verifyIdToken(firebaseIdToken);
        } catch (e) {
            console.error('Firebase token verification failed:', e);
            return withCors(NextResponse.json({ error: 'Invalid or expired verification. Please try again.' }, { status: 401 }), origin);
        }

        const tokenPhone = last10(decoded.phone_number || '');
        if (!tokenPhone || tokenPhone.length !== 10) {
            return withCors(NextResponse.json({ error: 'Phone number not verified' }, { status: 401 }), origin);
        }

        const member = await Member.findOne({ phone: tokenPhone }).populate('organisationId', 'name code');
        if (!member) {
            return withCors(NextResponse.json({ error: 'This number is not registered. Please contact your chit organisation.' }, { status: 404 }), origin);
        }

        if (member.status !== 'ACTIVE') {
            return withCors(NextResponse.json({ error: 'Your account has been deactivated. Please contact your organisation.' }, { status: 403 }), origin);
        }

        const token = await signToken({
            memberId: member._id.toString(),
            phone: member.phone,
            role: 'MEMBER',
            organisationId: member.organisationId?._id?.toString() || member.organisationId?.toString(),
        });

        const memberData = {
            id: member._id,
            name: member.name,
            phone: member.phone,
            email: member.email,
            status: member.status,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            organisationName: (member.organisationId as any)?.name || '',
        };

        const response = NextResponse.json(
            { message: 'Login successful', token, member: memberData },
            { status: 200 }
        );

        response.cookies.set('member_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return withCors(response, origin);
    } catch (error) {
        console.error('Member firebase verify error:', error);
        return withCors(NextResponse.json({ error: 'OTP verification failed' }, { status: 500 }), origin);
    }
}
