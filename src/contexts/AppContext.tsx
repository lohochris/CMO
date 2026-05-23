import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Member, Transaction, WelfareTicket, Expense, Announcement, Page, FamilyTransaction, FamilyExpense, FamilyWelfareTicket, FamilyAnnouncement } from '../types';
import { seedMembers, seedAnnouncements } from '../data/seedData';

interface AppContextType {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  welfareTickets: WelfareTicket[];
  setWelfareTickets: React.Dispatch<React.SetStateAction<WelfareTicket[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(seedMembers);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [welfareTickets, setWelfareTickets] = useState<WelfareTicket[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(seedAnnouncements);
  const [familyTransactions, setFamilyTransactions] = useState<FamilyTransaction[]>([]);
  const [familyExpenses, setFamilyExpenses] = useState<FamilyExpense[]>([]);
  const [familyWelfareTickets, setFamilyWelfareTickets] = useState<FamilyWelfareTicket[]>([]);
  const [familyAnnouncements, setFamilyAnnouncements] = useState<FamilyAnnouncement[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<import('../types').Family | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const expirationThreshold = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const activeAnnouncements = announcements.filter(ann => {
      const expiresAt = ann.expiresAt ? new Date(ann.expiresAt).getTime() : new Date(ann.timestamp).getTime() + 2 * 24 * 60 * 60 * 1000;
      return expiresAt >= expirationThreshold;
    });

    if (activeAnnouncements.length !== announcements.length) {
      setAnnouncements(activeAnnouncements);
    }
  }, [announcements]);

  return (
    <AppContext.Provider value={{
      members, setMembers,
      transactions, setTransactions,
      welfareTickets, setWelfareTickets,
      expenses, setExpenses,
      announcements, setAnnouncements,
      familyTransactions, setFamilyTransactions,
      familyExpenses, setFamilyExpenses,
      familyWelfareTickets, setFamilyWelfareTickets,
      familyAnnouncements, setFamilyAnnouncements,
      currentPage, setCurrentPage,
      selectedFamily, setSelectedFamily,
      currentUser, setCurrentUser,
      error, setError,
      success, setSuccess
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