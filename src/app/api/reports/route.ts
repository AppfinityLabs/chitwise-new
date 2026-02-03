import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Collection from '@/models/Collection';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const user = await verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        let orgGroupIds: any[] = [];
        let orgQuery: any = {};
        let collectionMatch: any = { status: 'PAID' };
        let groupMemberMatch: any = { status: 'ACTIVE' };

        // Scope to Organisation if Org Admin
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            orgQuery = { organisationId: user.organisationId };
            const orgGroups = await ChitGroup.find(orgQuery).select('_id');
            orgGroupIds = orgGroups.map(g => g._id);

            collectionMatch.groupId = { $in: orgGroupIds };
            groupMemberMatch.groupId = { $in: orgGroupIds };
        }

        // 1. Collection Trends (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const trendsRaw = await Collection.aggregate([
            { $match: { ...collectionMatch, createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    total: { $sum: "$amountPaid" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const trends = trendsRaw.map(item => ({
            name: monthNames[item._id.month - 1],
            amount: item.total
        }));

        // 2. Member Distribution
        const distributionRaw = await GroupMember.aggregate([
            { $match: groupMemberMatch },
            { $lookup: { from: 'chitgroups', localField: 'groupId', foreignField: '_id', as: 'group' } },
            { $unwind: '$group' },
            { $group: { _id: '$group.groupName', value: { $sum: 1 } } }
        ]);

        const distribution = distributionRaw.map(item => ({
            name: item._id,
            value: item.value
        }));

        // 3. Payment Mode Stats
        const paymentModeRaw = await Collection.aggregate([
            { $match: collectionMatch },
            { $group: { _id: "$paymentMode", value: { $sum: "$amountPaid" } } }
        ]);

        const paymentModeStats = paymentModeRaw.map(item => ({
            name: item._id || 'Unknown',
            value: item.value
        }));

        // 4. Recent Transactions (Last 10)
        const recentTransactions = await Collection.find(collectionMatch)
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('memberId', 'name')
            .populate('groupId', 'groupName');

        // 5. Group Performance (Total Collected per Group)
        const groupPerformanceRaw = await Collection.aggregate([
            { $match: collectionMatch },
            { $group: { _id: "$groupId", total: { $sum: "$amountPaid" } } },
            { $lookup: { from: 'chitgroups', localField: '_id', foreignField: '_id', as: 'group' } },
            { $unwind: "$group" },
            { $sort: { total: -1 } },
            { $limit: 5 }
        ]);

        const groupPerformance = groupPerformanceRaw.map(item => ({
            name: item.group.groupName,
            value: item.total
        }));

        return NextResponse.json({
            trends,
            distribution,
            paymentModeStats,
            recentTransactions,
            groupPerformance
        });

    } catch (error) {
        console.error("Reports API Error:", error);
        return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
    }
}
