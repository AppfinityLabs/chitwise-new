import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import NotificationTemplate from '@/models/NotificationTemplate';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// List all templates
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();

    try {
        const templates = await NotificationTemplate.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name email');
        return withCors(NextResponse.json(templates), origin);
    } catch (error) {
        return withCors(NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 }), origin);
    }
}

// Create a template
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);

    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    if (user.role !== 'SUPER_ADMIN') {
        return withCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin);
    }

    await dbConnect();

    try {
        const body = await request.json();
        const { name, title, body: templateBody, image, url, priority } = body;

        if (!name || !title || !templateBody) {
            return withCors(
                NextResponse.json({ error: 'Name, title, and body are required' }, { status: 400 }),
                origin
            );
        }

        const template = await NotificationTemplate.create({
            name,
            title,
            body: templateBody,
            image: image || undefined,
            url: url || undefined,
            priority: priority || 'normal',
            createdBy: user.userId,
        });

        return withCors(NextResponse.json(template, { status: 201 }), origin);
    } catch (error: any) {
        if (error.code === 11000) {
            return withCors(
                NextResponse.json({ error: 'Template name already exists' }, { status: 409 }),
                origin
            );
        }
        return withCors(
            NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 }),
            origin
        );
    }
}
