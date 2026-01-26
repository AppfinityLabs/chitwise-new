import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organisation from '@/models/Organisation';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const organisations = await Organisation.find({}).sort({ name: 1 });
        return NextResponse.json(organisations);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch organisations' }, { status: 500 });
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
        const organisation = await Organisation.create(body);
        return NextResponse.json(organisation, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ 
            error: 'Failed to create organisation', 
            details: error.message 
        }, { status: 400 });
    }
}
