import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    await dbConnect();
    try {
        const { id } = await params;
        const member = await Member.findById(id);
        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }
        return NextResponse.json(member);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 });
    }
}
