import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import Organisation from '@/models/Organisation';
import { normalizePhone } from '@/lib/phone';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    let query = {};
    if (user.role === 'ORG_ADMIN' && user.organisationId) {
        query = { organisationId: user.organisationId };
    }

    try {
        const members = await Member.find(query)
            .sort({ name: 1 })
            .populate('organisationId', 'name code');
        return withCors(NextResponse.json(members), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 }), origin);
    }
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();
    try {
        const body = await request.json();

        // Scope to Organisation
        if (user.role === 'ORG_ADMIN') {
            if (!user.organisationId) {
                return withCors(NextResponse.json({ error: 'User not linked to an organisation' }, { status: 400 }), origin);
            }
            body.organisationId = user.organisationId;
        } else if (user.role === 'SUPER_ADMIN') {
            if (!body.organisationId) {
                return withCors(NextResponse.json({ error: 'Organisation ID is required for Super Admin' }, { status: 400 }), origin);
            }
        }

        const organisation = await Organisation.findById(body.organisationId)
            .select('defaultCountry');
        if (!organisation) {
            return withCors(NextResponse.json({ error: 'Organisation not found' }, { status: 404 }), origin);
        }
        const normalizedPhone = normalizePhone(
            body.phoneE164 || body.phone,
            organisation.defaultCountry,
        );
        if (!normalizedPhone) {
            return withCors(NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 }), origin);
        }
        body.phone = normalizedPhone.e164;
        body.phoneE164 = normalizedPhone.e164;
        body.phoneCountry = normalizedPhone.country;
        body.phoneNational = normalizedPhone.nationalNumber;

        // Hash PIN if provided
        if (body.pin) {
            if (body.pin.length !== 4 || !/^\d{4}$/.test(body.pin)) {
                return withCors(NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 }), origin);
            }
            body.pin = await hashPassword(body.pin);
        }

        // Prevent duplicate phone numbers within the same organisation
        if (body.phone) {
            const existing = await Member.findOne({
                phoneE164: body.phoneE164,
            });
            if (existing) {
                return withCors(
                    NextResponse.json({ error: 'A customer with this phone number already exists' }, { status: 409 }),
                    origin
                );
            }
        }

        const member = await Member.create(body);
        await logAudit(user, {
            action: 'CREATE',
            entity: 'Member',
            entityId: String(member._id),
            summary: `Created member ${member.name} (${member.phone})`,
        });
        return withCors(NextResponse.json(member, { status: 201 }), origin);
    } catch (error: any) {
        if (error?.code === 11000) {
            return withCors(
                NextResponse.json({ error: 'A customer with this phone number already exists' }, { status: 409 }),
                origin
            );
        }
        return withCors(NextResponse.json({ error: 'Failed to create member', details: error.message }, { status: 400 }), origin);
    }
}
