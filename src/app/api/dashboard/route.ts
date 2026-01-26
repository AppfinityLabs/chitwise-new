import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import Member from '@/models/Member';
import GroupMember from '@/models/GroupMember';
import Collection from '@/models/Collection';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const user = verifyApiAuth(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        // 1. Stats Calculation
        const activeGroupsCount = await ChitGroup.countDocuments({ status: 'ACTIVE' });

        // Total Collections (Sum of all verified payments)
        const totalCollectionsResult = await Collection.aggregate([
            { $match: { status: 'PAID' } },
            { $group: { _id: null, total: { $sum: "$amountPaid" } } }
        ]);
        const totalCollections = totalCollectionsResult[0]?.total || 0;

        // Active Members (Unique members who are active)
        const activeMembersCount = await Member.countDocuments({ status: 'ACTIVE' });

        // Pending Dues (Sum of all pending amounts in active subscriptions)
        const pendingDuesResult = await GroupMember.aggregate([
            { $match: { status: 'ACTIVE' } },
            { $group: { _id: null, total: { $sum: "$pendingAmount" } } }
        ]);
        const totalPendingDues = pendingDuesResult[0]?.total || 0;

        // 2. Recent Collections (Last 5)
        const recentCollections = await Collection.find({ status: 'PAID' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('memberId', 'name')
            .populate('groupId', 'groupName');

        // 3. Pending Dues List (Top 5 highest pending)
        const pendingDuesList = await GroupMember.find({ status: 'ACTIVE', pendingAmount: { $gt: 0 } })
            .sort({ pendingAmount: -1 })
            .limit(5)
            .populate('memberId', 'name');

        return NextResponse.json({
            stats: {
                activeGroups: activeGroupsCount,
                totalCollections,
                activeMembers: activeMembersCount,
                pendingDues: totalPendingDues
            },
            recentCollections,
            pendingDuesList
        });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
