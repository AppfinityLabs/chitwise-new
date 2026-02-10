import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(
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

        // Find the original group
        const originalGroup = await ChitGroup.findById(id);
        if (!originalGroup) {
            return withCors(NextResponse.json({ error: 'Group not found' }, { status: 404 }), origin);
        }

        // Create a new group with the same properties but reset certain fields
        const clonedGroupData = {
            groupName: `${originalGroup.groupName} (Copy)`,
            description: originalGroup.description,
            frequency: originalGroup.frequency,
            contributionAmount: originalGroup.contributionAmount,
            totalUnits: originalGroup.totalUnits,
            totalPeriods: originalGroup.totalPeriods,
            commissionValue: originalGroup.commissionValue,
            allowCustomCollectionPattern: originalGroup.allowCustomCollectionPattern,
            subscriptionAmount: originalGroup.subscriptionAmount,
            subscriptionFrequency: originalGroup.subscriptionFrequency,
            organisationId: originalGroup.organisationId,
            startDate: new Date(), // Set to current date
            currentPeriod: 0, // Reset to 0 (not started)
            status: 'ACTIVE', // Reset to active
        };

        const clonedGroup = await ChitGroup.create(clonedGroupData);

        return withCors(NextResponse.json({
            message: 'Group cloned successfully',
            clonedGroup
        }, { status: 201 }), origin);

    } catch (error: any) {
        console.error("Group Clone Error:", error);
        return withCors(NextResponse.json({
            error: 'Failed to clone group',
            details: error.message
        }, { status: 500 }), origin);
    }
}
