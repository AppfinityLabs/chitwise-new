import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
