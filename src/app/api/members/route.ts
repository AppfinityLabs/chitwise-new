import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

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

        const member = await Member.create(body);
        return withCors(NextResponse.json(member, { status: 201 }), origin);
    } catch (error: any) {
        return withCors(NextResponse.json({ error: 'Failed to create member', details: error.message }, { status: 400 }), origin);
    }
}
