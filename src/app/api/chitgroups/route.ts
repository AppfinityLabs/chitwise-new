import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';

export async function GET() {
    await dbConnect();
    try {
        const groups = await ChitGroup.find({}).sort({ createdAt: -1 });
        return NextResponse.json(groups);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    await dbConnect();
    try {
        const body = await request.json();
        const group = await ChitGroup.create(body);
        return NextResponse.json(group, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create group', details: error }, { status: 400 });
    }
}
