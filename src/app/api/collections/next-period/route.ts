import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Collection from '@/models/Collection';
import GroupMember from '@/models/GroupMember';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/collections/next-period?groupMemberId=xxx
// Returns the next period that hasn't been fully collected for a subscription
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const groupMemberId = searchParams.get('groupMemberId');

    if (!groupMemberId) {
        return withCors(
            NextResponse.json({ error: 'groupMemberId is required' }, { status: 400 }),
            origin
        );
    }

    try {
        const subscription = await GroupMember.findById(groupMemberId).populate('groupId');
        if (!subscription) {
            return withCors(
                NextResponse.json({ error: 'Subscription not found' }, { status: 404 }),
                origin
            );
        }

        const group = subscription.groupId;
        // @ts-ignore
        const totalPeriods = group.totalPeriods;
        // @ts-ignore
        const currentPeriod = group.currentPeriod || 1;
        const collectionFactor = subscription.collectionFactor;

        // Find all collections for this subscription, grouped by period
        const collections = await Collection.aggregate([
            { $match: { groupMemberId: subscription._id } },
            {
                $group: {
                    _id: '$basePeriodNumber',
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Build a map of period -> collection count
        const periodCollections: Record<number, number> = {};
        for (const c of collections) {
            periodCollections[c._id] = c.count;
        }

        // Find the first period (starting from 1) that isn't fully collected
        let nextPeriod = currentPeriod;
        for (let p = 1; p <= totalPeriods; p++) {
            const count = periodCollections[p] || 0;
            if (count < collectionFactor) {
                nextPeriod = p;
                break;
            }
        }

        // Build list of periods with their collection status (up to currentPeriod)
        const periods = [];
        for (let p = 1; p <= Math.min(currentPeriod, totalPeriods); p++) {
            const count = periodCollections[p] || 0;
            periods.push({
                period: p,
                collected: count,
                total: collectionFactor,
                isComplete: count >= collectionFactor,
            });
        }

        return withCors(
            NextResponse.json({
                nextPeriod,
                currentPeriod,
                totalPeriods,
                collectionFactor,
                periods,
            }),
            origin
        );
    } catch (error: any) {
        console.error('Next period error:', error);
        return withCors(
            NextResponse.json({ error: error.message || 'Failed to determine next period' }, { status: 500 }),
            origin
        );
    }
}
