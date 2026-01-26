import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function POST(
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

        // Find the original group
        const originalGroup = await ChitGroup.findById(id);
        if (!originalGroup) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
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
            startDate: new Date(), // Set to current date
            currentPeriod: 1, // Reset to period 1
            status: 'ACTIVE', // Reset to active
        };

        const clonedGroup = await ChitGroup.create(clonedGroupData);

        return NextResponse.json({
            message: 'Group cloned successfully',
            clonedGroup
        }, { status: 201 });

    } catch (error: any) {
        console.error("Group Clone Error:", error);
        return NextResponse.json({ 
            error: 'Failed to clone group', 
            details: error.message 
        }, { status: 500 });
    }
}
