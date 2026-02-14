import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// ─── Type aliases for readability ────────────────────────────────────────────
type GroupInfo = {
    startDate: Date | string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    totalPeriods: number;
    contributionAmount: number;
};
type SubInfo = {
    units: number;
    totalCollected: number;
    collectionPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    collectionFactor?: number;
};

/**
 * Dynamically calculate the current period of a chit group based on start date and frequency.
 * Returns 0 if the group hasn't started yet (startDate > now).
 * Capped at totalPeriods.
 *
 * For MONTHLY groups the period advances on the **start-date anniversary** each month,
 * NOT on the calendar-month boundary.
 *   e.g. startDate = Jan 15 → Period 2 starts Feb 15, NOT Feb 1.
 */
export function calculateCurrentPeriod(group: {
    startDate: Date | string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    totalPeriods: number;
}): number {
    const now = new Date();
    const start = new Date(group.startDate);

    if (now < start) return 0; // Group hasn't started

    let calculatedPeriod = 0;

    if (group.frequency === 'DAILY') {
        const diffTime = now.getTime() - start.getTime();
        // Use floor so "same day" = period 1, next calendar-day = period 2
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        calculatedPeriod = diffDays + 1;
    } else if (group.frequency === 'WEEKLY') {
        const diffTime = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        calculatedPeriod = Math.floor(diffDays / 7) + 1;
    } else if (group.frequency === 'MONTHLY') {
        // Calculate month difference respecting the start day-of-month.
        let diffMonths = (now.getFullYear() - start.getFullYear()) * 12
            + (now.getMonth() - start.getMonth());

        // If the current day hasn't reached the start-date anniversary day,
        // we're still in the previous period.
        // Handle edge case: if start day > days-in-current-month (e.g. 31 → Feb),
        // treat the last day of the month as the boundary.
        const startDay = start.getDate();
        const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const effectiveStartDay = Math.min(startDay, daysInCurrentMonth);
        if (now.getDate() < effectiveStartDay) {
            diffMonths -= 1;
        }

        calculatedPeriod = Math.max(1, diffMonths + 1);
    }

    return Math.min(calculatedPeriod, group.totalPeriods);
}

/**
 * Get the start date of a specific period within a group.
 */
function getPeriodStartDate(group: { startDate: Date | string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' }, period: number): Date {
    const start = new Date(group.startDate);
    if (group.frequency === 'DAILY') {
        const d = new Date(start);
        d.setDate(d.getDate() + (period - 1));
        return d;
    } else if (group.frequency === 'WEEKLY') {
        const d = new Date(start);
        d.setDate(d.getDate() + (period - 1) * 7);
        return d;
    } else {
        // MONTHLY — advance by months preserving start day
        const d = new Date(start);
        d.setMonth(d.getMonth() + (period - 1));
        return d;
    }
}

/**
 * Calculate how many sub-installments within the current period have their
 * **deadline passed** (i.e. the member should have already paid them).
 *
 * Business rule (confirmed):
 *   - A WEEKLY installment is NOT due until the 7-day window expires.
 *     e.g. Group starts Feb 1, weekly member: week-1 deadline = Feb 7 end-of-day.
 *     Only on Feb 8+ does week-1 become "overdue" if unpaid.
 *   - A DAILY installment is due at the end of that day; overdue from next day.
 *   - A MONTHLY installment is due at the end of the period; overdue from next period.
 *
 * Returns the number of **completed** sub-installments whose deadlines have passed.
 * This is used for OVERDUE calculation — we only mark as overdue what should
 * have been paid by now.
 */
export function countCompletedInstallments(
    group: { startDate: Date | string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; contributionAmount: number },
    subscription: { units: number; collectionPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY'; collectionFactor?: number },
    currentPeriod: number
): number {
    const collectionFactor = (subscription.collectionFactor != null && subscription.collectionFactor >= 1)
        ? subscription.collectionFactor : 1;
    const collectionPattern = subscription.collectionPattern || group.frequency;

    // If member's collection pattern matches group frequency, the installment
    // is due at the END of the period → 0 completed sub-installments within
    // the current period (past-periods logic handles completed periods).
    if (collectionPattern === group.frequency || collectionFactor <= 1) {
        return 0;
    }

    const now = new Date();
    const periodStart = getPeriodStartDate(group, currentPeriod);
    const diffMs = now.getTime() - periodStart.getTime();
    if (diffMs < 0) return 0;

    const daysSincePeriodStart = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let completedInstallments = 0;

    if (group.frequency === 'MONTHLY') {
        if (collectionPattern === 'DAILY') {
            // Day 0 (start day) = installment 1 window open, due at end-of-day.
            // Day 1 = installment 1 deadline passed → 1 completed.
            completedInstallments = Math.min(daysSincePeriodStart, collectionFactor);
        } else if (collectionPattern === 'WEEKLY') {
            // Week 1 = days 0-6, deadline at end of day 6.
            // Day 7+ = week 1 completed → 1 installment past deadline.
            completedInstallments = Math.min(Math.floor(daysSincePeriodStart / 7), collectionFactor);
        }
    } else if (group.frequency === 'WEEKLY') {
        if (collectionPattern === 'DAILY') {
            completedInstallments = Math.min(daysSincePeriodStart, collectionFactor);
        }
    }

    return completedInstallments;
}

/**
 * Calculate how many sub-installments are currently "active" (deadline not yet
 * passed, but the window is open for payment). This is used for DUE status −
 * the member SHOULD pay but is not yet OVERDUE.
 *
 * Returns completedInstallments + 1 (the current active one), capped at collectionFactor.
 * If the member's pattern matches the group frequency, returns 1 (the whole period is one installment).
 */
function countActiveInstallments(
    group: { startDate: Date | string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; contributionAmount: number },
    subscription: { units: number; collectionPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY'; collectionFactor?: number },
    currentPeriod: number
): number {
    const collectionFactor = (subscription.collectionFactor != null && subscription.collectionFactor >= 1)
        ? subscription.collectionFactor : 1;
    const collectionPattern = subscription.collectionPattern || group.frequency;

    if (collectionPattern === group.frequency || collectionFactor <= 1) {
        // The whole period is one installment, currently active
        return 1;
    }

    const completed = countCompletedInstallments(group, subscription, currentPeriod);
    // Current active = completed + 1 (the one whose window is open now)
    return Math.min(completed + 1, collectionFactor);
}

/**
 * Calculate the overdue amount for a subscription based on the group's current period.
 * Returns 0 if the group hasn't started or member is paid up.
 *
 * OVERDUE = amount whose deadline has ALREADY PASSED and remains unpaid.
 *
 * Formula:
 *   overdueExpected = (pastCompletedPeriods × contributionPerPeriod)
 *                   + (completedInstallmentsInCurrentPeriod × amountPerInstallment)
 *   overdueAmount   = max(0, overdueExpected − totalCollected)
 *
 * A member is NOT overdue for installments whose payment window is still open.
 */
export function calculateOverdueAmount(group: GroupInfo, subscription: SubInfo): number {
    const currentPeriod = calculateCurrentPeriod(group);
    if (currentPeriod === 0) return 0;

    const collectionFactor = (subscription.collectionFactor != null && subscription.collectionFactor >= 1)
        ? subscription.collectionFactor : 1;
    const contributionPerPeriod = group.contributionAmount * subscription.units;
    const amountPerInstallment = contributionPerPeriod / collectionFactor;

    // Full amount expected for all completed past periods
    const pastPeriodsExpected = (currentPeriod - 1) * contributionPerPeriod;

    // Only count installments in the current period whose deadline has passed
    const completedInstallments = countCompletedInstallments(group, subscription, currentPeriod);
    const currentPeriodOverdueExpected = completedInstallments * amountPerInstallment;

    const totalOverdueExpected = pastPeriodsExpected + currentPeriodOverdueExpected;
    return Math.max(0, Math.round((totalOverdueExpected - subscription.totalCollected) * 100) / 100);
}

/**
 * Calculate the current DUE amount — installments whose window is open but deadline
 * hasn't passed yet. This is what the member should pay NOW but isn't overdue for yet.
 */
export function calculateDueAmount(group: GroupInfo, subscription: SubInfo): number {
    const currentPeriod = calculateCurrentPeriod(group);
    if (currentPeriod === 0) return 0;

    const collectionFactor = (subscription.collectionFactor != null && subscription.collectionFactor >= 1)
        ? subscription.collectionFactor : 1;
    const contributionPerPeriod = group.contributionAmount * subscription.units;
    const amountPerInstallment = contributionPerPeriod / collectionFactor;

    const pastPeriodsExpected = (currentPeriod - 1) * contributionPerPeriod;
    const activeInstallments = countActiveInstallments(group, subscription, currentPeriod);
    const totalActiveExpected = pastPeriodsExpected + (activeInstallments * amountPerInstallment);

    const overdueExpected = pastPeriodsExpected
        + (countCompletedInstallments(group, subscription, currentPeriod) * amountPerInstallment);

    // Due = what's expected for active installments minus what's already paid,
    // but excluding the overdue portion (which is tracked separately).
    const totalUnpaid = Math.max(0, totalActiveExpected - subscription.totalCollected);
    const overdueUnpaid = Math.max(0, overdueExpected - subscription.totalCollected);

    return Math.max(0, Math.round((totalUnpaid - overdueUnpaid) * 100) / 100);
}

/**
 * Determine the payment status of a subscription.
 * - ALL_CLEAR: Fully paid through all installments whose window is open (including current)
 * - DUE: Current installment window is open, member can still pay on time (not overdue)
 * - OVERDUE: One or more past installment deadlines have passed with unpaid amounts
 * - NOT_STARTED: Group hasn't started yet
 */
export function calculatePaymentStatus(group: GroupInfo, subscription: SubInfo): 'ALL_CLEAR' | 'DUE' | 'OVERDUE' | 'NOT_STARTED' {
    const currentPeriod = calculateCurrentPeriod(group);
    if (currentPeriod === 0) return 'NOT_STARTED';

    const overdueAmount = calculateOverdueAmount(group, subscription);
    if (overdueAmount > 0) return 'OVERDUE';

    const dueAmount = calculateDueAmount(group, subscription);
    if (dueAmount > 0) return 'DUE';

    return 'ALL_CLEAR';
}
