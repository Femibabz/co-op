import { Member } from '@/types';
import { calculateAccumulatedInterest } from './loan-utils';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * ══════════════════════════════════════════════════════════════════════════
 * INTEREST CALCULATION MODULE
 * ──────────────────────────────────────────────────────────────────────────
 * Interest is NEVER automatically added on data fetches.
 * It must be explicitly triggered by an admin via the
 * "Calculate Interest" admin page (or a scheduled job).
 *
 * Rules (see loan-utils.ts for full rule set):
 *  • 1st charge is on the 1st of the month AFTER loan disbursement
 *  • Rate: member.loanInterestRate (default 1.0%), doubles after 12 months
 *  • Calculated on outstanding PRINCIPAL — no interest-on-interest
 * ══════════════════════════════════════════════════════════════════════════
 */

/**
 * Calculate and record any uncharged interest for a single member.
 * Returns the updated member (with interestBalance incremented) if interest
 * was due, or the original member if nothing was owed yet.
 */
export async function autoCalculateInterest(member: Member): Promise<Member> {
  if ((member.loanBalance ?? 0) <= 0) return member;

  const result = calculateAccumulatedInterest(member);
  if (result.monthsToCalculate <= 0 || result.totalInterest <= 0) return member;

  const updatedMember: Member = {
    ...member,
    interestBalance: result.newInterestBalance,
    lastInterestCalculationDate: new Date(),
  };

  // Persist to database (Supabase + localStorage)
  await persistInterestCharge(member.id, member.societyId, result);

  return updatedMember;
}

/**
 * Run interest calculation for every member that has an active loan.
 * Called only by the admin "Calculate Interest" page.
 */
export async function autoCalculateInterestForAll(members: Member[]): Promise<Member[]> {
  const results: Member[] = [];
  for (const member of members) {
    results.push(await autoCalculateInterest(member));
  }
  return results;
}

/** True when a member has at least one uncharged month of interest waiting */
export function needsInterestCalculation(member: Member): boolean {
  if ((member.loanBalance ?? 0) <= 0) return false;
  const result = calculateAccumulatedInterest(member);
  return result.monthsToCalculate > 0 && result.totalInterest > 0;
}

/** Read-only summary — does NOT modify anything */
export function getInterestCalculationSummary(member: Member) {
  return calculateAccumulatedInterest(member);
}

// ─── Private helper ───────────────────────────────────────────────────────────

async function persistInterestCharge(
  memberId: string,
  societyId: string,
  calculation: { monthsToCalculate: number; totalInterest: number; newInterestBalance: number }
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      // Import the rate helper inside here to avoid circular dependency if any
      const { getCurrentInterestRate } = require('./loan-utils');
      
      // Calculate NEXT month's locked-in interest based on CURRENT balance
      // (This balance has NOT changed by the interest charge itself)
      const { data: memberData } = await supabase.from('members').select('loan_balance, loan_interest_rate, loan_start_date').eq('id', memberId).single();
      let nextInterest = 0;
      if (memberData && memberData.loan_balance > 0) {
        const rate = getCurrentInterestRate({ 
          loanBalance: memberData.loan_balance, 
          loanInterestRate: memberData.loan_interest_rate,
          loanStartDate: memberData.loan_start_date ? new Date(memberData.loan_start_date) : undefined
        });
        nextInterest = Math.round((memberData.loan_balance * rate) / 100);
      }

      await supabase
        .from('members')
        .update({
          interest_balance: calculation.newInterestBalance,
          last_interest_calculation_date: new Date().toISOString(),
          next_scheduled_interest: nextInterest
        })
        .eq('id', memberId);

      await supabase.from('transactions').insert({
        member_id: memberId,
        society_id: societyId,
        type: 'interest_charge',
        amount: calculation.totalInterest,
        description: `Monthly interest — ${calculation.monthsToCalculate} month(s)`,
        date: new Date().toISOString(),
        balance_after: calculation.newInterestBalance,
        reference_number: `AUTO-INT-${Date.now()}-${memberId}`,
        processed_by: 'system',
      });
    } catch {
      console.warn('Supabase interest persist failed — will update via localStorage.');
    }
  }
  // localStorage update is handled by the callers (db.updateMember / db.createTransaction)
}
