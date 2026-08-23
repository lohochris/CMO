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

/**
 * Uploads a payment receipt file (image/pdf) to Supabase Storage bucket `payment_receipts`.
 */
export const uploadPaymentReceiptToStorage = async (officialMemberId: string, file: File | Blob): Promise<string | null> => {
  try {
    const cleanId = (officialMemberId || 'member').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const ext = file.type.includes('pdf') ? 'pdf' : file.type.includes('png') ? 'png' : 'jpg';
    const filePath = `receipt_${cleanId}_${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('payment_receipts')
      .upload(filePath, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.warn('Error uploading payment receipt to storage:', uploadError);
    }

    const { data: publicUrlData } = supabase.storage
      .from('payment_receipts')
      .getPublicUrl(filePath);

    return publicUrlUrlString(publicUrlData?.publicUrl) || null;
  } catch (err) {
    console.error('Exception during payment receipt upload:', err);
    return null;
  }
};

function publicUrlUrlString(url?: string): string | null {
  if (!url) return null;
  return `${url}?t=${Date.now()}`;
}

/**
 * Submits proof of payment to public.payment_submissions table matching canonical Supabase types.
 */
export const submitPaymentReceipt = async (submissionInput: {
  member_id?: string;
  memberId?: string;
  official_member_id?: string;
  officialMemberId?: string;
  full_name?: string;
  fullName?: string;
  cmo_family?: string;
  cmoFamily?: string;
  purpose?: string;
  payment_title?: string;
  paymentTitle?: string;
  amount: number;
  reference_no?: string;
  referenceNo?: string;
  receipt_url?: string;
  receiptUrl?: string;
}) => {
  const memberId = submissionInput.memberId || submissionInput.member_id || '';
  const officialMemberId = submissionInput.officialMemberId || submissionInput.official_member_id;
  const resolvedMemberId = officialMemberId || memberId;

  const fullName = submissionInput.fullName || submissionInput.full_name || 'Member';
  const cmoFamily = submissionInput.cmoFamily || submissionInput.cmo_family || null;
  const paymentTitle = submissionInput.paymentTitle || submissionInput.payment_title || submissionInput.purpose || 'Payment Dues';
  const referenceNo = submissionInput.referenceNo || submissionInput.reference_no || null;
  const receiptUrl = submissionInput.receiptUrl || submissionInput.receipt_url || '';

  const payload = {
    member_id: resolvedMemberId,
    official_member_id: resolvedMemberId,
    full_name: fullName,
    member_name: fullName,
    cmo_family: cmoFamily || null,
    payment_title: paymentTitle,
    purpose: paymentTitle,
    amount: Number(submissionInput.amount),
    reference_no: referenceNo || null,
    transaction_ref: referenceNo || null,
    receipt_url: receiptUrl,
    status: 'pending',
  };

  const { data, error } = await supabase
    .from('payment_submissions')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error inserting payment submission:', error);
    throw error;
  }

  return data;
};

/**
 * Fetches payment submissions filtered by member or status.
 */
export const fetchPaymentSubmissions = async (filters?: {
  official_member_id?: string;
  status?: 'pending' | 'approved' | 'rejected';
}) => {
  let query = supabase.from('payment_submissions').select('*').order('created_at', { ascending: false });

  if (filters?.official_member_id) {
    query = query.or(`official_member_id.eq.${filters.official_member_id},member_id.eq.${filters.official_member_id}`);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  let { data, error } = await query;

  if (error) {
    // Retry without OR filter if official_member_id column is missing
    let retryQuery = supabase.from('payment_submissions').select('*').order('created_at', { ascending: false });
    if (filters?.official_member_id) {
      retryQuery = retryQuery.eq('member_id', filters.official_member_id);
    }
    if (filters?.status) {
      retryQuery = retryQuery.eq('status', filters.status);
    }
    const res = await retryQuery;
    data = res.data;
    error = res.error;
  }

  const normalizedData = (data || []).map((row: any) => ({
    ...row,
    official_member_id: row.official_member_id || row.member_id || '',
    full_name: row.full_name || row.member_name || 'Member',
    member_name: row.member_name || row.full_name || 'Member',
    purpose: row.purpose || row.payment_title || 'Payment Dues',
    payment_title: row.payment_title || row.purpose || 'Payment Dues',
    reference_no: row.reference_no || row.transaction_ref || '',
    transaction_ref: row.transaction_ref || row.reference_no || '',
    rejection_reason: row.rejection_reason || row.review_notes || '',
    review_notes: row.review_notes || row.rejection_reason || '',
    verified_at: row.verified_at || row.reviewed_at || undefined,
    reviewed_at: row.reviewed_at || row.verified_at || undefined,
    verified_by: row.verified_by || row.reviewed_by || undefined,
    reviewed_by: row.reviewed_by || row.verified_by || undefined,
  }));
  return { data: normalizedData, error };
};

/**
 * Audits a payment submission (Approve or Reject).
 * If approved, automatically posts an entry to public.transactions.
 */
export const auditPaymentSubmission = async (
  submissionId: string,
  action: 'approved' | 'rejected',
  officerName: string,
  rejectionReason?: string
) => {
  const { data: submission, error: fetchErr } = await supabase
    .from('payment_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (fetchErr || !submission) {
    return { error: fetchErr || new Error('Submission record not found') };
  }

  const nowIso = new Date().toISOString();
  const updatePayload: any = {
    status: action,
    verified_at: nowIso,
    verified_by: officerName
  };

  if (action === 'rejected' && rejectionReason) {
    updatePayload.rejection_reason = rejectionReason;
  }

  let { error: updateErr } = await supabase
    .from('payment_submissions')
    .update(updatePayload)
    .eq('id', submissionId);

  if (updateErr && (updateErr.code === 'PGRST204' || updateErr.message?.includes('column'))) {
    console.warn('Audit update PGRST204 missing column error, retrying with fallback aliases:', updateErr.message);
    const fallbackPayload: any = { status: action };
    const errMsg = updateErr.message || '';

    if (!errMsg.includes('verified_at')) fallbackPayload.verified_at = nowIso;
    if (!errMsg.includes('verified_by')) fallbackPayload.verified_by = officerName;
    if (errMsg.includes('verified_at')) fallbackPayload.reviewed_at = nowIso;
    if (errMsg.includes('verified_by')) fallbackPayload.reviewed_by = officerName;

    if (action === 'rejected' && rejectionReason) {
      if (!errMsg.includes('rejection_reason')) fallbackPayload.rejection_reason = rejectionReason;
      if (errMsg.includes('rejection_reason')) fallbackPayload.review_notes = rejectionReason;
    }

    const res = await supabase
      .from('payment_submissions')
      .update(fallbackPayload)
      .eq('id', submissionId);
    updateErr = res.error;
  }

  if (updateErr) {
    return { error: updateErr };
  }

  if (action === 'approved') {
    const memberName = submission.full_name || submission.member_name || 'Member';
    const purposeTitle = submission.purpose || submission.payment_title || 'Payment Dues';
    const refNo = submission.reference_no || submission.transaction_ref || 'Ref N/A';

    await supabase.from('transactions').insert([
      {
        member_id: submission.official_member_id || submission.member_id,
        official_member_id: submission.official_member_id || submission.member_id,
        member_name: memberName,
        amount: submission.amount,
        purpose: purposeTitle,
        notes: `Verified Receipt Payment (${refNo}). Verified by ${officerName}.`,
        transaction_type: 'Income',
        status: 'Completed',
        created_at: new Date().toISOString()
      }
    ]);
  }

  return { success: true };
};


