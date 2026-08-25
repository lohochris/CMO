import { supabase } from './supabaseClient';
import { WelfareNotification, Family, WelfareEventCategory, WelfareNotificationStatus } from '../types';

export const dbToWelfareNotification = (row: any): WelfareNotification => {
  return {
    id: row.id,
    memberId: row.member_id,
    officialMemberId: row.official_member_id,
    memberName: row.member_name || 'Member',
    cmoFamily: (row.cmo_family || 'Wisdom') as Family,
    eventCategory: (row.event_category || 'Other') as WelfareEventCategory,
    title: row.title || 'Welfare Incident',
    description: row.description || '',
    locationOrHospital: row.location_or_hospital || undefined,
    incidentDate: row.incident_date || new Date().toISOString().split('T')[0],
    status: (row.status || 'Submitted') as WelfareNotificationStatus,
    familyHeadNotes: row.family_head_notes || undefined,
    familyHeadVerifiedAt: row.family_head_verified_at || undefined,
    welfareOfficerNotes: row.welfare_officer_notes || undefined,
    welfareOfficerReviewedAt: row.welfare_officer_reviewed_at || undefined,
    elevatedTicketId: row.elevated_ticket_id || undefined,
    chairmanRead: Boolean(row.chairman_read),
    welfareOfficerRead: Boolean(row.welfare_officer_read),
    familyHeadRead: Boolean(row.family_head_read),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
};

export const welfareNotificationToDb = (data: Partial<WelfareNotification>): any => {
  const payload: any = {};
  if (data.id) payload.id = data.id;
  if (data.memberId) payload.member_id = data.memberId;
  if (data.officialMemberId) payload.official_member_id = data.officialMemberId;
  if (data.memberName) payload.member_name = data.memberName;
  if (data.cmoFamily) payload.cmo_family = data.cmoFamily;
  if (data.eventCategory) payload.event_category = data.eventCategory;
  if (data.title) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (data.locationOrHospital !== undefined) payload.location_or_hospital = data.locationOrHospital;
  if (data.incidentDate) payload.incident_date = data.incidentDate;
  if (data.status) payload.status = data.status;
  if (data.familyHeadNotes !== undefined) payload.family_head_notes = data.familyHeadNotes;
  if (data.familyHeadVerifiedAt !== undefined) payload.family_head_verified_at = data.familyHeadVerifiedAt;
  if (data.welfareOfficerNotes !== undefined) payload.welfare_officer_notes = data.welfareOfficerNotes;
  if (data.welfareOfficerReviewedAt !== undefined) payload.welfare_officer_reviewed_at = data.welfareOfficerReviewedAt;
  if (data.elevatedTicketId !== undefined) payload.elevated_ticket_id = data.elevatedTicketId;
  if (data.chairmanRead !== undefined) payload.chairman_read = data.chairmanRead;
  if (data.welfareOfficerRead !== undefined) payload.welfare_officer_read = data.welfareOfficerRead;
  if (data.familyHeadRead !== undefined) payload.family_head_read = data.familyHeadRead;

  return payload;
};

/**
 * Creates a new welfare emergency/incident notification.
 */
export async function createWelfareNotification(
  data: Partial<WelfareNotification>
): Promise<WelfareNotification> {
  const payload = {
    member_id: data.memberId,
    official_member_id: data.officialMemberId,
    member_name: data.memberName || 'Member',
    cmo_family: data.cmoFamily || 'Wisdom',
    event_category: data.eventCategory || 'Other',
    title: data.title || 'Emergency Welfare Intake',
    description: data.description || '',
    location_or_hospital: data.locationOrHospital || null,
    incident_date: data.incidentDate || new Date().toISOString().split('T')[0],
    status: 'Submitted',
    chairman_read: false,
    welfare_officer_read: false,
    family_head_read: false
  };

  const { data: inserted, error } = await supabase
    .from('welfare_notifications')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating welfare notification:', error);
    throw error;
  }

  return dbToWelfareNotification(inserted);
}

const isUuid = (val?: string | null): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));

/**
 * Fetches notifications submitted by a specific member.
 */
export async function getMemberNotifications(officialMemberId?: string, memberId?: string): Promise<WelfareNotification[]> {
  let query = supabase.from('welfare_notifications').select('*');

  const isMemberUuid = isUuid(memberId);

  if (officialMemberId && memberId) {
    if (isMemberUuid) {
      query = query.or(`official_member_id.eq.${officialMemberId},member_id.eq.${memberId}`);
    } else {
      query = query.or(`official_member_id.eq.${officialMemberId},official_member_id.eq.${memberId}`);
    }
  } else if (officialMemberId) {
    query = query.eq('official_member_id', officialMemberId);
  } else if (memberId) {
    if (isMemberUuid) {
      query = query.eq('member_id', memberId);
    } else {
      query = query.eq('official_member_id', memberId);
    }
  } else {
    return [];
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching member notifications:', error);
    return [];
  }

  return (data || []).map(dbToWelfareNotification);
}

/**
 * Fetches notifications matching a specific CMO Family unit.
 */
export async function getFamilyNotifications(family: Family | string): Promise<WelfareNotification[]> {
  // Normalize family string e.g. "Wisdom Family" -> "Wisdom"
  const cleanFamily = String(family || '').replace(/\s*Family\s*/gi, '').trim();

  const { data, error } = await supabase
    .from('welfare_notifications')
    .select('*')
    .ilike('cmo_family', `%${cleanFamily}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching family notifications:', error);
    return [];
  }

  return (data || []).map(dbToWelfareNotification);
}

/**
 * Fetches all welfare notifications (for Welfare Officer and Executive Chairman views).
 */
export async function getAllWelfareNotifications(): Promise<WelfareNotification[]> {
  const { data, error } = await supabase
    .from('welfare_notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching all welfare notifications:', error);
    return [];
  }

  return (data || []).map(dbToWelfareNotification);
}

/**
 * Action by Family Head to verify an incident and attach verification notes.
 */
export async function verifyByFamilyHead(id: string, notes: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('welfare_notifications')
    .update({
      status: 'Family_Verified',
      family_head_notes: notes.trim(),
      family_head_verified_at: nowIso,
      family_head_read: true,
      updated_at: nowIso
    })
    .eq('id', id);

  if (error) {
    console.error('Error verifying notification by Family Head:', error);
    throw error;
  }
}

/**
 * Action by Welfare Officer to elevate a notification into an official Welfare Ticket.
 */
export async function elevateToWelfareTicket(
  notificationId: string,
  ticketData: {
    requestedAmount: number;
    category: string;
    reasonDetails: string;
    memberName?: string;
    officialMemberId?: string;
    memberId?: string;
  }
): Promise<string> {
  if (ticketData.requestedAmount > 50000) {
    throw new Error('Constitutional Cap Violation: Welfare ticket requested amount cannot exceed ₦50,000.');
  }

  // 1. Fetch notification record to get full member/event context
  const { data: notification, error: fetchErr } = await supabase
    .from('welfare_notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (fetchErr || !notification) {
    throw new Error(`Welfare notification record not found: ${fetchErr?.message || notificationId}`);
  }

  // Check if Family Head verified
  if (notification.status !== 'Family_Verified' && !notification.family_head_verified_at && !notification.familyHeadVerifiedAt) {
    throw new Error('Verification Restriction: Welfare tickets can only be elevated after Family Head verification.');
  }

  const ticketId = `TK-${Date.now().toString().slice(-6)}`;

  const ticketPayload = {
    ticket_id: ticketId,
    member_id: notification.member_id || ticketData.memberId || null,
    official_member_id: notification.official_member_id || ticketData.officialMemberId || '',
    member_name: ticketData.memberName || notification.member_name || 'Member',
    category: ticketData.category || notification.event_category || 'Medical Assistance',
    requested_amount: Number(ticketData.requestedAmount),
    reason_details: ticketData.reasonDetails || notification.description || '',
    status: 'Pending', // Must be exact string 'Pending' for FinSec filter
    chairman_read: false,
    created_at: new Date().toISOString()
  };

  // 1. Insert into welfare_tickets
  const { error: ticketErr } = await supabase
    .from('welfare_tickets')
    .insert(ticketPayload);

  if (ticketErr) {
    console.error('Error inserting elevated welfare ticket:', ticketErr);
    throw new Error(`Failed to create elevated ticket: ${ticketErr.message}`);
  }

  // 2. Update welfare_notifications status
  const nowIso = new Date().toISOString();
  const { error: notifErr } = await supabase
    .from('welfare_notifications')
    .update({
      status: 'Elevated_To_Ticket',
      elevated_ticket_id: ticketId,
      welfare_officer_reviewed_at: nowIso,
      welfare_officer_read: true,
      updated_at: nowIso
    })
    .eq('id', notification.id);

  if (notifErr) {
    console.warn('Warning updating notification elevation status:', notifErr);
    throw notifErr;
  }

  return ticketId;
}

/**
 * Mark notification read status by role.
 */
export async function markNotificationRead(
  id: string,
  role: 'chairman' | 'welfare_officer' | 'family_head'
): Promise<void> {
  const updatePayload: any = {};
  if (role === 'chairman') updatePayload.chairman_read = true;
  if (role === 'welfare_officer') updatePayload.welfare_officer_read = true;
  if (role === 'family_head') updatePayload.family_head_read = true;

  const { error } = await supabase
    .from('welfare_notifications')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.warn('Error marking notification read:', error);
  }
}
