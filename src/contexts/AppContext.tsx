import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef, useCallback } from 'react';
import { Member, Transaction, WelfareTicket, Expense, Announcement, Page, Family, FamilyTransaction, FamilyExpense, FamilyWelfareTicket, FamilyAnnouncement, Lodgment, BankWithdrawal } from '../types';
import { seedAnnouncements } from '../data/seedData';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { isAdministrativeId } from '../utils/helpers';
import { calculateUnifiedFinancialSummary, fetchUnifiedFinancialSummary } from '../utils/supabaseHelpers';

interface AppContextType {
  members: Member[];
  setMembers: (newMembers: Member[] | ((prev: Member[]) => Member[])) => void;
  transactions: Transaction[];
  setTransactions: (newTx: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  welfareTickets: WelfareTicket[];
  setWelfareTickets: (newTickets: WelfareTicket[] | ((prev: WelfareTicket[]) => WelfareTicket[])) => void;
  expenses: Expense[];
  setExpenses: (newExpenses: Expense[] | ((prev: Expense[]) => Expense[])) => void;
  announcements: Announcement[];
  setAnnouncements: (newAnnouncements: Announcement[] | ((prev: Announcement[]) => Announcement[])) => void;
  lodgments: Lodgment[];
  setLodgments: React.Dispatch<React.SetStateAction<Lodgment[]>>;
  bankWithdrawals: BankWithdrawal[];
  setBankWithdrawals: React.Dispatch<React.SetStateAction<BankWithdrawal[]>>;
  authorizeBankWithdrawal: (withdrawalId: string, signatoryRole: string) => Promise<boolean>;
  createBankWithdrawal: (newWithdrawal: Partial<BankWithdrawal>) => Promise<boolean>;
  familyTransactions: FamilyTransaction[];
  setFamilyTransactions: React.Dispatch<React.SetStateAction<FamilyTransaction[]>>;
  familyExpenses: FamilyExpense[];
  setFamilyExpenses: React.Dispatch<React.SetStateAction<FamilyExpense[]>>;
  familyWelfareTickets: FamilyWelfareTicket[];
  setFamilyWelfareTickets: React.Dispatch<React.SetStateAction<FamilyWelfareTicket[]>>;
  familyAnnouncements: FamilyAnnouncement[];
  setFamilyAnnouncements: React.Dispatch<React.SetStateAction<FamilyAnnouncement[]>>;
  currentPage: Page;
  setCurrentPage: React.Dispatch<React.SetStateAction<Page>>;
  selectedFamily?: import('../types').Family | null;
  setSelectedFamily?: React.Dispatch<React.SetStateAction<import('../types').Family | null>>;
  currentUser: Member | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<Member | null>>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  success: string;
  setSuccess: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  dbError: string | null;
  rosterCount: number;
  totalIncome: number;
  totalExpenses: number;
  vaultBalance: number;
  refreshDatabase: () => Promise<void>;
  refreshUserContext: () => Promise<void>;
  executives: Member[];
  setExecutives: React.Dispatch<React.SetStateAction<Member[]>>;
  // Decentralized Floor Mic System
  isFloorActive: boolean;
  activeSpeaker: Member | null;
  speakQueue: string[];
  liveTranscriptListener: { speakerName: string; text: string; timestamp: number } | null;
  toggleFloor: (active: boolean) => void;
  grantFloor: (memberId: string) => void;
  revokeFloor: () => void;
  requestFloor: () => void;
  leaveQueue: () => void;
  broadcastLiveTranscript: (text: string) => void;
}

const HARDCODED_OFFICES = [
  { office_id: 'HCC-CMO-EXEC-CH', office_name: 'Chairman Office', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-FS', office_name: 'Financial Secretary', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-TR', office_name: 'Treasurer Office', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-WE', office_name: 'Welfare Office', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-PR', office_name: 'PRO Office', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-PV', office_name: 'Provost Marshall', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-SE', office_name: 'General Secretary', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-LT', office_name: 'Liturgist Office', category: 'Executive' },

  { office_id: 'HCC-CMO-WIS-FH', office_name: 'Wisdom Family Head', category: 'Family' },
  { office_id: 'HCC-CMO-WIS-FS', office_name: 'Wisdom Family Secretary', category: 'Family' },
  { office_id: 'HCC-CMO-HON-FH', office_name: 'Honour Family Head', category: 'Family' },
  { office_id: 'HCC-CMO-HON-FS', office_name: 'Honour Family Secretary', category: 'Family' },
  { office_id: 'HCC-CMO-TAL-FH', office_name: 'Talent Family Head', category: 'Family' },
  { office_id: 'HCC-CMO-TAL-FS', office_name: 'Talent Family Secretary', category: 'Family' },
  { office_id: 'HCC-CMO-INT-FH', office_name: 'Integrity Family Head', category: 'Family' },
  { office_id: 'HCC-CMO-INT-FS', office_name: 'Integrity Family Secretary', category: 'Family' },

  { office_id: 'HCC-CMO-SPRT-DIR', office_name: 'Sports Director', category: 'Sports' },
  { office_id: 'HCC-CMO-SPRT-TR', office_name: 'Sports Treasurer', category: 'Sports' },
  { office_id: 'HCC-CMO-SPRT-MED', office_name: 'Sports Medical Officer', category: 'Sports' },
  { office_id: 'HCC-CMO-SPRT-COACH', office_name: 'Sports Coach', category: 'Sports' },
  { office_id: 'HCC-CMO-SPRT-REF', office_name: 'Sports Referee', category: 'Sports' }
];

const mapCredentialToOfficeId = (cred: string): string => {
  const c = cred.toUpperCase().trim();
  
  if (c === 'CMO-CHAIRMAN-2026' || c === 'CHAIRMAN' || c === 'HCC-CMO-EXEC-CH') return 'HCC-CMO-EXEC-CH';
  if (c === 'FIN-SEC-2026' || c === 'FIN-SEC' || c === 'FINSEC' || c === 'HCC-CMO-EXEC-FS') return 'HCC-CMO-EXEC-FS';
  if (c === 'TREASURER-2026' || c === 'TREASURER' || c === 'TREAS-2026' || c === 'HCC-CMO-EXEC-TR') return 'HCC-CMO-EXEC-TR';
  if (c === 'WELFARE-2026' || c === 'WELFARE' || c === 'WEL-OFF-2026' || c === 'HCC-CMO-EXEC-WE') return 'HCC-CMO-EXEC-WE';
  if (c === 'PRO-2026' || c === 'PRO' || c === 'HCC-CMO-EXEC-PR') return 'HCC-CMO-EXEC-PR';
  if (c === 'PROVOST-2026' || c === 'PROVOST' || c === 'HCC-CMO-EXEC-PV') return 'HCC-CMO-EXEC-PV';
  if (c === 'SECRETARY-2026' || c === 'SECRETARY' || c === 'HCC-CMO-EXEC-SE') return 'HCC-CMO-EXEC-SE';
  if (c === 'LITURGIST-2026' || c === 'LITURGIST' || c === 'HCC-CMO-EXEC-LT') return 'HCC-CMO-EXEC-LT';

  if (c === 'SPORTS-ADMIN-2026' || c === 'HCC-CMO-SPRT-DIR') return 'HCC-CMO-SPRT-DIR';
  if (c === 'HCC-CMO-SPRT-TR') return 'HCC-CMO-SPRT-TR';
  if (c === 'HCC-CMO-SPRT-MED') return 'HCC-CMO-SPRT-MED';
  if (c === 'HCC-CMO-SPRT-COACH') return 'HCC-CMO-SPRT-COACH';
  if (c === 'HCC-CMO-SPRT-REF') return 'HCC-CMO-SPRT-REF';

  if (c === 'FAMILY-HEAD-WISDOM' || c === 'HCC-CMO-WIS-FH') return 'HCC-CMO-WIS-FH';
  if (c === 'FAMILY-SEC-WISDOM' || c === 'HCC-CMO-WIS-FS') return 'HCC-CMO-WIS-FS';
  if (c === 'FAMILY-HEAD-HONOUR' || c === 'HCC-CMO-HON-FH') return 'HCC-CMO-HON-FH';
  if (c === 'FAMILY-SEC-HONOUR' || c === 'HCC-CMO-HON-FS') return 'HCC-CMO-HON-FS';
  if (c === 'FAMILY-HEAD-INTEGRITY' || c === 'HCC-CMO-INT-FH') return 'HCC-CMO-INT-FH';
  if (c === 'FAMILY-SEC-INTEGRITY' || c === 'HCC-CMO-INT-FS') return 'HCC-CMO-INT-FS';
  if (c === 'FAMILY-HEAD-TALENT' || c === 'HCC-CMO-TAL-FH') return 'HCC-CMO-TAL-FH';
  if (c === 'FAMILY-SEC-TALENT' || c === 'HCC-CMO-TAL-FS') return 'HCC-CMO-TAL-FS';

  return c;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mapping Utilities: Database (snake_case) <-> Frontend (camelCase)
const dbToMember = (m: any): Member => {
  let mappedStatus = m.status;
  if (mappedStatus === 'Active (Cleared)') mappedStatus = 'Active';
  else if (mappedStatus === 'Pending Validation') mappedStatus = 'Inactive';

  const mId = m.official_member || m.official_member_id || m.id || '';
  let parsedFamily = m.cmo_family || m.family || m.family_unit || m.familyUnit || undefined;

  if (!parsedFamily && typeof mId === 'string') {
    const idUpper = mId.toUpperCase();
    if (idUpper.includes('HONOUR')) parsedFamily = 'Honour';
    else if (idUpper.includes('INTEGRITY')) parsedFamily = 'Integrity';
    else if (idUpper.includes('TALENT')) parsedFamily = 'Talent';
    else if (idUpper.includes('WISDOM')) parsedFamily = 'Wisdom';
  }

  return {
    id: mId,
    name: m.full_name || m.name,
    full_name: m.full_name || m.name,
    official_member_id: m.official_member || m.official_member_id || undefined,
    phone_number: m.phone_number || m.phone || undefined,
    status: mappedStatus as any,
    balance: Number(m.balance),
    role: m.role as any,
    family: parsedFamily as any,
    cmo_family: parsedFamily,
    familyUnit: parsedFamily,
    phone: m.phone_number || m.phone || undefined,
    email: m.email || undefined,
    homeTownAddress: m.home_town_address || undefined,
    residentialAddress: m.residential_address || undefined,
    maritalStatus: m.marital_status as any || undefined,
    weddingStatus: m.wedding_status as any || undefined,
    communicant: m.communicant || false,
    postHeld: m.post_held || undefined,
    numberOfChildren: m.number_of_children !== null ? Number(m.number_of_children) : undefined,
    wifeName: m.wife_name || undefined,
    wifePhone: m.wife_phone || undefined,
    profilePic: m.avatar_url || m.profile_picture_url || null,
    createdAt: m.created_at || m.createdAt || undefined,
    updatedAt: m.updated_at || m.updatedAt || undefined
  };
};

const dbToExecutive = (e: any, membersList?: Member[]): Member => {
  const execId = e.executive_id || e.id || '';
  const roleKey = (e.role_key || e.role || '').toLowerCase();
  const matchingMember = membersList?.find(m => m.id === e.user_id || m.official_member_id === e.user_id);

  let parsedFamily = e.cmo_family || e.family || e.family_unit || e.familyUnit || undefined;
  if (!parsedFamily && typeof execId === 'string') {
    const idUpper = execId.toUpperCase();
    if (idUpper.includes('HONOUR')) parsedFamily = 'Honour';
    else if (idUpper.includes('INTEGRITY')) parsedFamily = 'Integrity';
    else if (idUpper.includes('TALENT')) parsedFamily = 'Talent';
    else if (idUpper.includes('WISDOM')) parsedFamily = 'Wisdom';
  }

  return {
    id: execId,
    official_member_id: execId,
    name: matchingMember?.full_name || matchingMember?.name || e.full_name || e.name || execId,
    full_name: matchingMember?.full_name || matchingMember?.name || e.full_name || e.name || execId,
    phone_number: matchingMember?.phone_number || e.phone_number || e.phone || undefined,
    status: (e.status || 'Active') as any,
    balance: Number(e.balance || 0),
    role: roleKey as any,
    family: parsedFamily as any,
    cmo_family: parsedFamily,
    familyUnit: parsedFamily,
    phone: matchingMember?.phone || e.phone_number || e.phone || undefined,
    email: matchingMember?.email || e.email || undefined,
    profilePic: matchingMember?.profilePic || e.avatar_url || e.profile_picture_url || null,
    createdAt: e.created_at || undefined,
    updatedAt: e.updated_at || undefined
  };
};


const memberToDb = (m: Member): any => ({
  official_member_id: m.official_member_id || m.id,
  full_name: m.full_name || m.name,
  status: m.status,
  balance: m.balance,
  role: m.role,
  cmo_family: m.family || null,
  family: m.family || null,
  phone_number: m.phone_number || m.phone || null,
  email: m.email || null,
  home_town_address: m.homeTownAddress || null,
  residential_address: m.residentialAddress || null,
  marital_status: m.maritalStatus || null,
  wedding_status: m.weddingStatus || null,
  communicant: m.communicant || false,
  post_held: m.postHeld || null,
  number_of_children: m.numberOfChildren !== undefined ? m.numberOfChildren : null,
  wife_name: m.wifeName || null,
  wife_phone: m.wifePhone || null,
  avatar_url: m.profilePic || null,
  created_at: m.createdAt || null,
  updated_at: m.updatedAt || null
});

const dbToTransaction = (t: any): Transaction => {
  return {
    id: t.id,
    memberId: t.official_member_id || t.member_id || t.memberId,
    memberName: t.member_name || t.memberName || 'Member',
    amount: Number(t.amount),
    purpose: t.purpose,
    notes: t.notes,
    transactionType: t.transaction_type || t.transactionType,
    timestamp: t.created_at || t.timestamp,
    status: t.status || 'Approved',
    receipt_number: t.receipt_number || undefined,
    notification_status: t.notification_status || undefined,
    receipt_generated_at: t.receipt_generated_at || undefined
  };
};

const transactionToDb = (t: Transaction): any => {
  const payload: any = {
    official_member_id: t.memberId,
    member_name: t.memberName,
    amount: t.amount,
    purpose: t.purpose,
    notes: t.notes,
    transaction_type: t.transactionType || (t as any).transaction_type,
    created_at: t.timestamp || (t as any).created_at || new Date().toISOString(),
    status: t.status || 'Approved',
    receipt_number: t.receipt_number || null,
    notification_status: t.notification_status || 'pending',
    receipt_generated_at: t.receipt_generated_at || null
  };
  if (t.id && typeof t.id === 'string' && t.id.includes('-')) {
    payload.id = t.id;
  } else {
    payload.id = crypto.randomUUID();
  }
  return payload;
};

const dbToWelfareTicket = (t: any, membersList?: Member[]): WelfareTicket => {
  const memberId = t.official_member_id;
  let name = '';
  if (membersList) {
    const m = membersList.find(x => x.official_member_id === memberId || x.id === memberId);
    if (m) name = m.full_name || m.name;
  }
  return {
    ticketId: t.ticket_id || t.id,
    memberId: memberId,
    memberName: t.member_name || name || 'Unknown Member',
    category: t.category,
    requestedAmount: Number(t.requested_amount !== undefined ? t.requested_amount : t.amount),
    status: t.status as any,
    createdAt: t.created_at || new Date().toISOString(),
    approvedAt: t.approved_at || undefined,
    settledAt: t.settled_at || undefined,
    reasonDetails: t.reason_details || undefined,
    declineReason: t.decline_reason || undefined,
    chairmanRead: t.chairman_read !== undefined ? !!t.chairman_read : false,
    notes: t.notes || undefined
  };
};

const welfareTicketToDb = (t: WelfareTicket): any => {
  const payload: any = {
    official_member_id: t.memberId,
    member_name: t.memberName,
    category: t.category,
    requested_amount: t.requestedAmount,
    reason_details: t.reasonDetails || '',
    decline_reason: t.declineReason || '',
    chairman_read: t.chairmanRead !== undefined ? t.chairmanRead : false,
    status: t.status,
    notes: t.notes || null
  };
  if (t.ticketId && t.ticketId.includes('-') && t.ticketId.length > 15) {
    payload.ticket_id = t.ticketId;
  }
  return payload;
};

const dbToExpense = (e: any): Expense => ({
  id: e.id,
  amount: Number(e.amount),
  purpose: e.purpose,
  date: e.date,
  recordedBy: e.recorded_by
});

const expenseToDb = (e: Expense): any => {
  const payload: any = {
    amount: e.amount,
    purpose: e.purpose,
    date: e.date,
    recorded_by: e.recordedBy
  };
  if (e.id && e.id.includes('-') && e.id.length > 15) {
    payload.id = e.id;
  }
  return payload;
};

const dbToAnnouncement = (a: any): Announcement => ({
  id: a.id,
  title: a.title,
  content: a.content,
  author: a.author,
  timestamp: a.created_at || a.timestamp,
  expiresAt: a.expires_at || undefined
});

const announcementToDb = (a: Announcement): any => {
  const payload: any = {
    title: a.title,
    content: a.content,
    author: a.author,
    created_at: a.timestamp
  };
  if (a.id && a.id.includes('-') && a.id.length > 15) {
    payload.id = a.id;
  }
  return payload;
};

const INITIAL_BANK_WITHDRAWALS: BankWithdrawal[] = [
  {
    id: 'WTH-2026-001',
    withdrawal_ref: 'WTH-SEC1-8841',
    purpose: 'Bereavement Welfare Disbursement (Late Pa Okonkwo)',
    amount: 50000,
    category: 'Welfare Payout',
    signatories: 'Treasurer',
    status: 'PENDING',
    requested_by: 'Treasurer Office',
    ticket_id: 'WEL-2026-001',
    member_id: 'HCC-CMO-WIS-004',
    member_name: 'Bro. Emmanuel Okonkwo',
    created_at: new Date().toISOString()
  },
  {
    id: 'WTH-2026-002',
    withdrawal_ref: 'WTH-SEC1-8842',
    purpose: 'Parish Hall Renovation Support Project Phase I',
    amount: 150000,
    category: 'Major Project',
    signatories: 'Chairman',
    status: 'PENDING',
    requested_by: 'Chairman Office',
    created_at: new Date().toISOString()
  }
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [members, setMembersState] = useState<Member[]>([]);
  const [executives, setExecutives] = useState<Member[]>([]);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [welfareTickets, setWelfareTicketsState] = useState<WelfareTicket[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [announcements, setAnnouncementsState] = useState<Announcement[]>([]);
  const [lodgments, setLodgments] = useState<Lodgment[]>([]);
  const [bankWithdrawals, setBankWithdrawals] = useState<BankWithdrawal[]>(INITIAL_BANK_WITHDRAWALS);
  
  const [familyTransactions, setFamilyTransactions] = useState<FamilyTransaction[]>([]);
  const [familyExpenses, setFamilyExpenses] = useState<FamilyExpense[]>([]);
  const [familyWelfareTickets, setFamilyWelfareTickets] = useState<FamilyWelfareTicket[]>([]);
  const [familyAnnouncements, setFamilyAnnouncements] = useState<FamilyAnnouncement[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentUser, setCurrentUser] = useState<Member | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('cmo_current_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          let fUnit = parsed.familyUnit || parsed.cmo_family || parsed.family;
          const uId = String(parsed.official_member_id || parsed.id || '').toUpperCase();
          if (!fUnit && uId) {
            if (uId.includes('HONOUR')) fUnit = 'Honour';
            else if (uId.includes('INTEGRITY')) fUnit = 'Integrity';
            else if (uId.includes('TALENT')) fUnit = 'Talent';
            else if (uId.includes('WISDOM')) fUnit = 'Wisdom';
          }
          if (fUnit) {
            parsed.familyUnit = fUnit;
            parsed.cmo_family = parsed.cmo_family || fUnit;
            parsed.family = parsed.family || fUnit;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Persist currentUser changes to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (currentUser) {
          localStorage.setItem('cmo_current_user', JSON.stringify(currentUser));
          localStorage.setItem('cmo_member_session', currentUser.id);
          if (currentUser.id === 'WEL-OFF-2026' || currentUser.id === 'TREAS-2026') {
            localStorage.setItem('cmo_admin_id', currentUser.id);
          }
        } else {
          localStorage.removeItem('cmo_current_user');
          localStorage.removeItem('cmo_member_session');
          localStorage.removeItem('cmo_admin_id');
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const [selectedFamily, setSelectedFamily] = useState<import('../types').Family | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Decentralized Floor Mic State
  const [isFloorActive, setIsFloorActive] = useState<boolean>(false);
  const [activeSpeaker, setActiveSpeaker] = useState<Member | null>(null);
  const [speakQueue, setSpeakQueue] = useState<string[]>([]);
  const [liveTranscriptListener, setLiveTranscriptListener] = useState<{ speakerName: string; text: string; timestamp: number } | null>(null);

  // Supabase Realtime Channel Subscription for cmo_meeting_floor
  useEffect(() => {
    const floorChannel = supabase.channel('cmo_meeting_floor', {
      config: {
        broadcast: { self: true }
      }
    });

    floorChannel
      .on('broadcast', { event: 'FLOOR_STATE_CHANGE' }, ({ payload }) => {
        if (payload) {
          if (payload.isFloorActive !== undefined) setIsFloorActive(payload.isFloorActive);
          if (payload.activeSpeaker !== undefined) setActiveSpeaker(payload.activeSpeaker);
          if (payload.speakQueue !== undefined) setSpeakQueue(payload.speakQueue);
        }
      })
      .on('broadcast', { event: 'LIVE_TRANSCRIPT_CHUNK' }, ({ payload }) => {
        if (payload && payload.text) {
          setLiveTranscriptListener(payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(floorChannel);
    };
  }, []);

  const broadcastFloorState = useCallback((newActive: boolean, newSpeaker: Member | null, newQueue: string[]) => {
    setIsFloorActive(newActive);
    setActiveSpeaker(newSpeaker);
    setSpeakQueue(newQueue);

    supabase.channel('cmo_meeting_floor').send({
      type: 'broadcast',
      event: 'FLOOR_STATE_CHANGE',
      payload: {
        isFloorActive: newActive,
        activeSpeaker: newSpeaker,
        speakQueue: newQueue
      }
    }).catch((err) => console.warn('Realtime floor broadcast err:', err));
  }, []);

  const toggleFloor = useCallback((active: boolean) => {
    const nextSpeaker = active ? activeSpeaker : null;
    const nextQueue = active ? speakQueue : [];
    broadcastFloorState(active, nextSpeaker, nextQueue);
    toast(active ? 'Floor microphone system is now OPEN.' : 'Floor microphone system is now LOCKED.');
  }, [activeSpeaker, speakQueue, broadcastFloorState]);

  const grantFloor = useCallback((memberId: string) => {
    const memberObj = members.find(m => m.id === memberId || m.official_member_id === memberId);
    const nextSpeaker = memberObj || { id: memberId, name: 'Bro. Member', official_member_id: memberId, role: 'member', status: 'Active', balance: 0 };
    const nextQueue = speakQueue.filter(id => id !== memberId);
    broadcastFloorState(true, nextSpeaker as Member, nextQueue);
    toast.success(`Floor mic granted to ${nextSpeaker.name || 'member'}.`);
  }, [members, speakQueue, broadcastFloorState]);

  const revokeFloor = useCallback(() => {
    broadcastFloorState(isFloorActive, null, speakQueue);
    toast('Floor mic revoked.');
  }, [isFloorActive, speakQueue, broadcastFloorState]);

  const requestFloor = useCallback(() => {
    if (!currentUser) return;
    const myId = currentUser.official_member_id || currentUser.id;
    if (!speakQueue.includes(myId)) {
      const nextQueue = [...speakQueue, myId];
      broadcastFloorState(isFloorActive, activeSpeaker, nextQueue);
      toast.info('You joined the speak queue.');
    }
  }, [currentUser, speakQueue, isFloorActive, activeSpeaker, broadcastFloorState]);

  const leaveQueue = useCallback(() => {
    if (!currentUser) return;
    const myId = currentUser.official_member_id || currentUser.id;
    const nextQueue = speakQueue.filter(id => id !== myId);
    broadcastFloorState(isFloorActive, activeSpeaker, nextQueue);
    toast('Left the speak queue.');
  }, [currentUser, speakQueue, isFloorActive, activeSpeaker, broadcastFloorState]);

  const broadcastLiveTranscript = useCallback((text: string) => {
    if (!currentUser || !text.trim()) return;
    const speakerName = currentUser.full_name || currentUser.name;
    const payload = { speakerName, text, timestamp: Date.now() };
    setLiveTranscriptListener(payload);

    supabase.channel('cmo_meeting_floor').send({
      type: 'broadcast',
      event: 'LIVE_TRANSCRIPT_CHUNK',
      payload
    }).catch((err) => console.warn('Realtime transcript chunk err:', err));
  }, [currentUser]);

  // Auto-dismiss success notification toast after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-dismiss error notification toast after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // References to keep mutable states fresh in asynchronous callbacks
  const membersRef = useRef<Member[]>(members);
  const transactionsRef = useRef<Transaction[]>(transactions);
  const welfareTicketsRef = useRef<WelfareTicket[]>(welfareTickets);
  const expensesRef = useRef<Expense[]>(expenses);
  const announcementsRef = useRef<Announcement[]>(announcements);
  const dbErrorRef = useRef<string | null>(dbError);
  const currentUserRef = useRef<Member | null>(currentUser);

  // Synchronize references on every render
  membersRef.current = members;
  transactionsRef.current = transactions;
  welfareTicketsRef.current = welfareTickets;
  expensesRef.current = expenses;
  announcementsRef.current = announcements;
  dbErrorRef.current = dbError;
  currentUserRef.current = currentUser;

  const refreshDatabase = useCallback(async () => {
    let loadedMembersList: Member[] = [];
    let loadedExecutivesList: Member[] = [];

    // 1b. Fetch Parish Members first so we can map executives correctly
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*');
      if (membersError) {
        console.error("Members query error:", membersError);
        setDbError(membersError.message || 'Members query error');
        setMembersState([]);
        loadedMembersList = [];
      } else if (membersData && membersData.length > 0) {
        loadedMembersList = membersData.map(dbToMember);
        setMembersState(loadedMembersList);
      } else {
        setMembersState([]);
        loadedMembersList = [];
      }
    } catch (err: any) {
      console.error("Isolated member connection catch-block:", err);
      setDbError(err.message || 'Isolated member connection error');
      setMembersState([]);
      loadedMembersList = [];
    }

    // 1a. Fetch Operational Executives from public.cmo_executives
    try {
      const { data: execsData, error: execsError } = await supabase
        .from('cmo_executives')
        .select('*');
      if (!execsError && execsData && execsData.length > 0) {
        loadedExecutivesList = execsData.map(e => dbToExecutive(e, loadedMembersList));
        setExecutives(loadedExecutivesList);
      } else {
        setExecutives([]);
      }
    } catch (err: any) {
      console.error("cmo_executives partition query error:", err);
    }

    // Fetch all office assignments to resolve names
    let loadedAssignments: any[] = [];
    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('office_assignments')
        .select('*');
      if (!assignmentsError && assignmentsData) {
        loadedAssignments = assignmentsData;
      }
    } catch (err) {
      console.error("Failed to fetch office assignments:", err);
    }

    // Sync session credentials against cmo_executives and members
    try {
      if (typeof window !== 'undefined') {
        const sessionKey = localStorage.getItem('cmo_member_session') || localStorage.getItem('cmo_admin_id');
        const savedUserStr = localStorage.getItem('cmo_current_user');
        const savedUserId = savedUserStr ? JSON.parse(savedUserStr).id : null;
        const targetId = sessionKey || savedUserId;

        if (targetId) {
          const mappedOfficeId = mapCredentialToOfficeId(targetId);
          const assignment = loadedAssignments.find(a => a.office_id === mappedOfficeId);
          const officeObj = HARDCODED_OFFICES.find(o => o.office_id === mappedOfficeId);
          const officeName = officeObj?.office_name || mappedOfficeId;
          const isOffice = HARDCODED_OFFICES.some(o => o.office_id === mappedOfficeId);

          if (isOffice) {
            if (assignment) {
              const memberDetails = loadedMembersList.find(m => 
                m.official_member_id === assignment.official_member_id || m.id === assignment.official_member_id
              );
              
              if (memberDetails) {
                setCurrentUser({
                  id: targetId,
                  official_member_id: targetId,
                  name: memberDetails.full_name || memberDetails.name,
                  full_name: memberDetails.full_name || memberDetails.name,
                  status: memberDetails.status || 'Active',
                  balance: memberDetails.balance || 0,
                  role: memberDetails.role || 'member',
                  family: (memberDetails.family || memberDetails.cmo_family || undefined) as Family | undefined,
                  cmo_family: memberDetails.cmo_family || memberDetails.family || undefined,
                  familyUnit: memberDetails.familyUnit || memberDetails.family || undefined,
                  phone: memberDetails.phone || memberDetails.phone_number || undefined,
                  phone_number: memberDetails.phone_number || memberDetails.phone || undefined,
                  email: memberDetails.email || undefined,
                  profilePic: memberDetails.profilePic || null,
                  office_title: officeName,
                  is_assigned: true
                });
              } else {
                setCurrentUser({
                  id: targetId,
                  official_member_id: targetId,
                  name: `Assigned: ${assignment.official_member_id}`,
                  full_name: `Assigned: ${assignment.official_member_id}`,
                  status: 'Active',
                  balance: 0,
                  role: 'member',
                  profilePic: null,
                  office_title: officeName,
                  is_assigned: true
                });
              }
            } else {
              setCurrentUser({
                id: targetId,
                official_member_id: targetId,
                name: 'Vacant Position',
                full_name: 'Vacant Position',
                status: 'Inactive',
                balance: 0,
                role: 'member',
                profilePic: null,
                office_title: officeName,
                is_assigned: false
              });
            }
          } else {
            // Check cmo_executives partition first
            const execUser = loadedExecutivesList.find(
              (ex) => ex.id === targetId || ex.official_member_id === targetId
            );
            if (execUser) {
              setCurrentUser(execUser);
            } else if (loadedMembersList.length > 0) {
              const memberUser = loadedMembersList.find(
                (m: Member) => m.id === targetId || m.official_member_id === targetId
              );
              if (memberUser) {
                setCurrentUser(memberUser);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error syncing current user session with executive/member database:", e);
    }

    // 2. Fetch Transactions
    try {
      const { data: dbTx, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (txErr) {
        console.error("Transactions query error:", txErr);
      } else if (dbTx) {
        setTransactionsState(dbTx.map(dbToTransaction));
      }
    } catch (err: any) {
      console.error("Isolated transactions connection catch-block:", err);
    }

    // 3. Fetch Welfare Tickets
    try {
      const { data: dbWelfare, error: welErr } = await supabase.from('welfare_tickets').select('*');
      if (welErr) {
        console.error("Welfare tickets query error:", welErr);
      } else if (dbWelfare) {
        setWelfareTicketsState(dbWelfare.map((t: any) => dbToWelfareTicket(t, loadedMembersList)));
      }
    } catch (err: any) {
      console.error("Isolated welfare tickets connection catch-block:", err);
    }

    // 4. Fetch Expenses
    try {
      const { data: dbExpenses, error: expErr } = await supabase.from('expenses').select('*');
      if (expErr) {
        console.error("Expenses query error:", expErr);
      } else if (dbExpenses) {
        setExpensesState(dbExpenses.map(dbToExpense));
      }
    } catch (err: any) {
      console.error("Isolated expenses connection catch-block:", err);
    }

    // 5. Fetch Announcements
    try {
      const { data: dbAnnouncements, error: annErr } = await supabase.from('announcements').select('*');
      if (annErr) {
        console.error("Announcements query error:", annErr);
        setAnnouncementsState(seedAnnouncements);
      } else if (dbAnnouncements && dbAnnouncements.length > 0) {
        setAnnouncementsState(dbAnnouncements.map(dbToAnnouncement));
      } else {
        setAnnouncementsState(seedAnnouncements);
      }
    } catch (err: any) {
      console.error("Isolated announcements connection catch-block:", err);
      setAnnouncementsState(seedAnnouncements);
    }

    // 6. Fetch Bank Lodgments
    try {
      const { data: dbLodgments, error: lodgErr } = await supabase
        .from('lodgments')
        .select('*')
        .order('created_at', { ascending: false });
      if (!lodgErr && dbLodgments) {
        setLodgments(dbLodgments);
      }
    } catch (err: any) {
      console.error("Isolated lodgments connection catch-block:", err);
    }

    // 7. Fetch Bank Withdrawals (Section I)
    try {
      const { data: dbWithdrawals, error: wthErr } = await supabase
        .from('bank_withdrawals')
        .select('*')
        .order('created_at', { ascending: false });
      if (!wthErr && dbWithdrawals && dbWithdrawals.length > 0) {
        setBankWithdrawals(dbWithdrawals);
      }
    } catch (err: any) {
      console.error("Isolated bank_withdrawals connection catch-block:", err);
    }

    // Fetch parish member census count directly from public.members
    try {
      const { count, error: rosterErr } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'Rejected')
        .neq('status', 'Pending');
      if (!rosterErr && count !== null) {
        setRosterCount(count);
      } else {
        // Fallback to local count of loaded members
        const validMembers = loadedMembersList.filter(
          (m) => m.status !== 'Rejected' && m.status !== 'Pending'
        );
        setRosterCount(validMembers.length);
      }
    } catch (err) {
      console.error("AppContext member census count fetch error:", err);
    }
  }, []);

  const refreshUserContext = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const savedUserStr = localStorage.getItem('cmo_current_user');
        const sessionKey = localStorage.getItem('cmo_member_session') || localStorage.getItem('cmo_admin_id');
        const targetKey = sessionKey || (savedUserStr ? JSON.parse(savedUserStr).id || JSON.parse(savedUserStr).official_member_id : null);

        if (targetKey) {
          // Check cmo_executives partition directly
          const { data: execData } = await supabase
            .from('cmo_executives')
            .select('*')
            .or(`executive_id.eq.${targetKey},id.eq.${targetKey}`)
            .maybeSingle();

          if (execData) {
            setCurrentUser(dbToExecutive(execData));
          } else {
            // Check public.members partition directly for general registry
            const { data: memberData } = await supabase
              .from('members')
              .select('*')
              .or(`official_member_id.eq.${targetKey},id.eq.${targetKey}`)
              .maybeSingle();

            if (memberData) {
              setCurrentUser(dbToMember(memberData));
            } else if (savedUserStr) {
              setCurrentUser(JSON.parse(savedUserStr));
            }
          }
        }
      }
    } catch (e) {
      console.error("Executive session recovery failed:", e);
    }
  }, []);

  // Initial fetch from Supabase on mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setDbError(null);

      await refreshUserContext();
      await refreshDatabase();
      setLoading(false);
    };

    initializeData();
  }, [refreshDatabase, refreshUserContext]);


  // Real-time Supabase Postgres changes subscription to welfare_tickets
  useEffect(() => {
    const channel = supabase
      .channel('welfare-tickets-real-time')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'welfare_tickets' },
        (payload) => {
          console.log('Real-time database payload received:', payload);
          if (payload.eventType === 'INSERT') {
            const newTicket = dbToWelfareTicket(payload.new, membersRef.current);
            setWelfareTicketsState(prev => {
              if (prev.some(t => t.ticketId === newTicket.ticketId)) return prev;
              return [...prev, newTicket];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTicket = dbToWelfareTicket(payload.new, membersRef.current);
            
            // Check status change to trigger toast notification
            setWelfareTicketsState(prev => {
              const oldTicket = prev.find(t => t.ticketId === updatedTicket.ticketId);
              if (oldTicket && oldTicket.status !== updatedTicket.status) {
                const memberName = updatedTicket.memberName;
                const roleLower = currentUserRef.current?.role?.toLowerCase();
                
                if (roleLower === 'welfare' || roleLower === 'treasurer') {
                  if (updatedTicket.status === 'Approved' || updatedTicket.status === 'Declined') {
                    toast.success(`Ticket for ${memberName} has been ${updatedTicket.status}!`, {
                      style: {
                        background: '#002520',
                        border: '2px solid #ffd700',
                        color: '#ffd700'
                      }
                    });
                  }
                } else if (roleLower === 'chairman' || roleLower === 'cmo_chairman') {
                  if (updatedTicket.status === 'Approved' || updatedTicket.status === 'Declined' || updatedTicket.status === 'Completed') {
                    const statusStr = updatedTicket.status === 'Completed' ? 'Disbursed' : updatedTicket.status;
                    toast.info(`Transparency Alert: Ticket for ${memberName} was ${statusStr}!`, {
                      style: {
                        background: '#002520',
                        border: '2px solid #ffd700',
                        color: '#ffd700'
                      }
                    });
                  }
                }
              }
              return prev.map(t => t.ticketId === updatedTicket.ticketId ? updatedTicket : t);
            });
          } else if (payload.eventType === 'DELETE') {
            const ticketId = payload.old.ticket_id || payload.old.id;
            setWelfareTicketsState(prev => prev.filter(t => t.ticketId !== ticketId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time Supabase Postgres changes subscription to announcements
  useEffect(() => {
    const channel = supabase
      .channel('announcements-real-time')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        (payload) => {
          console.log('Real-time announcements payload received:', payload);
          if (payload.eventType === 'INSERT') {
            const newAnn = dbToAnnouncement(payload.new);
            setAnnouncementsState(prev => {
              if (prev.some(a => a.id === newAnn.id)) return prev;
              return [newAnn, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedAnn = dbToAnnouncement(payload.new);
            setAnnouncementsState(prev => prev.map(a => a.id === updatedAnn.id ? updatedAnn : a));
          } else if (payload.eventType === 'DELETE') {
            const annId = payload.old.id;
            setAnnouncementsState(prev => prev.filter(a => a.id !== annId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time Supabase Postgres changes subscription to lodgments
  useEffect(() => {
    const channel = supabase
      .channel('lodgments-real-time')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lodgments' },
        (payload) => {
          console.log('Real-time lodgments payload received:', payload);
          if (payload.eventType === 'INSERT') {
            setLodgments(prev => {
              if (prev.some(l => l.id === payload.new.id)) return prev;
              return [payload.new as Lodgment, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setLodgments(prev => prev.map(l => l.id === payload.new.id ? (payload.new as Lodgment) : l));
          } else if (payload.eventType === 'DELETE') {
            setLodgments(prev => prev.filter(l => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time Supabase Postgres changes subscription to transactions
  useEffect(() => {
    const channel = supabase
      .channel('transactions-real-time')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          console.log('Real-time transactions payload received:', payload);
          if (payload.eventType === 'INSERT') {
            const newTx = dbToTransaction(payload.new);
            setTransactionsState(prev => {
              if (prev.some(t => t.id === newTx.id)) return prev;
              return [newTx, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTx = dbToTransaction(payload.new);
            setTransactionsState(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
          } else if (payload.eventType === 'DELETE') {
            const txId = payload.old.id;
            setTransactionsState(prev => prev.filter(t => t.id !== txId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Intercepting State Setters to sync to Supabase asynchronously
  const setMembers = useCallback(async (newMembers: Member[] | ((prev: Member[]) => Member[])) => {
    const next = typeof newMembers === 'function' ? newMembers(membersRef.current) : newMembers;
    setMembersState(next);

    if (dbErrorRef.current) {
      console.warn('Supabase initialization failed or is in error state. Skipping members sync to prevent loops.');
      return;
    }

    for (const member of next) {
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      
      const targetCode = member.official_member_id || member.id;
      let existing: any = null;
      if (isUuid(member.id)) {
        const { data } = await supabase
          .from('members')
          .select('id, official_member_id')
          .eq('id', member.id)
          .maybeSingle();
        existing = data;
      } else if (targetCode) {
        const { data } = await supabase
          .from('members')
          .select('id, official_member_id')
          .eq('official_member_id', targetCode)
          .maybeSingle();
        existing = data;
      }

      if (existing) {
        // Update
        const { error: syncErr } = await supabase
          .from('members')
          .update({
            official_member_id: member.official_member_id || null,
            full_name: member.name || member.full_name,
            phone_number: member.phone || member.phone_number,
            status: member.status,
            balance: member.balance,
            role: member.role
          })
          .eq('id', existing.id);
        if (syncErr) console.error('Failed to sync member change to Supabase (update):', syncErr);
      } else {
        // Insert (Do not specify "id", let DB generate the UUID primary key)
        const { error: syncErr } = await supabase
          .from('members')
          .insert([{
            official_member_id: member.official_member_id || null,
            full_name: member.name || member.full_name,
            phone_number: member.phone || member.phone_number,
            status: member.status,
            balance: member.balance,
            role: member.role
          }]);
        if (syncErr) console.error('Failed to sync member change to Supabase (insert):', syncErr);
      }
    }
  }, []);

  const setTransactions = useCallback(async (newTx: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    const next = typeof newTx === 'function' ? newTx(transactionsRef.current) : newTx;
    setTransactionsState(next);

    // Sync only newly added transactions by comparing key hashes
    const currentHashes = new Set(transactionsRef.current.map(t => `${t.memberId}-${t.timestamp}`));
    const toInsert = next.filter(t => !currentHashes.has(`${t.memberId}-${t.timestamp}`));

    if (toInsert.length > 0) {
      try {
        const { data: insertedData, error: syncErr, status } = await supabase
          .from('transactions')
          .insert(toInsert.map(transactionToDb))
          .select('id, official_member_id, member_name, amount, purpose, notes, transaction_type, created_at');

        if (syncErr) {
          console.error('Failed to insert new transactions to Supabase:', syncErr);
          
          // Clear specific conflicting/duplicate items from the local state queue to prevent infinite conflict loops
          const isConflict = syncErr.code === '23505' || String(status) === '409' || 
                             syncErr.message?.includes('duplicate') || syncErr.message?.includes('conflict');
          if (isConflict) {
            console.warn('Conflict/Duplicate key detected on transactions sync. Clearing conflicting item from the queue.');
            setTransactionsState(prev => prev.filter(t => {
              const isConflicting = toInsert.some(ins => ins.memberId === t.memberId && ins.timestamp === t.timestamp);
              return !isConflicting;
            }));
          }
        } else if (insertedData) {
          const mappedInserted: Transaction[] = insertedData.map(dbToTransaction);
          setTransactionsState(prev => {
            return prev.map(t => {
              const match = mappedInserted.find((m: Transaction) => m.memberId === t.memberId && m.timestamp === t.timestamp);
              return match ? match : t;
            });
          });
        }
      } catch (err: any) {
        console.error('Transaction sync exception:', err);
      }
    }
  }, []);

  const setWelfareTickets = useCallback(async (newTickets: WelfareTicket[] | ((prev: WelfareTicket[]) => WelfareTicket[])) => {
    const next = typeof newTickets === 'function' ? newTickets(welfareTicketsRef.current) : newTickets;
    setWelfareTicketsState(next);

    for (const t of next) {
      const { error: syncErr } = await supabase.from('welfare_tickets').upsert(welfareTicketToDb(t));
      if (syncErr) console.error('Failed to sync welfare ticket to Supabase:', syncErr);
    }
  }, []);

  const setExpenses = useCallback(async (newExpenses: Expense[] | ((prev: Expense[]) => Expense[])) => {
    const next = typeof newExpenses === 'function' ? newExpenses(expensesRef.current) : newExpenses;
    setExpensesState(next);

    for (const e of next) {
      const { error: syncErr } = await supabase.from('expenses').upsert(expenseToDb(e));
      if (syncErr) console.error('Failed to sync expense to Supabase:', syncErr);
    }
  }, []);

  const setAnnouncements = useCallback(async (newAnnouncements: Announcement[] | ((prev: Announcement[]) => Announcement[])) => {
    const next = typeof newAnnouncements === 'function' ? newAnnouncements(announcementsRef.current) : newAnnouncements;
    setAnnouncementsState(next);

    for (const a of next) {
      const { error: syncErr } = await supabase.from('announcements').upsert(announcementToDb(a));
      if (syncErr) console.error('Failed to sync announcement to Supabase:', syncErr);
    }
  }, []);

  // Fixed Announcement Expiry logic using useMemo to calculate on-the-fly and prevent the state update loop
  const activeAnnouncements = useMemo(() => {
    const now = Date.now();
    return announcements.filter((ann) => {
      const expiresAt = ann.expiresAt 
        ? new Date(ann.expiresAt).getTime() 
        : new Date(ann.timestamp).getTime() + 2 * 24 * 60 * 60 * 1000;
      return expiresAt >= now;
    });
  }, [announcements]);

  // database-driven reactive unified financial totals
  const unifiedSummary = useMemo(() => {
    return calculateUnifiedFinancialSummary(transactions);
  }, [transactions]);

  const totalIncome = unifiedSummary.totalIncome;
  const totalExpenses = unifiedSummary.totalExpenses;
  const vaultBalance = unifiedSummary.vaultBalance;

  const authorizeBankWithdrawal = useCallback(async (withdrawalId: string, signatoryRole: string): Promise<boolean> => {
    try {
      const target = bankWithdrawals.find(w => w.id === withdrawalId);
      if (!target) return false;

      const currentSigs = target.signatories ? target.signatories.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (currentSigs.includes(signatoryRole)) {
        return true;
      }

      const updatedSigs = [...currentSigs, signatoryRole];
      const isAuthorized = updatedSigs.length >= 2;
      const newStatus = isAuthorized ? 'SETTLED' : 'PENDING';

      const updatedRecord: BankWithdrawal = {
        ...target,
        signatories: updatedSigs.join(', '),
        status: newStatus,
        authorized_at: isAuthorized ? new Date().toISOString() : target.authorized_at
      };

      const { error: bwErr } = await supabase.from('bank_withdrawals').upsert([updatedRecord]);
      if (bwErr) console.warn('Supabase bank_withdrawals upsert warning:', bwErr);

      setBankWithdrawals(prev => prev.map(w => w.id === withdrawalId ? updatedRecord : w));

      if (isAuthorized) {
        const settledTxPayload = {
          official_member_id: target.member_id || 'PARISH_BANK_VAULT',
          member_name: target.member_name || target.requested_by || 'Treasurer Office',
          amount: target.amount,
          purpose: `[Section I Bank Withdrawal] ${target.purpose}`,
          notes: `Section I 2-of-3 Authorized Bank Withdrawal (Signatories: ${updatedSigs.join(', ')})`,
          transaction_type: 'expense',
          status: 'SETTLED',
          created_at: new Date().toISOString()
        };

        const { data: txData, error: txErr } = await supabase
          .from('transactions')
          .insert([settledTxPayload])
          .select();

        if (txErr) console.warn('Supabase settled transaction insert warning:', txErr);
        const createdTx = (txData && txData.length > 0) ? dbToTransaction(txData[0]) : dbToTransaction(settledTxPayload);
        setTransactionsState(prev => [createdTx, ...prev]);

        const expensePayload = {
          id: `EXP-SEC1-${Date.now()}`,
          amount: target.amount,
          purpose: `[Section I Bank Withdrawal] ${target.purpose}`,
          date: new Date().toISOString().split('T')[0],
          recordedBy: `Signatories: ${updatedSigs.join(', ')}`
        };

        const { error: expErr } = await supabase.from('expenses').insert([expensePayload]);
        if (expErr) console.warn('Supabase expense insert warning:', expErr);
        setExpensesState(prev => [...prev, expensePayload]);

        if (target.ticket_id) {
          const { error: welErr } = await supabase
            .from('welfare_tickets')
            .update({
              status: 'Completed',
              settled_at: new Date().toISOString(),
              notes: `Bank withdrawal authorized by ${updatedSigs.join(', ')}`
            })
            .eq('ticket_id', target.ticket_id);

          if (!welErr) {
            setWelfareTicketsState(prev => prev.map(t =>
              t.ticketId === target.ticket_id
                ? { ...t, status: 'Completed', settledAt: new Date().toISOString() }
                : t
            ));
          }
        }

        setSuccess(`Section I Bank Withdrawal authorized! ₦${target.amount.toLocaleString()} disbursed and synchronized across FinSec Ledger, Treasurer Vault, and Chairman Oversight.`);
        await refreshDatabase();
      } else {
        setSuccess(`Signature recorded (${signatoryRole}). Requires 1 more signature out of 3 to authorize bank release.`);
      }

      return true;
    } catch (err: any) {
      console.error("Authorize bank withdrawal error:", err);
      setError("Failed to process signature authorization: " + err.message);
      return false;
    }
  }, [bankWithdrawals, refreshDatabase]);

  const createBankWithdrawal = useCallback(async (newWithdrawalData: Partial<BankWithdrawal>): Promise<boolean> => {
    try {
      const withdrawalRecord: BankWithdrawal = {
        id: `WTH-${Date.now()}`,
        withdrawal_ref: `WTH-SEC1-${Math.floor(1000 + Math.random() * 9000)}`,
        purpose: newWithdrawalData.purpose || 'Major Bank Disbursement',
        amount: newWithdrawalData.amount || 0,
        category: newWithdrawalData.category || 'General',
        signatories: newWithdrawalData.signatories || currentUser?.office_title || 'Treasurer',
        status: 'PENDING',
        requested_by: currentUser?.name || 'Treasurer Office',
        ticket_id: newWithdrawalData.ticket_id,
        member_id: newWithdrawalData.member_id,
        member_name: newWithdrawalData.member_name,
        created_at: new Date().toISOString()
      };

      const { error: insertErr } = await supabase.from('bank_withdrawals').insert([withdrawalRecord]);
      if (insertErr) console.warn('Supabase bank_withdrawals insert warning:', insertErr);
      setBankWithdrawals(prev => [withdrawalRecord, ...prev]);
      setSuccess(`Bank withdrawal request created for ₦${withdrawalRecord.amount.toLocaleString()}. Pending Section I 2-of-3 Signatory Authorization.`);
      return true;
    } catch (err: any) {
      console.error("Create bank withdrawal error:", err);
      setError("Failed to create bank withdrawal request: " + err.message);
      return false;
    }
  }, [currentUser]);

  const contextValue = useMemo(() => ({
    members,
    setMembers,
    transactions,
    setTransactions,
    welfareTickets,
    setWelfareTickets,
    expenses,
    setExpenses,
    announcements: activeAnnouncements,
    setAnnouncements,
    lodgments,
    setLodgments,
    bankWithdrawals,
    setBankWithdrawals,
    authorizeBankWithdrawal,
    createBankWithdrawal,
    familyTransactions,
    setFamilyTransactions,
    familyExpenses,
    setFamilyExpenses,
    familyWelfareTickets,
    setFamilyWelfareTickets,
    familyAnnouncements,
    setFamilyAnnouncements,
    currentPage,
    setCurrentPage,
    selectedFamily,
    setSelectedFamily,
    currentUser,
    setCurrentUser,
    error,
    setError,
    success,
    setSuccess,
    loading,
    dbError,
    rosterCount,
    totalIncome,
    totalExpenses,
    vaultBalance,
    refreshDatabase,
    refreshUserContext,
    executives,
    setExecutives,
    isFloorActive,
    activeSpeaker,
    speakQueue,
    liveTranscriptListener,
    toggleFloor,
    grantFloor,
    revokeFloor,
    requestFloor,
    leaveQueue,
    broadcastLiveTranscript
  }), [
    members,
    setMembers,
    transactions,
    setTransactions,
    welfareTickets,
    setWelfareTickets,
    expenses,
    setExpenses,
    activeAnnouncements,
    setAnnouncements,
    lodgments,
    setLodgments,
    bankWithdrawals,
    setBankWithdrawals,
    authorizeBankWithdrawal,
    createBankWithdrawal,
    familyTransactions,
    familyExpenses,
    familyWelfareTickets,
    familyAnnouncements,
    currentPage,
    selectedFamily,
    currentUser,
    error,
    success,
    loading,
    dbError,
    rosterCount,
    totalIncome,
    totalExpenses,
    vaultBalance,
    refreshDatabase,
    refreshUserContext,
    executives,
    isFloorActive,
    activeSpeaker,
    speakQueue,
    liveTranscriptListener,
    toggleFloor,
    grantFloor,
    revokeFloor,
    requestFloor,
    leaveQueue,
    broadcastLiveTranscript
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};