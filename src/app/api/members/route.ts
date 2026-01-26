import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        return NextResponse.json(members);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const body = await request.json();

        // Scope to Organisation
        if (user.role === 'ORG_ADMIN') {
            if (!user.organisationId) {
                return NextResponse.json({ error: 'User not linked to an organisation' }, { status: 400 });
            }
            body.organisationId = user.organisationId;
        } else if (user.role === 'SUPER_ADMIN') {
            if (!body.organisationId) {
                return NextResponse.json({ error: 'Organisation ID is required for Super Admin' }, { status: 400 });
            }
        }

        const member = await Member.create(body);
        return NextResponse.json(member, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to create member', details: error.message }, { status: 400 });
    }
}
