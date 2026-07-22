import { supabase } from '../lib/supabaseClient';
import { AttendanceRecord, CmoNotification, CmoMeetingSession } from '../types';

export const DEFAULT_LATE_FINE = 500;
export const DEFAULT_ABSENT_FINE = 1000;

export async function fetchAttendanceByDate(meetingDate: string): Promise<AttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('cmo_attendance_and_excuses')
      .select('*')
      .eq('meeting_date', meetingDate);

    if (error) {
      console.warn('cmo_attendance_and_excuses fetch error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Failed to fetch attendance records:', err);
    return [];
  }
}

export async function fetchPendingExcuses(): Promise<AttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('cmo_attendance_and_excuses')
      .select('*')
      .eq('excuse_status', 'Pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Pending excuses query error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Failed to fetch pending excuses:', err);
    return [];
  }
}

export async function upsertAttendanceRecord(record: Partial<AttendanceRecord>): Promise<{ success: boolean; error?: string }> {
  try {
    if (!record.meeting_date || !record.member_id) {
      return { success: false, error: 'Meeting date and Member ID are required' };
    }

    // Check if record exists for this date + member
    const { data: existing } = await supabase
      .from('cmo_attendance_and_excuses')
      .select('id, status, fine_amount')
      .eq('meeting_date', record.meeting_date)
      .eq('member_id', record.member_id)
      .maybeSingle();

    const payload: any = {
      meeting_date: record.meeting_date,
      meeting_title: record.meeting_title || 'Monthly General Meeting',
      member_id: record.member_id,
      official_member_id: record.official_member_id || record.member_id,
      member_name: record.member_name || 'Member',
      status: record.status || 'Present',
      fine_amount: record.fine_amount ?? 0,
      excuse_status: record.excuse_status || 'None',
      excuse_category: record.excuse_category || null,
      excuse_reason: record.excuse_reason || null,
      check_in_time: record.status === 'Present' || record.status === 'Late' ? (record.check_in_time || new Date().toISOString()) : null,
      updated_at: new Date().toISOString()
    };

    let opError = null;
    if (existing?.id) {
      const { error } = await supabase
        .from('cmo_attendance_and_excuses')
        .update(payload)
        .eq('id', existing.id);
      opError = error;
    } else {
      payload.created_at = new Date().toISOString();
      const { error } = await supabase
        .from('cmo_attendance_and_excuses')
        .insert([payload]);
      opError = error;
    }

    if (opError) {
      console.error('Supabase attendance upsert failed:', opError);
      return { success: false, error: opError.message };
    }

    // Pipeline Hook: Synchronize Attendance Fine into Fines Escrow Ledger (public.transactions)
    const targetOfficialId = record.official_member_id || record.member_id;
    const purposeTag = `Provost Fine: Attendance (${record.meeting_date})`;

    if (record.fine_amount && record.fine_amount > 0) {
      // Check if fine transaction entry already exists in transactions table
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('official_member_id', targetOfficialId)
        .eq('purpose', purposeTag)
        .maybeSingle();

      if (existingTx) {
        if (existingTx.status === 'Unpaid' || !existingTx.status) {
          await supabase
            .from('transactions')
            .update({
              amount: record.fine_amount,
              notes: `Attendance fine for ${record.status} on ${record.meeting_date}`,
              status: 'Unpaid'
            })
            .eq('id', existingTx.id);
        }
      } else {
        await supabase
          .from('transactions')
          .insert([{
            official_member_id: targetOfficialId,
            member_name: record.member_name || 'Member',
            amount: record.fine_amount,
            purpose: purposeTag,
            notes: `Attendance fine for ${record.status} on ${record.meeting_date}`,
            transaction_type: 'income',
            status: 'Unpaid',
            created_at: new Date().toISOString()
          }]);
      }
    } else {
      // Status corrected to Present or Excused (fine = 0): void/delete any pending Unpaid fine entry for this meeting
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('official_member_id', targetOfficialId)
        .eq('purpose', purposeTag)
        .maybeSingle();

      if (existingTx && existingTx.status === 'Unpaid') {
        await supabase
          .from('transactions')
          .delete()
          .eq('id', existingTx.id);
      }
    }

    // Also log notification if status is Late or Absent
    if (record.status === 'Late' || record.status === 'Absent') {
      const fineText = record.fine_amount ? ` (Fine: ₦${record.fine_amount.toLocaleString()})` : '';
      await createCmoNotification({
        member_id: record.member_id,
        official_member_id: record.official_member_id,
        title: `Attendance Alert: ${record.status}`,
        message: `You were marked ${record.status} for meeting on ${record.meeting_date}${fineText}. Fine added to Escrow Clearance.`,
        type: 'attendance'
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('Exception in upsertAttendanceRecord:', err);
    return { success: false, error: err.message };
  }
}

export async function processPendingExcuse(
  meetingDate: string,
  memberId: string,
  officialMemberId: string | undefined,
  memberName: string,
  action: 'Approve' | 'Reject'
): Promise<{ success: boolean; error?: string }> {
  try {
    const isApproved = action === 'Approve';
    const newStatus = isApproved ? 'Excused' : 'Absent';
    const newExcuseStatus = isApproved ? 'Approved' : 'Rejected';
    const fineAmount = isApproved ? 0 : DEFAULT_ABSENT_FINE;

    const result = await upsertAttendanceRecord({
      meeting_date: meetingDate,
      member_id: memberId,
      official_member_id: officialMemberId,
      member_name: memberName,
      status: newStatus,
      fine_amount: fineAmount,
      excuse_status: newExcuseStatus
    });

    if (!result.success) return result;

    // Send Notification to Member
    const notifTitle = isApproved ? 'Excuse Approved' : 'Excuse Rejected';
    const notifMsg = isApproved
      ? `Your excuse request for meeting on ${meetingDate} has been Approved by the Provost (Fine waived).`
      : `Your excuse request for meeting on ${meetingDate} was Rejected. Marked Absent with ₦${DEFAULT_ABSENT_FINE.toLocaleString()} fine.`;

    await createCmoNotification({
      member_id: memberId,
      official_member_id: officialMemberId,
      title: notifTitle,
      message: notifMsg,
      type: 'excuse'
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

const VALID_EXCUSE_CATEGORIES = [
  'Illness / Medical',
  'Travel',
  'Work/Official Assignment',
  'Family Emergency',
  'Bereavement',
  'Other'
];

export function normalizeExcuseCategory(cat: string): string {
  if (!cat) return 'Other';
  if (VALID_EXCUSE_CATEGORIES.includes(cat)) return cat;
  if (cat.includes('Work') || cat.includes('Official')) return 'Work/Official Assignment';
  if (cat.includes('Travel') || cat.includes('Town')) return 'Travel';
  if (cat.includes('Illness') || cat.includes('Medical')) return 'Illness / Medical';
  if (cat.includes('Emergency') || cat.includes('Family')) return 'Family Emergency';
  if (cat.includes('Bereavement') || cat.includes('Death')) return 'Bereavement';
  return 'Other';
}

export async function submitExcuseRequest(params: {
  member_id: string;
  official_member_id?: string;
  member_name: string;
  meeting_date: string;
  meeting_title?: string;
  category: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const sanitizedCategory = normalizeExcuseCategory(params.category);
    const result = await upsertAttendanceRecord({
      meeting_date: params.meeting_date,
      meeting_title: params.meeting_title || 'Monthly General Meeting',
      member_id: params.member_id,
      official_member_id: params.official_member_id,
      member_name: params.member_name,
      status: 'Absent', // default until approved
      fine_amount: 0,
      excuse_status: 'Pending',
      excuse_category: sanitizedCategory,
      excuse_reason: params.reason
    });

    if (result.success) {
      await createCmoNotification({
        member_id: params.member_id,
        official_member_id: params.official_member_id,
        title: 'Excuse Submitted',
        message: `Your excuse request for meeting on ${params.meeting_date} has been submitted for Provost review.`,
        type: 'excuse'
      });
    }

    return result;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createCmoNotification(params: {
  member_id: string;
  official_member_id?: string;
  title: string;
  message: string;
  type?: 'attendance' | 'fine' | 'excuse' | 'general';
}): Promise<boolean> {
  try {
    const payload = {
      member_id: params.member_id,
      official_member_id: params.official_member_id || params.member_id,
      title: params.title,
      message: params.message,
      type: params.type || 'attendance',
      read_status: false,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('cmo_notifications').insert([payload]);
    if (error) console.warn('cmo_notifications insert warning:', error.message);
    return !error;
  } catch (err) {
    console.error('Error creating notification:', err);
    return false;
  }
}

export async function fetchMemberNotifications(memberId: string, officialMemberId?: string): Promise<CmoNotification[]> {
  try {
    const targetId = officialMemberId || memberId;
    const { data, error } = await supabase
      .from('cmo_notifications')
      .select('*')
      .or(`member_id.eq.${memberId},official_member_id.eq.${targetId}`)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('cmo_notifications query error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Failed to fetch member notifications:', err);
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cmo_notifications')
      .update({ read_status: true })
      .eq('id', id);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function fetchMeetingSession(meetingDate: string): Promise<CmoMeetingSession | null> {
  try {
    const { data, error } = await supabase
      .from('cmo_meeting_sessions')
      .select('*')
      .eq('meeting_date', meetingDate)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('cmo_meeting_sessions fetch exception:', err);
  }

  // Fallback to localStorage
  try {
    const saved = localStorage.getItem(`cmo_session_${meetingDate}`);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return null;
}

export async function openMeetingSession(
  meetingDate: string, 
  meetingTitle: string, 
  openedBy?: string
): Promise<CmoMeetingSession> {
  const now = new Date();
  const locksAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 Hours Session Policy

  const sessionObj: CmoMeetingSession = {
    meeting_date: meetingDate,
    meeting_title: meetingTitle || 'Monthly General Meeting',
    opened_at: now.toISOString(),
    locks_at: locksAt.toISOString(),
    is_manually_locked: false,
    opened_by: openedBy || 'Provost Marshal',
    created_at: now.toISOString()
  };

  // Persist in localStorage
  localStorage.setItem(`cmo_session_${meetingDate}`, JSON.stringify(sessionObj));

  // Persist in Supabase
  try {
    const { data: existing } = await supabase
      .from('cmo_meeting_sessions')
      .select('id')
      .eq('meeting_date', meetingDate)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('cmo_meeting_sessions')
        .update({
          opened_at: sessionObj.opened_at,
          locks_at: sessionObj.locks_at,
          is_manually_locked: false,
          opened_by: sessionObj.opened_by
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('cmo_meeting_sessions')
        .insert([sessionObj]);
    }
  } catch (err) {
    console.warn('Supabase cmo_meeting_sessions write warning:', err);
  }

  return sessionObj;
}

export async function lockMeetingSession(meetingDate: string): Promise<boolean> {
  try {
    const saved = localStorage.getItem(`cmo_session_${meetingDate}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.is_manually_locked = true;
      localStorage.setItem(`cmo_session_${meetingDate}`, JSON.stringify(parsed));
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const { error } = await supabase
      .from('cmo_meeting_sessions')
      .update({ is_manually_locked: true })
      .eq('meeting_date', meetingDate);
    return !error;
  } catch (err) {
    return true;
  }
}
