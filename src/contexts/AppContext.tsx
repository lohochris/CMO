import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Member, Transaction, WelfareTicket, Expense, Announcement, Page, FamilyTransaction, FamilyExpense, FamilyWelfareTicket, FamilyAnnouncement } from '../types';
import { seedMembers, seedAnnouncements } from '../data/seedData';
import { supabase } from '../utils/supabaseClient';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mapping Utilities: Database (snake_case) <-> Frontend (camelCase)
const dbToMember = (m: any): Member => ({
  id: m.id,
  name: m.name,
  status: m.status as any,
  balance: Number(m.balance),
  role: m.role as any,
  family: m.family as any,
  phone: m.phone || undefined,
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
  profilePic: m.profile_picture_url || null
});

const memberToDb = (m: Member): any => ({
  id: m.id,
  name: m.name,
  status: m.status,
  balance: m.balance,
  role: m.role,
  family: m.family || null,
  phone: m.phone || null,
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
  profile_picture_url: m.profilePic || null
});

const dbToTransaction = (t: any): Transaction => ({
  memberId: t.member_id,
  amount: Number(t.amount),
  purpose: t.purpose,
  timestamp: t.timestamp
});

const transactionToDb = (t: Transaction): any => ({
  member_id: t.memberId,
  amount: t.amount,
  purpose: t.purpose,
  timestamp: t.timestamp
});

const dbToWelfareTicket = (t: any): WelfareTicket => ({
  ticketId: t.ticket_id,
  memberId: t.member_id,
  memberName: t.member_name,
  category: t.category,
  requestedAmount: Number(t.requested_amount),
  status: t.status as any,
  createdAt: t.created_at,
  approvedAt: t.approved_at || undefined,
  settledAt: t.settled_at || undefined
});

const welfareTicketToDb = (t: WelfareTicket): any => ({
  ticket_id: t.ticketId,
  member_id: t.memberId,
  member_name: t.memberName,
  category: t.category,
  requested_amount: t.requestedAmount,
  status: t.status,
  created_at: t.createdAt,
  approved_at: t.approvedAt || null,
  settled_at: t.settledAt || null
});

const dbToExpense = (e: any): Expense => ({
  id: e.id,
  amount: Number(e.amount),
  purpose: e.purpose,
  date: e.date,
  recordedBy: e.recorded_by
});

const expenseToDb = (e: Expense): any => ({
  id: e.id,
  amount: e.amount,
  purpose: e.purpose,
  date: e.date,
  recorded_by: e.recordedBy
});

const dbToAnnouncement = (a: any): Announcement => ({
  id: a.id,
  title: a.title,
  content: a.content,
  author: a.author,
  timestamp: a.timestamp,
  expiresAt: a.expires_at || undefined
});

const announcementToDb = (a: Announcement): any => ({
  id: a.id,
  title: a.title,
  content: a.content,
  author: a.author,
  timestamp: a.timestamp,
  expires_at: a.expiresAt || null
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [members, setMembersState] = useState<Member[]>([]);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [welfareTickets, setWelfareTicketsState] = useState<WelfareTicket[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [announcements, setAnnouncementsState] = useState<Announcement[]>([]);
  
  const [familyTransactions, setFamilyTransactions] = useState<FamilyTransaction[]>([]);
  const [familyExpenses, setFamilyExpenses] = useState<FamilyExpense[]>([]);
  const [familyWelfareTickets, setFamilyWelfareTickets] = useState<FamilyWelfareTicket[]>([]);
  const [familyAnnouncements, setFamilyAnnouncements] = useState<FamilyAnnouncement[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<import('../types').Family | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Initial fetch from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setDbError(null);
      try {
        const { data: dbMembers, error: memErr } = await supabase.from('members').select('*');
        if (memErr) throw memErr;

        const { data: dbTx, error: txErr } = await supabase.from('transactions').select('*');
        if (txErr) throw txErr;

        const { data: dbWelfare, error: welErr } = await supabase.from('welfare_tickets').select('*');
        if (welErr) throw welErr;

        const { data: dbExpenses, error: expErr } = await supabase.from('expenses').select('*');
        if (expErr) throw expErr;

        const { data: dbAnnouncements, error: annErr } = await supabase.from('announcements').select('*');
        if (annErr) throw annErr;

        // Map database records to frontend structures
        if (dbMembers && dbMembers.length > 0) {
          setMembersState(dbMembers.map(dbToMember));
        } else {
          // Initialize DB with seed members if empty
          for (const m of seedMembers) {
            await supabase.from('members').insert(memberToDb(m));
          }
          setMembersState(seedMembers);
        }

        if (dbTx) {
          setTransactionsState(dbTx.map(dbToTransaction));
        }
        if (dbWelfare) {
          setWelfareTicketsState(dbWelfare.map(dbToWelfareTicket));
        }
        if (dbExpenses) {
          setExpensesState(dbExpenses.map(dbToExpense));
        }

        if (dbAnnouncements && dbAnnouncements.length > 0) {
          setAnnouncementsState(dbAnnouncements.map(dbToAnnouncement));
        } else {
          // Initialize DB with seed announcements if empty
          for (const a of seedAnnouncements) {
            await supabase.from('announcements').insert(announcementToDb(a));
          }
          setAnnouncementsState(seedAnnouncements);
        }
      } catch (err: any) {
        console.error('Error fetching Supabase data, falling back to seed data:', err);
        setDbError(err.message || 'Database connection error');
        setMembersState(seedMembers);
        setAnnouncementsState(seedAnnouncements);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Intercepting State Setters to sync to Supabase asynchronously
  const setMembers = async (newMembers: Member[] | ((prev: Member[]) => Member[])) => {
    const next = typeof newMembers === 'function' ? newMembers(members) : newMembers;
    setMembersState(next);

    for (const m of next) {
      // Check if the member already exists by official_member_id
      const { data: existing, error: checkErr } = await supabase
        .from('members')
        .select('official_member_id')
        .eq('official_member_id', m.id)
        .maybeSingle();

      const payload = {
        name: m.name,
        full_name: m.name,
        phone_number: m.phone || null,
        phone: m.phone || null, // Alignment safeguard mapping
        email: m.email || null,
        family: m.family || null,
        cmo_family: m.family || null,
        status: m.status,
        role: m.role,
        balance: m.balance,
        home_town_address: m.homeTownAddress || null,
        residential_address: m.residentialAddress || null,
        marital_status: m.maritalStatus || null,
        wedding_status: m.weddingStatus || null,
        communicant: m.communicant || false,
        post_held: m.postHeld || null,
        number_of_children: m.numberOfChildren !== undefined ? m.numberOfChildren : null,
        wife_name: m.wifeName || null,
        wife_phone: m.wifePhone || null,
        profile_picture_url: m.profilePic || null,
        official_member_id: m.id
      };

      if (existing) {
        // Update
        const { error: syncErr } = await supabase
          .from('members')
          .update(payload)
          .eq('official_member_id', m.id);
        if (syncErr) console.error('Failed to sync member change to Supabase (update):', syncErr);
      } else {
        // Insert (Do not specify "id", let DB generate the UUID primary key)
        const { error: syncErr } = await supabase
          .from('members')
          .insert(payload);
        if (syncErr) console.error('Failed to sync member change to Supabase (insert):', syncErr);
      }
    }
  };

  const setTransactions = async (newTx: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    const next = typeof newTx === 'function' ? newTx(transactions) : newTx;
    setTransactionsState(next);

    // Sync only newly added transactions by comparing key hashes
    const currentHashes = new Set(transactions.map(t => `${t.memberId}-${t.timestamp}`));
    const toInsert = next.filter(t => !currentHashes.has(`${t.memberId}-${t.timestamp}`));

    if (toInsert.length > 0) {
      const { error: syncErr } = await supabase.from('transactions').insert(toInsert.map(transactionToDb));
      if (syncErr) console.error('Failed to insert new transactions to Supabase:', syncErr);
    }
  };

  const setWelfareTickets = async (newTickets: WelfareTicket[] | ((prev: WelfareTicket[]) => WelfareTicket[])) => {
    const next = typeof newTickets === 'function' ? newTickets(welfareTickets) : newTickets;
    setWelfareTicketsState(next);

    for (const t of next) {
      const { error: syncErr } = await supabase.from('welfare_tickets').upsert(welfareTicketToDb(t));
      if (syncErr) console.error('Failed to sync welfare ticket to Supabase:', syncErr);
    }
  };

  const setExpenses = async (newExpenses: Expense[] | ((prev: Expense[]) => Expense[])) => {
    const next = typeof newExpenses === 'function' ? newExpenses(expenses) : newExpenses;
    setExpensesState(next);

    for (const e of next) {
      const { error: syncErr } = await supabase.from('expenses').upsert(expenseToDb(e));
      if (syncErr) console.error('Failed to sync expense to Supabase:', syncErr);
    }
  };

  const setAnnouncements = async (newAnnouncements: Announcement[] | ((prev: Announcement[]) => Announcement[])) => {
    const next = typeof newAnnouncements === 'function' ? newAnnouncements(announcements) : newAnnouncements;
    setAnnouncementsState(next);

    for (const a of next) {
      const { error: syncErr } = await supabase.from('announcements').upsert(announcementToDb(a));
      if (syncErr) console.error('Failed to sync announcement to Supabase:', syncErr);
    }
  };

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

  return (
    <AppContext.Provider value={{
      members, setMembers,
      transactions, setTransactions,
      welfareTickets, setWelfareTickets,
      expenses, setExpenses,
      announcements: activeAnnouncements, setAnnouncements,
      familyTransactions, setFamilyTransactions,
      familyExpenses, setFamilyExpenses,
      familyWelfareTickets, setFamilyWelfareTickets,
      familyAnnouncements, setFamilyAnnouncements,
      currentPage, setCurrentPage,
      selectedFamily, setSelectedFamily,
      currentUser, setCurrentUser,
      error, setError,
      success, setSuccess,
      loading, dbError
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};