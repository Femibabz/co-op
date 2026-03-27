export interface User {
  id: string;
  email: string;
  password: string;
  role: 'super_admin' | 'admin' | 'member';
  createdAt: Date;
  isFirstLogin?: boolean; // Flag to track if user needs to change password on first login
  societyId?: string; // Optional - only for admin and member roles
  isActive?: boolean; // Flag to track if user is active or deactivated
}

export interface Society {
  id: string;
  name: string;
  registrationNumber: string;
  address: string;
  phone: string;
  email: string;
  createdAt: Date;
  status: 'active' | 'inactive' | 'suspended';
  adminUserId: string; // The user ID of the society admin
  memberCount: number;
  totalSavings: number;
  totalLoans: number;
  totalShares: number;
}

export interface Member {
  id: string;
  userId: string;
  societyId: string; // Which society this member belongs to
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dateJoined: Date;
  status: 'active' | 'inactive' | 'suspended';

  // Personal details
  occupation?: string;
  annualIncome?: number;

  // Financial balances
  sharesBalance: number;
  savingsBalance: number;
  loanBalance: number;
  interestBalance: number;
  societyDues: number;

  // Loan details
  loanStartDate?: Date; // Loan disbursement date
  loanDurationMonths?: number;
  loanInterestRate?: number; // Monthly percentage rate (starts at 1.5%, doubles after 12 months)
  monthlyLoanPayment?: number;
  lastInterestCalculationDate?: Date; // Last time monthly interest was calculated
  // Admin overrides
  loanEligibilityOverride?: boolean; // Super admin can override 6-month requirement
  allowNewLoanWithBalance?: boolean; // Admin can allow new loan with outstanding balance
}

export interface MembershipApplication {
  id: string;
  societyId: string; // Which society they're applying to
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  occupation?: string;
  monthlyIncome?: number;
  // Guarantors (existing members)
  guarantor1Id?: string;
  guarantor2Id?: string;

  guarantorIds?: string[];      // internal use for processing
  guarantorCount?: number;      // internal use for processing
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface LoanApplication {
  id: string;
  memberId: string;
  societyId: string; // Which society this loan belongs to
  amount: number;
  purpose: string;
  duration: number; // in months
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  appliedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  disbursedAt?: Date;
  guarantor1Id?: string;
  guarantor2Id?: string;
  guarantorIds?: string[];      // internal use for processing
  guarantorCount?: number;      // internal use for processing
}

/** Tracks a guarantor's approval/decline for a loan or membership application */
export interface GuarantorRequest {
  id: string;
  societyId: string;            // Which society this request belongs to
  type: 'loan' | 'membership';
  applicationId: string;        // LoanApplication.id or MembershipApplication.id
  applicantName: string;        // display name for the guarantor prompt
  guarantorMemberId: string;    // which member must respond
  status: 'pending' | 'approved' | 'declined';
  requestedAt: Date;
  respondedAt?: Date;
}

/** Broadcast message sent by admin to all members */
export interface BroadcastMessage {
  id: string;
  societyId: string;
  subject: string;
  body: string;
  sentAt: Date;
  sentBy: string;
  readBy: string[];  // memberIds who dismissed it
  
  // Recurrence fields
  isRecurrent?: boolean;
  frequency?: 'once' | 'weekly' | 'monthly' | 'custom';
  customDays?: number; // Days interval for 'custom'
  nextScheduledAt?: Date;
}

/** Levy or due imposed on one or more members */
export interface Levy {
  id: string;
  societyId: string;
  memberNumber: string; // Direct association for the new table structure
  description: string;
  amount: number;
  originalAmount: number; // For tracking initial vs current
  imposedAt: Date;
  imposedBy: string;
  status: 'active' | 'waived';
}

export interface Transaction {
  id: string;
  memberId: string;
  societyId: string; // Which society this transaction belongs to
  type: 'shares_deposit' | 'shares_withdrawal' | 'savings_deposit' | 'savings_withdrawal' | 'loan_disbursement' | 'loan_payment' | 'interest_charge' | 'interest_payment' | 'dues_charge' | 'dues_payment' | 'profile_update' | 'original levy';
  amount: number;
  originalAmount?: number;
  description: string;
  date: Date;
  balanceAfter: number;
  referenceNumber?: string;
  processedBy?: string; // admin who processed it
}

export interface DashboardStats {
  totalMembers: number;
  pendingApplications: number;
  pendingLoans: number;
  totalSavings: number;
  totalLoans: number;
  totalShares: number;
  totalWithOrganization: number;
}

export interface ByLaw {
  id: string;
  societyId: string;
  title: string;
  content: string;
  category: 'membership' | 'financial' | 'governance' | 'general';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenResolution: string;
  userAgent: string;
}

export interface LocationInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  isp?: string;
}

export interface LoginSession {
  id: string;
  userId: string;
  userEmail: string;
  userRole: 'super_admin' | 'admin' | 'member';
  societyId?: string; // Optional - only for admin and member roles
  loginTime: Date;
  logoutTime?: Date;
  deviceInfo: DeviceInfo;
  locationInfo: LocationInfo;
  sessionActive: boolean;
  isSuspicious?: boolean; // Flag for unusual activity
  suspiciousReasons?: string[]; // Why it's flagged as suspicious
}
