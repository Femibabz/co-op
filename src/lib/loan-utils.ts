import { Member } from '@/types';
import { getSocietySettings } from './society-settings';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LOAN INTEREST RULES
 * ────────────────────────────────────────────────────────────────────────────
 * • Default monthly interest rate: 1.0% of outstanding PRINCIPAL balance
 * • After 12 months without full repayment: rate doubles to 2.0%
 * • Interest is calculated once per month, on the 1st of the month FOLLOWING
 *   the month in which the loan was disbursed.
 *   e.g. Loan disbursed 15-Jan → first interest charged 1-Feb
 * • Interest accumulates in `interestBalance` (separate from `loanBalance`)
 * • Interest is calculated on the PRINCIPAL (loanBalance) only — no
 *   compounding on unpaid interest.
 * • Payment allocation order: outstanding interest first, then principal.
 * • Interest is ONLY added explicitly by the admin via the "Calculate Interest"
 *   page — it is NOT automatically added on every page load or member fetch.
 * ════════════════════════════════════════════════════════════════════════════
 */

/** Helper: integer month difference between two dates (ignores day-of-month) */
export function getMonthsDifference(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

/**
 * Returns the member's loan interest rate per month.
 * Uses the rate stored on the member record (set at disbursement).
 * Falls back to the current society setting for older records.
 * Rate doubles after penaltyAfterMonths.
 */
export function getCurrentInterestRate(member: Member): number {
  const settings = getSocietySettings();
  const baseRate = (member.loanInterestRate != null && member.loanInterestRate > 0)
    ? member.loanInterestRate
    : settings.loanInterestRate;

  if (shouldDoubleInterestRate(member)) {
    return baseRate * 2;   // penalty rate
  }
  return baseRate;
}

/** True if the loan has been running for ≥ penaltyAfterMonths without full repayment */
export function shouldDoubleInterestRate(member: Member): boolean {
  if (!member.loanStartDate || (member.loanBalance ?? 0) <= 0) return false;
  const { penaltyAfterMonths } = getSocietySettings();
  const months = getMonthsDifference(new Date(member.loanStartDate), new Date());
  return months >= penaltyAfterMonths;
}

/**
 * Monthly interest amount on the CURRENT principal balance.
 * Interest = loanBalance × monthlyRate / 100
 */
export function calculateMonthlyInterest(member: Member): number {
  if ((member.loanBalance ?? 0) <= 0) return 0;
  const rate = getCurrentInterestRate(member);
  return Math.round((member.loanBalance! * rate) / 100);
}

/**
 * Calculate how many months of interest have NOT yet been charged since the
 * last calculation date (or since the loan was disbursed).
 *
 * This is a READ-ONLY preview — it does NOT write anything.
 *
 * Timing rule: interest for month M is charged on the 1st of month M+1.
 *   Loan Jan-15 → first charge Feb-01
 *   If lastInterestCalculationDate = Feb-01 and today = Apr-05 → 2 months due
 *     (Mar-01 and Apr-01 charges)
 */
export function calculateAccumulatedInterest(member: Member): {
  monthsToCalculate: number;
  totalInterest: number;
  newInterestBalance: number;
  breakdown: Array<{ month: string; balance: number; rate: number; interest: number }>;
} {
  const empty = {
    monthsToCalculate: 0,
    totalInterest: 0,
    newInterestBalance: member.interestBalance || 0,
    breakdown: [],
  };

  if ((member.loanBalance ?? 0) <= 0 || !member.loanStartDate) return empty;

  const loanStartDate = new Date(member.loanStartDate);
  const now = new Date();

  // First interest charge date: 1st of month following loan disbursement
  const firstChargeDate = new Date(
    loanStartDate.getFullYear(),
    loanStartDate.getMonth() + 1,
    1
  );

  if (now < firstChargeDate) return empty; // too early

  // Start from last calculation date (or first charge date if never calculated)
  const lastCalc = member.lastInterestCalculationDate
    ? new Date(member.lastInterestCalculationDate)
    : null;

  // The next charge month is the month AFTER the last calculation
  const startChargeDate = lastCalc
    ? new Date(lastCalc.getFullYear(), lastCalc.getMonth() + 1, 1)
    : firstChargeDate;

  // The ceiling is the START OF NEXT MONTH so that interest fires ON the 1st.
  // Example: today = Feb 1 → nextMonthStart = Mar 1
  //   startChargeDate = Feb 1 → monthsToCalculate = getMonthsDiff(Feb 1, Mar 1) = 1  ✓
  // Example: today = Feb 15 → nextMonthStart = Mar 1
  //   startChargeDate = Mar 1 (interest was charged on Feb 1) → 0  ✓
  // Example: today = Mar 1  → nextMonthStart = Apr 1
  //   startChargeDate = Mar 1 → getMonthsDiff(Mar 1, Apr 1) = 1  ✓
  const ceilingMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Calculate how many months of interest to charge
  const monthsToCalculate = getMonthsDifference(startChargeDate, ceilingMonth);
  if (monthsToCalculate <= 0) return empty;

  // Build month-by-month breakdown
  const breakdown: Array<{ month: string; balance: number; rate: number; interest: number }> = [];
  let totalInterest = 0;

  for (let i = 0; i < monthsToCalculate; i++) {
    const chargeDate = new Date(
      startChargeDate.getFullYear(),
      startChargeDate.getMonth() + i,
      1
    );
    const monthsSinceDisbursement = getMonthsDifference(loanStartDate, chargeDate);
    const baseRate = (member.loanInterestRate != null && member.loanInterestRate > 0)
      ? member.loanInterestRate
      : 1.0;
    const rate = monthsSinceDisbursement >= 12 ? baseRate * 2 : baseRate;
    
    // For the first month being calculated, use the locked-in scheduled interest if available.
    // This implements the "interest lock-in" rule.
    let interest = Math.round((member.loanBalance! * rate) / 100);
    if (i === 0 && member.nextScheduledInterest !== undefined && member.nextScheduledInterest > 0) {
      interest = member.nextScheduledInterest;
    }

    totalInterest += interest;
    breakdown.push({
      month: chargeDate.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }),
      balance: member.loanBalance!,
      rate,
      interest,
    });
  }

  return {
    monthsToCalculate,
    totalInterest,
    newInterestBalance: (member.interestBalance || 0) + totalInterest,
    breakdown,
  };
}

/**
 * Process a loan repayment.
 * Allocation order:  1. Outstanding interest  →  2. Principal
 *
 * Returns the amounts applied and the resulting new balances.
 */
export function processLoanPayment(
  member: Member,
  paymentAmount: number
): {
  interestPaid: number;
  principalPaid: number;
  newInterestBalance: number;
  newLoanBalance: number;
  remainingPayment: number;
} {
  let remaining = paymentAmount;
  let interestPaid = 0;
  let principalPaid = 0;

  // Step 1: Clear outstanding interest first
  const outstandingInterest = member.interestBalance || 0;
  if (outstandingInterest > 0 && remaining > 0) {
    interestPaid = Math.min(remaining, outstandingInterest);
    remaining -= interestPaid;
  }

  // Step 2: Apply remainder to principal
  const outstandingPrincipal = member.loanBalance || 0;
  if (outstandingPrincipal > 0 && remaining > 0) {
    principalPaid = Math.min(remaining, outstandingPrincipal);
    remaining -= principalPaid;
  }

  return {
    interestPaid,
    principalPaid,
    newInterestBalance: outstandingInterest - interestPaid,
    newLoanBalance: outstandingPrincipal - principalPaid,
    remainingPayment: remaining,
  };
}

/** Date on which the next interest charge will be added (1st of next month) */
export function getNextInterestDueDate(member: Member): Date | null {
  if (!member.loanStartDate || (member.loanBalance ?? 0) <= 0) return null;

  const now = new Date();
  const loanStartDate = new Date(member.loanStartDate);
  const firstChargeDate = new Date(loanStartDate.getFullYear(), loanStartDate.getMonth() + 1, 1);

  if (now < firstChargeDate) return firstChargeDate;

  // Next interest is always the 1st of next calendar month
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/**
 * Preview of what next month's interest charge will be.
 * Used to show members / admins a forward-looking estimate.
 */
export function getNextMonthInterestPreview(member: Member): {
  date: Date;
  amount: number;
  rate: number;
  message: string;
  isFirstInterest: boolean;
} | null {
  if (!member.loanStartDate || (member.loanBalance ?? 0) <= 0) return null;

  const now = new Date();
  const loanStartDate = new Date(member.loanStartDate);
  const firstChargeDate = new Date(loanStartDate.getFullYear(), loanStartDate.getMonth() + 1, 1);

  const date = now < firstChargeDate
    ? firstChargeDate
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Use locked-in interest if available, otherwise calculate on current balance
  const amount = member.nextScheduledInterest ?? Math.round((member.loanBalance! * (getCurrentInterestRate(member))) / 100);
  const rate = getCurrentInterestRate(member);
  const monthLabel = date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

  const isFirstInterest = now < firstChargeDate;
  const message = isFirstInterest
    ? `First interest of ${formatNaira(amount)} will be charged on ${date.toLocaleDateString('en-NG')} (${monthLabel})`
    : `Interest of ${formatNaira(amount)} will be charged on ${date.toLocaleDateString('en-NG')} (${monthLabel})`;

  return { date, amount, rate, message, isFirstInterest };
}

/** Nigerian Naira currency formatter */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Full loan status summary for a member.
 * Used by admin process-payment page and member dashboard.
 */
export function getLoanSummary(member: Member): {
  hasActiveLoan: boolean;
  loanBalance: number;
  interestBalance: number;
  totalOwed: number;
  monthsSinceDisbursement: number;
  currentMonthlyRate: number;
  nextMonthInterest: number;
  isPenaltyRate: boolean;
  nextInterestDueDate: Date | null;
  monthsOverdue: number;
  isOverdue: boolean;
  monthsRemaining: number;
  loanEndDate: Date | null;
  nextPaymentDate: Date | null;
  interestDue: number;
  pendingInterestMonths: number;
  pendingInterestAmount: number;
} | null {
  if ((member.loanBalance ?? 0) <= 0) return null;

  const loanBalance = member.loanBalance!;
  const interestBalance = member.interestBalance || 0;
  const monthsSinceDisbursement = member.loanStartDate
    ? getMonthsDifference(new Date(member.loanStartDate), new Date())
    : 0;

  const currentMonthlyRate = getCurrentInterestRate(member);
  const nextMonthInterest = member.nextScheduledInterest ?? Math.round((loanBalance * currentMonthlyRate) / 100);
  const isPenaltyRate = shouldDoubleInterestRate(member);
  const nextInterestDueDate = getNextInterestDueDate(member);

  const loanDurationMonths = member.loanDurationMonths || 12;
  const monthsOverdue = Math.max(0, monthsSinceDisbursement - loanDurationMonths);
  const isOverdue = monthsOverdue > 0;
  const monthsRemaining = Math.max(0, loanDurationMonths - monthsSinceDisbursement);

  const loanEndDate = member.loanStartDate
    ? new Date(
      new Date(member.loanStartDate).getFullYear(),
      new Date(member.loanStartDate).getMonth() + loanDurationMonths,
      new Date(member.loanStartDate).getDate()
    )
    : null;

  // Check for un-charged months
  const pending = calculateAccumulatedInterest(member);

  return {
    hasActiveLoan: true,
    loanBalance,
    interestBalance,
    totalOwed: loanBalance + interestBalance,
    monthsSinceDisbursement,
    currentMonthlyRate,
    nextMonthInterest,
    isPenaltyRate,
    nextInterestDueDate,
    monthsOverdue,
    isOverdue,
    monthsRemaining,
    loanEndDate,
    nextPaymentDate: nextInterestDueDate,
    interestDue: interestBalance,
    pendingInterestMonths: pending.monthsToCalculate,
    pendingInterestAmount: pending.totalInterest,
  };
}
