import OrgSubscription from '@/models/OrgSubscription';
import OrgInvoice from '@/models/OrgInvoice';
import ChitGroup from '@/models/ChitGroup';
import mongoose from 'mongoose';

export interface SubscriptionGateResult {
    allowed: boolean;
    reason?: string;
    status?: string;
    invoiceAmount?: number;
    dueDate?: Date;
}

/**
 * Check if an organisation is allowed to perform collections.
 * Returns { allowed: true } if OK, or { allowed: false, reason, ... } if blocked.
 */
export async function checkSubscriptionGate(organisationId: string | mongoose.Types.ObjectId): Promise<SubscriptionGateResult> {
    const subscription = await OrgSubscription.findOne({ organisationId });

    if (!subscription) {
        return { allowed: false, reason: 'No subscription found. Please contact support.', status: 'NONE' };
    }

    // Trial check
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

    // Active subscription — check current month's invoice
    if (subscription.status === 'ACTIVE') {
        const now = new Date();
        const billingMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // If paid through a future date, allow without checking invoice
        if (subscription.paidThroughDate && now <= new Date(subscription.paidThroughDate)) {
            return { allowed: true };
        }

        const invoice = await OrgInvoice.findOne({
            organisationId,
            billingMonth,
        });

        if (!invoice) {
            // No invoice generated yet for this month — allow (will be generated on demand)
            return { allowed: true };
        }

        if (invoice.status === 'PAID' || invoice.status === 'WAIVED') {
            return { allowed: true };
        }

        // Check grace period (3 days after due date)
        if (new Date() <= new Date(invoice.graceEndDate)) {
            return { allowed: true };
        }

        // Overdue — block
        return {
            allowed: false,
            reason: `Monthly payment of ₹${invoice.totalAmount} is overdue. Please make a payment to continue collections.`,
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
 * Generate or fetch the current month's invoice for an organisation.
 */
export async function getOrCreateCurrentInvoice(organisationId: string | mongoose.Types.ObjectId) {
    const subscription = await OrgSubscription.findOne({ organisationId });
    if (!subscription || !subscription.planName) {
        return null;
    }

    const billingMonth = getCurrentBillingMonth();

    // Check existing
    let invoice = await OrgInvoice.findOne({ organisationId, billingMonth });
    if (invoice) {
        return invoice;
    }

    // Count active groups
    const activeGroupCount = await ChitGroup.countDocuments({
        organisationId,
        status: 'ACTIVE',
    });

    if (activeGroupCount === 0) {
        return null; // No groups — no invoice needed
    }

    const totalAmount = activeGroupCount * subscription.pricePerGroup;
    const dueDate = new Date(billingMonth);
    dueDate.setDate(5); // Due on 5th of the month
    const graceEndDate = new Date(dueDate);
    graceEndDate.setDate(graceEndDate.getDate() + 3); // 3-day grace

    invoice = await OrgInvoice.create({
        organisationId,
        subscriptionId: subscription._id,
        billingMonth,
        activeGroupCount,
        pricePerGroup: subscription.pricePerGroup,
        totalAmount,
        status: 'PENDING',
        dueDate,
        graceEndDate,
    });

    return invoice;
}
