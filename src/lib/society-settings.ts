/**
 * Society-level configurable settings.
 * Stored in localStorage under 'societySettings'.
 *
 * The society admin sets these in the Settings page.
 * Values here are stamped onto each loan at disbursement time and stored
 * on the member record — so changing the setting does NOT retroactively
 * alter existing loans.
 */

export interface SocietySettings {
    /** Monthly loan interest rate (%) applied to new loans. Default: 1.5 */
    loanInterestRate: number;
    /** After this many months without full repayment, the rate doubles. Default: 12 */
    penaltyAfterMonths: number;
    /** Maximum loan multiple of (shares + savings). Default: 2 */
    maxLoanMultiple: number;
    /** Minimum months of membership before loan eligibility. Default: 6 */
    minMembershipMonthsForLoan: number;
    /** Society name as shown in reports */
    societyName: string;
}

const STORAGE_KEY = 'societySettings';

const DEFAULTS: SocietySettings = {
    loanInterestRate: 1.5,
    penaltyAfterMonths: 12,
    maxLoanMultiple: 2,
    minMembershipMonthsForLoan: 6,
    societyName: 'Osuolale Cooperative Society',
};

/** Load settings from localStorage (merges with defaults for missing keys) */
export function getSocietySettings(): SocietySettings {
    if (typeof window === 'undefined') return { ...DEFAULTS };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULTS };
        return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULTS };
    }
}

/** Persist updated settings to localStorage */
export function saveSocietySettings(settings: Partial<SocietySettings>): SocietySettings {
    const current = getSocietySettings();
    const merged = { ...current, ...settings };
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
}
