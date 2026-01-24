import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Collection from '@/models/Collection';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';

export async function GET() {
    await dbConnect();

    try {
        // 1. Collection Trends (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const trendsRaw = await Collection.aggregate([
            { $match: { status: 'PAID', createdAt: { $gte: sixMonthsAgo } } },
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
            { $match: { status: 'ACTIVE' } },
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
            { $match: { status: 'PAID' } },
            { $group: { _id: "$paymentMode", value: { $sum: "$amountPaid" } } }
        ]);

        const paymentModeStats = paymentModeRaw.map(item => ({
            name: item._id || 'Unknown',
            value: item.value
        }));

        // 4. Recent Transactions (Last 10)
        const recentTransactions = await Collection.find({ status: 'PAID' })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('memberId', 'name')
            .populate('groupId', 'groupName');

        // 5. Group Performance (Total Collected per Group)
        const groupPerformanceRaw = await Collection.aggregate([
            { $match: { status: 'PAID' } },
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
