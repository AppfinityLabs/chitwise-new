import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';

export async function GET() {
    await dbConnect();
    try {
        const members = await Member.find({}).sort({ name: 1 });
        return NextResponse.json(members);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    await dbConnect();
    try {
        const body = await request.json();
        const member = await Member.create(body);
        return NextResponse.json(member, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create member', details: error }, { status: 400 });
    }
}
