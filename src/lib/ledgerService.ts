import { supabase } from './supabase';

export interface TransactionRecord {
  id: string;
  timestamp: string;
  member_name: string;
  official_member_id?: string;
  member_id?: string;
  purpose: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  status: string;
  reference_no?: string;

  // Compatibility fields for UI rendering
  contributor?: string;
  date?: string;
  created_at?: string;
  type?: string;
  memberName?: string;
  memberId?: string;
  source?: string;
  receipt_number?: string;
}

export interface CanonicalLedgerSummary {
  totalIncome: number;
  totalExpenses: number;
  vaultBalance: number;
  inflows: TransactionRecord[];
  outflows: TransactionRecord[];
  allTransactions: TransactionRecord[];
}

export const getCanonicalLedgerSummary = async (): Promise<CanonicalLedgerSummary> => {
  try {
    let { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      // Fallback if timestamp column does not exist on transactions
      const fallback = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    const rawTransactions = data || [];

    const transactions: TransactionRecord[] = rawTransactions.map((t: any) => {
      const ts = t.timestamp || t.created_at || t.date || new Date().toISOString();
      const mName = t.member_name || t.contributor || t.full_name || 'Parish Member';
      const mId = t.official_member_id || t.member_id || 'N/A';
      const txType = (t.transaction_type || t.type || 'income').toLowerCase().trim() as 'income' | 'expense';
      const ref = t.reference_no || t.reference || t.receipt_number || 'TX-REF';
      return {
        ...t,
        id: t.id,
        timestamp: ts,
        date: ts,
        created_at: ts,
        member_name: mName,
        contributor: mName,
        memberName: mName,
        official_member_id: mId,
        member_id: mId,
        memberId: mId,
        purpose: t.purpose || t.payment_title || t.description || 'Transaction',
        amount: Number(t.amount) || 0,
        transaction_type: txType,
        type: txType.toUpperCase(),
        status: t.status || 'Approved',
        reference_no: ref,
        reference: ref
      };
    });

    const inflows = transactions.filter(
      (t) => (t.transaction_type || '').toLowerCase().trim() === 'income'
    );

    const outflows = transactions.filter(
      (t) => (t.transaction_type || '').toLowerCase().trim() === 'expense'
    );

    const totalIncome = inflows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalExpenses = outflows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const vaultBalance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      vaultBalance,
      inflows,
      outflows,
      allTransactions: transactions,
    };
  } catch (err) {
    console.error('Fatal error loading canonical ledger:', err);
    return {
      totalIncome: 0,
      totalExpenses: 0,
      vaultBalance: 0,
      inflows: [],
      outflows: [],
      allTransactions: [],
    };
  }
};

// Aliases for full backward compatibility
export type MasterLedgerSummary = CanonicalLedgerSummary;
export type LedgerEntry = TransactionRecord;
export const fetchMasterFinancialLedger = getCanonicalLedgerSummary;
