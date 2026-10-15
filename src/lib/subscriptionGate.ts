import OrgSubscription from '@/models/OrgSubscription';
import OrgInvoice from '@/models/OrgInvoice';
import ChitGroup from '@/models/ChitGroup';
import Organisation from '@/models/Organisation';
import mongoose from 'mongoose';

export interface SubscriptionGateResult {
    allowed: boolean;
    reason?: string;
    status?: string;
    invoiceAmount?: number;
    dueDate?: Date;
}

/**
 * Check if an organisation is allowed to perform collections for a specific group.
 *
 * Billing is per group: each active group gets its own monthly invoice, and paying
 * one group only unblocks that group. Returns { allowed: true } if OK, or
 * { allowed: false, reason, ... } if blocked.
 */
export async function checkSubscriptionGate(
    organisationId: string | mongoose.Types.ObjectId,
    groupId: string | mongoose.Types.ObjectId,
): Promise<SubscriptionGateResult> {
    const subscription = await OrgSubscription.findOne({ organisationId });

    if (!subscription) {
        return { allowed: false, reason: 'No subscription found. Please contact support.', status: 'NONE' };
    }

    // Free access granted by Super Admin covers every group.
    if (subscription.isFree) {
        return { allowed: true };
    }

    // Trial is org-level and covers every group.
    if (subscription.status === 'TRIAL') {
        if (new Date() <= new Date(subscription.trialEndDate)) {
            return { allowed: true };
        }
        // Trial expired — need to select plan and pay
        return {
            allowed: false,
            reason: 'Your 7-day free trial has ended. Please select a plan and make a payment to continue collections.',
            status: 'TRIAL_EXPIRED',
        };
    }

    // Active subscription — check this group's invoice for the current month
    if (subscription.status === 'ACTIVE') {
        const billingMonth = getCurrentBillingMonth();

        const invoice = await getOrCreateGroupInvoice(organisationId, groupId, billingMonth);

        if (!invoice) {
            // Group is not billable this month (not started yet, or closed before it) — allow.
            return { allowed: true };
        }

        if (invoice.status === 'PAID' || invoice.status === 'WAIVED') {
            return { allowed: true };
        }

        // Back-compat for the cutover month: a legacy org-wide invoice that was already
        // settled covers every group for that month. Remove after one billing cycle.
        const legacyInvoice = await OrgInvoice.findOne({
            organisationId,
            groupId: null,
            billingMonth,
            status: { $in: ['PAID', 'WAIVED'] },
        });
        if (legacyInvoice) {
            return { allowed: true };
        }

        // Grace period (3 days after due date)
        if (new Date() <= new Date(invoice.graceEndDate)) {
            return { allowed: true };
        }

        // Overdue — block this group only
        return {
            allowed: false,
            reason: `Monthly payment of ₹${invoice.totalAmount} for ${invoice.groupName ?? 'this group'} is overdue. Please make a payment to continue collections.`,
            status: 'OVERDUE',
            invoiceAmount: invoice.totalAmount,
            dueDate: invoice.dueDate,
        };
    }

    // Expired or cancelled
    return {
        allowed: false,
        reason: 'Your subscription has expired. Please renew to continue collections.',
        status: 'EXPIRED',
    };
}

/**
 * Get the billing month date (1st of current month, midnight UTC)
 */
export function getCurrentBillingMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Whether a group owes a fee for the given billing month.
 *
 * Full-month rule: a group active during any part of the month owes the full
 * pricePerGroup. There is no daily proration. A group closed mid-month still owes
 * that month, so this deliberately does not filter on the live ACTIVE status.
 */
function isGroupBillableForMonth(group: any, billingMonth: Date): boolean {
    const monthStart = billingMonth;
    const monthEnd = new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    // Not started yet
    if (new Date(group.startDate) > monthEnd) return false;

    // Ended before this month began
    if (group.endDate && new Date(group.endDate) < monthStart) return false;

    // Closed before this month began (no endDate recorded — fall back to when it was closed)
    if (group.status === 'CLOSED' && !group.endDate && new Date(group.updatedAt) < monthStart) return false;

    return true;
}

/**
 * Generate or fetch a single group's invoice for a billing month.
 * Returns null if the org has no plan, or the group is not billable that month.
 */
export async function getOrCreateGroupInvoice(
    organisationId: string | mongoose.Types.ObjectId,
    groupId: string | mongoose.Types.ObjectId,
    billingMonth: Date = getCurrentBillingMonth(),
) {
    const subscription = await OrgSubscription.findOne({ organisationId });
    if (!subscription || !subscription.planName || subscription.isFree) {
        return null;
    }

    // Existing invoice wins — an issued invoice is never re-priced.
    const existing = await OrgInvoice.findOne({ organisationId, groupId, billingMonth });
    if (existing) {
        return existing;
    }

    const group = await ChitGroup.findOne({ _id: groupId, organisationId });
    if (!group || !isGroupBillableForMonth(group, billingMonth)) {
        return null;
    }

    const dueDate = new Date(billingMonth);
    dueDate.setDate(5); // Due on 5th of the month
    const graceEndDate = new Date(dueDate);
    graceEndDate.setDate(graceEndDate.getDate() + 3); // 3-day grace

    try {
        return await OrgInvoice.create({
            organisationId,
            subscriptionId: subscription._id,
            groupId: group._id,
            groupName: group.groupName,
            billingMonth,
            activeGroupCount: 1,
            pricePerGroup: subscription.pricePerGroup,
            totalAmount: subscription.pricePerGroup,
            status: 'PENDING',
            dueDate,
            graceEndDate,
        });
    } catch (error: any) {
        // Concurrent request already created it — return the winner.
        if (error?.code === 11000) {
            return await OrgInvoice.findOne({ organisationId, groupId, billingMonth });
        }
        throw error;
    }
}

/**
 * Generate or fetch invoices for every billable group of an org for a billing month.
 */
export async function getOrCreateCurrentInvoicesForOrg(
    organisationId: string | mongoose.Types.ObjectId,
    billingMonth: Date = getCurrentBillingMonth(),
) {
    const subscription = await OrgSubscription.findOne({ organisationId });
    if (!subscription || !subscription.planName || subscription.isFree) {
        return [];
    }

    const monthEnd = new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    // Candidate groups: started on or before this month ended, and not ended before it began.
    const groups = await ChitGroup.find({
        organisationId,
        startDate: { $lte: monthEnd },
        $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: billingMonth } }],
    });

    const invoices = [];
    for (const group of groups) {
        if (!isGroupBillableForMonth(group, billingMonth)) continue;
        const invoice = await getOrCreateGroupInvoice(organisationId, group._id, billingMonth);
        if (invoice) invoices.push(invoice);
    }

    return invoices;
}

/**
 * Recompute the organisation's denormalized currentInvoiceStatus from all of the
 * current month's per-group invoices. With per-group billing an org can sit partially
 * paid, so the flag only reads PAID once every group is settled.
 */
export async function syncOrgInvoiceStatus(organisationId: string | mongoose.Types.ObjectId) {
    const billingMonth = getCurrentBillingMonth();
    const invoices = await OrgInvoice.find({ organisationId, billingMonth, groupId: { $ne: null } });

    if (invoices.length === 0) {
        return null;
    }

    const now = new Date();
    const unsettled = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'WAIVED');

    let currentInvoiceStatus: 'PENDING' | 'PAID' | 'OVERDUE';
    if (unsettled.length === 0) {
        currentInvoiceStatus = 'PAID';
    } else if (unsettled.some((i) => now > new Date(i.graceEndDate))) {
        currentInvoiceStatus = 'OVERDUE';
    } else {
        currentInvoiceStatus = 'PENDING';
    }

    await Organisation.findByIdAndUpdate(organisationId, { currentInvoiceStatus });
    return currentInvoiceStatus;
}
