import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GroupMember from '@/models/GroupMember';
import Collection from '@/models/Collection';
import Winner from '@/models/Winner';
import ChitGroup from '@/models/ChitGroup';
import Member from '@/models/Member';
import { verifyMemberAuth } from '@/lib/memberAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const memberPayload = await verifyMemberAuth(request);

    if (!memberPayload) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        const memberId = memberPayload.memberId;

        // Get all subscriptions for this member
        const subscriptions = await GroupMember.find({ memberId })
            .populate('groupId', 'groupName frequency contributionAmount currentPeriod totalPeriods status startDate');

        const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE');

        // Total paid across all groups
        const totalPaid = subscriptions.reduce((sum, s) => sum + s.totalCollected, 0);

        // Total pending across all groups
        const totalPending = subscriptions.reduce((sum, s) => sum + s.pendingAmount, 0);

        // Calculate overdue amounts (no overdue if group hasn't started yet)
        const now = new Date();
        let totalOverdue = 0;
        for (const sub of activeSubscriptions) {
            const group = sub.groupId as any;
            if (group) {
                const groupStarted = group.startDate ? new Date(group.startDate) <= now : true;
                const effectivePeriod = groupStarted ? group.currentPeriod : 0;
                const expectedAmount = effectivePeriod * group.contributionAmount * sub.units;
                const overdueAmount = Math.max(0, expectedAmount - sub.totalCollected);
                totalOverdue += overdueAmount;
            }
        }

        // Recent payments (last 5)
        const recentPayments = await Collection.find({ memberId })
            .sort({ collectedAt: -1 })
            .limit(5)
            .populate('groupId', 'groupName');

        // Upcoming dues (active subscriptions with pending amounts)
        const upcomingDues = activeSubscriptions
            .map(sub => {
                const group = sub.groupId as any;
                const groupStarted = group?.startDate ? new Date(group.startDate) <= now : true;
                const effectivePeriod = groupStarted ? (group?.currentPeriod || 0) : 0;
                const expectedAmount = group ? effectivePeriod * group.contributionAmount * sub.units : 0;
                const overdueAmount = Math.max(0, expectedAmount - sub.totalCollected);
                return {
                    _id: sub._id,
                    groupName: group?.groupName || 'Unknown',
                    groupId: group?._id,
                    units: sub.units,
                    pendingAmount: sub.pendingAmount,
                    overdueAmount,
                    nextDueAmount: group ? group.contributionAmount * sub.units : 0,
                };
            })
            .filter(d => d.overdueAmount > 0)
            .sort((a, b) => b.overdueAmount - a.overdueAmount)
            .slice(0, 5);

        // Total wins
        const totalWins = await Winner.countDocuments({ memberId });
        const totalPrizeAmount = await Winner.aggregate([
            { $match: { memberId: require('mongoose').Types.ObjectId.createFromHexString(memberId) } },
            { $group: { _id: null, total: { $sum: '$prizeAmount' } } },
        ]);

        return withCors(NextResponse.json({
            stats: {
                activeGroups: activeSubscriptions.length,
                totalGroups: subscriptions.length,
                totalPaid,
                totalPending,
                totalOverdue,
                totalWins,
                totalPrizeAmount: totalPrizeAmount[0]?.total || 0,
            },
            recentPayments,
            upcomingDues,
        }), origin);
    } catch (error) {
        console.error('Member dashboard error:', error);
        return withCors(NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 }), origin);
    }
}
