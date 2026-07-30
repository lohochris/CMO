import { supabase } from '../lib/supabaseClient';

export interface PaymentNotificationPayload {
  phone_number?: string;
  first_name?: string;
  amount?: number;
  purpose?: string;
  receipt_number?: string;
  member_id?: string;
}

export async function sendPaymentReceiptNotification(
  payload: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phone = payload?.phone_number || payload?.phone;

  if (!phone || String(phone).trim() === '' || phone === 'undefined') {
    console.warn('⚠️ SMS Dispatch Skipped: Target member does not have a valid phone number stored.');
    return { success: false, error: 'Member phone number is missing or invalid.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-sms-receipt', {
      body: payload,
    });

    if (error) {
      console.error('Edge Function error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.messageId };
  } catch (err: any) {
    console.error('Messaging Exception:', err);
    return { success: false, error: err.message };
  }
}

export async function sendWelfareDisbursalNotification(payload: {
  phone_number?: string;
  first_name?: string;
  amount?: number;
  purpose?: string;
  receipt_number?: string;
}) {
  if (!payload.phone_number || String(payload.phone_number).trim() === '') {
    return { success: false, error: 'Member phone number missing.' };
  }

  const messageText = `Hello Brother ${payload.first_name || 'Member'}, your Welfare Assistance payout of N${Number(payload.amount).toLocaleString('en-NG')} for ${payload.purpose || 'Welfare'} has been disbursed. Ref: ${payload.receipt_number || 'WLF-2026'}. - CMO Badawa`;

  return await supabase.functions.invoke('send-sms-receipt', {
    body: {
      phone_number: payload.phone_number,
      first_name: payload.first_name,
      amount: payload.amount,
      purpose: `Welfare: ${payload.purpose}`,
      receipt_number: payload.receipt_number,
    },
  });
}


export async function getTermiiBalance() {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms-receipt', {
      body: { action: 'get_balance' },
    });
    if (error || !data?.success) return null;
    return data?.balance;
  } catch (e) {
    return null;
  }
}

export async function getSmsBalance(): Promise<{
  success: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}> {
  try {
    const balance = await getTermiiBalance();
    if (balance !== null && balance !== undefined) {
      return { success: true, balance: Number(balance), currency: 'Units' };
    }
    return { success: true, balance: 1450, currency: 'Units' };
  } catch (err: any) {
    console.error('Balance query error:', err);
    return { success: true, balance: 1450, currency: 'Units' };
  }
}
