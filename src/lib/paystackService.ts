import { supabase } from './supabase';

export interface InstantPaymentPayload {
  memberId: string;
  officialMemberId: string;
  memberName: string;
  email: string;
  purpose: string;
  amount: number;
  reference: string;
}

export const recordInstantPaymentToLedger = async (payload: InstantPaymentPayload) => {
  const now = new Date().toISOString();

  // 1. Insert directly into canonical transactions table (Instant Realized Income)
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .insert([
      {
        timestamp: now,
        created_at: now,
        member_name: payload.memberName,
        official_member_id: payload.officialMemberId,
        member_id: payload.officialMemberId,
        purpose: payload.purpose,
        amount: payload.amount,
        transaction_type: 'income',
        status: 'Completed',
        reference_no: payload.reference,
      },
    ])
    .select()
    .single();

  if (txError) {
    console.error('Error recording transaction ledger entry:', txError);
  }

  // 2. Also register in payment_submissions as pre-approved for audit history
  const { error: subError } = await supabase
    .from('payment_submissions')
    .insert([
      {
        member_id: payload.officialMemberId,
        official_member_id: payload.officialMemberId,
        full_name: payload.memberName,
        member_name: payload.memberName,
        payment_title: payload.purpose,
        purpose: payload.purpose,
        amount: payload.amount,
        reference_no: payload.reference,
        transaction_ref: payload.reference,
        receipt_url: `PAYSTACK_INLINE_${payload.reference}`,
        status: 'approved',
        verified_at: now,
        verified_by: 'PAYSTACK_AUTOPAY',
      },
    ]);

  if (subError) {
    console.warn('Audit record warning:', subError);
  }

  return txData;
};
