import { Member } from '@/types';
import { db } from './mock-data';

export class InterestCalculator {
  /**
   * Calculate monthly interest for a member with an active loan
   * Interest rate: 1.5% per month (18% annual)
   */
  static calculateMonthlyInterest(member: Member): number {
    if (!member.loanBalance || member.loanBalance <= 0) {
      return 0;
    }

    const monthlyRate = 0.015; // 1.5% monthly (18% annual)
    return member.loanBalance * monthlyRate;
  }

  /**
   * Apply monthly interest charges to all members with active loans
   * Interest is charged starting from the month the loan was issued
   */
  static async applyMonthlyInterestCharges(processedBy: string = 'system'): Promise<{
    processed: number;
    totalInterestCharged: number;
    results: Array<{
      memberId: string;
      memberName: string;
      loanBalance: number;
      interestCharged: number;
      newInterestBalance: number;
    }>;
  }> {
    const members = await db.getMembers();
    const results: Array<{
      memberId: string;
      memberName: string;
      loanBalance: number;
      interestCharged: number;
      newInterestBalance: number;
    }> = [];

    let totalInterestCharged = 0;
    let processed = 0;

    for (const member of members) {
      if (member.loanBalance && member.loanBalance > 0 && member.loanStartDate) {
        // Check if interest should be charged this month
        // Interest starts from the month the loan was issued
        const shouldChargeInterest = await this.shouldChargeInterestThisMonth(member);

        if (shouldChargeInterest) {
          const monthlyInterest = this.calculateMonthlyInterest(member);

          if (monthlyInterest > 0) {
            const newInterestBalance = member.interestBalance + monthlyInterest;

            // Update member's interest balance
            await db.updateMember(member.id, {
              interestBalance: newInterestBalance
            });

            // Create transaction record
            const referenceNumber = `INT${Date.now()}-${member.id}`;
            await db.createTransaction({
              memberId: member.id,
              societyId: member.societyId,
              type: 'interest_charge',
              amount: monthlyInterest,
              description: `Monthly interest charge (1.5% on loan balance)`,
              date: new Date(),
              balanceAfter: newInterestBalance,
              referenceNumber,
              processedBy,
            });

            results.push({
              memberId: member.id,
              memberName: `${member.firstName} ${member.lastName}`,
              loanBalance: member.loanBalance,
              interestCharged: monthlyInterest,
              newInterestBalance,
            });

            totalInterestCharged += monthlyInterest;
            processed++;
          }
        }
      }
    }

    return {
      processed,
      totalInterestCharged,
      results,
    };
  }

  /**
   * Check if interest should be charged for a member this month
   * Interest starts from the month the loan was issued (month 1), not month 2
   */
  static async shouldChargeInterestThisMonth(member: Member): Promise<boolean> {
    if (!member.loanBalance || member.loanBalance <= 0 || !member.loanStartDate) {
      return false;
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const loanStartDate = member.loanStartDate;

    // Check if we've passed the loan start month (interest starts from month 1)
    const loanStartMonth = loanStartDate.getMonth();
    const loanStartYear = loanStartDate.getFullYear();

    // Interest should be charged starting from the same month the loan was issued
    const shouldStartCharging =
      (currentYear > loanStartYear) ||
      (currentYear === loanStartYear && currentMonth >= loanStartMonth);

    if (!shouldStartCharging) {
      return false;
    }

    // Check if interest has already been charged this month
    const transactions = await db.getTransactionsByMember(member.id, 1);
    const hasInterestThisMonth = transactions.some(transaction =>
      transaction.type === 'interest_charge' &&
      transaction.date.getMonth() === currentMonth &&
      transaction.date.getFullYear() === currentYear
    );

    return !hasInterestThisMonth;
  }
}
