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
    loanInterestRate: 15, // 15% annual
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
    guarantor1MemberId: 'm1',
    guarantor1Name: 'John Doe',
    guarantor1MemberNumber: 'OSU001',
    guarantor2MemberId: 'm2',
    guarantor2Name: 'Jane Smith',
    guarantor2MemberNumber: 'OSU002',
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
    guarantor1MemberId: 'm1',
    guarantor1Name: 'John Doe',
    guarantor1MemberNumber: 'OSU001',
    guarantor2MemberId: 'm2',
    guarantor2Name: 'Jane Smith',
    guarantor2MemberNumber: 'OSU002',
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
  },
  {
    id: 'loan2',
    memberId: 'm2',
    amount: 50000,
    purpose: 'Emergency medical expenses',
    duration: 6,
    status: 'pending',
    appliedAt: new Date('2024-03-08'),
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
      const storedSocieties = localStorage.getItem('osuolale_societies');
      const storedUsers = localStorage.getItem('osuolale_users');
      const storedMembers = localStorage.getItem('osuolale_members');
      const storedApplications = localStorage.getItem('osuolale_applications');
      const storedLoanApplications = localStorage.getItem('osuolale_loan_applications');
      const storedTransactions = localStorage.getItem('osuolale_transactions');
      const storedByLaws = localStorage.getItem('osuolale_bylaws');
      const storedLoginSessions = localStorage.getItem('osuolale_login_sessions');

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
      localStorage.setItem('osuolale_societies', JSON.stringify(this.societies));
      localStorage.setItem('osuolale_users', JSON.stringify(this.users));
      localStorage.setItem('osuolale_members', JSON.stringify(this.members));
      localStorage.setItem('osuolale_applications', JSON.stringify(this.applications));
      localStorage.setItem('osuolale_loan_applications', JSON.stringify(this.loanApplications));
      localStorage.setItem('osuolale_transactions', JSON.stringify(this.transactions));
      localStorage.setItem('osuolale_bylaws', JSON.stringify(this.byLaws));
      localStorage.setItem('osuolale_login_sessions', JSON.stringify(this.loginSessions));
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
          // User not found is not an error, just return undefined
          if (error.code === 'PGRST116') {
            return undefined;
          }
          console.warn('Supabase fetch error:', error);
          throw error;
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

    // Fallback to localStorage
    return this.users.find(user => user.email === email);
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
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

        if (error) {
          console.warn('Supabase insert error:', error);
          throw error;
        }

        // Convert Supabase response to User format
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

        // Also save to localStorage as backup
        this.users.push(newUser);
        this.saveToStorage();

        return newUser;
      } catch (error) {
        console.warn('Error creating user in Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage if Supabase is not configured or fails
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    this.users.push(newUser);
    this.saveToStorage();
    return newUser;
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
        // Fall through to localStorage fallback
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
  async getMembers(): Promise<Member[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .order('date_joined', { ascending: false });

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
            loanEligibilityOverride: m.loan_eligibility_override
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
    const members = [...this.members];
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
            return undefined;
          }
          console.warn('Supabase fetch error:', error);
          throw error;
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
            loanEligibilityOverride: data.loan_eligibility_override
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
            return undefined;
          }
          console.warn('Supabase fetch error:', error);
          throw error;
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
            loanEligibilityOverride: data.loan_eligibility_override
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
            loanEligibilityOverride: data.loan_eligibility_override
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
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
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
            loan_eligibility_override: member.loanEligibilityOverride
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
  async getApplications(): Promise<MembershipApplication[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('membership_applications')
          .select('*')
          .order('applied_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data) {
          // Convert Supabase response to MembershipApplication format
          const applications: MembershipApplication[] = data.map(app => ({
            id: app.id,
            societyId: app.society_id,
            firstName: app.first_name,
            lastName: app.last_name,
            email: app.email,
            phone: app.phone,
            address: app.address,
            guarantor1MemberId: app.guarantor1_member_id || app.guarantor_name || '',
            guarantor1Name: app.guarantor1_name || app.guarantor_name || '',
            guarantor1MemberNumber: app.guarantor1_member_number || '',
            guarantor2MemberId: app.guarantor2_member_id || '',
            guarantor2Name: app.guarantor2_name || '',
            guarantor2MemberNumber: app.guarantor2_member_number || '',
            status: app.status as 'pending' | 'approved' | 'rejected',
            appliedAt: new Date(app.applied_at),
            reviewedAt: app.reviewed_at ? new Date(app.reviewed_at) : undefined,
            reviewedBy: app.reviewed_by || undefined,
            reviewNotes: app.review_notes || undefined
          }));

          return applications;
        }
      } catch (error) {
        console.warn('Error fetching applications from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
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
            guarantor1MemberId: data.guarantor1_member_id || data.guarantor_name || '',
            guarantor1Name: data.guarantor1_name || data.guarantor_name || '',
            guarantor1MemberNumber: data.guarantor1_member_number || '',
            guarantor2MemberId: data.guarantor2_member_id || '',
            guarantor2Name: data.guarantor2_name || '',
            guarantor2MemberNumber: data.guarantor2_member_number || '',
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
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('membership_applications')
          .insert([{
            society_id: application.societyId,
            first_name: application.firstName,
            last_name: application.lastName,
            email: application.email,
            phone: application.phone,
            address: application.address,
            guarantor1_member_id: application.guarantor1MemberId,
            guarantor1_name: application.guarantor1Name,
            guarantor1_member_number: application.guarantor1MemberNumber,
            guarantor2_member_id: application.guarantor2MemberId,
            guarantor2_name: application.guarantor2Name,
            guarantor2_member_number: application.guarantor2MemberNumber,
            status: 'pending'
          }])
          .select()
          .single();

        if (error) {
          console.warn('Supabase insert error:', error);
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
          guarantor1MemberId: data.guarantor1_member_id,
          guarantor1Name: data.guarantor1_name,
          guarantor1MemberNumber: data.guarantor1_member_number,
          guarantor2MemberId: data.guarantor2_member_id,
          guarantor2Name: data.guarantor2_name,
          guarantor2MemberNumber: data.guarantor2_member_number,
          status: data.status as 'pending' | 'approved' | 'rejected',
          appliedAt: new Date(data.applied_at),
          reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined,
          reviewedBy: data.reviewed_by || undefined,
          reviewNotes: data.review_notes || undefined
        };

        // Also save to localStorage as backup
        this.applications.push(newApplication);
        this.saveToStorage();

        return newApplication;
      } catch (error) {
        console.warn('Error creating application in Supabase:', error);
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
    this.applications.push(newApplication);
    this.saveToStorage();
    return newApplication;
  }

  // Loan application methods
  async getLoanApplications(): Promise<LoanApplication[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('loan_applications')
          .select('*')
          .order('applied_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data) {
          // Convert Supabase response to LoanApplication format
          const loanApplications: LoanApplication[] = data.map(loan => ({
            id: loan.id,
            memberId: loan.member_id,
            amount: loan.amount,
            purpose: loan.purpose,
            duration: loan.duration,
            status: loan.status as 'pending' | 'approved' | 'rejected',
            appliedAt: new Date(loan.applied_at),
            reviewedAt: loan.reviewed_at ? new Date(loan.reviewed_at) : undefined,
            reviewedBy: loan.reviewed_by || undefined,
            reviewNotes: loan.review_notes || undefined,
            disbursedAt: loan.disbursed_at ? new Date(loan.disbursed_at) : undefined
          }));

          return loanApplications;
        }
      } catch (error) {
        console.warn('Error fetching loan applications from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
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
          const loanApplications: LoanApplication[] = data.map(loan => ({
            id: loan.id,
            memberId: loan.member_id,
            amount: loan.amount,
            purpose: loan.purpose,
            duration: loan.duration,
            status: loan.status as 'pending' | 'approved' | 'rejected',
            appliedAt: new Date(loan.applied_at),
            reviewedAt: loan.reviewed_at ? new Date(loan.reviewed_at) : undefined,
            reviewedBy: loan.reviewed_by || undefined,
            reviewNotes: loan.review_notes || undefined,
            disbursedAt: loan.disbursed_at ? new Date(loan.disbursed_at) : undefined
          }));

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
            amount: data.amount,
            purpose: data.purpose,
            duration: data.duration,
            status: data.status as 'pending' | 'approved' | 'rejected',
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
            amount: application.amount,
            purpose: application.purpose,
            duration: application.duration,
            status: 'pending'
          }])
          .select()
          .single();

        if (error) {
          console.warn('Supabase insert error:', error);
          throw error;
        }

        // Convert Supabase response to LoanApplication format
        const newLoanApplication: LoanApplication = {
          id: data.id,
          memberId: data.member_id,
          amount: data.amount,
          purpose: data.purpose,
          duration: data.duration,
          status: data.status as 'pending' | 'approved' | 'rejected',
          appliedAt: new Date(data.applied_at),
          reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined,
          reviewedBy: data.reviewed_by || undefined,
          reviewNotes: data.review_notes || undefined,
          disbursedAt: data.disbursed_at ? new Date(data.disbursed_at) : undefined
        };

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
    this.loanApplications.push(newApplication);
    this.saveToStorage();
    return newApplication;
  }

  // Transaction methods
  async getTransactions(): Promise<Transaction[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });

        if (error) {
          console.warn('Supabase fetch error:', error);
          throw error;
        }

        if (data) {
          // Convert Supabase response to Transaction format
          const transactions: Transaction[] = data.map(t => ({
            id: t.id,
            memberId: t.member_id,
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
          const transactions: Transaction[] = data.map(t => ({
            id: t.id,
            memberId: t.member_id,
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
          console.warn('Supabase insert error:', error);
          throw error;
        }

        // Convert Supabase response to Transaction format
        const newTransaction: Transaction = {
          id: data.id,
          memberId: data.member_id,
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
      } catch (error) {
        console.warn('Error creating transaction in Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage if Supabase is not configured or fails
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    this.transactions.push(newTransaction);
    this.saveToStorage();
    return newTransaction;
  }

  // By-laws methods
  getByLaws(): ByLaw[] {
    return [...this.byLaws].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getActiveByLaws(): Promise<ByLaw[]> {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('bylaws')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false });

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

          // Update localStorage with Supabase data
          this.byLaws = bylaws;
          this.saveToStorage();

          return bylaws;
        } else {
          console.warn('No bylaws found in Supabase. Visit /seed-bylaws to seed the database.');
        }
      } catch (error) {
        console.warn('Error fetching active bylaws from Supabase:', error);
        // Fall through to localStorage fallback
      }
    }

    // Fallback to localStorage
    const localBylaws = this.byLaws
      .filter(bylaw => bylaw.isActive)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // If no bylaws in localStorage, initialize with mock data
    if (localBylaws.length === 0) {
      console.warn('No bylaws in localStorage. Initializing with mock data.');
      this.byLaws = [...mockByLaws];
      this.saveToStorage();
      return mockByLaws.filter(bylaw => bylaw.isActive);
    }

    return localBylaws;
  }

  getByLawsByCategory(category: string): ByLaw[] {
    return this.byLaws
      .filter(bylaw => bylaw.category === category && bylaw.isActive)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
  getLoginSessions(): LoginSession[] {
    return [...this.loginSessions].sort((a, b) => b.loginTime.getTime() - a.loginTime.getTime());
  }

  getLoginSessionsByUser(userId: string): LoginSession[] {
    return this.loginSessions
      .filter(session => session.userId === userId)
      .sort((a, b) => b.loginTime.getTime() - a.loginTime.getTime());
  }

  getAdminLoginSessions(limit?: number): LoginSession[] {
    const adminSessions = this.loginSessions
      .filter(session => session.userRole === 'admin')
      .sort((a, b) => b.loginTime.getTime() - a.loginTime.getTime());

    return limit ? adminSessions.slice(0, limit) : adminSessions;
  }

  async createLoginSession(session: Omit<LoginSession, 'id'>): Promise<LoginSession> {
    const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // Check for suspicious activity
    const userPreviousSessions = this.getLoginSessionsByUser(session.userId);
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

  updateLoginSession(id: string, updates: Partial<LoginSession>): LoginSession | undefined {
    const index = this.loginSessions.findIndex(session => session.id === id);
    if (index !== -1) {
      this.loginSessions[index] = { ...this.loginSessions[index], ...updates };
      this.saveToStorage();
      return this.loginSessions[index];
    }
    return undefined;
  }

  endLoginSession(sessionId: string): boolean {
    const index = this.loginSessions.findIndex(session => session.id === sessionId);
    if (index !== -1) {
      this.loginSessions[index] = {
        ...this.loginSessions[index],
        logoutTime: new Date(),
        sessionActive: false,
      };
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Super Admin methods - Platform-wide management
  getAllSocieties(): Society[] {
    return [...this.societies].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getSocietyById(id: string): Society | undefined {
    return this.societies.find(soc => soc.id === id);
  }

  getAllUsers(): User[] {
    return [...this.users];
  }

  getAllMembers(): Member[] {
    return [...this.members];
  }

  getMembersBySociety(societyId: string): Member[] {
    return this.members.filter(m => m.societyId === societyId);
  }

  getApplicationsBySociety(societyId: string): MembershipApplication[] {
    return this.applications.filter(a => a.societyId === societyId);
  }

  toggleUserActive(userId: string): boolean {
    const index = this.users.findIndex(user => user.id === userId);
    if (index !== -1) {
      this.users[index] = {
        ...this.users[index],
        isActive: !this.users[index].isActive,
      };
      this.saveToStorage();
      return true;
    }
    return false;
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

  getPlatformStatistics() {
    const activeSocieties = this.societies.filter(s => s.status === 'active').length;
    const totalUsers = this.users.length;
    const activeUsers = this.users.filter(u => u.isActive !== false).length;
    const totalMembers = this.members.length;
    const activeMembers = this.members.filter(m => m.status === 'active').length;
    const totalSavings = this.members.reduce((sum, m) => sum + m.savingsBalance, 0);
    const totalLoans = this.members.reduce((sum, m) => sum + m.loanBalance, 0);
    const totalShares = this.members.reduce((sum, m) => sum + m.sharesBalance, 0);
    const pendingApplications = this.applications.filter(a => a.status === 'pending').length;

    return {
      activeSocieties,
      totalSocieties: this.societies.length,
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

  createGuarantorRequest(data: Omit<GuarantorRequest, 'id' | 'requestedAt'>): GuarantorRequest {
    const req: GuarantorRequest = {
      ...data,
      id: `gr${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      requestedAt: new Date(),
    };
    this.guarantorRequests.push(req);
    this.saveCollectionToStorage('guarantorRequests', this.guarantorRequests);
    return req;
  }

  getGuarantorRequestsForMember(memberId: string): GuarantorRequest[] {
    return this.guarantorRequests
      .filter(r => r.guarantorMemberId === memberId)
      .map(r => ({ ...r, requestedAt: new Date(r.requestedAt), respondedAt: r.respondedAt ? new Date(r.respondedAt) : undefined }));
  }

  getGuarantorRequestsForApplication(applicationId: string): GuarantorRequest[] {
    return this.guarantorRequests
      .filter(r => r.applicationId === applicationId)
      .map(r => ({ ...r, requestedAt: new Date(r.requestedAt), respondedAt: r.respondedAt ? new Date(r.respondedAt) : undefined }));
  }

  updateGuarantorRequest(id: string, status: 'approved' | 'declined'): GuarantorRequest | undefined {
    const idx = this.guarantorRequests.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.guarantorRequests[idx] = { ...this.guarantorRequests[idx], status, respondedAt: new Date() };
    this.saveCollectionToStorage('guarantorRequests', this.guarantorRequests);
    return this.guarantorRequests[idx];
  }

  getActiveGuaranteesCount(memberId: string): number {
    // Count approved guarantor requests for loans that are still active (pending/approved/disbursed but not rejected)
    return this.guarantorRequests.filter(
      r => r.guarantorMemberId === memberId && r.status === 'approved' && r.type === 'loan'
    ).length;
  }

  // ─── Broadcast Messages ────────────────────────────────────────────────────

  private broadcastMessages: BroadcastMessage[] = this.loadKeyFromStorage<BroadcastMessage[]>('broadcastMessages') || [];

  createBroadcastMessage(data: Omit<BroadcastMessage, 'id' | 'sentAt' | 'readBy'>): BroadcastMessage {
    const msg: BroadcastMessage = {
      ...data,
      id: `bm${Date.now()}`,
      sentAt: new Date(),
      readBy: [],
    };
    this.broadcastMessages.push(msg);
    this.saveCollectionToStorage('broadcastMessages', this.broadcastMessages);
    return msg;
  }

  getBroadcastMessages(): BroadcastMessage[] {
    return this.broadcastMessages
      .map(m => ({ ...m, sentAt: new Date(m.sentAt) }))
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  markBroadcastRead(msgId: string, memberId: string): void {
    const idx = this.broadcastMessages.findIndex(m => m.id === msgId);
    if (idx !== -1 && !this.broadcastMessages[idx].readBy.includes(memberId)) {
      this.broadcastMessages[idx].readBy.push(memberId);
      this.saveCollectionToStorage('broadcastMessages', this.broadcastMessages);
    }
  }

  // ─── Levies ────────────────────────────────────────────────────────────────

  private levies: Levy[] = this.loadKeyFromStorage<Levy[]>('levies') || [];

  createLevy(data: Omit<Levy, 'id' | 'imposedAt' | 'status'>): Levy {
    const levy: Levy = {
      ...data,
      id: `lv${Date.now()}`,
      imposedAt: new Date(),
      status: 'active',
    };
    this.levies.push(levy);
    this.saveCollectionToStorage('levies', this.levies);
    return levy;
  }

  getLevies(): Levy[] {
    return this.levies.map(l => ({ ...l, imposedAt: new Date(l.imposedAt) }));
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
