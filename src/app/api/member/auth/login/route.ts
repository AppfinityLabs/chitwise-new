import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import '@/models/Organisation';
import { comparePassword, signToken } from '@/lib/auth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    await dbConnect();

    try {
        const { phone, pin } = await request.json();

        // Validate input
        if (!phone || !pin) {
            return withCors(
                NextResponse.json({ error: 'Phone number and PIN are required' }, { status: 400 }),
                origin
            );
        }

        // Find member by phone
        const member = await Member.findOne({ phone }).populate('organisationId', 'name code');

        if (!member) {
            return withCors(
                NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 }),
                origin
            );
        }

        // Check if member is active
        if (member.status !== 'ACTIVE') {
            return withCors(
                NextResponse.json({ error: 'Your account has been deactivated. Please contact your organisation.' }, { status: 403 }),
                origin
            );
        }

        // Check if PIN is set
        if (!member.pin) {
            return withCors(
                NextResponse.json({ error: 'Login PIN not set. Please contact your organisation admin.' }, { status: 403 }),
                origin
            );
        }

        // Verify PIN
        const isPinValid = await comparePassword(pin, member.pin);

        if (!isPinValid) {
            return withCors(
                NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 }),
                origin
            );
        }

        // Generate JWT token with MEMBER role
        const token = await signToken({
            memberId: member._id.toString(),
            phone: member.phone,
            role: 'MEMBER',
            organisationId: member.organisationId._id?.toString() || member.organisationId.toString(),
        });

        // Create response with member data
        const memberData = {
            id: member._id,
            name: member.name,
            phone: member.phone,
            email: member.email,
            status: member.status,
            organisationName: (member.organisationId as any)?.name || '',
        };

        const response = NextResponse.json(
            {
                message: 'Login successful',
                token,
                member: memberData,
            },
            { status: 200 }
        );

        // Set httpOnly cookie with token (same-origin only, PWAs use Bearer tokens)
        response.cookies.set('member_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return withCors(response, origin);
    } catch (error) {
        console.error('Member login error:', error);
        return withCors(
            NextResponse.json({ error: 'An error occurred during login' }, { status: 500 }),
            origin
        );
    }
}
