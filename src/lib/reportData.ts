import dbConnect from '@/lib/db';
import Collection from '@/models/Collection';
import GroupMember from '@/models/GroupMember';
import ChitGroup from '@/models/ChitGroup';
import type { JWTPayload } from '@/lib/auth';

export interface ReportFilters {
    startDate?: string | null;
    endDate?: string | null;
    groupId?: string | null;
    paymentMode?: string | null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Build the aggregated report dataset, honouring org scoping and optional filters
 * (date range, group, payment mode). Shared by the reports API and export endpoints.
 */
export async function buildReportData(user: JWTPayload, filters: ReportFilters = {}) {
    await dbConnect();

    const { startDate, endDate, groupId, paymentMode } = filters;

    // Resolve the set of groups this request is allowed to see.
    let allowedGroupIds: any[] | null = null;
    const groupScope: any = {};

    if (user.role === 'ORG_ADMIN' && user.organisationId) {
        groupScope.organisationId = user.organisationId;
    }
    if (Object.keys(groupScope).length > 0 || groupId) {
        const groupQuery: any = { ...groupScope };
        if (groupId) groupQuery._id = groupId;
        const groups = await ChitGroup.find(groupQuery).select('_id');
        allowedGroupIds = groups.map((g) => g._id);
    }

    // Base match for PAID collections.
    const collectionMatch: any = { status: 'PAID' };
    if (allowedGroupIds) collectionMatch.groupId = { $in: allowedGroupIds };
    if (paymentMode) collectionMatch.paymentMode = paymentMode;

    // Date range applies to collectedAt when provided.
    const dateMatch: any = {};
    if (startDate) dateMatch.$gte = new Date(startDate);
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateMatch.$lte = end;
    }
    if (Object.keys(dateMatch).length > 0) {
        collectionMatch.collectedAt = dateMatch;
    }

    const groupMemberMatch: any = { status: 'ACTIVE' };
    if (allowedGroupIds) groupMemberMatch.groupId = { $in: allowedGroupIds };

    // 1. Collection Trends — by month within range, or last 6 months by default.
    const trendsMatch: any = { ...collectionMatch };
    if (!collectionMatch.collectedAt) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        trendsMatch.collectedAt = { $gte: sixMonthsAgo };
    }

    const trendsRaw = await Collection.aggregate([
        { $match: trendsMatch },
        {
            $group: {
                _id: { month: { $month: '$collectedAt' }, year: { $year: '$collectedAt' } },
                total: { $sum: '$amountPaid' },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const trends = trendsRaw.map((item) => ({
        name: `${MONTH_NAMES[item._id.month - 1]} ${String(item._id.year).slice(2)}`,
        amount: item.total,
    }));

    // 2. Member Distribution (active enrollments per group)
    const distributionRaw = await GroupMember.aggregate([
        { $match: groupMemberMatch },
        { $lookup: { from: 'chitgroups', localField: 'groupId', foreignField: '_id', as: 'group' } },
        { $unwind: '$group' },
        { $group: { _id: '$group.groupName', value: { $sum: 1 } } },
    ]);
    const distribution = distributionRaw.map((item) => ({ name: item._id, value: item.value }));

    // 3. Payment Mode Stats
    const paymentModeRaw = await Collection.aggregate([
        { $match: collectionMatch },
        { $group: { _id: '$paymentMode', value: { $sum: '$amountPaid' } } },
    ]);
    const paymentModeStats = paymentModeRaw.map((item) => ({ name: item._id || 'Unknown', value: item.value }));

    // 4. Recent Transactions (Last 10)
    const recentTransactions = await Collection.find(collectionMatch)
        .sort({ collectedAt: -1 })
        .limit(10)
        .populate('memberId', 'name')
        .populate('groupId', 'groupName')
        .lean();

    // 5. Group Performance (Total Collected per Group — top 5)
    const groupPerformanceRaw = await Collection.aggregate([
        { $match: collectionMatch },
        { $group: { _id: '$groupId', total: { $sum: '$amountPaid' } } },
        { $lookup: { from: 'chitgroups', localField: '_id', foreignField: '_id', as: 'group' } },
        { $unwind: '$group' },
        { $sort: { total: -1 } },
        { $limit: 5 },
    ]);
    const groupPerformance = groupPerformanceRaw.map((item) => ({ name: item.group.groupName, value: item.total }));

    // 6. Defaulters — active enrollments with outstanding dues
    const defaulterMatch: any = { status: { $in: ['ACTIVE', 'DEFAULTED'] }, pendingAmount: { $gt: 0 } };
    if (allowedGroupIds) defaulterMatch.groupId = { $in: allowedGroupIds };

    const defaultersRaw = await GroupMember.find(defaulterMatch)
        .sort({ pendingAmount: -1 })
        .limit(100)
        .populate('memberId', 'name phone')
        .populate('groupId', 'groupName')
        .lean();

    const defaulters = defaultersRaw.map((d: any) => ({
        _id: d._id,
        memberName: d.memberId?.name || 'Unknown',
        memberPhone: d.memberId?.phone || '',
        groupName: d.groupId?.groupName || 'Unknown',
        totalDue: d.totalDue || 0,
        totalCollected: d.totalCollected || 0,
        pendingAmount: d.pendingAmount || 0,
        status: d.status,
    }));

    // 7. Group list for filter dropdowns
    const groupFilterQuery: any = { ...groupScope };
    const groupList = await ChitGroup.find(groupFilterQuery).select('_id groupName').sort({ groupName: 1 }).lean();
    const groups = groupList.map((g: any) => ({ _id: String(g._id), groupName: g.groupName }));

    // Totals
    const totalCollected = paymentModeStats.reduce((sum, p) => sum + p.value, 0);
    const totalOutstanding = defaulters.reduce((sum, d) => sum + d.pendingAmount, 0);

    return {
        filters: { startDate: startDate || null, endDate: endDate || null, groupId: groupId || null, paymentMode: paymentMode || null },
        trends,
        distribution,
        paymentModeStats,
        recentTransactions,
        groupPerformance,
        defaulters,
        groups,
        summary: {
            totalCollected,
            totalOutstanding,
            activeMembers: distribution.reduce((sum, d) => sum + d.value, 0),
            activeGroups: distribution.length,
            defaulterCount: defaulters.length,
        },
    };
}

/**
 * Fetch a flat list of PAID collections for export, honouring the same scope/filters.
 */
export async function buildCollectionRows(user: JWTPayload, filters: ReportFilters = {}) {
    await dbConnect();
    const { startDate, endDate, groupId, paymentMode } = filters;

    let allowedGroupIds: any[] | null = null;
    const groupScope: any = {};
    if (user.role === 'ORG_ADMIN' && user.organisationId) groupScope.organisationId = user.organisationId;
    if (Object.keys(groupScope).length > 0 || groupId) {
        const groupQuery: any = { ...groupScope };
        if (groupId) groupQuery._id = groupId;
        const groups = await ChitGroup.find(groupQuery).select('_id');
        allowedGroupIds = groups.map((g) => g._id);
    }

    const match: any = { status: 'PAID' };
    if (allowedGroupIds) match.groupId = { $in: allowedGroupIds };
    if (paymentMode) match.paymentMode = paymentMode;
    const dateMatch: any = {};
    if (startDate) dateMatch.$gte = new Date(startDate);
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateMatch.$lte = end;
    }
    if (Object.keys(dateMatch).length > 0) match.collectedAt = dateMatch;

    const rows = await Collection.find(match)
        .sort({ collectedAt: -1 })
        .limit(5000)
        .populate('memberId', 'name phone')
        .populate('groupId', 'groupName')
        .lean();

    return rows.map((r: any) => ({
        date: r.collectedAt ? new Date(r.collectedAt).toISOString().slice(0, 10) : '',
        member: r.memberId?.name || '',
        phone: r.memberId?.phone || '',
        group: r.groupId?.groupName || '',
        period: r.basePeriodNumber,
        amountDue: r.amountDue || 0,
        amountPaid: r.amountPaid || 0,
        paymentMode: r.paymentMode || '',
        status: r.status,
    }));
}
