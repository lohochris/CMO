import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mapping Utilities: Database (snake_case) <-> Frontend (camelCase)
const dbToMember = (m: any): Member => {
  let mappedStatus = m.status;
  if (mappedStatus === 'Active (Cleared)') mappedStatus = 'Active';
  else if (mappedStatus === 'Pending Validation') mappedStatus = 'Inactive';

  return {
    id: m.official_member_id || m.id,
    name: m.full_name || m.name,
    full_name: m.full_name || m.name,
    official_member_id: m.official_member_id || undefined,
    phone_number: m.phone_number || m.phone || undefined,
    status: mappedStatus as any,
    balance: Number(m.balance),
    role: m.role as any,
    family: m.family as any,
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
    profilePic: m.profile_picture_url || null,
    createdAt: m.created_at || m.createdAt || undefined,
    updatedAt: m.updated_at || m.updatedAt || undefined
  };
};

const memberToDb = (m: Member): any => ({
  official_member_id: m.official_member_id || m.id,
  full_name: m.full_name || m.name,
  status: m.status,
  balance: m.balance,
  role: m.role,
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
  profile_picture_url: m.profilePic || null,
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
  timestamp: t.created_at || t.timestamp
});

const transactionToDb = (t: Transaction): any => ({
  id: t.id,
  official_member_id: t.memberId,
  member_name: t.memberName,
  amount: t.amount,
  purpose: t.purpose,
  notes: t.notes,
  transaction_type: t.transactionType,
  created_at: t.timestamp
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

  // Ensure data hydrates even if native Supabase Auth is anonymous
  useEffect(() => {
    const hydrateData = async () => {
      // Recover administrative session if present in local storage
      try {
        if (typeof window !== 'undefined') {
          const savedUser = localStorage.getItem('cmo_current_user');
          const sessionKey = localStorage.getItem('cmo_member_session') || localStorage.getItem('cmo_admin_id');
          
          if ((sessionKey === 'WEL-OFF-2026' || sessionKey === 'TREAS-2026' || savedUser) && !currentUser) {
            if (savedUser) {
              setCurrentUser(JSON.parse(savedUser));
            } else if (sessionKey) {
              const fallbackAdmin: Member = {
                id: sessionKey,
                name: sessionKey === 'WEL-OFF-2026' ? 'Welfare Officer' : 'Treasurer',
                status: 'Active',
                balance: 0,
                role: sessionKey === 'WEL-OFF-2026' ? 'welfare' : 'treasurer'
              };
              setCurrentUser(fallbackAdmin);
            }
          }
        }
      } catch (e) {
        console.error("Administrative session recovery failed:", e);
      }

      // Fetch the global members list immediately to unblock the UI dropdown
      const { data, error } = await supabase.from('members').select('*');
      if (data) {
        const loadedMembers = data.map((m: any) => ({
          ...dbToMember(m),
          name: m.full_name || m.name,
          phone: m.phone_number || m.phone
        }));
        setMembersState(loadedMembers);

        // Also fetch welfare tickets and map them with loadedMembers context
        try {
          const { data: dbWelfare } = await supabase.from('welfare_tickets').select('*');
          if (dbWelfare) {
            setWelfareTicketsState(dbWelfare.map((t: any) => dbToWelfareTicket(t, loadedMembers)));
          }
        } catch (welfareErr) {
          console.error("Immediate welfare tickets hydration error:", welfareErr);
        }

        // Fetch master_roster count
        try {
          const { count, error: rosterErr } = await supabase
            .from('master_roster')
            .select('*', { count: 'exact', head: true });
          if (!rosterErr && count !== null) {
            setRosterCount(count);
          }
        } catch (rosterErr) {
          console.error("Immediate roster count hydration error:", rosterErr);
        }
      }
    };
    hydrateData();
  }, [currentUser]);
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

      let loadedMembersList: Member[] = [];

      // 1. Fetch Members
      try {
        // Ensure all executives pull the complete human membership database rows
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

      // 2. Fetch Transactions
      try {
        const { data: dbTx, error: txErr } = await supabase
          .from('transactions')
          .select('id, official_member_id, member_name, amount, purpose, notes, created_at');
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

      // Fetch master_roster count
      try {
        const { count, error: rosterErr } = await supabase
          .from('master_roster')
          .select('*', { count: 'exact', head: true });
        if (!rosterErr && count !== null) {
          setRosterCount(count);
        }
      } catch (err) {
        console.error("AppContext roster count fetch error:", err);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

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
            const newTicket = dbToWelfareTicket(payload.new, members);
            setWelfareTicketsState(prev => {
              if (prev.some(t => t.ticketId === newTicket.ticketId)) return prev;
              return [...prev, newTicket];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTicket = dbToWelfareTicket(payload.new, members);
            
            // Check status change to trigger toast notification
            setWelfareTicketsState(prev => {
              const oldTicket = prev.find(t => t.ticketId === updatedTicket.ticketId);
              if (oldTicket && oldTicket.status !== updatedTicket.status) {
                const memberName = updatedTicket.memberName;
                const roleLower = currentUser?.role?.toLowerCase();
                
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
  }, [currentUser, members]);

  // Intercepting State Setters to sync to Supabase asynchronously
  const setMembers = async (newMembers: Member[] | ((prev: Member[]) => Member[])) => {
    const next = typeof newMembers === 'function' ? newMembers(members) : newMembers;
    setMembersState(next);

    if (dbError) {
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
  };

  const setTransactions = async (newTx: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    const next = typeof newTx === 'function' ? newTx(transactions) : newTx;
    setTransactionsState(next);

    // Sync only newly added transactions by comparing key hashes
    const currentHashes = new Set(transactions.map(t => `${t.memberId}-${t.timestamp}`));
    const toInsert = next.filter(t => !currentHashes.has(`${t.memberId}-${t.timestamp}`));

    if (toInsert.length > 0) {
      try {
        const { data: insertedData, error: syncErr, status } = await supabase
          .from('transactions')
          .insert(toInsert.map(transactionToDb))
          .select('id, official_member_id, member_name, amount, purpose, notes, created_at');

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
      loading, dbError,
      rosterCount
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