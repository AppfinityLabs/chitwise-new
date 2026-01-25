import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organisation from '@/models/Organisation';

export async function GET() {
    await dbConnect();
    try {
        const organisations = await Organisation.find({}).sort({ name: 1 });
        return NextResponse.json(organisations);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch organisations' }, { status: 500 });
    }
}

export async function POST(request: Request) {
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
