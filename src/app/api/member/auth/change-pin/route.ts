import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { verifyMemberAuth } from '@/lib/memberAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { hashPassword, comparePassword } from '@/lib/auth';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function PUT(request: NextRequest) {
    const origin = request.headers.get('origin');
    const memberPayload = await verifyMemberAuth(request);

    if (!memberPayload) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        const { currentPin, newPin } = await request.json();

        if (!currentPin || !newPin) {
            return withCors(NextResponse.json({ error: 'Current PIN and new PIN are required' }, { status: 400 }), origin);
        }

        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            return withCors(NextResponse.json({ error: 'New PIN must be exactly 4 digits' }, { status: 400 }), origin);
        }

        const member = await Member.findById(memberPayload.memberId);
        if (!member) {
            return withCors(NextResponse.json({ error: 'Member not found' }, { status: 404 }), origin);
        }

        if (!member.pin) {
            return withCors(NextResponse.json({ error: 'No PIN set. Contact your admin to set a PIN.' }, { status: 400 }), origin);
        }

        // Verify current PIN
        const isCurrentPinValid = await comparePassword(currentPin, member.pin);
        if (!isCurrentPinValid) {
            return withCors(NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 401 }), origin);
        }

        // Hash and set new PIN
        member.pin = await hashPassword(newPin);
        await member.save();

        return withCors(NextResponse.json({ message: 'PIN changed successfully' }), origin);
    } catch (error) {
        console.error('Change PIN error:', error);
        return withCors(NextResponse.json({ error: 'Failed to change PIN' }, { status: 500 }), origin);
    }
}
