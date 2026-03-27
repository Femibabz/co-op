import { User, Member, MembershipApplication, LoanApplication, Transaction, ByLaw, LoginSession, Society, GuarantorRequest, BroadcastMessage, Levy } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';
import { calculateAccumulatedInterest } from './loan-utils';

/**
 * Session-level cache: tracks which member IDs have already had their
 * monthly interest auto-calculated in this browser session.
 * Prevents double-charging when getMembers() is called multiple times
 * (e.g. from the process-payment dropdown re-selecting a member).
 * Cleared on full page reload (module re-initialisation).
 */
const interestSessionCache = new Set<string>();

// Mock societies
export const mockSocieties: Society[] = [
  {
    id: 'soc1',
    name: 'OsuOlale Cooperative Society',
    registrationNumber: 'OSU-2024-001',
    address: '123 Society Avenue, Lagos',
    phone: '+234-800-123-4567',
    email: 'admin@osuolale.com',
    createdAt: new Date('2024-01-01'),
    status: 'active',
    adminUserId: '1',
    memberCount: 2,
    totalSavings: 350000,
    totalLoans: 75000,
    totalShares: 125000,
  },
  {
    id: 'soc2',
    name: 'Unity Cooperative Society',
    registrationNumber: 'UNI-2024-001',
    address: '456 Unity Way, Abuja',
    phone: '+234-900-987-6543',
    email: 'admin@unity.com',
    createdAt: new Date('2024-02-01'),
    status: 'active',
    adminUserId: '4',
    memberCount: 1,
    totalSavings: 50000,
    totalLoans: 0,
    totalShares: 25000,
  },
];

// Mock users
export const mockUsers: User[] = [
  {
    id: '0',
    email: 'platform@admin.com',
    password: 'superadmin123', // Super admin for platform management
    role: 'super_admin',
    createdAt: new Date('2023-01-01'),
    isActive: true,
  },
  {
    id: '1',
    email: 'admin@osuolale.com',
    password: 'admin123', // In real app, this would be hashed
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    societyId: 'soc1',
    isActive: true,
  },
  {
    id: '2',
    email: 'john.doe@email.com',
    password: 'member123',
    role: 'member',
    createdAt: new Date('2024-02-01'),
    societyId: 'soc1',
    isActive: true,
  },
  {
    id: '3',
    email: 'jane.smith@email.com',
    password: 'member123',
    role: 'member',
    createdAt: new Date('2024-02-15'),
    societyId: 'soc1',
    isActive: true,
  },
  {
    id: '4',
    email: 'admin@unity.com',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date('2024-02-01'),
    societyId: 'soc2',
    isActive: true,
  },
  {
    id: '5',
    email: 'bob.brown@email.com',
    password: 'member123',
    role: 'member',
    createdAt: new Date('2024-03-01'),
    societyId: 'soc2',
    isActive: true,
  },
];

// Mock bylaws
export const mockByLaws: ByLaw[] = [
  {
    id: 'bl1',
    societyId: 'soc1',
    title: 'Membership Eligibility and Requirements',
    content: `1. Any individual of sound mind and at least 18 years of age may apply for membership in the OsuOlale Cooperative Society.

2. All prospective members must:
   - Complete the membership application form with accurate information
   - Provide a valid guarantor who is a current member in good standing
   - Pay the required membership fees and initial share capital
   - Attend a mandatory orientation session

3. Membership becomes effective upon approval by the Board of Directors and payment of all required fees.

4. Members must maintain active participation by:
   - Making regular monthly contributions to their savings account
   - Attending at least 75% of general meetings annually
   - Participating in society activities and programs`,
    category: 'membership',
    createdBy: '1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    isActive: true,
  },
  {
    id: 'bl2',
    societyId: 'soc1',
    title: 'Share Capital and Savings Contributions',
    content: `1. SHARE CAPITAL:
   - Minimum initial share capital: ₦50,000
   - Shares may be purchased in multiples of ₦10,000
   - Members may increase their share capital at any time
   - Share capital is refundable upon voluntary withdrawal or termination of membership

2. MONTHLY SAVINGS:
   - All members must contribute a minimum of ₦5,000 monthly to their savings account
   - Savings contributions are due on or before the 5th day of each month
   - Late payments may attract a penalty of 2% of the amount due
   - Savings are withdrawable subject to the society's withdrawal policy

3. DIVIDENDS:
   - Annual dividends are distributed based on share capital held
   - Dividend rates are determined by the Board based on annual performance
   - Members may choose to reinvest dividends or receive cash payment`,
    category: 'financial',
    createdBy: '1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    isActive: true,
  },
  {
    id: 'bl3',
    societyId: 'soc1',
    title: 'Loan Policies and Procedures',
    content: `1. LOAN ELIGIBILITY:
   - Must be a member in good standing for at least 6 months
   - Must have made regular monthly savings contributions
   - No outstanding defaulted loans
   - Must provide acceptable collateral or guarantors

2. LOAN LIMITS:
   - Maximum loan amount: 3 times member's total savings and share capital
   - First-time borrowers: Maximum of ₦200,000
   - Subsequent loans based on repayment history

3. INTEREST RATES:
   - Standard loan interest rate: 15% per annum (reducing balance)
   - Emergency loans (up to ₦50,000): 12% per annum
   - Business expansion loans: 18% per annum

4. REPAYMENT TERMS:
   - Repayment period: 6 to 24 months
   - Monthly installment payments required
   - Early repayment allowed without penalty
   - Late payment penalty: 3% of overdue amount per month

5. LOAN DEFAULT:
   - Failure to pay for 3 consecutive months constitutes default
   - Society may recover from guarantor or collateral
   - Defaulters not eligible for new loans until fully cleared`,
    category: 'financial',
    createdBy: '1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-01'),
    isActive: true,
  },
  {
    id: 'bl4',
    societyId: 'soc1',
    title: 'Governance and Decision Making',
    content: `1. BOARD OF DIRECTORS:
   - Elected by members at the Annual General Meeting
   - Term of office: 2 years (renewable once)
   - Minimum of 5 directors, maximum of 9
   - Board meets quarterly or as needed

2. GENERAL MEETINGS:
   - Annual General Meeting (AGM) held in January each year
   - Special meetings may be called with 14 days notice
   - Quorum: 50% of total membership
   - Decisions by simple majority unless otherwise stated

3. VOTING RIGHTS:
   - Each member has one vote regardless of share capital
   - Voting by proxy allowed with written authorization
   - Secret ballot for elections and sensitive matters

4. FINANCIAL ACCOUNTABILITY:
   - Annual financial statements audited by external auditor
   - Financial reports presented at AGM
   - Members have right to inspect society's books with reasonable notice`,
    category: 'governance',
    createdBy: '1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    isActive: true,
  },
  {
    id: 'bl5',
    societyId: 'soc1',
    title: 'Member Rights and Responsibilities',
    content: `MEMBER RIGHTS:
1. Participate in all society activities and programs
2. Vote on all matters requiring member approval
3. Access to society's financial information
4. Fair treatment in loan applications and other services
5. Receive share of annual surplus/dividends
6. Voluntary withdrawal with proper notice

MEMBER RESPONSIBILITIES:
1. Pay all dues and contributions on time
2. Attend general meetings regularly
3. Serve on committees when appointed
4. Maintain confidentiality of society information
5. Promote the society's interests and reputation
6. Comply with all bylaws and regulations
7. Update personal information when changes occur

DISCIPLINARY ACTIONS:
- Violations may result in warnings, fines, suspension, or expulsion
- Members have right to fair hearing before disciplinary action
- Appeals may be made to the Board of Directors`,
    category: 'membership',
    createdBy: '1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    isActive: true,
  },
  {
    id: 'bl6',
    societyId: 'soc1',
    title: 'Withdrawal and Termination of Membership',
    content: `1. VOLUNTARY WITHDRAWAL:
   - Member must submit written notice 30 days in advance
   - All outstanding loans must be cleared
   - Share capital refunded within 60 days after clearance
   - Savings balance paid immediately upon clearance
   - Accrued dividends paid as per policy

2. INVOLUNTARY TERMINATION:
   Membership may be terminated for:
   - Gross misconduct or violation of bylaws
   - Criminal conviction affecting society's reputation
   - Continued failure to meet financial obligations
   - Actions detrimental to the society

3. DEATH OF MEMBER:
   - Share capital and savings paid to designated beneficiary or next of kin
   - Outstanding loans recovered from estate or insurance
   - Benefits processed within 90 days of notification

4. INACTIVE MEMBERSHIP:
   - Failure to make contributions for 12 consecutive months
   - Automatic conversion to inactive status
   - Reactivation allowed upon payment of arrears`,
    category: 'membership',
    createdBy: '1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    isActive: true,
  },
  {
    id: 'bl-soc2-1',
    societyId: 'soc2',
    title: 'Unity Membership & Unity Principles',
    content: `1. Membership in Unity Cooperative is open to all who share our vision of collective growth.
2. Members must contribute minimum ₦10,000 monthly.
3. Decision making is done through consensus during monthly town halls.`,
    category: 'membership',
    createdBy: '4',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05'),
    isActive: true,
  },
  {
    id: 'bl-soc2-2',
    societyId: 'soc2',
    title: 'Unity Loan Framework',
    content: `1. Loans are interest-free for the first 3 months.
2. Maximum loan amount is 2x of savings balance.
3. Guarantors must have at least 1 year of active membership.`,
    category: 'financial',
    createdBy: '4',
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05'),
    isActive: true,
  },
  {
    id: 'bl-osu-dynamic-1',
    societyId: 'soc1774539941239', // Osuolale CTCS
    title: 'Osuolale Membership Statutes',
    content: `1. Open to all individuals in the Osuolale community.
2. Monthly contribution is mandatory.
3. Members must adhere to the core values of integrity and cooperation.`,
    category: 'membership',
    createdBy: 'admin',
    createdAt: new Date('2024-03-26'),
    updatedAt: new Date('2024-03-26'),
    isActive: true,
  },
  {
    id: 'bl-ire-dynamic-1',
    societyId: 'soc1774540250718', // Irewole CTCS
    title: 'Irewole Cooperative Constitution',
    content: `1. Membership requires registration and approval.
2. Savings must be consistent.
3. Loans are granted based on savings history.`,
    category: 'membership',
    createdBy: 'admin',
    createdAt: new Date('2024-03-26'),
    updatedAt: new Date('2024-03-26'),
    isActive: true,
  },
];

// Mock members
export const mockMembers: Member[] = [
  {
    id: 'm1',
    userId: '2',
    societyId: 'soc1',
    memberNumber: 'OSU001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    phone: '+234-801-234-5678',
    address: '123 Lagos Street, Lagos',
    dateJoined: new Date('2024-02-01'),
    status: 'active',
    sharesBalance: 50000,
    savingsBalance: 150000,
    loanBalance: 75000,
    interestBalance: 5000,
    societyDues: 2000,
    loanStartDate: new Date('2024-01-15'),
    loanDurationMonths: 12,
    loanInterestRate: 1.5, // 1.5% monthly (approx 18% annual)
    monthlyLoanPayment: 7500,
  },
  {
    id: 'm2',
    userId: '3',
    societyId: 'soc1',
    memberNumber: 'OSU002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@email.com',
    phone: '+234-802-345-6789',
    address: '456 Abuja Road, Abuja',
    dateJoined: new Date('2024-02-15'),
    status: 'active',
    sharesBalance: 75000,
    savingsBalance: 200000,
    loanBalance: 0,
    interestBalance: 0,
    societyDues: 0,
  },
  {
    id: 'm3',
    userId: '5',
    societyId: 'soc2',
    memberNumber: 'UNI001',
    firstName: 'Bob',
    lastName: 'Brown',
    email: 'bob.brown@email.com',
    phone: '+234-701-111-2222',
    address: '789 Garki, Abuja',
    dateJoined: new Date('2024-03-01'),
    status: 'active',
    sharesBalance: 25000,
    savingsBalance: 50000,
    loanBalance: 0,
    interestBalance: 0,
    societyDues: 0,
  },
];

// Mock transactions for the last 12 months
export const mockTransactions: Transaction[] = [
  // John Doe transactions
  {
    id: 't1',
    memberId: 'm1',
    type: 'shares_deposit',
    amount: 25000,
    description: 'Initial share purchase',
    date: new Date('2024-02-01'),
    balanceAfter: 25000,
    referenceNumber: 'SH001',
    processedBy: 'admin',
    societyId: 'soc1',
  },
  {
    id: 't2',
    memberId: 'm1',
    type: 'savings_deposit',
    amount: 100000,
    description: 'Opening savings deposit',
    date: new Date('2024-02-01'),
    balanceAfter: 100000,
    referenceNumber: 'SV001',
    processedBy: 'admin',
    societyId: 'soc1',
  },
  {
    id: 't3',
    memberId: 'm1',
    type: 'loan_disbursement',
    amount: 100000,
    description: 'Business loan - 12 months @ 15%',
    date: new Date('2024-01-15'),
    balanceAfter: 100000,
    referenceNumber: 'LN001',
    processedBy: 'admin',
    societyId: 'soc1',
  },
  {
    id: 't4',
    memberId: 'm1',
    type: 'loan_payment',
    amount: 7500,
    description: 'Monthly loan payment - Feb 2024',
    date: new Date('2024-02-15'),
    balanceAfter: 92500,
    referenceNumber: 'LP001',
    societyId: 'soc1',
  },
  {
    id: 't5',
    memberId: 'm1',
    type: 'loan_payment',
    amount: 7500,
    description: 'Monthly loan payment - Mar 2024',
    date: new Date('2024-03-15'),
    balanceAfter: 85000,
    referenceNumber: 'LP002',
    societyId: 'soc1',
  },
  {
    id: 't6',
    memberId: 'm1',
    type: 'interest_charge',
    amount: 1250,
    description: 'Monthly interest charge - Feb 2024',
    date: new Date('2024-02-28'),
    balanceAfter: 6250,
    referenceNumber: 'INT001',
    processedBy: 'system',
    societyId: 'soc1',
  },
  {
    id: 't7',
    memberId: 'm1',
    type: 'shares_deposit',
    amount: 25000,
    description: 'Additional share purchase',
    date: new Date('2024-03-01'),
    balanceAfter: 50000,
    referenceNumber: 'SH002',
    processedBy: 'admin',
    societyId: 'soc1',
  },
  {
    id: 't8',
    memberId: 'm1',
    type: 'savings_deposit',
    amount: 50000,
    description: 'Monthly savings deposit',
    date: new Date('2024-03-01'),
    balanceAfter: 150000,
    referenceNumber: 'SV002',
    societyId: 'soc1',
  },

  // Jane Smith transactions
  {
    id: 't9',
    memberId: 'm2',
    type: 'shares_deposit',
    amount: 50000,
    description: 'Initial share purchase',
    date: new Date('2024-02-15'),
    balanceAfter: 50000,
    referenceNumber: 'SH003',
    processedBy: 'admin',
    societyId: 'soc1',
  },
  {
    id: 't10',
    memberId: 'm2',
    type: 'savings_deposit',
    amount: 150000,
    description: 'Opening savings deposit',
    date: new Date('2024-02-15'),
    balanceAfter: 150000,
    referenceNumber: 'SV003',
    processedBy: 'admin',
    societyId: 'soc1',
  },
  {
    id: 't11',
    memberId: 'm2',
    type: 'shares_deposit',
    amount: 25000,
    description: 'Additional share purchase',
    date: new Date('2024-03-01'),
    balanceAfter: 75000,
    referenceNumber: 'SH004',
    processedBy: 'admin',
    societyId: 'soc1',
  },
  {
    id: 't12',
    memberId: 'm2',
    type: 'savings_deposit',
    amount: 50000,
    description: 'Monthly savings deposit',
    date: new Date('2024-03-01'),
    balanceAfter: 200000,
    referenceNumber: 'SV004',
    societyId: 'soc1',
  },
];

// Mock membership applications
export const mockApplications: MembershipApplication[] = [
  {
    id: 'app1',
    societyId: 'soc1',
    firstName: 'David',
    lastName: 'Johnson',
    email: 'david.johnson@email.com',
    phone: '+234-803-456-7890',
    address: '789 Port Harcourt Street, Port Harcourt',
    guarantor1Id: 'm1',
    guarantor2Id: 'm2',
    guarantorIds: ['m1', 'm2'],
    guarantorCount: 2,
    status: 'pending',
    appliedAt: new Date('2024-03-01'),
  },
  {
    id: 'app2',
    societyId: 'soc1',
    firstName: 'Mary',
    lastName: 'Okafor',
    email: 'mary.okafor@email.com',
    phone: '+234-805-678-9012',
    address: '101 Kano Avenue, Kano',
    guarantor1Id: 'm1',
    guarantor2Id: 'm2',
    guarantorIds: ['m1', 'm2'],
    guarantorCount: 2,
    status: 'pending',
    appliedAt: new Date('2024-03-05'),
  },
];

// Mock loan applications
export const mockLoanApplications: LoanApplication[] = [
  {
    id: 'loan1',
    memberId: 'm1',
    amount: 100000,
    purpose: 'Business expansion',
    duration: 12,
    status: 'pending',
    appliedAt: new Date('2024-03-10'),
    societyId: 'soc1',
  },
  {
    id: 'loan2',
    memberId: 'm2',
    amount: 50000,
    purpose: 'Emergency medical expenses',
    duration: 6,
    status: 'pending',
    appliedAt: new Date('2024-03-08'),
    societyId: 'soc1',
  },
];

// Mock storage functions (would be replaced with real database)
export class MockDatabase {
  private societies: Society[] = [];
  private users: User[] = [];
  private members: Member[] = [];
  private applications: MembershipApplication[] = [];
  private loanApplications: LoanApplication[] = [];
  private transactions: Transaction[] = [];
  private byLaws: ByLaw[] = [];
  private loginSessions: LoginSession[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const storedSocieties = localStorage.getItem('coopkonnect_societies');
      const storedUsers = localStorage.getItem('coopkonnect_users');
      const storedMembers = localStorage.getItem('coopkonnect_members');
      const storedApplications = localStorage.getItem('coopkonnect_applications');
      const storedLoanApplications = localStorage.getItem('coopkonnect_loan_applications');
      const storedTransactions = localStorage.getItem('coopkonnect_transactions');
      const storedByLaws = localStorage.getItem('coopkonnect_bylaws');
      const storedLoginSessions = localStorage.getItem('coopkonnect_login_sessions');

      this.societies = storedSocieties ? JSON.parse(storedSocieties) : [...mockSocieties];
      this.users = storedUsers ? JSON.parse(storedUsers) : [...mockUsers];
      this.members = storedMembers ? JSON.parse(storedMembers) : [...mockMembers];
      this.applications = storedApplications ? JSON.parse(storedApplications) : [...mockApplications];
      this.loanApplications = storedLoanApplications ? JSON.parse(storedLoanApplications) : [...mockLoanApplications];
      this.transactions = storedTransactions ? JSON.parse(storedTransactions) : [...mockTransactions];
      this.byLaws = storedByLaws ? JSON.parse(storedByLaws) : [...mockByLaws];
      this.loginSessions = storedLoginSessions ? JSON.parse(storedLoginSessions) : [];

      // Convert date strings back to Date objects
      this.societies.forEach(society => {
        society.createdAt = new Date(society.createdAt);
      });

      this.users.forEach(user => {
        user.createdAt = new Date(user.createdAt);
      });

      this.members.forEach(member => {
        member.dateJoined = new Date(member.dateJoined);
        if (member.loanStartDate) member.loanStartDate = new Date(member.loanStartDate);
      });

      this.applications.forEach(app => {
        app.appliedAt = new Date(app.appliedAt);
        if (app.reviewedAt) app.reviewedAt = new Date(app.reviewedAt);
      });

      this.loanApplications.forEach(loan => {
        loan.appliedAt = new Date(loan.appliedAt);
        if (loan.reviewedAt) loan.reviewedAt = new Date(loan.reviewedAt);
      });

      this.transactions.forEach(transaction => {
        transaction.date = new Date(transaction.date);
      });

      this.byLaws.forEach(bylaw => {
        bylaw.createdAt = new Date(bylaw.createdAt);
        bylaw.updatedAt = new Date(bylaw.updatedAt);
      });

      this.loginSessions.forEach(session => {
        session.loginTime = new Date(session.loginTime);
        if (session.logoutTime) session.logoutTime = new Date(session.logoutTime);
      });
    } else {
      // Server-side fallback
      this.societies = [...mockSocieties];
      this.users = [...mockUsers];
      this.members = [...mockMembers];
      this.applications = [...mockApplications];
      this.loanApplications = [...mockLoanApplications];
      this.transactions = [...mockTransactions];
      this.byLaws = [...mockByLaws];
      this.loginSessions = [];
    }

    // Ensure superadmin always exists
    const superAdminExists = this.users.some(user => user.email === 'platform@admin.com');
    if (!superAdminExists) {
      const superAdmin = mockUsers.find(user => user.email === 'platform@admin.com');
      if (superAdmin) {
        this.users.unshift(superAdmin);
        this.saveToStorage();
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('coopkonnect_societies', JSON.stringify(this.societies));
      localStorage.setItem('coopkonnect_users', JSON.stringify(this.users));
      localStorage.setItem('coopkonnect_members', JSON.stringify(this.members));
      localStorage.setItem('coopkonnect_applications', JSON.stringify(this.applications));
      localStorage.setItem('coopkonnect_loan_applications', JSON.stringify(this.loanApplications));
      localStorage.setItem('coopkonnect_transactions', JSON.stringify(this.transactions));
      localStorage.setItem('coopkonnect_bylaws', JSON.stringify(this.byLaws));
      localStorage.setItem('coopkonnect_login_sessions', JSON.stringify(this.loginSessions));
    }
  }

  // User methods
  async findUserByEmail(email: string): Promise<User | undefined> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // User not found in Supabase is not a fatal error, 
            // fall through to check localStorage fallback
          } else {
            console.warn('Supabase fetch error:', error);
            throw error;
          }
        }

        if (data) {
          // Convert Supabase response to User format
          const user: User = {
            id: data.id,
            email: data.email,
            password: data.password,
            role: data.role,
            createdAt: new Date(data.created_at),
            societyId: data.society_id || undefined,
            isFirstLogin: data.is_first_login,
            isActive: data.is_active ?? true
          };

          return user;
        }
      } catch (error) {
        console.warn('Error finding user by email in Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage - find the MOST RECENT user with this email
    // This handles cases where old stale records might exist in localStorage
    return [...this.users].reverse().find(user => user.email === email);
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    // 0. DRY RUN: Check if user with this email already exists locally (skip if Supabase is active)
    if (!isSupabaseConfigured()) {
      const existingLocalUser = this.users.find(u => u.email === user.email);
      if (existingLocalUser) {
        throw new Error(`A user with email ${user.email} already exists (local). Use a unique email.`);
      }
    }

    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data: existingSupaUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        let data, error;

        if (existingSupaUser) {
          // Update existing user instead of throwing
          const { data: updatedData, error: updateError } = await supabase
            .from('users')
            .update({
              role: user.role,
              society_id: user.societyId,
              is_active: user.isActive ?? true
            })
            .eq('id', existingSupaUser.id)
            .select()
            .single();

          data = updatedData;
          error = updateError;
        } else {
          // Insert new user
          const { data: insertedData, error: insertError } = await supabase
            .from('users')
            .insert([{
              email: user.email,
              password: user.password,
              role: user.role,
              society_id: user.societyId,
              is_first_login: user.isFirstLogin,
              is_active: user.isActive ?? true
            }])
            .select()
            .single();

          data = insertedData;
          error = insertError;
        }

        if (error) {
          console.warn('Supabase database error (users):', error.message, error.code);
          throw new Error(`Database error handling user: ${error.message} (${error.code})`);
        }

        if (data) {
          const newUser: User = {
            id: data.id,
            email: data.email,
            password: data.password,
            role: data.role,
            createdAt: new Date(data.created_at),
            societyId: data.society_id || undefined,
            isFirstLogin: data.is_first_login,
            isActive: data.is_active ?? true
          };

          this.users.push(newUser);
          this.saveToStorage();
          return newUser;
        }
      } catch (error: any) {
        console.warn('Error creating user in Supabase:', error);
        throw error;
      }
    }

    // Fallback to localStorage
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    this.users.push(newUser);
    this.saveToStorage();
    return newUser;
  }

  async createSociety(data: Omit<Society, 'id' | 'createdAt' | 'adminUserId' | 'memberCount' | 'totalSavings' | 'totalLoans' | 'totalShares' | 'status'>, adminEmail: string): Promise<Society> {
    // Pre-check if society with same email or reg exists
    if (isSupabaseConfigured()) {
      try {
        const { data: existingSoc } = await supabase
          .from('societies')
          .select('id, email, registration_number')
          .or(`email.eq.${data.email},registration_number.eq.${data.registrationNumber}`)
          .maybeSingle();

        if (existingSoc) {
          if (existingSoc.email === data.email) {
            throw new Error(`A society with official email ${data.email} already exists.`);
          }
          if (existingSoc.registration_number === data.registrationNumber) {
            throw new Error(`A society with registration number ${data.registrationNumber} already exists.`);
          }
        }
      } catch (err: any) {
        if (err.message && err.message.includes('already exists')) throw err;
        console.warn('Supabase dry-run check failed:', err);
      }
    }

    // Pre-check if ADMIN user already exists by email
    const existingAdmin = await this.findUserByEmail(adminEmail);
    if (existingAdmin) {
      throw new Error(`The admin email ${adminEmail} is already in use by another account.`);
    }

    const societyId = `soc${Date.now()}`;

    // 1. Insert society record first in Supabase to resolve circular dependency
    // This allows the admin user to be created with a valid society_id reference
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('societies').insert([{
          id: societyId,
          name: data.name,
          registration_number: data.registrationNumber,
          address: data.address,
          phone: data.phone,
          email: data.email,
          status: 'active',
          admin_user_id: null // Set to null initially
        }]);

        if (error) {
          console.warn('Supabase society initial insert error:', error);
          throw new Error(`Failed to initialize society in database: ${error.message} (${error.code})`);
        }
      } catch (err: any) {
        console.warn('Supabase society initial insert exception:', err);
        throw err;
      }
    }

    // 2. Create the admin user for this society
    const adminUser = await this.createUser({
      email: adminEmail,
      password: 'admin123', // Default admin password
      role: 'admin',
      societyId,
      isFirstLogin: true,
      isActive: true
    });

    // 3. Update the society record with the adminUserId in Supabase
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('societies')
          .update({ admin_user_id: adminUser.id })
          .eq('id', societyId);

        if (error) {
          console.warn('Supabase society update error (admin_user_id):', error);
          // Non-fatal if user and society are both created, but inconsistent pointers
        }
      } catch (err) {
        console.warn('Supabase society update exception (admin_user_id):', err);
      }
    }

    // 4. Create the full local society object
    const newSociety: Society = {
      ...data,
      id: societyId,
      adminUserId: adminUser.id,
      createdAt: new Date(),
      status: 'active',
      memberCount: 0,
      totalSavings: 0,
      totalLoans: 0,
      totalShares: 0
    };

    this.societies.push(newSociety);
    this.saveToStorage();
    return newSociety;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.users.findIndex(user => user.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates };
      this.saveToStorage();
      return this.users[index];
    }
    return undefined;
  }

  async updateUserPassword(id: string, newPassword: string): Promise<boolean> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .update({
            password: newPassword,
            is_first_login: false
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.warn('Supabase update error:', error);
          throw error;
        }

        if (data) {
          // Update localStorage as well
          const index = this.users.findIndex(user => user.id === id);
          if (index !== -1) {
            this.users[index] = {
              ...this.users[index],
              password: newPassword,
              isFirstLogin: false
            };
            this.saveToStorage();
          }

          return true;
        }
      } catch (error) {
        console.warn('Error updating password in Supabase:', error);
      }
    }

    // Fallback to localStorage
    const index = this.users.findIndex(user => user.id === id);
    if (index !== -1) {
      this.users[index] = {
        ...this.users[index],
        password: newPassword,
        isFirstLogin: false // Clear first login flag when password is changed
      };
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Member methods
  async getMembers(societyId?: string): Promise<Member[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('members')
          .select('*')
          .order('date_joined', { ascending: false });

        if (societyId) {
          query = query.eq('society_id', societyId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data) {
          // Convert Supabase response to Member format
          const members: Member[] = data.map(m => ({
            id: m.id,
            userId: m.user_id,
            societyId: m.society_id,
            memberNumber: m.member_number,
            firstName: m.first_name,
            lastName: m.last_name,
            email: m.email,
            phone: m.phone,
            address: m.address,
            dateJoined: new Date(m.date_joined),
            status: m.status,
            sharesBalance: m.shares_balance,
            savingsBalance: m.savings_balance,
            loanBalance: m.loan_balance,
            interestBalance: m.interest_balance,
            societyDues: m.society_dues,
            loanStartDate: m.loan_start_date ? new Date(m.loan_start_date) : undefined,
            loanDurationMonths: m.loan_duration_months,
            loanInterestRate: m.loan_interest_rate,
            monthlyLoanPayment: m.monthly_loan_payment,
            lastInterestCalculationDate: m.last_interest_calculation_date
              ? new Date(m.last_interest_calculation_date)
              : undefined,
            annualIncome: m.annual_income,
            loanEligibilityOverride: m.loan_eligibility_override,
            allowNewLoanWithBalance: m.allow_new_loan_with_balance
          }));

          // Auto-apply any pending monthly interest.
          // calculateAccumulatedInterest() returns monthsToCalculate=0 once the
          // current month has been charged, so this is safe to call on every fetch.
          const updatedMembers = await this.autoCalculateInterestForMembers(members);
          return updatedMembers;
        }
      } catch (error) {
        console.warn('Supabase member fetch failed, using localStorage fallback.');
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage — auto-apply pending monthly interest
    let members = [...this.members];
    if (societyId) {
      members = members.filter(m => m.societyId === societyId);
    }
    const updatedMembers = await this.autoCalculateInterestForMembers(members);
    return updatedMembers;
  }

  async getMemberByUserId(userId: string): Promise<Member | undefined> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Not found in Supabase, fall through to localStorage
          } else {
            console.warn('Supabase fetch error:', error);
            throw error;
          }
        }

        if (data) {
          const member: Member = {
            id: data.id,
            userId: data.user_id,
            societyId: data.society_id,
            memberNumber: data.member_number,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            dateJoined: new Date(data.date_joined),
            status: data.status,
            sharesBalance: data.shares_balance,
            savingsBalance: data.savings_balance,
            loanBalance: data.loan_balance,
            interestBalance: data.interest_balance,
            societyDues: data.society_dues,
            loanStartDate: data.loan_start_date ? new Date(data.loan_start_date) : undefined,
            loanDurationMonths: data.loan_duration_months,
            loanInterestRate: data.loan_interest_rate,
            monthlyLoanPayment: data.monthly_loan_payment,
            annualIncome: data.annual_income,
            loanEligibilityOverride: data.loan_eligibility_override,
            allowNewLoanWithBalance: data.allow_new_loan_with_balance
          };

          // Auto-calculate pending interest
          const updatedMember = await this.autoCalculateInterestForMember(member);
          return updatedMember;
        }
      } catch (error) {
        console.warn('Error fetching member by user ID from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
    const member = this.members.find(member => member.userId === userId);
    if (member) {
      return await this.autoCalculateInterestForMember(member);
    }
    return undefined;
  }

  async getMemberById(id: string): Promise<Member | undefined> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Not found in Supabase, fall through to localStorage
          } else {
            console.warn('Supabase fetch error:', error);
            throw error;
          }
        }

        if (data) {
          const member: Member = {
            id: data.id,
            userId: data.user_id,
            societyId: data.society_id,
            memberNumber: data.member_number,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            dateJoined: new Date(data.date_joined),
            status: data.status,
            sharesBalance: data.shares_balance,
            savingsBalance: data.savings_balance,
            loanBalance: data.loan_balance,
            interestBalance: data.interest_balance,
            societyDues: data.society_dues,
            loanStartDate: data.loan_start_date ? new Date(data.loan_start_date) : undefined,
            loanDurationMonths: data.loan_duration_months,
            loanInterestRate: data.loan_interest_rate,
            monthlyLoanPayment: data.monthly_loan_payment,
            annualIncome: data.annual_income,
            loanEligibilityOverride: data.loan_eligibility_override,
            allowNewLoanWithBalance: data.allow_new_loan_with_balance
          };

          // Auto-calculate pending interest
          const updatedMember = await this.autoCalculateInterestForMember(member);
          return updatedMember;
        }
      } catch (error) {
        console.warn('Error fetching member by ID from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
    const member = this.members.find(member => member.id === id);
    if (member) {
      return await this.autoCalculateInterestForMember(member);
    }
    return undefined;
  }

  async updateMember(id: string, updates: Partial<Member>): Promise<Member | undefined> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const updateData: any = {};
        if (updates.userId !== undefined) updateData.user_id = updates.userId;
        if (updates.societyId !== undefined) updateData.society_id = updates.societyId;
        if (updates.memberNumber !== undefined) updateData.member_number = updates.memberNumber;
        if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
        if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
        if (updates.email !== undefined) updateData.email = updates.email;
        if (updates.phone !== undefined) updateData.phone = updates.phone;
        if (updates.address !== undefined) updateData.address = updates.address;
        if (updates.dateJoined !== undefined) updateData.date_joined = updates.dateJoined;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.sharesBalance !== undefined) updateData.shares_balance = updates.sharesBalance;
        if (updates.savingsBalance !== undefined) updateData.savings_balance = updates.savingsBalance;
        if (updates.loanBalance !== undefined) updateData.loan_balance = updates.loanBalance;
        if (updates.interestBalance !== undefined) updateData.interest_balance = updates.interestBalance;
        if (updates.societyDues !== undefined) updateData.society_dues = updates.societyDues;
        if (updates.loanStartDate !== undefined) updateData.loan_start_date = updates.loanStartDate;
        if (updates.loanDurationMonths !== undefined) updateData.loan_duration_months = updates.loanDurationMonths;
        if (updates.loanInterestRate !== undefined) updateData.loan_interest_rate = updates.loanInterestRate;
        if (updates.monthlyLoanPayment !== undefined) updateData.monthly_loan_payment = updates.monthlyLoanPayment;
        if (updates.annualIncome !== undefined) updateData.annual_income = updates.annualIncome;
        if (updates.loanEligibilityOverride !== undefined) updateData.loan_eligibility_override = updates.loanEligibilityOverride;
        if (updates.allowNewLoanWithBalance !== undefined) updateData.allow_new_loan_with_balance = updates.allowNewLoanWithBalance;

        const { data, error } = await supabase
          .from('members')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.warn('Supabase update skipped, falling back to localStorage:', error?.message || error);
          throw error;
        }

        if (data) {
          const updatedMember: Member = {
            id: data.id,
            userId: data.user_id,
            societyId: data.society_id,
            memberNumber: data.member_number,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            dateJoined: new Date(data.date_joined),
            status: data.status,
            sharesBalance: data.shares_balance,
            savingsBalance: data.savings_balance,
            loanBalance: data.loan_balance,
            interestBalance: data.interest_balance,
            societyDues: data.society_dues,
            loanStartDate: data.loan_start_date ? new Date(data.loan_start_date) : undefined,
            loanDurationMonths: data.loan_duration_months,
            loanInterestRate: data.loan_interest_rate,
            monthlyLoanPayment: data.monthly_loan_payment,
            annualIncome: data.annual_income,
            loanEligibilityOverride: data.loan_eligibility_override,
            allowNewLoanWithBalance: data.allow_new_loan_with_balance
          };

          // Update localStorage
          const index = this.members.findIndex(m => m.id === id);
          if (index !== -1) {
            this.members[index] = updatedMember;
            this.saveToStorage();
          }

          return updatedMember;
        }
      } catch (error) {
        console.warn('Supabase member update failed, using localStorage fallback.');
        // Fall through to localStorage
      }
    }

    // Fallback to localStorage
    const index = this.members.findIndex(member => member.id === id);
    if (index !== -1) {
      this.members[index] = { ...this.members[index], ...updates };
      this.saveToStorage();
      return this.members[index];
    }
    return undefined;
  }

  async createMember(member: Omit<Member, 'id' | 'dateJoined'>): Promise<Member> {
    // Check if member already exists (skip local if Supabase is active)
    if (!isSupabaseConfigured()) {
      const existingMember = this.members.find(m => m.email === member.email && m.societyId === member.societyId);
      if (existingMember) {
        throw new Error('A member with this email already exists in this society.');
      }
    }

    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        // Double check in Supabase
        const { data: existingSupabaseMember } = await supabase
          .from('members')
          .select('id')
          .eq('email', member.email)
          .eq('society_id', member.societyId)
          .maybeSingle();

        if (existingSupabaseMember) {
          throw new Error('A member with this email already exists in this society.');
        }

        const { data, error } = await supabase
          .from('members')
          .insert([{
            user_id: member.userId,
            society_id: member.societyId,
            member_number: member.memberNumber,
            first_name: member.firstName,
            last_name: member.lastName,
            email: member.email,
            phone: member.phone,
            address: member.address,
            status: member.status,
            shares_balance: member.sharesBalance,
            savings_balance: member.savingsBalance,
            loan_balance: member.loanBalance,
            interest_balance: member.interestBalance,
            society_dues: member.societyDues,
            loan_start_date: member.loanStartDate,
            loan_duration_months: member.loanDurationMonths,
            loan_interest_rate: member.loanInterestRate,
            monthly_loan_payment: member.monthlyLoanPayment,
            annual_income: member.annualIncome,
            loan_eligibility_override: member.loanEligibilityOverride,
            allow_new_loan_with_balance: member.allowNewLoanWithBalance
          }])
          .select()
          .single();

        if (error) {
          console.warn('Supabase insert error:', error);
          throw error;
        }

        // Convert Supabase response to Member format
        const newMember: Member = {
          id: data.id,
          userId: data.user_id,
          societyId: data.society_id,
          memberNumber: data.member_number,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          dateJoined: new Date(data.date_joined),
          status: data.status,
          sharesBalance: data.shares_balance,
          savingsBalance: data.savings_balance,
          loanBalance: data.loan_balance,
          interestBalance: data.interest_balance,
          societyDues: data.society_dues,
          loanStartDate: data.loan_start_date ? new Date(data.loan_start_date) : undefined,
          loanDurationMonths: data.loan_duration_months,
          loanInterestRate: data.loan_interest_rate,
          monthlyLoanPayment: data.monthly_loan_payment,
          annualIncome: data.annual_income,
          loanEligibilityOverride: data.loan_eligibility_override
        };

        // Also save to localStorage as backup
        this.members.push(newMember);
        this.saveToStorage();

        return newMember;
      } catch (error) {
        console.warn('Error creating member in Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage if Supabase is not configured or fails
    const newMember: Member = {
      ...member,
      id: Date.now().toString(),
      dateJoined: new Date(),
    };
    this.members.push(newMember);
    this.saveToStorage();
    return newMember;
  }

  // Application methods
  async getApplications(societyId?: string): Promise<MembershipApplication[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('membership_applications')
          .select('*')
          .order('applied_at', { ascending: false });

        if (societyId) {
          query = query.eq('society_id', societyId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data && data.length > 0) {
          // Convert Supabase response to MembershipApplication format
          const applications: MembershipApplication[] = data.map(app => {
            const guarantorIds = [app.guarantor_id1, app.guarantor_id2].filter(Boolean) as string[];
            return {
              id: app.id,
              societyId: app.society_id || 'soc1',
              firstName: app.first_name || 'N/A',
              lastName: app.last_name || 'N/A',
              email: app.email || 'N/A',
              phone: app.phone || 'N/A',
              address: app.address || 'N/A',
              occupation: app.occupation || undefined,
              monthlyIncome: app.monthly_income ? Number(app.monthly_income) : undefined,
              guarantor1Id: app.guarantor_id1,
              guarantor2Id: app.guarantor_id2,
              guarantorIds,
              guarantorCount: 2,
              status: (app.status as any) || 'pending',
              appliedAt: app.applied_at ? new Date(app.applied_at) : new Date(),
              reviewedAt: app.reviewed_at ? new Date(app.reviewed_at) : undefined,
              reviewedBy: app.reviewed_by || undefined,
              reviewNotes: app.review_notes || undefined
            };
          });

          // Sync localStorage
          this.applications = applications;
          this.saveToStorage();

          return applications;
        }
      } catch (error) {
        console.warn('Error fetching applications from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
    if (societyId) {
      return [...this.applications].filter(app => app.societyId === societyId);
    }
    return [...this.applications];
  }

  async updateApplication(id: string, updates: Partial<MembershipApplication>): Promise<MembershipApplication | undefined> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const updateData: any = {};
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.reviewedAt !== undefined) updateData.reviewed_at = updates.reviewedAt;
        if (updates.reviewedBy !== undefined) updateData.reviewed_by = updates.reviewedBy;
        if (updates.reviewNotes !== undefined) updateData.review_notes = updates.reviewNotes;

        const { data, error } = await supabase
          .from('membership_applications')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.warn('Supabase update error:', error);
          throw error;
        }

        if (data) {
          const updatedApplication: MembershipApplication = {
            id: data.id,
            societyId: data.society_id,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            guarantorIds: data.guarantor_ids || [],
            guarantorCount: data.guarantor_count || 0,
            status: data.status as 'pending' | 'approved' | 'rejected',
            appliedAt: new Date(data.applied_at),
            reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined,
            reviewedBy: data.reviewed_by || undefined,
            reviewNotes: data.review_notes || undefined
          };

          // Update localStorage
          const index = this.applications.findIndex(app => app.id === id);
          if (index !== -1) {
            this.applications[index] = updatedApplication;
            this.saveToStorage();
          }

          return updatedApplication;
        }
      } catch (error) {
        console.warn('Error updating application in Supabase:', error);
        // Fall through to localStorage
      }
    }

    // Fallback to localStorage
    const index = this.applications.findIndex(app => app.id === id);
    if (index !== -1) {
      this.applications[index] = { ...this.applications[index], ...updates };
      this.saveToStorage();
      return this.applications[index];
    }
    return undefined;
  }

  async createApplication(application: Omit<MembershipApplication, 'id' | 'appliedAt' | 'status'>): Promise<MembershipApplication> {
    // Check if user is already a member (skip local if Supabase is active)
    if (!isSupabaseConfigured()) {
      const existingMember = this.members.find(m => m.email === application.email && m.societyId === application.societyId);
      if (existingMember) {
        throw new Error('You are already a member of this society.');
      }

      // Check if application already exists
      const existingApp = this.applications.find(a =>
        a.email === application.email &&
        a.societyId === application.societyId &&
        (a.status === 'pending' || a.status === 'approved')
      );
      if (existingApp) {
        throw new Error('An active application with this email already exists for this society.');
      }
    }

    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        // Double check in Supabase
        const [{ data: supabaseMember }, { data: supabaseApp }] = await Promise.all([
          supabase.from('members').select('id').eq('email', application.email).eq('society_id', application.societyId).maybeSingle(),
          supabase.from('membership_applications')
            .select('id')
            .eq('email', application.email)
            .eq('society_id', application.societyId)
            .in('status', ['pending', 'approved'])
            .maybeSingle()
        ]);

        if (supabaseMember) {
          throw new Error('You are already a member of this society.');
        }
        if (supabaseApp) {
          throw new Error('An active application with this email already exists for this society.');
        }

        const { data, error } = await supabase
          .from('membership_applications')
          .insert([{
            society_id: application.societyId,
            first_name: application.firstName,
            last_name: application.lastName,
            email: application.email,
            phone: application.phone,
            address: application.address,
            guarantor_id1: application.guarantor1Id || application.guarantorIds?.[0],
            guarantor_id2: application.guarantor2Id || application.guarantorIds?.[1],
            occupation: application.occupation || '',
            monthly_income: application.monthlyIncome || 0,
            status: 'pending'
          }])
          .select()
          .single();

        if (error) {
          console.error('CRITICAL: Supabase membership_applications insert error:', error.message, '| details:', error.details, '| hint:', error.hint);
          throw error;
        }

        // Convert Supabase response to MembershipApplication format
        const newApplication: MembershipApplication = {
          id: data.id,
          societyId: data.society_id,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          occupation: data.occupation || undefined,
          monthlyIncome: data.monthly_income ? Number(data.monthly_income) : undefined,
          guarantor1Id: data.guarantor_id1,
          guarantor2Id: data.guarantor_id2,
          guarantorIds: [data.guarantor_id1, data.guarantor_id2].filter(Boolean) as string[],
          guarantorCount: 2,
          status: data.status as 'pending' | 'approved' | 'rejected',
          appliedAt: new Date(data.applied_at),
          reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined,
          reviewedBy: data.reviewed_by || undefined,
          reviewNotes: data.review_notes || undefined
        };

        // Create guarantor requests for this application in Supabase
        const guarantorIds = [data.guarantor_id1, data.guarantor_id2].filter(Boolean) as string[];
        for (const guarantorId of guarantorIds) {
          await this.createGuarantorRequest({
            societyId: data.society_id,
            type: 'membership',
            applicationId: data.id,
            applicantName: `${data.first_name} ${data.last_name}`,
            guarantorMemberId: guarantorId,
            status: 'pending'
          });
        }

        // Also save to localStorage as backup
        this.applications.push(newApplication);
        this.saveToStorage();

        return newApplication;
      } catch (error: any) {
        console.error('FATAL: Error creating application in Supabase. Falling back to LocalStorage.', error.message || error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage if Supabase is not configured or fails
    const newApplication: MembershipApplication = {
      ...application,
      id: Date.now().toString(),
      appliedAt: new Date(),
      status: 'pending',
    };

    // Create guarantor requests for this application
    if (application.guarantorIds && application.guarantorIds.length > 0) {
      for (const guarantorId of application.guarantorIds) {
        await this.createGuarantorRequest({
          societyId: newApplication.societyId,
          type: 'membership',
          applicationId: newApplication.id,
          applicantName: `${newApplication.firstName} ${newApplication.lastName}`,
          guarantorMemberId: guarantorId,
          status: 'pending'
        });
      }
    }

    this.applications.push(newApplication);
    this.saveToStorage();
    return newApplication;
  }

  // Loan application methods
  async getLoanApplications(societyId?: string): Promise<LoanApplication[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('loan_applications')
          .select('*')
          .order('applied_at', { ascending: false });

        if (societyId) {
          query = query.eq('society_id', societyId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data) {
          // Convert Supabase response to LoanApplication format
          const loanApplications: LoanApplication[] = data.map(loan => {
            const guarantorIds = [loan.guarantor_id1, loan.guarantor_id2].filter(Boolean) as string[];
            return {
              id: loan.id,
              memberId: loan.member_id || 'N/A',
              societyId: loan.society_id || 'N/A',
              amount: loan.amount || 0,
              purpose: loan.purpose || 'N/A',
              duration: loan.duration || 0,
              guarantor1Id: loan.guarantor_id1,
              guarantor2Id: loan.guarantor_id2,
              guarantorIds,
              guarantorCount: 2,
              status: (loan.status as any) || 'pending',
              appliedAt: loan.applied_at ? new Date(loan.applied_at) : new Date(),
              reviewedAt: loan.reviewed_at ? new Date(loan.reviewed_at) : undefined,
              reviewedBy: loan.reviewed_by || undefined,
              reviewNotes: loan.review_notes || undefined,
              disbursedAt: loan.disbursed_at ? new Date(loan.disbursed_at) : undefined
            };
          });

          return loanApplications;
        }
      } catch (error) {
        console.warn('Error fetching loan applications from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
    if (societyId) {
      return this.loanApplications.filter(l => l.societyId === societyId);
    }
    return [...this.loanApplications];
  }

  async getLoanApplicationsByMember(memberId: string): Promise<LoanApplication[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('loan_applications')
          .select('*')
          .eq('member_id', memberId)
          .order('applied_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data) {
          // Convert Supabase response to LoanApplication format
          const loanApplications: LoanApplication[] = data.map(loan => {
            const guarantorIds = [loan.guarantor_id1, loan.guarantor_id2].filter(Boolean) as string[];
            return {
              id: loan.id,
              memberId: loan.member_id || 'N/A',
              societyId: loan.society_id || 'N/A',
              amount: loan.amount || 0,
              purpose: loan.purpose || 'N/A',
              duration: loan.duration || 0,
              guarantor1Id: loan.guarantor_id1,
              guarantor2Id: loan.guarantor_id2,
              guarantorIds,
              guarantorCount: 2,
              status: (loan.status as any) || 'pending',
              appliedAt: loan.applied_at ? new Date(loan.applied_at) : new Date(),
              reviewedAt: loan.reviewed_at ? new Date(loan.reviewed_at) : undefined,
              reviewedBy: loan.reviewed_by || undefined,
              reviewNotes: loan.review_notes || undefined,
              disbursedAt: loan.disbursed_at ? new Date(loan.disbursed_at) : undefined
            };
          });

          return loanApplications;
        }
      } catch (error) {
        console.warn('Error fetching member loan applications from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
    return this.loanApplications.filter(loan => loan.memberId === memberId);
  }

  async updateLoanApplication(id: string, updates: Partial<LoanApplication>): Promise<LoanApplication | undefined> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const updateData: any = {};
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.reviewedAt !== undefined) updateData.reviewed_at = updates.reviewedAt;
        if (updates.reviewedBy !== undefined) updateData.reviewed_by = updates.reviewedBy;
        if (updates.reviewNotes !== undefined) updateData.review_notes = updates.reviewNotes;
        if (updates.disbursedAt !== undefined) updateData.disbursed_at = updates.disbursedAt;

        const { data, error } = await supabase
          .from('loan_applications')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.warn('Supabase update error:', error);
          throw error;
        }

        if (data) {
          const updatedLoanApplication: LoanApplication = {
            id: data.id,
            memberId: data.member_id,
            societyId: data.society_id,
            amount: data.amount,
            purpose: data.purpose,
            duration: data.duration,
            guarantor1Id: data.guarantor_id1,
            guarantor2Id: data.guarantor_id2,
            guarantorIds: [data.guarantor_id1, data.guarantor_id2].filter(Boolean) as string[],
            guarantorCount: 2,
            status: data.status as 'pending' | 'approved' | 'rejected' | 'disbursed',
            appliedAt: new Date(data.applied_at),
            reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined,
            reviewedBy: data.reviewed_by || undefined,
            reviewNotes: data.review_notes || undefined,
            disbursedAt: data.disbursed_at ? new Date(data.disbursed_at) : undefined
          };

          // Update localStorage
          const index = this.loanApplications.findIndex(loan => loan.id === id);
          if (index !== -1) {
            this.loanApplications[index] = updatedLoanApplication;
            this.saveToStorage();
          }

          return updatedLoanApplication;
        }
      } catch (error) {
        console.warn('Error updating loan application in Supabase:', error);
        // Fall through to localStorage
      }
    }

    // Fallback to localStorage
    const index = this.loanApplications.findIndex(loan => loan.id === id);
    if (index !== -1) {
      this.loanApplications[index] = { ...this.loanApplications[index], ...updates };
      this.saveToStorage();
      return this.loanApplications[index];
    }
    return undefined;
  }

  async createLoanApplication(application: Omit<LoanApplication, 'id' | 'appliedAt' | 'status'>): Promise<LoanApplication> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('loan_applications')
          .insert([{
            member_id: application.memberId,
            society_id: application.societyId,
            amount: application.amount,
            purpose: application.purpose,
            duration: application.duration,
            guarantor_id1: application.guarantor1Id || application.guarantorIds?.[0],
            guarantor_id2: application.guarantor2Id || application.guarantorIds?.[1],
            status: 'pending'
          }])
          .select()
          .single();

        if (error) {
          console.error('CRITICAL: Supabase loan_applications insert error:', error.message, '| details:', error.details, '| hint:', error.hint);
          throw error;
        }

        // Convert Supabase response to LoanApplication format
        const newLoanApplication: LoanApplication = {
          id: data.id,
          memberId: data.member_id,
          societyId: data.society_id,
          amount: data.amount,
          purpose: data.purpose,
          duration: data.duration,
          guarantor1Id: data.guarantor_id1,
          guarantor2Id: data.guarantor_id2,
          guarantorIds: [data.guarantor_id1, data.guarantor_id2].filter(Boolean) as string[],
          guarantorCount: 2,
          status: data.status as 'pending' | 'approved' | 'rejected' | 'disbursed',
          appliedAt: new Date(data.applied_at),
          reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined,
          reviewedBy: data.reviewed_by || undefined,
          reviewNotes: data.review_notes || undefined,
          disbursedAt: data.disbursed_at ? new Date(data.disbursed_at) : undefined
        };

        // Create guarantor requests for this application in Supabase
        const guarantorIds = [data.guarantor_id1, data.guarantor_id2].filter(Boolean) as string[];
        const member = this.members.find(m => m.id === data.member_id);
        const applicantName = member ? `${member.firstName} ${member.lastName}` : `Member ${data.member_id}`;

        for (const guarantorId of guarantorIds) {
          await this.createGuarantorRequest({
            societyId: data.society_id,
            type: 'loan',
            applicationId: data.id,
            applicantName,
            guarantorMemberId: guarantorId,
            status: 'pending'
          });
        }

        // Also save to localStorage as backup
        this.loanApplications.push(newLoanApplication);
        this.saveToStorage();

        return newLoanApplication;
      } catch (error) {
        console.warn('Error creating loan application in Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage if Supabase is not configured or fails
    const newApplication: LoanApplication = {
      ...application,
      id: Date.now().toString(),
      appliedAt: new Date(),
      status: 'pending',
    };
    // Create guarantor requests for this application
    const guarantorIds = [application.guarantor1Id, application.guarantor2Id].filter(Boolean) as string[];
    for (const guarantorId of guarantorIds) {
      await this.createGuarantorRequest({
        societyId: newApplication.societyId,
        type: 'loan',
        applicationId: newApplication.id,
        applicantName: `Member ${newApplication.memberId}`,
        guarantorMemberId: guarantorId,
        status: 'pending'
      });
    }

    this.loanApplications.push(newApplication);
    this.saveToStorage();
    return newApplication;
  }

  // Transaction methods
  async getTransactions(societyId?: string): Promise<Transaction[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });

        if (societyId) {
          query = query.eq('society_id', societyId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data) {
          // Convert Supabase response to Transaction format
          const transactions: Transaction[] = data.map(t => ({
            id: t.id,
            memberId: t.member_id,
            societyId: t.society_id || 'N/A',
            type: t.type,
            amount: t.amount,
            description: t.description,
            date: new Date(t.date),
            balanceAfter: t.balance_after,
            referenceNumber: t.reference_number || undefined,
            processedBy: t.processed_by || undefined
          }));

          return transactions;
        }
      } catch (error) {
        console.warn('Error fetching transactions from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
    if (societyId) {
      return this.transactions.filter(t => t.societyId === societyId);
    }
    return [...this.transactions];
  }

  async getTransactionsByMember(memberId: string, monthsBack: number = 12): Promise<Transaction[]> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('member_id', memberId)
          .gte('date', cutoffDate.toISOString())
          .order('date', { ascending: false });

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data) {
          // Convert Supabase response to Transaction format
          const supaTransactions: Transaction[] = data.map(t => ({
            id: t.id,
            memberId: t.member_id,
            societyId: t.society_id || 'N/A',
            type: t.type,
            amount: t.amount,
            description: t.description,
            date: new Date(t.date),
            balanceAfter: t.balance_after,
            referenceNumber: t.reference_number || undefined,
            processedBy: t.processed_by || undefined
          }));

          // Merge: Preserve local-only transactions that haven't been synced yet
          const localOnly = this.transactions.filter(lt => 
            lt.memberId === memberId &&
            lt.date >= cutoffDate &&
            lt.id.startsWith('loc-t') && // Only merge our explicitly local ones
            !supaTransactions.some(st => st.referenceNumber === lt.referenceNumber)
          );

          const combined = [...supaTransactions, ...localOnly].sort((a, b) => 
            b.date.getTime() - a.date.getTime()
          );

          // Update local cache for this member
          // (Careful not to overwrite other members' local-only transactions)
          const otherTransactions = this.transactions.filter(t => t.memberId !== memberId);
          this.transactions = [...otherTransactions, ...combined];
          this.saveToStorage();

          return combined;
        }
      } catch (error) {
        console.warn('Error fetching member transactions from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
    return this.transactions
      .filter(transaction =>
        transaction.memberId === memberId &&
        transaction.date >= cutoffDate
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert([{
            member_id: transaction.memberId,
            society_id: transaction.societyId,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.date,
            balance_after: transaction.balanceAfter,
            reference_number: transaction.referenceNumber,
            processed_by: transaction.processedBy
          }])
          .select()
          .single();

        if (error) {
          console.warn('Supabase insert error (transactions):', error);
          throw error;
        }

        if (data) {
          // Convert Supabase response to Transaction format
          const newTransaction: Transaction = {
            id: data.id,
            memberId: data.member_id,
            societyId: data.society_id,
            type: data.type,
            amount: data.amount,
            description: data.description,
            date: new Date(data.date),
            balanceAfter: data.balance_after,
            referenceNumber: data.reference_number || undefined,
            processedBy: data.processed_by || undefined
          };

          // Also save to localStorage as backup
          this.transactions.push(newTransaction);
          this.saveToStorage();

          return newTransaction;
        }
      } catch (error) {
        console.warn('Error creating transaction in Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage if Supabase is not configured or fails
    const newTransaction: Transaction = {
      ...transaction,
      id: `loc-t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    this.transactions.push(newTransaction);
    this.saveToStorage();
    return newTransaction;
  }

  // By-laws methods
  getByLaws(societyId?: string): ByLaw[] {
    let results = [...this.byLaws];
    if (societyId) {
      results = results.filter(bylaw => bylaw.societyId === societyId);
    }
    return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getActiveByLaws(societyId?: string): Promise<ByLaw[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('bylaws')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false });

        if (societyId) {
          query = query.eq('society_id', societyId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data && data.length > 0) {
          // Convert Supabase response to ByLaw format
          const bylaws: ByLaw[] = data.map(bylaw => ({
            id: bylaw.id,
            societyId: bylaw.society_id,
            title: bylaw.title,
            content: bylaw.content,
            category: bylaw.category,
            createdBy: bylaw.created_by,
            createdAt: new Date(bylaw.created_at),
            updatedAt: new Date(bylaw.updated_at),
            isActive: bylaw.is_active
          }));

          return bylaws;
        } else {
          console.warn('No bylaws found in Supabase.');
        }
      } catch (error) {
        console.warn('Error fetching active bylaws from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
    let localBylaws = this.byLaws.filter(bylaw => bylaw.isActive);

    if (societyId) {
      localBylaws = localBylaws.filter(bylaw => bylaw.societyId === societyId);
    }

    // If no bylaws in localStorage, initialize with mock data
    if (localBylaws.length === 0) {
      console.warn('No bylaws in localStorage. Initializing with mock data.');
      // When initializing with mock data, we should also filter by societyId if provided
      if (societyId) {
        return [...mockByLaws].filter(bylaw => bylaw.isActive && bylaw.societyId === societyId);
      }
      return [...mockByLaws].filter(bylaw => bylaw.isActive);
    }

    return localBylaws.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  getByLawsByCategory(category: string, societyId?: string): ByLaw[] {
    let results = this.byLaws.filter(bylaw => bylaw.category === category && bylaw.isActive);
    if (societyId) {
      results = results.filter(bylaw => bylaw.societyId === societyId);
    }
    return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  getByLawById(id: string): ByLaw | undefined {
    return this.byLaws.find(bylaw => bylaw.id === id);
  }

  createByLaw(bylaw: Omit<ByLaw, 'id' | 'createdAt' | 'updatedAt'>): ByLaw {
    const newByLaw: ByLaw = {
      ...bylaw,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.byLaws.push(newByLaw);
    this.saveToStorage();
    return newByLaw;
  }

  updateByLaw(id: string, updates: Partial<Omit<ByLaw, 'id' | 'createdAt'>>): ByLaw | undefined {
    const index = this.byLaws.findIndex(bylaw => bylaw.id === id);
    if (index !== -1) {
      this.byLaws[index] = {
        ...this.byLaws[index],
        ...updates,
        updatedAt: new Date(),
      };
      this.saveToStorage();
      return this.byLaws[index];
    }
    return undefined;
  }

  deleteByLaw(id: string): boolean {
    const index = this.byLaws.findIndex(bylaw => bylaw.id === id);
    if (index !== -1) {
      this.byLaws.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Login session methods
  async getLoginSessions(societyId?: string): Promise<LoginSession[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('login_sessions').select('*');
        if (societyId) {
          query = query.eq('society_id', societyId);
        }
        const { data, error } = await query.order('login_time', { ascending: false });

        if (!error && data) {
          return data.map(s => ({
            id: s.id,
            userId: s.user_id,
            userEmail: s.user_email,
            userRole: s.user_role,
            societyId: s.society_id,
            loginTime: new Date(s.login_time),
            logoutTime: s.logout_time ? new Date(s.logout_time) : undefined,
            deviceInfo: s.device_info,
            locationInfo: s.location_info,
            sessionActive: s.session_active,
            isSuspicious: s.is_suspicious,
            suspiciousReasons: s.suspicious_reasons || undefined
          }));
        }
      } catch (error) {
        console.warn('Supabase fetch error for login sessions:', error);
      }
    }

    let results = this.loginSessions;
    if (societyId) {
      results = results.filter(s => s.societyId === societyId);
    }
    return [...results].sort((a, b) => b.loginTime.getTime() - a.loginTime.getTime());
  }

  async getLoginSessionsByUser(userId: string, societyId?: string): Promise<LoginSession[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('login_sessions').select('*').eq('user_id', userId);
        if (societyId) {
          query = query.eq('society_id', societyId);
        }
        const { data, error } = await query.order('login_time', { ascending: false });

        if (!error && data) {
          return data.map(s => ({
            id: s.id,
            userId: s.user_id,
            userEmail: s.user_email,
            userRole: s.user_role,
            societyId: s.society_id,
            loginTime: new Date(s.login_time),
            logoutTime: s.logout_time ? new Date(s.logout_time) : undefined,
            deviceInfo: s.device_info,
            locationInfo: s.location_info,
            sessionActive: s.session_active,
            isSuspicious: s.is_suspicious,
            suspiciousReasons: s.suspicious_reasons || undefined
          }));
        }
      } catch (error) {
        console.warn('Supabase fetch error for user login sessions:', error);
      }
    }

    let results = this.loginSessions.filter(session => session.userId === userId);
    if (societyId) {
      results = results.filter(s => s.societyId === societyId);
    }
    return results.sort((a, b) => b.loginTime.getTime() - a.loginTime.getTime());
  }

  async getAdminLoginSessions(societyId?: string, limit?: number): Promise<LoginSession[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('login_sessions').select('*').eq('user_role', 'admin');
        if (societyId) {
          query = query.eq('society_id', societyId);
        }
        query = query.order('login_time', { ascending: false });
        if (limit) {
          query = query.limit(limit);
        }
        const { data, error } = await query;

        if (!error && data) {
          return data.map(s => ({
            id: s.id,
            userId: s.user_id,
            userEmail: s.user_email,
            userRole: s.user_role,
            societyId: s.society_id,
            loginTime: new Date(s.login_time),
            logoutTime: s.logout_time ? new Date(s.logout_time) : undefined,
            deviceInfo: s.device_info,
            locationInfo: s.location_info,
            sessionActive: s.session_active,
            isSuspicious: s.is_suspicious,
            suspiciousReasons: s.suspicious_reasons || undefined
          }));
        }
      } catch (error) {
        console.warn('Supabase fetch error for admin login sessions:', error);
      }
    }

    let adminSessions = this.loginSessions.filter(session => session.userRole === 'admin');
    if (societyId) {
      adminSessions = adminSessions.filter(s => s.societyId === societyId);
    }
    adminSessions.sort((a, b) => b.loginTime.getTime() - a.loginTime.getTime());

    return limit ? adminSessions.slice(0, limit) : adminSessions;
  }

  async createLoginSession(session: Omit<LoginSession, 'id'>): Promise<LoginSession> {
    const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // Check for suspicious activity
    const userPreviousSessions = await this.getLoginSessionsByUser(session.userId, session.societyId);
    const suspiciousReasons: string[] = [];

    if (userPreviousSessions.length > 0) {
      // Check for different country
      const lastSession = userPreviousSessions[0];
      if (lastSession.locationInfo.country &&
        session.locationInfo.country &&
        lastSession.locationInfo.country !== session.locationInfo.country) {
        suspiciousReasons.push('Login from different country');
      }

      // Check for different device type
      if (lastSession.deviceInfo.deviceType !== session.deviceInfo.deviceType) {
        suspiciousReasons.push('Different device type');
      }

      // Check for different OS
      if (lastSession.deviceInfo.os !== session.deviceInfo.os) {
        suspiciousReasons.push('Different operating system');
      }

      // Check for different browser
      if (lastSession.deviceInfo.browser !== session.deviceInfo.browser) {
        suspiciousReasons.push('Different browser');
      }
    }

    const isSuspicious = suspiciousReasons.length > 0;

    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('login_sessions')
          .insert([{
            user_id: session.userId,
            user_email: session.userEmail,
            user_role: session.userRole,
            society_id: session.societyId,
            login_time: session.loginTime,
            device_info: session.deviceInfo,
            location_info: session.locationInfo,
            session_active: session.sessionActive ?? true,
            is_suspicious: isSuspicious,
            suspicious_reasons: isSuspicious ? suspiciousReasons : null
          }])
          .select()
          .single();

        if (error) {
          console.warn('Supabase insert error:', error);
          throw error;
        }

        // Convert Supabase response to LoginSession format
        const newSession: LoginSession = {
          id: data.id,
          userId: data.user_id,
          userEmail: data.user_email,
          userRole: data.user_role,
          societyId: data.society_id,
          loginTime: new Date(data.login_time),
          logoutTime: data.logout_time ? new Date(data.logout_time) : undefined,
          deviceInfo: data.device_info,
          locationInfo: data.location_info,
          sessionActive: data.session_active,
          isSuspicious: data.is_suspicious,
          suspiciousReasons: data.suspicious_reasons || undefined
        };

        // Also save to localStorage as backup
        this.loginSessions.push(newSession);
        this.saveToStorage();

        return newSession;
      } catch (error) {
        console.warn('Error creating login session in Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage if Supabase is not configured or fails
    const newSession: LoginSession = {
      ...session,
      id: tempId,
      isSuspicious,
      suspiciousReasons: isSuspicious ? suspiciousReasons : undefined
    };

    this.loginSessions.push(newSession);
    this.saveToStorage();
    return newSession;
  }

  async updateLoginSession(id: string, updates: Partial<LoginSession>): Promise<LoginSession | undefined> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('login_sessions')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const updated: LoginSession = {
            ...data,
            loginTime: new Date(data.login_time),
            logoutTime: data.logout_time ? new Date(data.logout_time) : undefined
          };
          const index = this.loginSessions.findIndex(s => s.id === id);
          if (index !== -1) {
            this.loginSessions[index] = updated;
            this.saveToStorage();
          }
          return updated;
        }
      } catch (error) {
        console.warn('Error updating login session in Supabase:', error);
      }
    }

    const index = this.loginSessions.findIndex(session => session.id === id);
    if (index !== -1) {
      this.loginSessions[index] = { ...this.loginSessions[index], ...updates };
      this.saveToStorage();
      return this.loginSessions[index];
    }
    return undefined;
  }

  async endLoginSession(sessionId: string): Promise<boolean> {
    const logoutTime = new Date();
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('login_sessions')
          .update({
            logout_time: logoutTime.toISOString(),
            session_active: false
          })
          .eq('id', sessionId);

        if (error) throw error;
      } catch (error) {
        console.warn('Error ending login session in Supabase:', error);
      }
    }

    const index = this.loginSessions.findIndex(session => session.id === sessionId);
    if (index !== -1) {
      this.loginSessions[index] = {
        ...this.loginSessions[index],
        logoutTime,
        sessionActive: false,
      };
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Super Admin methods - Platform-wide management
  async getAllSocieties(): Promise<Society[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('societies')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data) {
          // Convert Supabase response to Society format
          return data.map(soc => ({
            id: soc.id,
            name: soc.name,
            registrationNumber: soc.registration_number,
            address: soc.address,
            phone: soc.phone,
            email: soc.email,
            adminUserId: soc.admin_user_id,
            createdAt: new Date(soc.created_at),
            status: soc.status || 'active',
            memberCount: soc.member_count || 0,
            totalSavings: soc.total_savings || 0,
            totalLoans: soc.total_loans || 0,
            totalShares: soc.total_shares || 0
          }));
        }
      } catch (error) {
        console.warn('Error fetching societies from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    return [...this.societies].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSocietyById(id: string): Promise<Society | undefined> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('societies')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data) {
          return {
            id: data.id,
            name: data.name,
            registrationNumber: data.registration_number,
            address: data.address,
            phone: data.phone,
            email: data.email,
            adminUserId: data.admin_user_id,
            createdAt: new Date(data.created_at),
            status: data.status || 'active',
            memberCount: data.member_count || 0,
            totalSavings: data.total_savings || 0,
            totalLoans: data.total_loans || 0,
            totalShares: data.total_shares || 0
          };
        }
      } catch (error) {
        console.warn('Error fetching society by ID from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    return this.societies.find(soc => soc.id === id);
  }

  async getAllUsers(): Promise<User[]> {
    // Try Supabase first if needed, for now use local
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
          return data.map(u => ({
            id: u.id,
            email: u.email,
            password: u.password,
            role: u.role,
            createdAt: new Date(u.created_at),
            societyId: u.society_id || undefined,
            isFirstLogin: u.is_first_login,
            isActive: u.is_active ?? true
          }));
        }
      } catch (err) {
        console.warn('Supabase users fetch error:', err);
      }
    }
    return [...this.users];
  }

  async getAllMembers(): Promise<Member[]> {
    return this.getMembers();
  }

  getMembersBySociety(societyId: string): Member[] {
    return this.members.filter(m => m.societyId === societyId);
  }

  getApplicationsBySociety(societyId: string): MembershipApplication[] {
    return this.applications.filter(a => a.societyId === societyId);
  }

  async toggleUserActive(userId: string): Promise<boolean> {
    const index = this.users.findIndex(user => user.id === userId);
    if (index !== -1) {
      const newStatus = !this.users[index].isActive;
      this.users[index] = {
        ...this.users[index],
        isActive: newStatus,
      };

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('users').update({ is_active: newStatus }).eq('id', userId);
        } catch (err) {
          console.warn('Supabase user status update error:', err);
        }
      }

      this.saveToStorage();
      return true;
    }
    return false;
  }


  async createMemberWithUser(data: Omit<Member, 'id' | 'userId' | 'memberNumber' | 'dateJoined' | 'status' | 'loanBalance' | 'interestBalance' | 'societyDues'>): Promise<Member> {
    const userId = `u${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

    // 1. Create the user account
    const user = await this.createUser({
      email: data.email,
      password: (data as any).password || 'member123', // Use provided password if any, else default
      role: 'member',
      societyId: data.societyId,
      isFirstLogin: true,
      isActive: true
    });

    // 2. Create the member record
    const newMember: Member = {
      ...data,
      id: '', // Will be set by Supabase
      userId: user.id,
      memberNumber: (data as any).memberNumber || `MEM-${Date.now().toString().slice(-6)}`,
      dateJoined: new Date(),
      status: 'active',
      sharesBalance: data.sharesBalance || 0,
      savingsBalance: data.savingsBalance || 0,
      loanBalance: 0,
      interestBalance: 0,
      societyDues: 0
    };

    // 3. Save member to Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data: supaMember, error } = await supabase.from('members').insert([{
          user_id: newMember.userId,
          society_id: newMember.societyId,
          member_number: newMember.memberNumber,
          first_name: newMember.firstName,
          last_name: newMember.lastName,
          email: newMember.email,
          phone: newMember.phone,
          address: newMember.address,
          status: newMember.status,
          shares_balance: newMember.sharesBalance,
          savings_balance: newMember.savingsBalance,
          loan_balance: newMember.loanBalance,
          interest_balance: newMember.interestBalance,
          society_dues: newMember.societyDues,
          date_joined: newMember.dateJoined.toISOString(),
          occupation: newMember.occupation,
          annual_income: newMember.annualIncome
        }]).select().single();

        if (error) {
          console.warn('Supabase member insert error:', error);
          throw new Error(`Failed to save member to database: ${error.message}`);
        }

        if (supaMember) {
          newMember.id = supaMember.id;
        }
      } catch (err: any) {
        console.warn('Supabase member insert exception:', err);
        throw err;
      }
    } else {
      newMember.id = `m${Date.now()}`;
    }

    this.members.push(newMember);

    // Increment member count in society
    const socIndex = this.societies.findIndex(s => s.id === data.societyId);
    if (socIndex !== -1) {
      this.societies[socIndex].memberCount++;
    }

    this.saveToStorage();
    return newMember;
  }

  async updateSocietyStatus(id: string, status: 'active' | 'suspended'): Promise<Society | undefined> {
    const soc = this.societies.find(s => s.id === id);
    if (!soc) return undefined;

    soc.status = status;

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('societies').update({ status }).eq('id', id);
        if (error) {
          console.warn('Supabase society status update error:', error);
          throw new Error(`Failed to update society status in database: ${error.message}`);
        }
      } catch (err: any) {
        console.warn('Supabase society status update exception:', err);
        throw err;
      }
    }

    this.saveToStorage();
    return soc;
  }

  // Auto-calculate pending interest for a single member (once per session)
  private async autoCalculateInterestForMember(member: Member): Promise<Member> {
    // Only calculate if member has an active loan
    if (!member.loanBalance || member.loanBalance <= 0) {
      return member;
    }

    // Session guard: don't charge the same member twice in one browser session.
    // The member.id key is used so each reload of the page gives a fresh session.
    if (interestSessionCache.has(member.id)) {
      return member;
    }

    // Calculate pending interest
    const calculation = calculateAccumulatedInterest(member);

    // Mark as processed for this session whether or not interest was owed.
    // This prevents repeated 0-month checks too.
    interestSessionCache.add(member.id);

    // If there's pending interest to charge, update the member
    if (calculation.monthsToCalculate > 0 && calculation.totalInterest > 0) {
      console.log(`[Interest] Auto-charging ${calculation.monthsToCalculate} month(s) for ${member.firstName} ${member.lastName}: ₦${calculation.totalInterest.toLocaleString()}`);

      // Update member with new interest balance and mark the calculation date
      const updated = await this.updateMember(member.id, {
        interestBalance: calculation.newInterestBalance,
        lastInterestCalculationDate: new Date(),
      });

      // Record an interest_charge transaction
      await this.createTransaction({
        memberId: member.id,
        societyId: member.societyId,
        type: 'interest_charge',
        amount: calculation.totalInterest,
        description: `Monthly interest — ${calculation.monthsToCalculate} month(s) @ ${calculation.breakdown[0]?.rate ?? '?'}%`,
        date: new Date(),
        balanceAfter: calculation.newInterestBalance,
        referenceNumber: `AUTO-INT-${Date.now()}-${member.id}`,
        processedBy: 'system',
      });

      return updated || member;
    }

    return member;
  }

  // Auto-calculate pending interest for multiple members
  private async autoCalculateInterestForMembers(members: Member[]): Promise<Member[]> {
    const updatedMembers: Member[] = [];

    for (const member of members) {
      const updated = await this.autoCalculateInterestForMember(member);
      updatedMembers.push(updated);
    }

    return updatedMembers;
  }

  async getPlatformStatistics() {
    // Refresh local cache if possible, or just use what we have
    const societies = await this.getAllSocieties();
    const members = await this.getAllMembers();
    const users = await this.getAllUsers();
    const applications = await this.getApplications();

    const activeSocieties = societies.filter(s => s.status === 'active').length;
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive !== false).length;
    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'active').length;
    const totalSavings = members.reduce((sum, m) => sum + (m.savingsBalance || 0), 0);
    const totalLoans = members.reduce((sum, m) => sum + (m.loanBalance || 0), 0);
    const totalShares = members.reduce((sum, m) => sum + (m.sharesBalance || 0), 0);
    const pendingApplications = applications.filter(a => a.status === 'pending').length;

    return {
      activeSocieties,
      totalSocieties: societies.length,
      totalUsers,
      activeUsers,
      totalMembers,
      activeMembers,
      totalSavings,
      totalLoans,
      totalShares,
      totalWithPlatform: totalSavings + totalShares,
      pendingApplications,
    };
  }

  updateSociety(id: string, updates: Partial<Society>): Society | undefined {
    const index = this.societies.findIndex(soc => soc.id === id);
    if (index !== -1) {
      this.societies[index] = { ...this.societies[index], ...updates };
      this.saveToStorage();
      return this.societies[index];
    }
    return undefined;
  }

  // ─── Guarantor Requests ────────────────────────────────────────────────────

  private guarantorRequests: GuarantorRequest[] = this.loadKeyFromStorage<GuarantorRequest[]>('guarantorRequests') || [];

  async createGuarantorRequest(data: Omit<GuarantorRequest, 'id' | 'requestedAt'>): Promise<GuarantorRequest> {
    const id = `gr${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const requestedAt = new Date();

    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data: supabaseData, error } = await supabase
          .from('guarantor_requests')
          .insert([{
            id,
            society_id: data.societyId,
            type: data.type,
            application_id: data.applicationId,
            applicant_name: data.applicantName,
            guarantor_member_id: data.guarantorMemberId,
            status: data.status || 'pending',
            requested_at: requestedAt.toISOString()
          }])
          .select()
          .single();

        if (error) {
          console.warn('Supabase guarantor request insert error:', error);
          throw error;
        }

        if (supabaseData) {
          const newReq: GuarantorRequest = {
            id: supabaseData.id,
            societyId: supabaseData.society_id,
            type: supabaseData.type as 'loan' | 'membership',
            applicationId: supabaseData.application_id,
            applicantName: supabaseData.applicant_name,
            guarantorMemberId: supabaseData.guarantor_member_id,
            status: supabaseData.status as 'pending' | 'approved' | 'declined',
            requestedAt: new Date(supabaseData.requested_at),
            respondedAt: supabaseData.responded_at ? new Date(supabaseData.responded_at) : undefined
          };

          this.guarantorRequests.push(newReq);
          this.saveCollectionToStorage('guarantorRequests', this.guarantorRequests);
          return newReq;
        }
      } catch (error) {
        console.warn('Error creating guarantor request in Supabase:', error);
      }
    }

    const req: GuarantorRequest = {
      ...data,
      id,
      requestedAt,
    };
    this.guarantorRequests.push(req);
    this.saveCollectionToStorage('guarantorRequests', this.guarantorRequests);
    return req;
  }

  async getGuarantorRequestsForMember(memberId: string): Promise<GuarantorRequest[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('guarantor_requests')
          .select('*')
          .eq('guarantor_member_id', memberId);

        if (!error && data) {
          return data.map(r => ({
            id: r.id,
            societyId: r.society_id,
            type: r.type as 'loan' | 'membership',
            applicationId: r.application_id,
            applicantName: r.applicant_name,
            guarantorMemberId: r.guarantor_member_id,
            status: r.status as 'pending' | 'approved' | 'declined',
            requestedAt: new Date(r.requested_at),
            respondedAt: r.responded_at ? new Date(r.responded_at) : undefined
          }));
        }
      } catch (error) {
        console.warn('Error fetching guarantor requests from Supabase:', error);
      }
    }

    return this.guarantorRequests
      .filter(r => r.guarantorMemberId === memberId)
      .map(r => ({ ...r, requestedAt: new Date(r.requestedAt), respondedAt: r.respondedAt ? new Date(r.respondedAt) : undefined }));
  }

  async getGuarantorRequestsForApplication(applicationId: string): Promise<GuarantorRequest[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('guarantor_requests')
          .select('*')
          .eq('application_id', applicationId);

        if (!error && data) {
          return data.map(r => ({
            id: r.id,
            societyId: r.society_id,
            type: r.type as 'loan' | 'membership',
            applicationId: r.application_id,
            applicantName: r.applicant_name,
            guarantorMemberId: r.guarantor_member_id,
            status: r.status as 'pending' | 'approved' | 'declined',
            requestedAt: new Date(r.requested_at),
            respondedAt: r.responded_at ? new Date(r.responded_at) : undefined
          }));
        }
      } catch (error) {
        console.warn('Error fetching guarantor requests from Supabase:', error);
      }
    }

    return this.guarantorRequests
      .filter(r => r.applicationId === applicationId)
      .map(r => ({ ...r, requestedAt: new Date(r.requestedAt), respondedAt: r.respondedAt ? new Date(r.respondedAt) : undefined }));
  }

  async updateGuarantorRequest(id: string, status: 'approved' | 'declined'): Promise<GuarantorRequest | undefined> {
    const respondedAt = new Date();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('guarantor_requests')
          .update({
            status,
            responded_at: respondedAt.toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const updated: GuarantorRequest = {
            id: data.id,
            societyId: data.society_id,
            type: data.type as 'loan' | 'membership',
            applicationId: data.application_id,
            applicantName: data.applicant_name,
            guarantorMemberId: data.guarantor_member_id,
            status: data.status as 'pending' | 'approved' | 'declined',
            requestedAt: new Date(data.requested_at),
            respondedAt: new Date(data.responded_at)
          };

          const index = this.guarantorRequests.findIndex(r => r.id === id);
          if (index !== -1) {
            this.guarantorRequests[index] = updated;
            this.saveCollectionToStorage('guarantorRequests', this.guarantorRequests);
          }
          return updated;
        }
      } catch (error) {
        console.warn('Error updating guarantor request in Supabase:', error);
      }
    }

    const index = this.guarantorRequests.findIndex(r => r.id === id);
    if (index !== -1) {
      this.guarantorRequests[index] = {
        ...this.guarantorRequests[index],
        status,
        respondedAt,
      };
      this.saveCollectionToStorage('guarantorRequests', this.guarantorRequests);
      return this.guarantorRequests[index];
    }
    return undefined;
  }

  getActiveGuaranteesCount(memberId: string): number {
    let count = 0;
    // Get all approved loan guarantor requests for this member
    const approvedRequests = this.guarantorRequests.filter(
      r => r.guarantorMemberId === memberId && r.status === 'approved' && r.type === 'loan'
    );

    for (const request of approvedRequests) {
      // Find the application being guaranteed
      const application = this.loanApplications.find(a => a.id === request.applicationId);

      // If the application doesn't exist anymore or it was rejected, it shouldn't count
      if (!application || application.status === 'rejected') continue;

      // Find the member who applied for the loan (the borrower)
      const borrower = this.members.find(m => m.id === application.memberId);
      if (!borrower) continue;

      // If the loan is still pending approval, it's an active guarantee obligation
      if (application.status === 'pending') {
        count++;
      }
      // If the loan was approved/disbursed, it only counts if the borrower still has a balance
      else if ((borrower.loanBalance || 0) > 0 || (borrower.interestBalance || 0) > 0) {
        count++;
      }
    }

    return count;
  }

  // ─── Broadcast Messages ────────────────────────────────────────────────────

  private broadcastMessages: BroadcastMessage[] = this.loadKeyFromStorage<BroadcastMessage[]>('broadcastMessages') || [];

  async createBroadcastMessage(data: Omit<BroadcastMessage, 'id' | 'sentAt' | 'readBy'>): Promise<BroadcastMessage> {
    const msg: BroadcastMessage = {
      ...data,
      id: `bm${Date.now()}`,
      sentAt: new Date(),
      readBy: [],
    };

    if (isSupabaseConfigured()) {
      try {
        const { data: supaMsg, error } = await supabase.from('broadcast_messages').insert([{
          society_id: msg.societyId,
          subject: msg.subject,
          body: msg.body,
          sent_at: msg.sentAt.toISOString(),
          sent_by: msg.sentBy,
          read_by: [],
          is_recurrent: msg.isRecurrent,
          frequency: msg.frequency,
          custom_days: msg.customDays,
          next_scheduled_at: msg.nextScheduledAt?.toISOString()
        }]).select().single();

        if (!error && supaMsg) {
          console.log(`MockDatabase: Created broadcast message in Supabase with ID: ${supaMsg.id}`);
          msg.id = supaMsg.id;
        }
      } catch (err) {
        console.warn('Supabase broadcast insert error:', err);
      }
    }

    console.log(`MockDatabase: Saving broadcast message locally for society: ${msg.societyId}`);
    this.broadcastMessages.push(msg);
    this.saveCollectionToStorage('broadcastMessages', this.broadcastMessages);
    return msg;
  }

  async getBroadcastMessages(societyId?: string): Promise<BroadcastMessage[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('broadcast_messages').select('*');
        if (societyId) {
          query = query.eq('society_id', societyId);
        }
        const { data, error } = await query.order('sent_at', { ascending: false });

        if (error) throw error;
        if (data) {
          console.log(`MockDatabase: Fetched ${data.length} broadcasts for society ${societyId} from Supabase`);
          const supaMessages: BroadcastMessage[] = data.map(m => ({
            id: m.id,
            societyId: m.society_id,
            subject: m.subject,
            body: m.body,
            sentAt: new Date(m.sent_at),
            sentBy: m.sent_by,
            readBy: m.read_by || [],
            isRecurrent: m.is_recurrent,
            frequency: m.frequency,
            customDays: m.custom_days,
            nextScheduledAt: m.next_scheduled_at ? new Date(m.next_scheduled_at) : undefined
          }));

          // Merge: Preserve local readBy if it's more up-to-date
          // ALSO: Preserve local-only messages that haven't been synced yet
          const localOnly = this.broadcastMessages.filter(lm => 
            !supaMessages.some(sm => sm.id === lm.id) && lm.id.startsWith('bm')
          );
          
          supaMessages.forEach(sm => {
            const local = this.broadcastMessages.find(lm => lm.id === sm.id);
            if (local && local.readBy.length > sm.readBy.length) {
              sm.readBy = local.readBy;
            }
          });

          const combined = [...supaMessages, ...localOnly].sort((a, b) => 
            new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
          );

          // Update local cache
          this.broadcastMessages = combined;
          this.saveCollectionToStorage('broadcastMessages', this.broadcastMessages);
          
          return combined;
        }
      } catch (err) {
        console.warn('Supabase broadcast fetch error:', err);
      }
    }

    let results = this.broadcastMessages;
    if (societyId) {
      results = results.filter(m => m.societyId === societyId);
    }
    return results
      .map(m => ({ ...m, sentAt: new Date(m.sentAt) }))
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  async markBroadcastRead(messageId: string, memberId: string): Promise<void> {
    console.log(`MockDatabase: Attempting to mark broadcast ${messageId} as read by member ${memberId}`);
    let msg = this.broadcastMessages.find(m => m.id === messageId);

    // If not in local cache, try to fetch current state from Supabase first
    if (!msg && isSupabaseConfigured()) {
      console.log(`MockDatabase: Broadcast ${messageId} not in cache, fetching from Supabase...`);
      try {
        const { data, error } = await supabase
          .from('broadcast_messages')
          .select('*')
          .eq('id', messageId)
          .single();

        if (data) {
          msg = {
            id: data.id,
            societyId: data.society_id,
            subject: data.subject,
            body: data.body,
            sentAt: new Date(data.sent_at),
            sentBy: data.sent_by,
            readBy: data.read_by || [],
            isRecurrent: data.is_recurrent,
            frequency: data.frequency,
            customDays: data.custom_days,
            nextScheduledAt: data.next_scheduled_at ? new Date(data.next_scheduled_at) : undefined
          };
          this.broadcastMessages.push(msg);
          console.log(`MockDatabase: Fetched broadcast from Supabase. Current readBy:`, msg.readBy);
        }
      } catch (err) {
        console.warn('Supabase fetch in markBroadcastRead error:', err);
      }
    }

    if (msg) {
      if (!msg.readBy.includes(memberId)) {
        msg.readBy.push(memberId);
        this.saveCollectionToStorage('broadcastMessages', this.broadcastMessages);

        if (isSupabaseConfigured()) {
          try {
            console.log(`MockDatabase: Updating Supabase read_by for ${messageId} to:`, msg.readBy);
            const { error } = await supabase
              .from('broadcast_messages')
              .update({ read_by: msg.readBy })
              .eq('id', messageId);
            if (error) throw error;
            console.log(`MockDatabase: Successfully updated Supabase.`);
          } catch (err) {
            console.warn('Supabase markBroadcastRead error:', err);
          }
        }
      } else {
        console.log(`MockDatabase: Member ${memberId} already in readBy for ${messageId}`);
      }
    } else {
      console.warn(`MockDatabase: Broadcast ${messageId} not found even after Supabase check.`);
    }
  }

  /**
   * Processes recurrent broadcasts to "automatically" send new instances
   * This is typically called by an admin dashboard or a simulated background process
   */
  async processRecurrentBroadcasts(societyId: string): Promise<void> {
    console.log(`MockDatabase: Processing recurrent broadcasts for society: ${societyId}`);
    const now = new Date();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('broadcast_messages')
          .select('*')
          .eq('society_id', societyId)
          .eq('is_recurrent', true)
          .lte('next_scheduled_at', now.toISOString());

        if (error) {
          if (error.code === '42703') {
            console.warn('MockDatabase: Supabase schema mismatch (missing columns). Skipping recurrent processing.');
            return;
          }
          throw error;
        }
        if (data && data.length > 0) {
          for (const template of data) {
            console.log(`MockDatabase: Recurrence triggered for "${template.subject}"`);

            // Create new broadcast instance (the actual message members see)
            const newMsg: BroadcastMessage = {
              id: '', // Will be set by create method
              societyId: template.society_id,
              subject: template.subject,
              body: template.body,
              sentAt: now,
              sentBy: template.sent_by,
              readBy: [],
              isRecurrent: false // Instance itself is NOT recurrent
            };

            await this.createBroadcastMessage(newMsg);

            // Update the template with next scheduled date
            const nextDate = this.calculateNextRecurrence(new Date(template.next_scheduled_at), template.frequency, template.custom_days);

            await supabase
              .from('broadcast_messages')
              .update({
                next_scheduled_at: nextDate?.toISOString(),
                sent_at: now.toISOString() // Record the last run time
              })
              .eq('id', template.id);
          }
        }
      } catch (err) {
        console.warn('Supabase processRecurrentBroadcasts error:', err);
      }
    }
  }

  private calculateNextRecurrence(current: Date, frequency: string, customDays?: number): Date | null {
    const next = new Date(current);
    if (frequency === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else if (frequency === 'monthly') {
      next.setMonth(next.getMonth() + 1);
    } else if (frequency === 'custom' && customDays) {
      next.setDate(next.getDate() + customDays);
    } else {
      return null;
    }
    return next;
  }

  async deleteBroadcastMessage(id: string): Promise<void> {
    this.broadcastMessages = this.broadcastMessages.filter(m => m.id !== id);
    this.saveCollectionToStorage('broadcastMessages', this.broadcastMessages);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('broadcast_messages').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteBroadcastMessage error:', err);
      }
    }
  }

  // ─── Levies ────────────────────────────────────────────────────────────────

  private levies: Levy[] = this.loadKeyFromStorage<Levy[]>('levies') || [];

  async createLevy(data: Omit<Levy, 'id' | 'imposedAt' | 'status'>): Promise<Levy> {
    const levy: Levy = {
      ...data,
      id: `lv${Date.now()}`,
      imposedAt: new Date(),
      status: 'active',
    };
    this.levies.push(levy);
    this.saveCollectionToStorage('levies', this.levies);

    // Update members and create transactions
    const targetIds = data.memberIds;

    await Promise.all(targetIds.map(async (memberId) => {
      const member = await this.getMemberById(memberId);
      if (member) {
        const newDuesBalance = (member.societyDues || 0) + data.amount;

        // Update member balance
        await this.updateMember(memberId, { societyDues: newDuesBalance });

        // Create dues_charge transaction with unique reference for sync tracking
        await this.createTransaction({
          memberId,
          societyId: data.societyId,
          type: 'dues_charge',
          amount: data.amount,
          description: data.description,
          date: new Date(),
          balanceAfter: newDuesBalance,
          referenceNumber: `LVY-${levy.id}-${memberId}`,
          processedBy: 'admin'
        });
      }
    }));

    return levy;
  }

  getLevies(societyId?: string): Levy[] {
    let results = this.levies;
    if (societyId) {
      results = results.filter(l => l.societyId === societyId);
    }
    return results.map(l => ({ ...l, imposedAt: new Date(l.imposedAt) }));
  }

  async getLeviesByMember(memberId: string): Promise<Levy[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('levies')
          .select('*')
          .contains('member_ids', [memberId]);

        if (!error && data) {
          return data.map(l => ({
            id: l.id,
            societyId: l.society_id,
            description: l.description,
            amount: l.amount,
            imposedAt: new Date(l.imposed_at),
            imposedBy: l.imposed_by,
            memberIds: l.member_ids || [],
            targetAll: l.target_all || false,
            status: l.status as 'active' | 'waived'
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch error for member levies:', err);
      }
    }

    return this.levies
      .filter(l => l.memberIds.includes(memberId) || l.targetAll)
      .map(l => ({ ...l, imposedAt: new Date(l.imposedAt) }))
      .sort((a, b) => b.imposedAt.getTime() - a.imposedAt.getTime());
  }

  // ─── Member Status ─────────────────────────────────────────────────────────

  async updateMemberStatus(memberId: string, status: 'active' | 'suspended' | 'inactive'): Promise<Member | undefined> {
    return this.updateMember(memberId, { status });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private loadKeyFromStorage<T>(key: string): T | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch { return null; }
  }

  private saveCollectionToStorage(key: string, data: unknown): void {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(data));
    } catch { /* ignore */ }
  }
}

export const db = new MockDatabase();
