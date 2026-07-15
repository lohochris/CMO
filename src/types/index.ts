export type MemberStatus = 'Active' | 'Inactive' | 'Active (Cleared)' | 'Pending Validation' | 'Deceased' | 'Pending';
export type Family = 'Wisdom' | 'Honour' | 'Integrity' | 'Talent';
export type MemberRole = 'member' | 'fin_sec' | 'welfare' | 'treasurer' | 'gen_sec' | 'pro' | 'family_chairman' | 'family_head' | 'family_secretary' | 'chairman' | 'cmo_chairman' | 'provost' | 'liturgist';
export type MaritalStatus = 'Married' | 'Divorced' | 'Widowed';
export type WeddingStatus = 'Wedded' | 'Not Wedded';
export type TicketStatus = 'Pending' | 'Approved' | 'Completed' | 'Declined' | 'Awaiting Financial Audit' | 'Awaiting Disbursement' | 'Settled & Cleared';
export type Page =
  | 'home'
  | 'about'
  | 'services'
  | 'register'
  | 'login'
  | 'dashboard'
  | 'welfare'
  | 'treasurer'
  | 'secretary'
  | 'pro'
  | 'chairman'
  | 'fin_sec'
  | 'provost'
  | 'liturgist'
  | 'familyHub'
  | 'familyChairman'
  | 'familySecretary'
  | 'familyWisdomChairman'
  | 'familyWisdomSecretary'
  | 'familyHonourChairman'
  | 'familyHonourSecretary'
  | 'familyIntegrityChairman'
  | 'familyIntegritySecretary'
  | 'familyTalentChairman'
  | 'familyTalentSecretary'
  | 'family/wisdom'
  | 'family/honour'
  | 'family/integrity'
  | 'family/talent';

export interface Member {
  id: string;
  name: string;
  full_name?: string;
  official_member_id?: string;
  phone_number?: string;
  status: MemberStatus;
  balance: number;
  role: MemberRole;
  family?: Family;
  cmo_family?: string;
  phone?: string;
  profilePic?: string | null;
  email?: string;
  homeTownAddress?: string;
  residentialAddress?: string;
  maritalStatus?: MaritalStatus;
  weddingStatus?: WeddingStatus;
  communicant?: boolean;
  postHeld?: string;
  numberOfChildren?: number;
  wifeName?: string;
  wifePhone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id?: number;
  memberId: string;
  memberName?: string;
  amount: number;
  purpose: string;
  notes?: string;
  transactionType?: string;
  timestamp: string;
}

export interface FamilyTransaction extends Transaction {
  family: Family;
}

export interface FamilyWelfareTicket extends WelfareTicket {
  family: Family;
}

export interface WelfareTicket {
  ticketId: string;
  memberId: string;
  memberName: string;
  category: string;
  requestedAmount: number;
  status: TicketStatus;
  createdAt: string;
  approvedAt?: string;
  settledAt?: string;
  reasonDetails?: string;
  declineReason?: string;
  chairmanRead?: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  purpose: string;
  date: string;
  recordedBy: string;
}

export interface FamilyExpense extends Expense {
  family: Family;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: string;
  expiresAt?: string;
}

export interface FamilyAnnouncement extends Announcement {
  family: Family;
}