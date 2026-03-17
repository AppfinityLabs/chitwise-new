import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ChitGroup from '@/models/ChitGroup';
import Member from '@/models/Member';
import GroupMember from '@/models/GroupMember';
import Collection from '@/models/Collection';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { calculateOverdueAmount, calculateCurrentPeriod } from '@/lib/utils';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

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

            if (groupId) {
                // Verify groupId belongs to this org
                const groupExists = await ChitGroup.findOne({ _id: groupId, organisationId: user.organisationId });
                if (!groupExists) {
                    return withCors(NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 }), origin);
                }
                orgGroupIds = [groupId];
            } else {
                const orgGroups = await ChitGroup.find(orgQuery).select('_id');
                orgGroupIds = orgGroups.map(g => g._id);
            }
        } else if (groupId) {
            orgGroupIds = [groupId];
        }

        // 1. Stats Calculation
        let groupFilter: any = { ...orgQuery };
        if (groupId) {
            groupFilter._id = groupId;
        }
        const activeGroupsCount = await ChitGroup.countDocuments({ status: 'ACTIVE', ...groupFilter });

        // Active Members
        const activeMembersCount = await Member.countDocuments({ status: 'ACTIVE', ...orgQuery });


        let collectionMatch: any = { status: 'PAID' };
        let groupMemberMatch: any = { status: 'ACTIVE' };

        if (user.role === 'ORG_ADMIN' && user.organisationId) {
            collectionMatch.groupId = { $in: orgGroupIds };
            groupMemberMatch.groupId = { $in: orgGroupIds };
        } else if (groupId) {
            collectionMatch.groupId = groupId;
            groupMemberMatch.groupId = groupId;
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
            .limit(10) // Increased limit to see more on group dashboard
            .populate('memberId', 'name')
            .populate('groupId', 'groupName');

        // 3. Pending Dues List — use period-based overdue calculation, not lifetime pendingAmount
        const pendingSubscriptions = await GroupMember.find({ ...groupMemberMatch, pendingAmount: { $gt: 0 } })
            .populate('memberId', 'name')
            .populate('groupId', 'groupName frequency contributionAmount startDate totalPeriods');

        const pendingDuesList = pendingSubscriptions
            .map(sub => {
                const group = sub.groupId as any;
                if (!group) return null;

                // Calculate only the CURRENT period's pending amount
                const currentPeriod = calculateCurrentPeriod(group);
                if (currentPeriod === 0) return null;

                const contributionPerPeriod = group.contributionAmount * sub.units;
                const totalExpectedByPreviousPeriod = (currentPeriod - 1) * contributionPerPeriod;
                const paidForCurrentPeriod = Math.max(0, sub.totalCollected - totalExpectedByPreviousPeriod);
                const currentPeriodPending = Math.max(0, Math.round((contributionPerPeriod - paidForCurrentPeriod) * 100) / 100);

                return {
                    _id: sub._id,
                    memberId: sub.memberId,
                    groupId: { _id: group._id, groupName: group.groupName },
                    units: sub.units,
                    pendingAmount: currentPeriodPending,
                    totalCollected: sub.totalCollected,
                    totalDue: sub.totalDue,
                    status: sub.status,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item != null && item.pendingAmount > 0)
            .sort((a, b) => b.pendingAmount - a.pendingAmount)
            .slice(0, 10);

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
