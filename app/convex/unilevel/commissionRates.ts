/**
 * Unilevel Commission Rates
 * 
 * 10-Level commission structure with progressive unlock
 * Unlock formula: Active Direct Referrals × 2 = Unlocked Levels (max 10)
 */

export const UNILEVEL_RATES: Record<number, number> = {
    1: 0.03,  // 3%
    2: 0.02,  // 2%
    3: 0.01,  // 1%
    4: 0.01,  // 1%
    5: 0.01,  // 1%
    6: 0.01,  // 1%
    7: 0.01,  // 1%
    8: 0.01,  // 1%
    9: 0.02,  // 2%
    10: 0.03, // 3%
};

/**
 * Get commission rate for a specific level
 */
export function getCommissionRate(level: number): number {
    if (level < 1 || level > 10) return 0;
    return UNILEVEL_RATES[level] || 0;
}

/**
 * Calculate unlocked levels based on active direct referrals
 * Formula: Active Directs × 2 (max 10)
 */
export function calculateUnlockedLevels(activeDirects: number): number {
    return Math.min(activeDirects * 2, 10);
}

/**
 * Get week string in format "YYYY-WW"
 */
export function getWeekString(date: Date): string {
    const year = date.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${year}-${String(week).padStart(2, '0')}`;
}

/**
 * Format date for reporting
 */
export function formatReportingDate(timestamp: number) {
    const date = new Date(timestamp);
    return {
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        week: getWeekString(date),               // YYYY-WW
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, // YYYY-MM
        year: date.getFullYear(),
    };
}
