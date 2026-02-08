import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organisation from '@/models/Organisation';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();
    try {
        const { id } = await params;
        const organisation = await Organisation.findById(id);
        if (!organisation) {
            return withCors(NextResponse.json({ error: 'Organisation not found' }, { status: 404 }), origin);
        }
        return withCors(NextResponse.json(organisation), origin);
    } catch (error) {
        console.error("Organisation Fetch Error:", error);
        return withCors(NextResponse.json({ error: 'Failed to fetch organisation' }, { status: 500 }), origin);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        const { id } = await params;
        const body = await request.json();

        // Check if organisation exists
        const organisation = await Organisation.findById(id);
        if (!organisation) {
            return withCors(NextResponse.json({ error: 'Organisation not found' }, { status: 404 }), origin);
        }

        // Update allowed fields
        const allowedUpdates = [
            'name',
            'code',
            'description',
            'address',
            'phone',
            'email',
            'gstNumber',
            'panNumber',
            'logo',
            'status'
        ];

        allowedUpdates.forEach(field => {
            if (body[field] !== undefined) {
                organisation[field] = body[field];
            }
        });

        await organisation.save();

        return withCors(NextResponse.json({
            message: 'Organisation updated successfully',
            organisation
        }), origin);

    } catch (error: any) {
        console.error("Organisation Update Error:", error);
        return withCors(NextResponse.json({
            error: 'Failed to update organisation',
            details: error.message
        }, { status: 500 }), origin);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        const { id } = await params;

        // Check if organisation exists
        const organisation = await Organisation.findById(id);
        if (!organisation) {
            return withCors(NextResponse.json({ error: 'Organisation not found' }, { status: 404 }), origin);
        }

        // Delete the organisation
        await Organisation.findByIdAndDelete(id);

        return withCors(NextResponse.json({
            message: 'Organisation deleted successfully',
            deletedOrganisationId: id
        }), origin);

    } catch (error: any) {
        console.error("Organisation Delete Error:", error);
        return withCors(NextResponse.json({
            error: 'Failed to delete organisation',
            details: error.message
        }, { status: 500 }), origin);
    }
}
