import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organisation from '@/models/Organisation';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const { id } = await params;
        const organisation = await Organisation.findById(id);
        if (!organisation) {
            return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
        }
        return NextResponse.json(organisation);
    } catch (error) {
        console.error("Organisation Fetch Error:", error);
        return NextResponse.json({ error: 'Failed to fetch organisation' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        const { id } = await params;
        const body = await request.json();

        // Check if organisation exists
        const organisation = await Organisation.findById(id);
        if (!organisation) {
            return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
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

        return NextResponse.json({
            message: 'Organisation updated successfully',
            organisation
        });

    } catch (error: any) {
        console.error("Organisation Update Error:", error);
        return NextResponse.json({ 
            error: 'Failed to update organisation', 
            details: error.message 
        }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        const { id } = await params;

        // Check if organisation exists
        const organisation = await Organisation.findById(id);
        if (!organisation) {
            return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
        }

        // Delete the organisation
        await Organisation.findByIdAndDelete(id);

        return NextResponse.json({ 
            message: 'Organisation deleted successfully',
            deletedOrganisationId: id 
        });

    } catch (error: any) {
        console.error("Organisation Delete Error:", error);
        return NextResponse.json({ 
            error: 'Failed to delete organisation', 
            details: error.message 
        }, { status: 500 });
    }
}
