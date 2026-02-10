import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Dynamically calculate the current period of a chit group based on start date and frequency.
 * Returns 0 if the group hasn't started yet (startDate > now).
 * Capped at totalPeriods.
 */
export function calculateCurrentPeriod(group: {
    startDate: Date | string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    totalPeriods: number;
}): number {
    const now = new Date();
    const start = new Date(group.startDate);

    if (now < start) return 0; // Group hasn't started

    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let calculatedPeriod = 0;

    if (group.frequency === 'DAILY') {
        calculatedPeriod = diffDays + 1;
    } else if (group.frequency === 'WEEKLY') {
        calculatedPeriod = Math.floor(diffDays / 7) + 1;
    } else if (group.frequency === 'MONTHLY') {
        const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        calculatedPeriod = diffMonths + 1;
    }

    return Math.min(calculatedPeriod, group.totalPeriods);
}

/**
 * Calculate the overdue amount for a subscription based on the group's current period.
 * Returns 0 if the group hasn't started or member is paid up.
 */
export function calculateOverdueAmount(
    group: { startDate: Date | string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; totalPeriods: number; contributionAmount: number },
    subscription: { units: number; totalCollected: number }
): number {
    const currentPeriod = calculateCurrentPeriod(group);
    const expectedAmount = currentPeriod * group.contributionAmount * subscription.units;
    return Math.max(0, expectedAmount - subscription.totalCollected);
}

/**
 * Determine the payment status of a subscription.
 * - ALL_CLEAR: Fully paid through current period
 * - DUE: Current period payment pending but not yet overdue (only current period unpaid)
 * - OVERDUE: One or more past periods are unpaid
 * - NOT_STARTED: Group hasn't started yet
 */
export function calculatePaymentStatus(
    group: { startDate: Date | string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; totalPeriods: number; contributionAmount: number },
    subscription: { units: number; totalCollected: number }
): 'ALL_CLEAR' | 'DUE' | 'OVERDUE' | 'NOT_STARTED' {
    const currentPeriod = calculateCurrentPeriod(group);

    if (currentPeriod === 0) return 'NOT_STARTED';

    const expectedAmount = currentPeriod * group.contributionAmount * subscription.units;
    const previousPeriodExpected = (currentPeriod - 1) * group.contributionAmount * subscription.units;

    if (subscription.totalCollected >= expectedAmount) return 'ALL_CLEAR';
    if (subscription.totalCollected >= previousPeriodExpected) return 'DUE';
    return 'OVERDUE';
}
