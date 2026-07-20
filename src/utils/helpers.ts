import { Transaction, Expense } from '../types';

export const calculateTotal = (items: Array<{ amount: number }>): number => {
  return items.reduce((sum, item) => sum + item.amount, 0);
};

export const formatCurrency = (amount: number): string => {
  return `₦${amount.toLocaleString()}`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

export const getCombinedTransactions = (
  transactions: Transaction[],
  expenses: Expense[]
): Array<
  (Transaction & { type: 'income'; timestamp: string }) |
  (Expense & { type: 'expense'; timestamp: string })
> => {
  return [
    ...transactions.map(t => ({ ...t, type: 'income' as const, timestamp: t.timestamp })),
    ...expenses.map(e => ({ ...e, type: 'expense' as const, timestamp: e.date }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const isAdministrativeId = (rawId: string): boolean => {
  if (!rawId) return false;
  const id = rawId.toUpperCase();
  // Sequential IDs starting with HCC are standard members
  if (id.startsWith('HCC-')) return false;

  return (
    id === 'FIN-SEC-2026'         ||
    id === 'WEL-OFF-2026'         ||
    id === 'WELFARE-2026'         ||
    id === 'TREAS-2026'           ||
    id === 'TREASURER-2026'       ||
    id === 'SECRETARY-2026'       ||
    id === 'PRO-2026'             ||
    id === 'CMO-CHAIRMAN-2026'    ||
    id === 'PROVOST-2026'         ||
    id === 'LITURGIST-2026'
  );
};

export const isStandardParishMember = (m: { official_member_id?: string; id?: string; role?: string }): boolean => {
  const memberId = (m.official_member_id || m.id || '').toUpperCase();
  if (isAdministrativeId(memberId)) return false;
  return memberId.startsWith('HCC-CMO-26-') || memberId.startsWith('HCC-');
};

export const getInitials = (name?: string | null): string => {
  if (!name || !name.trim()) return 'HC';
  const cleaned = name.trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'HC';
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  const firstInitial = parts[0][0];
  const lastInitial = parts[parts.length - 1][0];
  return (firstInitial + lastInitial).toUpperCase();
};