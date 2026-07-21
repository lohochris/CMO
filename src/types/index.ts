export type MemberStatus = 'Active' | 'Inactive' | 'Active (Cleared)' | 'Pending Validation' | 'Deceased' | 'Pending' | 'Transferred';
export type Family = 'Wisdom' | 'Honour' | 'Integrity' | 'Talent';
export type MemberRole = 'member' | 'fin_sec' | 'welfare' | 'treasurer' | 'gen_sec' | 'pro' | 'family_chairman' | 'family_head' | 'family_secretary' | 'chairman' | 'cmo_chairman' | 'provost' | 'liturgist' | 'sports_director' | 'coach' | 'athlete' | 'referee' | 'medical_officer' | 'Sports_Director' | 'Treasurer' | 'Medical_Officer' | 'Coach' | 'Referee';
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
  | 'family/talent'
  | 'sports_admin'
  | 'coach_workspace'
  | 'athlete_hub'
  | 'referee_center'
  | 'standings_board'
  | 'medical_portal'
  | 'equipment_ledger'
  | 'sports_finance'
  | 'publicGallery';

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
  familyUnit?: string;
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
  date_of_birth?: string | null;
  occupation?: string | null;
  nok_name?: string | null;
  nok_relationship?: string | null;
  nok_phone?: string | null;
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
  status?: string;
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

export type AlbumCategory = 'Meeting' | 'Harvest' | 'FathersDay' | 'Welfare' | 'General';

export interface GeneralAlbum {
  id: string;
  name: string;
  title?: string;
  category: AlbumCategory;
  description?: string | null;
  created_at?: string;
  created_by?: string | null;
  item_count?: number;
}

export interface GeneralGalleryItem {
  id: string;
  album_id: string;
  media_url?: string | null;
  video_url?: string | null;
  title?: string | null;
  uploaded_by?: string | null;
  created_at?: string;
}

export interface AttendanceRecord {
  id?: string;
  meeting_date: string;
  meeting_title?: string;
  member_id: string;
  official_member_id?: string;
  member_name: string;
  status: 'Present' | 'Late' | 'Excused' | 'Absent';
  fine_amount: number;
  excuse_status?: 'None' | 'Pending' | 'Approved' | 'Rejected';
  excuse_category?: string;
  excuse_reason?: string;
  excuse_submitted_at?: string;
  check_in_time?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CmoNotification {
  id?: string;
  member_id: string;
  official_member_id?: string;
  title: string;
  message: string;
  type?: 'attendance' | 'fine' | 'excuse' | 'general';
  read_status?: boolean;
  created_at?: string;
}

export interface CmoMeetingSession {
  id?: string;
  meeting_date: string;
  meeting_title?: string;
  opened_at: string;
  locks_at: string;
  is_manually_locked?: boolean;
  opened_by?: string;
  created_at?: string;
}