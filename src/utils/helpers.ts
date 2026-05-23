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