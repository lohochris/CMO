export type MemberStatus = 'Active (Cleared)' | 'Pending Validation';
export type Family = 'Wisdom' | 'Honour' | 'Integrity' | 'Talent';
export type MemberRole = 'member' | 'fin_sec' | 'welfare' | 'treasurer' | 'gen_sec' | 'pro' | 'family_chairman' | 'family_secretary' | 'chairman' | 'cmo_chairman';
export type MaritalStatus = 'Married' | 'Divorced' | 'Widowed';
export type WeddingStatus = 'Wedded' | 'Not Wedded';
export type TicketStatus = 'Awaiting Financial Audit' | 'Awaiting Disbursement' | 'Settled & Cleared' | 'Declined';
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
  | 'familyTalentSecretary';

export interface Member {
  id: string;
  name: string;
  status: MemberStatus;
  balance: number;
  role: MemberRole;
  family?: Family;
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
  memberId: string;
  amount: number;
  purpose: string;
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