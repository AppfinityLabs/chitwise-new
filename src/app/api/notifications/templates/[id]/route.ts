import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import NotificationTemplate from '@/models/NotificationTemplate';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// Update template
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    const { id } = await params;
    await dbConnect();

    try {
        const body = await request.json();
        const allowedFields = ['name', 'title', 'body', 'image', 'url', 'priority'];
        const updates: any = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        const template = await NotificationTemplate.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!template) {
            return withCors(NextResponse.json({ error: 'Template not found' }, { status: 404 }), origin);
        }

        return withCors(NextResponse.json(template), origin);
    } catch (error: any) {
        if (error.code === 11000) {
            return withCors(
                NextResponse.json({ error: 'Template name already exists' }, { status: 409 }),
                origin
            );
        }
        return withCors(
            NextResponse.json({ error: error.message || 'Failed to update template' }, { status: 500 }),
            origin
        );
    }
}

// Delete template
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    const { id } = await params;
    await dbConnect();

    try {
        const template = await NotificationTemplate.findByIdAndDelete(id);
        if (!template) {
            return withCors(NextResponse.json({ error: 'Template not found' }, { status: 404 }), origin);
        }
        return withCors(NextResponse.json({ success: true, message: 'Template deleted' }), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to delete template' }, { status: 500 }), origin);
    }
}
