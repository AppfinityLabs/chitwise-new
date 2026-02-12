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
 * Calculate how much a member should have paid by now within the current period,
 * accounting for their collection pattern (DAILY/WEEKLY/MONTHLY).
 * For members with sub-period collection patterns (e.g., daily in a monthly group),
 * only the installments due up to today are expected, not the full period amount.
 */
function calculateExpectedAmountForCurrentPeriod(
    group: { startDate: Date | string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; contributionAmount: number },
    subscription: { units: number; collectionPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY'; collectionFactor?: number }
): number {
    const contributionPerPeriod = group.contributionAmount * subscription.units;
    const collectionFactor = subscription.collectionFactor || 1;
    const collectionPattern = subscription.collectionPattern || group.frequency;

    // If member's collection pattern matches group frequency, full amount is due
    if (collectionPattern === group.frequency || collectionFactor <= 1) {
        return contributionPerPeriod;
    }

    // Calculate how many sub-installments are due within the current period
    const now = new Date();
    const start = new Date(group.startDate);
    const amountPerInstallment = contributionPerPeriod / collectionFactor;

    let installmentsDue = 0;

    if (group.frequency === 'MONTHLY') {
        // Calculate start of current period (month)
        const currentPeriod = calculateCurrentPeriod(group);
        const periodStart = new Date(start);
        periodStart.setMonth(periodStart.getMonth() + (currentPeriod - 1));

        if (collectionPattern === 'DAILY') {
            const diffTime = now.getTime() - periodStart.getTime();
            const daysSincePeriodStart = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            installmentsDue = Math.max(1, Math.min(daysSincePeriodStart, collectionFactor));
        } else if (collectionPattern === 'WEEKLY') {
            const diffTime = now.getTime() - periodStart.getTime();
            const weeksSincePeriodStart = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
            installmentsDue = Math.max(1, Math.min(weeksSincePeriodStart, collectionFactor));
        }
    } else if (group.frequency === 'WEEKLY') {
        if (collectionPattern === 'DAILY') {
            const currentPeriod = calculateCurrentPeriod(group);
            const periodStart = new Date(start);
            periodStart.setDate(periodStart.getDate() + (currentPeriod - 1) * 7);

            const diffTime = now.getTime() - periodStart.getTime();
            const daysSincePeriodStart = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            installmentsDue = Math.max(1, Math.min(daysSincePeriodStart, collectionFactor));
        }
    }

    // Fallback: if we couldn't determine, expect at least 1 installment
    if (installmentsDue === 0) installmentsDue = 1;

    return amountPerInstallment * installmentsDue;
}

/**
 * Calculate the overdue amount for a subscription based on the group's current period.
 * Returns 0 if the group hasn't started or member is paid up.
 * Accounts for the member's collection pattern — for daily-pattern members in a
 * monthly group, only the installments due up to today are expected.
 */
export function calculateOverdueAmount(
    group: { startDate: Date | string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; totalPeriods: number; contributionAmount: number },
    subscription: { units: number; totalCollected: number; collectionPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY'; collectionFactor?: number }
): number {
    const currentPeriod = calculateCurrentPeriod(group);
    if (currentPeriod === 0) return 0;

    const contributionPerPeriod = group.contributionAmount * subscription.units;

    // Full amount expected for all completed past periods
    const pastPeriodsExpected = (currentPeriod - 1) * contributionPerPeriod;

    // Partial amount expected for current in-progress period based on collection pattern
    const currentPeriodExpected = calculateExpectedAmountForCurrentPeriod(group, subscription);

    const totalExpected = pastPeriodsExpected + currentPeriodExpected;
    return Math.max(0, totalExpected - subscription.totalCollected);
}

/**
 * Determine the payment status of a subscription.
 * - ALL_CLEAR: Fully paid through all installments due up to today
 * - DUE: Current installments pending but past periods are paid (not yet overdue)
 * - OVERDUE: One or more past periods' installments are unpaid
 * - NOT_STARTED: Group hasn't started yet
 */
export function calculatePaymentStatus(
    group: { startDate: Date | string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; totalPeriods: number; contributionAmount: number },
    subscription: { units: number; totalCollected: number; collectionPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY'; collectionFactor?: number }
): 'ALL_CLEAR' | 'DUE' | 'OVERDUE' | 'NOT_STARTED' {
    const currentPeriod = calculateCurrentPeriod(group);

    if (currentPeriod === 0) return 'NOT_STARTED';

    const contributionPerPeriod = group.contributionAmount * subscription.units;

    // Past periods expected (must be fully paid)
    const pastPeriodsExpected = (currentPeriod - 1) * contributionPerPeriod;

    // Current period expected (based on sub-installments due today)
    const currentPeriodExpected = calculateExpectedAmountForCurrentPeriod(group, subscription);
    const totalExpected = pastPeriodsExpected + currentPeriodExpected;

    if (subscription.totalCollected >= totalExpected) return 'ALL_CLEAR';
    if (subscription.totalCollected >= pastPeriodsExpected) return 'DUE';
    return 'OVERDUE';
}
