import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Collection from '@/models/Collection';
import GroupMember from '@/models/GroupMember';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { calculateCurrentPeriod, countCompletedInstallments } from '@/lib/utils';

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
        // Dynamically calculate current period instead of using stale DB value
        // @ts-ignore
        const currentPeriod = calculateCurrentPeriod(group);
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

        // ── Member-centric installment info ──────────────────────────
        // For members with sub-period collection patterns (e.g. daily in a monthly group),
        // each sub-installment is treated as the member's own "period".
        // e.g. daily member in 10-month group with collectionFactor=30 → 300 total.
        const totalMemberInstallments = totalPeriods * collectionFactor;
        const completedMemberInstallments = collections.reduce((sum: number, c: any) => sum + c.count, 0);
        const nextMemberInstallment = Math.min(completedMemberInstallments + 1, totalMemberInstallments);

        // How many member installments are time-available based on elapsed time
        let currentMemberInstallment = 0;
        if (collectionFactor > 1) {
            const completedGroupPeriods = currentPeriod - 1;
            const now = new Date();
            // @ts-ignore
            const start = new Date(group.startDate);
            let subInstallmentsInCurrentPeriod = collectionFactor;
            // @ts-ignore
            if (group.frequency === 'MONTHLY') {
                const periodStart = new Date(start);
                periodStart.setMonth(periodStart.getMonth() + (currentPeriod - 1));
                const diffMs = now.getTime() - periodStart.getTime();
                const daysSincePeriodStart = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                if (subscription.collectionPattern === 'DAILY') {
                    subInstallmentsInCurrentPeriod = Math.min(daysSincePeriodStart + 1, collectionFactor);
                } else if (subscription.collectionPattern === 'WEEKLY') {
                    subInstallmentsInCurrentPeriod = Math.min(Math.floor(daysSincePeriodStart / 7) + 1, collectionFactor);
                }
            // @ts-ignore
            } else if (group.frequency === 'WEEKLY') {
                if (subscription.collectionPattern === 'DAILY') {
                    const periodStart = new Date(start);
                    periodStart.setDate(periodStart.getDate() + (currentPeriod - 1) * 7);
                    const diffMs = now.getTime() - periodStart.getTime();
                    const daysSincePeriodStart = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                    subInstallmentsInCurrentPeriod = Math.min(daysSincePeriodStart + 1, collectionFactor);
                }
            }
            currentMemberInstallment = (completedGroupPeriods * collectionFactor) + subInstallmentsInCurrentPeriod;
        } else {
            currentMemberInstallment = currentPeriod;
        }

        // ── Overdue installment breakdown ────────────────────────────
        // Build a list of every unfulfilled installment whose deadline has passed.
        const overdueInstallments: Array<{
            basePeriodNumber: number;
            collectionSequence: number;
            amountDue: number;
        }> = [];

        // @ts-ignore
        const contributionPerPeriod = group.contributionAmount * subscription.units;
        const amountPerInstallment = contributionPerPeriod / collectionFactor;

        // Completed sub-installments in the current period whose deadline passed
        const completedSubsInCurrent = countCompletedInstallments(
            // @ts-ignore
            group,
            subscription,
            currentPeriod
        );

        for (let p = 1; p <= Math.min(currentPeriod, totalPeriods); p++) {
            const actualCount = periodCollections[p] || 0;

            // How many installments should have been paid by now for this period?
            let expectedCount: number;
            if (p < currentPeriod) {
                // Fully elapsed period — all sub-installments are overdue if missing
                expectedCount = collectionFactor;
            } else {
                // Current period — only count sub-installments whose deadline passed
                expectedCount = completedSubsInCurrent;
            }

            // Each missing slot is one overdue installment
            for (let seq = actualCount + 1; seq <= expectedCount; seq++) {
                overdueInstallments.push({
                    basePeriodNumber: p,
                    collectionSequence: seq,
                    amountDue: Math.round(amountPerInstallment * 100) / 100,
                });
            }
        }

        const overdueTotal = overdueInstallments.reduce((sum, i) => sum + i.amountDue, 0);
        const overdueCount = overdueInstallments.length;

        return withCors(
            NextResponse.json({
                nextPeriod,
                currentPeriod,
                totalPeriods,
                collectionFactor,
                periods,
                // Member-centric fields
                nextMemberInstallment,
                totalMemberInstallments,
                completedMemberInstallments,
                currentMemberInstallment,
                collectionPattern: subscription.collectionPattern,
                // Overdue details
                overdueInstallments,
                overdueTotal: Math.round(overdueTotal * 100) / 100,
                overdueCount,
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
