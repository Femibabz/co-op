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
    /** Number of guarantors required for a loan application. Default: 2 */
    loanGuarantorCount: number;
    /** Number of guarantors required for a membership application. Default: 2 */
    membershipGuarantorCount: number;
    /** Maximum simultaneous active guarantees a member can hold. Default: 2 */
    maxActiveGuaranteesPerMember: number;
}

const BASE_STORAGE_KEY = 'societySettings';

const DEFAULTS: SocietySettings = {
    loanInterestRate: 1.5,
    penaltyAfterMonths: 12,
    maxLoanMultiple: 2,
    minMembershipMonthsForLoan: 6,
    societyName: 'Default Cooperative Society',
    loanGuarantorCount: 2,
    membershipGuarantorCount: 2,
    maxActiveGuaranteesPerMember: 2,
};

/** Load settings from localStorage (merges with defaults for missing keys) */
export function getSocietySettings(societyId?: string): SocietySettings {
    if (typeof window === 'undefined') return { ...DEFAULTS };
    try {
        const key = societyId ? `${BASE_STORAGE_KEY}_${societyId}` : BASE_STORAGE_KEY;
        const raw = localStorage.getItem(key);
        if (!raw) return { ...DEFAULTS };
        return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULTS };
    }
}

/** Persist updated settings to localStorage */
export function saveSocietySettings(settings: Partial<SocietySettings>, societyId?: string): SocietySettings {
    const current = getSocietySettings(societyId);
    const merged = { ...current, ...settings };
    if (typeof window !== 'undefined') {
        const key = societyId ? `${BASE_STORAGE_KEY}_${societyId}` : BASE_STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(merged));
    }
    return merged;
}
