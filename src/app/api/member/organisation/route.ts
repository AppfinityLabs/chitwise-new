import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organisation from '@/models/Organisation';
import { verifyMemberAuth } from '@/lib/memberAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const member = await verifyMemberAuth(request);
    if (!member) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();
    try {
        const organisation = await Organisation.findOne({
            _id: member.organisationId,
            status: 'ACTIVE',
        }).select('name code description logo phone email address');

        if (!organisation) {
            return withCors(NextResponse.json({ error: 'Organisation not found' }, { status: 404 }), origin);
        }

        return withCors(NextResponse.json({
            id: organisation._id,
            name: organisation.name,
            code: organisation.code,
            description: organisation.description,
            logo: organisation.logo,
            phone: organisation.phone,
            email: organisation.email,
            address: organisation.address,
        }), origin);
    } catch (error) {
        console.error('Member organisation error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch organisation' }, { status: 500 }), origin);
    }
}
