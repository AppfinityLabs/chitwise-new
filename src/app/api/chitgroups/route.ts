import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const user = await verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const organisationId = searchParams.get('organisationId');

    let query: any = {};

    // Org Admin: Enforce Own Org
    if (user.role === 'ORG_ADMIN' && user.organisationId) {
        query.organisationId = user.organisationId;
    }
    // Super Admin: Allow Filter
    else if (organisationId) {
        query.organisationId = organisationId;
    }

    try {
        const groups = await ChitGroup.find(query)
            .sort({ createdAt: -1 })
            .populate('organisationId', 'name code');
        return NextResponse.json(groups);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await verifyApiAuth(request);
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

        const group = await ChitGroup.create(body);
        return NextResponse.json(group, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to create group', details: error.message }, { status: 400 });
    }
}
