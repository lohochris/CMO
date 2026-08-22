import { uploadProfilePhotoToStorage, supabase } from '../lib/supabaseClient';

/**
 * Checks if a string is a valid 36-character UUID.
 */
export const isUuid = (val: string | null | undefined): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
};

/**
 * Returns the appropriate database column field name to query ('id' vs 'official_member_id').
 * Prevents PostgreSQL error 22P02 (invalid input syntax for type uuid).
 */
export const getMemberQueryField = (memberId: string | null | undefined): 'id' | 'official_member_id' => {
  return isUuid(memberId) ? 'id' : 'official_member_id';
};

export const uploadProfilePicture = async (memberId: string, file: Blob | string, fallbackUrl?: string) => {
  const url = await uploadProfilePhotoToStorage(memberId, file);

  // Strictly enforce permanent storage URLs. Never save temporary blob: or data: URLs to database.
  const isPermanentUrl = Boolean(url && !url.startsWith('blob:') && !url.startsWith('data:'));
  const targetUrl = isPermanentUrl ? url : null;

  if (targetUrl && memberId) {
    const queryField = getMemberQueryField(memberId);
    try {
      const { error } = await supabase
        .from('members')
        .update({ avatar_url: targetUrl })
        .eq(queryField, memberId);
      
      if (error) {
        // Retry updating by official_member_id if primary query field failed
        await supabase
          .from('members')
          .update({ avatar_url: targetUrl })
          .eq('official_member_id', memberId);
      }
    } catch (e) {
      console.error('Failed updating members avatar_url in database:', e);
    }
  }

  // Return the permanent URL if successful, otherwise null
  return targetUrl;
};

/**
 * Fetches pending bank withdrawal requests from public.bank_withdrawals.
 */
export const fetchPendingBankWithdrawals = async () => {
  const { data, error } = await supabase
    .from('bank_withdrawals')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
};

/**
 * Submits a new Section I Bank Withdrawal Request to public.bank_withdrawals.
 */
export const submitBankWithdrawalRequest = async (
  purpose: string,
  amount: number,
  requestedBy: string = 'Treasurer Office',
  category: 'Welfare Payout' | 'Major Project' | 'Operational Expense' | 'General' = 'General'
) => {
  const withdrawalRecord = {
    id: `WTH-${Date.now()}`,
    withdrawal_ref: `WTH-SEC1-${Math.floor(1000 + Math.random() * 9000)}`,
    purpose,
    amount,
    category,
    signatories: requestedBy.includes('Treasurer') ? 'Treasurer' : requestedBy,
    status: 'PENDING',
    requested_by: requestedBy,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('bank_withdrawals')
    .insert([withdrawalRecord])
    .select();

  return { data: (data && data.length > 0) ? data[0] : withdrawalRecord, error };
};

/**
 * Appends a signatory to a bank withdrawal request.
 * If signatories.length >= 2, status becomes APPROVED/SETTLED and an expense record is inserted into public.transactions.
 */
export const authorizeBankWithdrawal = async (
  withdrawalId: string,
  signatoryRole: string
) => {
  const { data: existingData, error: fetchErr } = await supabase
    .from('bank_withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .single();

  if (fetchErr || !existingData) {
    return { error: fetchErr || new Error('Bank withdrawal record not found'), isApproved: false };
  }

  const currentSigs = existingData.signatories
    ? existingData.signatories.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  if (!currentSigs.includes(signatoryRole)) {
    currentSigs.push(signatoryRole);
  }

  const isApproved = currentSigs.length >= 2;
  const newStatus = isApproved ? 'SETTLED' : 'PENDING';

  const updatedRecord = {
    ...existingData,
    signatories: currentSigs.join(', '),
    status: newStatus,
    authorized_at: isApproved ? new Date().toISOString() : existingData.authorized_at
  };

  const { data: updatedData, error: updateErr } = await supabase
    .from('bank_withdrawals')
    .upsert([updatedRecord])
    .select();

  if (isApproved) {
    const settledTxPayload = {
      official_member_id: existingData.member_id || 'PARISH_BANK_VAULT',
      member_name: existingData.member_name || existingData.requested_by || 'Treasurer Office',
      amount: existingData.amount,
      purpose: `[Section I Bank Withdrawal] ${existingData.purpose}`,
      notes: `Section I 2-of-3 Authorized Bank Withdrawal (Signatories: ${currentSigs.join(', ')})`,
      transaction_type: 'expense',
      status: 'SETTLED',
      created_at: new Date().toISOString()
    };

    const { error: txErr } = await supabase.from('transactions').insert([settledTxPayload]);
    if (txErr) console.warn('Supabase transaction insert error:', txErr);

    const expensePayload = {
      id: `EXP-SEC1-${Date.now()}`,
      amount: existingData.amount,
      purpose: `[Section I Bank Withdrawal] ${existingData.purpose}`,
      date: new Date().toISOString().split('T')[0],
      recordedBy: `Signatories: ${currentSigs.join(', ')}`
    };

    const { error: expErr } = await supabase.from('expenses').insert([expensePayload]);
    if (expErr) console.warn('Supabase expense insert error:', expErr);
  }

  return { data: (updatedData && updatedData.length > 0) ? updatedData[0] : updatedRecord, error: updateErr, isApproved };
};

export interface UnifiedFinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  vaultBalance: number;
}

/**
 * Pure calculation function that evaluates unified financial summary metrics
 * from an array of transaction objects according to exact constitution & accounting rules.
 * Fines are strictly classified as Income (when cleared/approved) and never placed in Operational Expenses.
 */
export const calculateUnifiedFinancialSummary = (transactionsList: any[] = []): UnifiedFinancialSummary => {
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const t of transactionsList) {
    const amount = Number(t.amount) || 0;
    const typeLower = String(t.transactionType || t.transaction_type || t.type || '').toLowerCase().trim();
    const purpose = String(t.purpose || '');
    const isFine = purpose.startsWith('Provost Fine:') || purpose.includes('Fine Commitment');

    if (typeLower === 'income' || typeLower === 'inflow' || typeLower === 'section_a') {
      if (purpose.startsWith('Provost Fine:')) {
        const statusLower = String(t.status || '').toLowerCase();
        if (statusLower === 'cleared' || statusLower === 'approved') {
          totalIncome += amount;
        }
      } else {
        totalIncome += amount;
      }
    } else if (typeLower === 'expense' || typeLower === 'outflow' || typeLower === 'section_b') {
      if (!isFine) {
        totalExpenses += amount;
      }
    }
  }

  const netBalance = totalIncome - totalExpenses;
  return {
    totalIncome,
    totalExpenses,
    netBalance,
    vaultBalance: netBalance
  };
};

/**
 * Fetches all transaction records directly from public.transactions in Supabase
 * and computes unified Total Income, Total Expenses, and Net/Vault Balance.
 */
export const fetchUnifiedFinancialSummary = async (): Promise<UnifiedFinancialSummary> => {
  try {
    const { data: txData, error } = await supabase
      .from('transactions')
      .select('amount, transaction_type, purpose, status');

    if (error || !txData) {
      console.warn("fetchUnifiedFinancialSummary warning or error:", error);
      return { totalIncome: 0, totalExpenses: 0, netBalance: 0, vaultBalance: 0 };
    }

    return calculateUnifiedFinancialSummary(txData);
  } catch (err) {
    console.error("fetchUnifiedFinancialSummary exception:", err);
    return { totalIncome: 0, totalExpenses: 0, netBalance: 0, vaultBalance: 0 };
  }
};


