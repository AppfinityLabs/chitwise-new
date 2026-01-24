import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    await dbConnect();
    try {
        const { id } = await params;
        let group = await ChitGroup.findById(id);
        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Auto-update currentPeriod based on dates
        const now = new Date();
        const start = new Date(group.startDate);
        let calculatedPeriod = 1;

        if (now >= start) {
            const diffTime = Math.abs(now.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (group.frequency === 'DAILY') {
                calculatedPeriod = diffDays + 1;
            } else if (group.frequency === 'WEEKLY') {
                calculatedPeriod = Math.floor(diffDays / 7) + 1;
            } else if (group.frequency === 'MONTHLY') {
                const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
                // Adjust for day of month? keeping simple for now
                calculatedPeriod = diffMonths + 1;
            }
        }

        // Cap at totalPeriods
        if (calculatedPeriod > group.totalPeriods) {
            calculatedPeriod = group.totalPeriods; // Or marked as completed
        }

        // Update if significantly different (and strictly forward)
        // We only move forward automatically, manually reverting is possible via edit if needed (not impl yet)
        if (calculatedPeriod > group.currentPeriod) {
            group.currentPeriod = calculatedPeriod;
            await group.save();
        }

        return NextResponse.json(group);
    } catch (error) {
        console.error("Group Fetch Error:", error);
        return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
    }
}
