import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef, useCallback } from 'react';
import { Member, Transaction, WelfareTicket, Expense, Announcement, Page, FamilyTransaction, FamilyExpense, FamilyWelfareTicket, FamilyAnnouncement } from '../types';
import { seedAnnouncements } from '../data/seedData';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

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
  rosterCount: number;
  totalIncome: number;
  totalExpenses: number;
  vaultBalance: number;
  refreshDatabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mapping Utilities: Database (snake_case) <-> Frontend (camelCase)
const dbToMember = (m: any): Member => {
  let mappedStatus = m.status;
  if (mappedStatus === 'Active (Cleared)') mappedStatus = 'Active';
  else if (mappedStatus === 'Pending Validation') mappedStatus = 'Inactive';

  return {
    id: m.official_member || m.official_member_id || m.id,
    name: m.full_name || m.name,
    full_name: m.full_name || m.name,
    official_member_id: m.official_member || m.official_member_id || undefined,
    phone_number: m.phone_number || m.phone || undefined,
    status: mappedStatus as any,
    balance: Number(m.balance),
    role: m.role as any,
    family: m.cmo_family || m.family as any,
    cmo_family: m.cmo_family || m.family || undefined,
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

const dbToExecutive = (e: any): Member => {
  const execId = e.executive_id || e.id;
  const roleKey = (e.role_key || e.role || '').toLowerCase();
  return {
    id: execId,
    official_member_id: execId,
    name: e.full_name || e.name || execId,
    full_name: e.full_name || e.name || execId,
    phone_number: e.phone_number || e.phone || undefined,
    status: (e.status || 'Active') as any,
    balance: Number(e.balance || 0),
    role: roleKey as any,
    family: e.cmo_family || e.family as any || undefined,
    cmo_family: e.cmo_family || e.family || undefined,
    phone: e.phone_number || e.phone || undefined,
    email: e.email || undefined,
    profilePic: e.avatar_url || e.profile_picture_url || null,
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

const dbToTransaction = (t: any): Transaction => ({
  id: t.id,
  memberId: t.official_member_id || t.member_id,
  memberName: t.member_name,
  amount: Number(t.amount),
  purpose: t.purpose,
  notes: t.notes,
  transactionType: t.transaction_type,
  timestamp: t.created_at || t.timestamp,
  status: t.status
});

const transactionToDb = (t: Transaction): any => ({
  id: t.id,
  official_member_id: t.memberId,
  member_name: t.memberName,
  amount: t.amount,
  purpose: t.purpose,
  notes: t.notes,
  transaction_type: t.transactionType,
  created_at: t.timestamp,
  status: t.status
});

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
    chairmanRead: t.chairman_read !== undefined ? !!t.chairman_read : false
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
    status: t.status
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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [members, setMembersState] = useState<Member[]>([]);
  const [transactions, setTransactionsState] = useState<Transaction[]>([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [welfareTickets, setWelfareTicketsState] = useState<WelfareTicket[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [announcements, setAnnouncementsState] = useState<Announcement[]>([]);
  
  const [familyTransactions, setFamilyTransactions] = useState<FamilyTransaction[]>([]);
  const [familyExpenses, setFamilyExpenses] = useState<FamilyExpense[]>([]);
  const [familyWelfareTickets, setFamilyWelfareTickets] = useState<FamilyWelfareTicket[]>([]);
  const [familyAnnouncements, setFamilyAnnouncements] = useState<FamilyAnnouncement[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentUser, setCurrentUser] = useState<Member | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('cmo_current_user');
        return saved ? JSON.parse(saved) : null;
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

    // 1a. Fetch Operational Executives from public.cmo_executives
    try {
      const { data: execsData, error: execsError } = await supabase
        .from('cmo_executives')
        .select('*');
      if (!execsError && execsData && execsData.length > 0) {
        loadedExecutivesList = execsData.map(dbToExecutive);
      }
    } catch (err: any) {
      console.error("cmo_executives partition query error:", err);
    }

    // 1b. Fetch Parish Members from public.members
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

    // Sync session credentials against cmo_executives and members
    try {
      if (typeof window !== 'undefined') {
        const sessionKey = localStorage.getItem('cmo_member_session') || localStorage.getItem('cmo_admin_id');
        const savedUserStr = localStorage.getItem('cmo_current_user');
        const savedUserId = savedUserStr ? JSON.parse(savedUserStr).id : null;
        const targetId = sessionKey || savedUserId;

        if (targetId) {
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
    } catch (e) {
      console.error("Error syncing current user session with executive/member database:", e);
    }

    // 2. Fetch Transactions
    try {
      const { data: dbTx, error: txErr } = await supabase
        .from('transactions')
        .select('id, official_member_id, member_name, amount, purpose, notes, transaction_type, created_at');
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

    // Fetch parish member census count directly from public.members
    try {
      const { count, error: rosterErr } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });
      if (!rosterErr && count !== null) {
        setRosterCount(count);
      } else {
        // Fallback to local count of loaded members
        setRosterCount(loadedMembersList.length);
      }
    } catch (err) {
      console.error("AppContext member census count fetch error:", err);
    }
  }, []);

  // Initial fetch from Supabase on mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setDbError(null);

      // Check cmo_executives and local storage for initial user session
      try {
        if (typeof window !== 'undefined') {
          const savedUserStr = localStorage.getItem('cmo_current_user');
          const sessionKey = localStorage.getItem('cmo_member_session') || localStorage.getItem('cmo_admin_id');
          const targetKey = sessionKey || (savedUserStr ? JSON.parse(savedUserStr).id : null);

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

      await refreshDatabase();
      setLoading(false);
    };

    initializeData();
  }, [refreshDatabase]);


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
      
      let existing = null;
      if (isUuid(member.id)) {
        const { data } = await supabase
          .from('members')
          .select('id, official_member_id')
          .eq('id', member.id)
          .maybeSingle();
        existing = data;
      } else if (member.official_member_id) {
        const { data } = await supabase
          .from('members')
          .select('id, official_member_id')
          .eq('official_member_id', member.official_member_id)
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

  // database-driven reactive financial totals
  const totalIncome = useMemo(() => {
    return transactions
      .filter(t => {
        const typeLower = (t.transactionType ?? '').toLowerCase();
        if (typeLower !== 'income' && typeLower !== 'inflow' && typeLower !== 'section_a') return false;
        
        // If it's a Provost Fine, count toward realized treasury income when cleared or approved
        if (t.purpose?.startsWith('Provost Fine:')) {
          return t.status === 'Cleared' || t.status === 'Approved';
        }
        return true;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions
      .filter(t => {
        const typeLower = (t.transactionType ?? '').toLowerCase();
        if (typeLower !== 'expense' && typeLower !== 'outflow' && typeLower !== 'section_b') return false;
        
        // Strictly exclude fine entries from operational expense outflows
        if (t.purpose?.startsWith('Provost Fine:') || t.purpose?.includes('Fine Commitment')) {
          return false;
        }
        return true;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions]);

  const vaultBalance = useMemo(() => {
    return totalIncome - totalExpenses;
  }, [totalIncome, totalExpenses]);

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
    refreshDatabase
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
    refreshDatabase
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