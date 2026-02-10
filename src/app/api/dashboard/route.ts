import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import Member from '@/models/Member';
import GroupMember from '@/models/GroupMember';
import Collection from '@/models/Collection';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { calculateOverdueAmount } from '@/lib/utils';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    await dbConnect();

    try {
        let orgGroupIds: any[] = [];
        let orgQuery: any = {};

        // Scope to Organisation if Org Admin
        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            orgQuery = { organisationId: user.organisationId };
            const orgGroups = await ChitGroup.find(orgQuery).select('_id');
            orgGroupIds = orgGroups.map(g => g._id);
        }

        // 1. Stats Calculation
        const activeGroupsCount = await ChitGroup.countDocuments({ status: 'ACTIVE', ...orgQuery });

        // Active Members
        const activeMembersCount = await Member.countDocuments({ status: 'ACTIVE', ...orgQuery });


        let collectionMatch: any = { status: 'PAID' };
        let groupMemberMatch: any = { status: 'ACTIVE' };

        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            collectionMatch.groupId = { $in: orgGroupIds };
            groupMemberMatch.groupId = { $in: orgGroupIds };
        }

        // Total Collections
        const totalCollectionsResult = await Collection.aggregate([
            { $match: collectionMatch },
            { $group: { _id: null, total: { $sum: "$amountPaid" } } }
        ]);
        const totalCollections = totalCollectionsResult[0]?.total || 0;

        // Pending Dues — calculate dynamically as overdue (not lifetime pending)
        const activeSubscriptions = await GroupMember.find(groupMemberMatch)
            .populate('groupId', 'groupName frequency contributionAmount startDate totalPeriods');
        
        let totalOverdueDues = 0;
        for (const sub of activeSubscriptions) {
            const group = sub.groupId as any;
            if (group) {
                totalOverdueDues += calculateOverdueAmount(group, sub);
            }
        }

        // Also get lifetime pending for reference
        const pendingDuesResult = await GroupMember.aggregate([
            { $match: groupMemberMatch },
            { $group: { _id: null, total: { $sum: "$pendingAmount" } } }
        ]);
        const totalPendingDues = pendingDuesResult[0]?.total || 0;

        // 2. Recent Collections
        const recentCollections = await Collection.find(collectionMatch)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('memberId', 'name')
            .populate('groupId', 'groupName');

        // 3. Pending Dues List
        const pendingDuesList = await GroupMember.find({ ...groupMemberMatch, pendingAmount: { $gt: 0 } })
            .sort({ pendingAmount: -1 })
            .limit(5)
            .populate('memberId', 'name');

        return withCors(NextResponse.json({
            stats: {
                activeGroups: activeGroupsCount,
                totalCollections,
                activeMembers: activeMembersCount,
                pendingDues: totalOverdueDues,
                totalOutstanding: totalPendingDues
            },
            recentCollections,
            pendingDuesList
        }), origin);

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return withCors(NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 }), origin);
    }
}
