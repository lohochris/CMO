import { useState, useEffect } from 'react';
import type { WeddingStatus, Family, Transaction } from '../../types';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { CheckCircle, FileText, Settings, X, Users, BookOpen, Sparkles, UserCheck, Calendar, MapPin, ArrowRight, Bell, Clock, LayoutDashboard, Trophy, CreditCard, Church, Download, ExternalLink, ShieldCheck, Search, Scale, Radio, Mic, MicOff, MessageSquare } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import useLiveTranscriber from '../../hooks/useLiveTranscriber';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { MemberAttendanceAndNotificationWidget } from '../../app/components/attendance/MemberAttendanceAndNotificationWidget';
import { DigitalReceiptModal } from '../../app/components/ui/DigitalReceiptModal';
import { DigitalIdCardModal } from '../../app/components/ui/DigitalIdCardModal';
import { sendPaymentReceiptNotification } from '../../utils/messagingService';

const formatRefCode = (ref?: string, type?: string) => {
  if (!ref) return '';
  // If it's a long raw UUID (36 chars), format cleanly
  if (ref.length > 20 && ref.includes('-')) {
    const shortHash = ref.split('-').pop()?.substring(0, 4).toUpperCase() || '2026';
    return type === 'Welfare Payout' ? `Ref: WLF-${shortHash}` : `Ref: RCP-${shortHash}`;
  }
  return ref.startsWith('Ref:') ? ref : `Ref: ${ref}`;
};

const getPhotoUrl = (photoPath?: string | null) => {
  if (!photoPath) return null;
  if (photoPath.startsWith('http') || photoPath.startsWith('data:')) return photoPath;
  const { data } = supabase.storage.from('profile-pictures').getPublicUrl(photoPath);
  return data?.publicUrl || null;
};

export const MemberDashboard = () => {
  const { 
    currentUser, 
    members, 
    transactions, 
    setMembers, 
    setCurrentUser, 
    setSuccess, 
    setError, 
    setCurrentPage, 
    announcements,
    isFloorActive,
    activeSpeaker,
    speakQueue,
    requestFloor,
    leaveQueue,
    broadcastLiveTranscript
  } = useApp();

  const myId = currentUser?.official_member_id || currentUser?.id || '';
  const isMyTurn = Boolean(
    activeSpeaker && currentUser && 
    (activeSpeaker.id === currentUser.id || activeSpeaker.official_member_id === myId || activeSpeaker.id === myId)
  );
  const isMyInQueue = Boolean(currentUser && speakQueue.includes(myId));
  const myQueuePosition = isMyInQueue ? speakQueue.indexOf(myId) + 1 : 0;

  const { isListening: isFloorMicListening, startListening: startFloorMic, stopListening: stopFloorMic } = useLiveTranscriber((liveText) => {
    if (isMyTurn && liveText) {
      broadcastLiveTranscript(liveText);
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sports' | 'financials' | 'spiritual' | 'constitution'>('overview');
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [smsCooldownMap, setSmsCooldownMap] = useState<Record<string, number>>({});

  const getCooldownRemaining = (txId: string | number) => {
    const key = `cmo_sms_cooldown_${txId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return 0;
    const diff = Math.max(0, Math.ceil((Number(stored) - Date.now()) / 1000));
    return diff;
  };

  const handleMemberResendSms = async (txn: Transaction) => {
    if (!txn.id) return;
    const remainingSec = getCooldownRemaining(txn.id);
    if (remainingSec > 0) {
      const mins = Math.ceil(remainingSec / 60);
      toast.error(`Please wait ${mins} minute(s) before requesting another SMS alert for this receipt.`);
      return;
    }

    const phone = currentUser?.phone || currentUser?.phone_number;
    if (!phone) {
      toast.error('No mobile phone number registered on your profile. Please edit your profile settings.');
      return;
    }

    const firstName = ((currentUser?.full_name || currentUser?.name || 'Brother').split(' ')[0]) || 'Brother';
    const receiptNo = txn.receipt_number || `RCP-2026-${String(txn.id || '0000').slice(-4).padStart(4, '0')}`;

    toast.info('Dispatching payment receipt SMS alert...');
    const res = await sendPaymentReceiptNotification({
      phone_number: phone,
      first_name: firstName,
      amount: txn.amount,
      purpose: txn.purpose,
      receipt_number: receiptNo,
      member_id: currentUser?.official_member_id || currentUser?.id || 'MEMBER'
    });

    if (res.success) {
      const expireTime = Date.now() + 15 * 60 * 1000;
      localStorage.setItem(`cmo_sms_cooldown_${txn.id}`, String(expireTime));
      setSmsCooldownMap(prev => ({ ...prev, [String(txn.id)]: expireTime }));
      toast.success(`Receipt SMS alert sent to ${phone}!`);
    } else {
      toast.error(`SMS alert dispatch failed: ${res.error}`);
    }
  };
  const [constitutionSearchQuery, setConstitutionSearchQuery] = useState('');
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editHomeTownAddress, setEditHomeTownAddress] = useState(currentUser?.homeTownAddress || '');
  const [editResidentialAddress, setEditResidentialAddress] = useState(currentUser?.residentialAddress || '');
  const [editMaritalStatus, setEditMaritalStatus] = useState(currentUser?.maritalStatus || '');
  const [editWeddingStatus, setEditWeddingStatus] = useState<WeddingStatus | ''>(currentUser?.weddingStatus || '');
  const [editCommunicant, setEditCommunicant] = useState(currentUser?.communicant || false);
  const [editPostHeld, setEditPostHeld] = useState(currentUser?.postHeld || '');
  const [editNumberOfChildren, setEditNumberOfChildren] = useState(currentUser?.numberOfChildren || 0);
  const [editWifeName, setEditWifeName] = useState(currentUser?.wifeName || '');
  const [editWifePhone, setEditWifePhone] = useState(currentUser?.wifePhone || '');
  const [formCmoFamily, setFormCmoFamily] = useState<Family | ''>(currentUser?.family || '');
  const [editDateOfBirth, setEditDateOfBirth] = useState(currentUser?.date_of_birth || '');
  const [editOccupation, setEditOccupation] = useState(currentUser?.occupation || '');
  const [editNokName, setEditNokName] = useState(currentUser?.nok_name || '');
  const [editNokRelationship, setEditNokRelationship] = useState(currentUser?.nok_relationship || '');
  const [editNokPhone, setEditNokPhone] = useState(currentUser?.nok_phone || '');

  const handleProfilePictureSave = async (imageDataUrl: string, imageFile: Blob) => {
    if (!currentUser) return;

    const storageUrl = await uploadProfilePicture(currentUser.id, imageFile, imageDataUrl);
    const finalImageUrl = storageUrl || imageDataUrl;

    const updatedMembers = members.map(m =>
      m.id === currentUser.id ? { ...m, profilePic: finalImageUrl } : m
    );
    setMembers(updatedMembers);
    setCurrentUser({ ...currentUser, profilePic: finalImageUrl });
    setSuccess('✓ Profile picture updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSettingsOpen = () => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditPhone(currentUser.phone || '');
      setEditEmail(currentUser.email || '');
      setEditHomeTownAddress(currentUser.homeTownAddress || '');
      setEditResidentialAddress(currentUser.residentialAddress || '');
      setEditMaritalStatus(currentUser.maritalStatus || '');
      setEditWeddingStatus(currentUser.weddingStatus || '');
      setEditCommunicant(currentUser.communicant || false);
      setEditPostHeld(currentUser.postHeld || '');
      setEditNumberOfChildren(currentUser.numberOfChildren || 0);
      setEditWifeName(currentUser.wifeName || '');
      setEditWifePhone(currentUser.wifePhone || '');
      setFormCmoFamily(currentUser.family || '');
      setEditDateOfBirth(currentUser.date_of_birth || '');
      setEditOccupation(currentUser.occupation || '');
      setEditNokName(currentUser.nok_name || '');
      setEditNokRelationship(currentUser.nok_relationship || '');
      setEditNokPhone(currentUser.nok_phone || '');
      setIsSettingsOpen(true);
    }
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    setError('');
  };

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [liveTransactions, setLiveTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [pastoralMessages, setPastoralMessages] = useState<any[]>([]);
  const [pastoralLoading, setPastoralLoading] = useState(false);

  const fetchPastoralMessages = async () => {
    if (!currentUser) return;
    setPastoralLoading(true);
    try {
      const memberId = currentUser.official_member_id || currentUser.id;
      const { data, error } = await supabase
        .from('pastoral_messages')
        .select('*')
        .eq('official_member_id', memberId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPastoralMessages(data || []);
    } catch (err) {
      console.error('Error fetching pastoral messages:', err);
    } finally {
      setPastoralLoading(false);
    }
  };

  const handleAcknowledgeMessage = async (msgId: string) => {
    try {
      const { error } = await supabase
        .from('pastoral_messages')
        .update({ is_read: true, read: true })
        .eq('id', msgId);
      if (error) throw error;
      toast.success('Message acknowledged!');
      fetchPastoralMessages();
    } catch (err: any) {
      console.error('Failed to acknowledge message:', err);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchTransactions = async () => {
      setTxLoading(true);
      try {
        const currentMember = currentUser as any;
        const memberCode = currentMember?.member_code || currentMember?.official_member_id || currentMember?.id;
        if (!memberCode) return;

        // 1. Fetch direct member transactions in a try/catch block
        let userLogs: any[] = [];
        try {
          const { data: txs, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .or(`official_member_id.eq.${memberCode},member_id.eq.${memberCode},member_code.eq.${memberCode}`)
            .order('created_at', { ascending: false });

          if (txError) {
            console.warn('Warning fetching member transactions:', txError);
          } else if (txs) {
            userLogs = txs;
          }
        } catch (txCatch) {
          console.warn('Transactions query exception caught:', txCatch);
        }

        // 2. Fetch completed/settled/disbursed welfare tickets in a try/catch block
        let welfareLogs: any[] = [];
        try {
          const { data: tickets, error: wErr } = await supabase
            .from('welfare_tickets')
            .select('*')
            .or(`official_member_id.eq.${memberCode},member_id.eq.${memberCode},member_code.eq.${memberCode}`)
            .in('status', ['Completed', 'Settled & Cleared', 'Approved', 'Disbursed']);

          if (wErr) {
            console.warn('Warning fetching welfare tickets:', wErr);
          } else if (tickets) {
            welfareLogs = tickets;
          }
        } catch (wlfCatch) {
          console.warn('Welfare tickets query exception caught:', wlfCatch);
        }

        // Map transactions as type: 'Payment' (Outflow)
        const mappedTransactions = userLogs.map((tx: any) => {
          const isDisbursal =
            tx.transaction_type === 'Welfare Disbursal' ||
            tx.type === 'Welfare Payout' ||
            tx.category === 'Welfare';
          return {
            ...tx,
            type: isDisbursal ? 'Welfare Payout' : 'Payment',
            isWelfareBenefit: isDisbursal
          };
        });

        // Map disbursed welfare tickets as type: 'Welfare Payout' (Inflow/Benefit)
        const mappedWelfareTickets = welfareLogs.map((t: any) => ({
          id: `wlf_tx_${t.ticket_id || t.id}`,
          ticket_id: t.ticket_id || t.id,
          official_member_id: myId,
          member_id: myId,
          memberName: t.member_name || currentUser?.name,
          amount: Number(t.requested_amount !== undefined ? t.requested_amount : (t.amount || 0)),
          purpose: `Welfare Assistance: ${t.category || 'Disbursal'}`,
          notes: t.reason_details || t.notes,
          transaction_type: 'Welfare Disbursal',
          category: 'Welfare',
          type: 'Welfare Payout',
          isWelfareBenefit: true,
          created_at: t.settled_at || t.approved_at || t.created_at,
          status: 'Approved',
          receipt_number: t.ticket_id || `WLF-${t.id}`
        }));

        // Combine both into allActivityHistory deduplicating by ticket/receipt ID or ID
        const allActivityHistory = [...mappedTransactions];
        for (const wTx of mappedWelfareTickets) {
          const exists = allActivityHistory.some(
            tx =>
              (tx.receipt_number && tx.receipt_number === wTx.receipt_number) ||
              (tx.purpose && tx.purpose.includes(wTx.ticket_id)) ||
              (tx.id && String(tx.id) === String(wTx.id))
          );
          if (!exists) {
            allActivityHistory.push(wTx);
          }
        }

        allActivityHistory.sort((a, b) => {
          const dateA = new Date(a.created_at || a.timestamp || 0).getTime();
          const dateB = new Date(b.created_at || b.timestamp || 0).getTime();
          return dateB - dateA;
        });

        setLiveTransactions(allActivityHistory);
      } catch (err) {
        console.error('Error fetching activity history:', err);
      } finally {
        setTxLoading(false);
      }
    };

    fetchTransactions();

    const txChannel = supabase
      .channel(`member-tx-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          fetchTransactions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'welfare_tickets'
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchPastoralMessages();

    const pastoralChannel = supabase
      .channel(`member-pastoral-${currentUser.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'pastoral_messages',
          filter: `official_member_id=eq.${currentUser.official_member_id || currentUser.id}`
        },
        () => {
          fetchPastoralMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pastoralChannel);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    const fellowshipChannel = supabase
      .channel(`member-fellowship-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fellowship_meetings' },
        () => {
          fetchPastoralMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fellowship_attendance' },
        () => {
          fetchPastoralMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(fellowshipChannel);
    };
  }, [currentUser?.id]);

  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // ── Referee Duty State ──
  const [refereeDuties, setRefereeDuties] = useState<any[]>([]);

  const fetchRefereeDuties = async () => {
    if (!currentUser?.id) return;
    try {
      const memberId = currentUser.id || currentUser.official_member_id;

      const { data: fixtures, error: fixtureError } = await supabase
        .from('sports_fixtures')
        .select(`
          id,
          match_date,
          venue,
          status,
          home_team:home_team_id(team_name),
          away_team:away_team_id(team_name)
        `)
        .in('status', ['Scheduled', 'Live', 'Ongoing'])
        .eq('referee_id', memberId)
        .order('match_date', { ascending: true });

      if (fixtureError) {
        setRefereeDuties([]);
      } else {
        setRefereeDuties(fixtures || []);
      }
    } catch (err) {
      setRefereeDuties([]);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchRefereeDuties();
    const channel = supabase
      .channel(`member-referee-duties-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sports_fixtures' }, fetchRefereeDuties)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  // ── Active Squad Roster State ──
  const [squadData, setSquadData] = useState<any>(null);
  const [squadLoading, setSquadLoading] = useState(false);

  const fetchActiveSquad = async () => {
    if (!currentUser?.id) return;
    setSquadLoading(true);
    try {
      const memberId = currentUser.id || currentUser.official_member_id;

      const { data: roster, error: rosterError } = await supabase
        .from('sports_team_rosters')
        .select(`
          id,
          jersey_number,
          position,
          sports_teams (
            id,
            team_name,
            cmo_family,
            sports_tournaments ( title )
          )
        `)
        .eq('member_id', memberId)
        .maybeSingle();

      if (rosterError) {
        setSquadData(null);
      } else {
        setSquadData(roster || null);
      }
    } catch (err) {
      setSquadData(null);
    } finally {
      setSquadLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchActiveSquad();
  }, [currentUser?.id]);

  const fetchSpiritualAssignments = async () => {
    if (!currentUser) return;
    setAssignmentsLoading(true);
    try {
      const userFamily = (currentUser.cmo_family || currentUser.family || '').replace(/\s*Family\s*/gi, '').trim();
      const memberId = currentUser.official_member_id || currentUser.id;
      
      let query = supabase
        .from('liturgical_assignments')
        .select('*');
      
      if (userFamily) {
        query = query.or(`assigned_member_id.eq.${memberId},assigned_family.eq.${userFamily}`);
      } else {
        query = query.eq('assigned_member_id', memberId);
      }
      
      const { data, error } = await query.order('activity_date', { ascending: true });
      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchSpiritualAssignments();
    
    const spiritualChannel = supabase
      .channel(`member-spiritual-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'liturgical_assignments' },
        () => {
          fetchSpiritualAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(spiritualChannel);
    };
  }, [currentUser?.id]);

  const getStatusBadge = (status: string) => {
    const statusVal = status || 'Assigned';
    if (statusVal === 'Completed') {
      return (
        <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">
          Completed
        </span>
      );
    }
    if (statusVal === 'Pending') {
      return (
        <span className="bg-orange-950/60 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">
          Pending
        </span>
      );
    }
    return (
      <span className="bg-blue-950/60 text-[#ffd700] border border-blue-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">
        Assigned
      </span>
    );
  };

  const handleProfileUpdate = async () => {
    setError('');
    if (!editName.trim()) {
      setError('Name cannot be empty');
      return;
    }
    if (!editPhone.trim()) {
      setError('Phone number cannot be empty');
      return;
    }

    if (!editWeddingStatus) {
      setError('Please select whether you are Wedded or Not Wedded');
      return;
    }

    if (editWeddingStatus === 'Wedded' && !editMaritalStatus) {
      setError('Please select your marital status');
      return;
    }

    if (!currentUser) return;

    if (!formCmoFamily) {
      setError('Please select your CMO Family');
      return;
    }

    setSettingsLoading(true);
    try {
      const updatePayload = {
        full_name: editName,
        phone_number: editPhone,
        phone: editPhone,
        email: editEmail,
        address: editResidentialAddress,
        home_town_address: editHomeTownAddress,
        residential_address: editResidentialAddress,
        marriage_status: editWeddingStatus,
        marital_status: editMaritalStatus,
        number_of_children: Number(editNumberOfChildren) || 0,
        communicant: editCommunicant,
        wifes_name: editWifeName,
        wifes_phone: editWifePhone,
        church_position: editPostHeld,
        post_held: editPostHeld,
        cmo_family: formCmoFamily || null,
        date_of_birth: editDateOfBirth || null,
        occupation: editOccupation?.trim() || null,
        nok_name: editNokName?.trim() || null,
        nok_relationship: editNokRelationship?.trim() || null,
        nok_phone: editNokPhone?.trim() || null
      };

      const { error: membersErr } = await supabase
        .from('members')
        .update(updatePayload)
        .eq('official_member_id', currentUser.id);

      if (membersErr) {
        throw new Error(`Failed to update members table: ${membersErr.message}`);
      }

      const updatedMembers = members.map(m =>
        m.id === currentUser.id ? {
          ...m,
          name: editName,
          phone: editPhone,
          email: editEmail,
          homeTownAddress: editHomeTownAddress,
          residentialAddress: editResidentialAddress,
          maritalStatus: editWeddingStatus === 'Wedded' ? (editMaritalStatus as any) : undefined,
          weddingStatus: editWeddingStatus as any,
          communicant: editCommunicant,
          postHeld: editPostHeld,
          numberOfChildren: editNumberOfChildren,
          wifeName: editWifeName,
          wifePhone: editWifePhone,
          family: formCmoFamily || undefined,
          date_of_birth: editDateOfBirth || null,
          occupation: editOccupation?.trim() || null,
          nok_name: editNokName?.trim() || null,
          nok_relationship: editNokRelationship?.trim() || null,
          nok_phone: editNokPhone?.trim() || null
        } : m
      );

      setMembers(updatedMembers);

      setCurrentUser({
        ...currentUser,
        name: editName,
        phone: editPhone,
        email: editEmail,
        homeTownAddress: editHomeTownAddress,
        residentialAddress: editResidentialAddress,
        maritalStatus: editWeddingStatus === 'Wedded' ? (editMaritalStatus as any) : undefined,
        weddingStatus: editWeddingStatus as any,
        communicant: editCommunicant,
        postHeld: editPostHeld,
        numberOfChildren: editNumberOfChildren,
        wifeName: editWifeName,
        wifePhone: editWifePhone,
        family: formCmoFamily || undefined,
        date_of_birth: editDateOfBirth || null,
        occupation: editOccupation?.trim() || null,
        nok_name: editNokName?.trim() || null,
        nok_relationship: editNokRelationship?.trim() || null,
        nok_phone: editNokPhone?.trim() || null
      });

      setSuccess('✓ Profile updated successfully across active profile and master roster!');
      setIsSettingsOpen(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Profile update failed:', err);
      setError(err.message || 'An error occurred while updating profile.');
    } finally {
      setSettingsLoading(false);
    }
  };

  if (!currentUser) return null;

  const profileNeedsUpdate = !currentUser.full_name?.trim() || !currentUser.phone_number?.trim() || !currentUser.family;

  const duesPaidTotal = liveTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const duesCount = liveTransactions.filter(t => t.purpose?.toLowerCase().includes('due')).length;
  const leviesCount = liveTransactions.filter(t => t.purpose?.toLowerCase().includes('levy') || t.purpose?.toLowerCase().includes('fine')).length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. ALWAYS VISIBLE TOP SECTION: Profile Card & Tab Navigation  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 shadow-xl rounded-2xl">
        <div className="flex flex-col gap-4 justify-between items-start md:flex-row md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#ffd700]">Member Dashboard</h2>
            {profileNeedsUpdate && (
              <p className="mt-2 text-sm text-gray-300 max-w-xl">
                Please update your profile in Settings with all required information. Once complete, this message will disappear.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCardModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-[#001a16] px-4 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              🪪 Download Digital ID
            </button>
            <button
              onClick={handleSettingsOpen}
              title="Edit profile settings"
              aria-label="Edit profile settings"
              className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] p-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2"
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Edit Profile</span>
            </button>
          </div>
        </div>

        {/* User Profile Card (NAME, MEMBER ID, STATUS, PHONE) */}
        <div className="bg-[#001a16] border border-[#ffd700]/20 p-4 rounded-xl shadow-inner mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <ProfilePictureUploader
                currentImage={currentUser.profilePic}
                onSave={handleProfilePictureSave}
                memberName={currentUser.full_name || currentUser.name || ''}
                size="sm"
              />
            </div>
            <div className="flex-grow w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
                <div className="bg-[#002520] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">NAME</p>
                  <p className="text-white font-bold text-sm truncate">{currentUser.name}</p>
                </div>
                <div className="bg-[#002520] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">MEMBER ID</p>
                  <p className="text-white font-bold text-sm truncate">{currentUser.id}</p>
                </div>
                <div className="bg-[#002520] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">STATUS</p>
                  <p className="text-green-400 font-bold text-sm flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    {currentUser.status}
                  </p>
                </div>
                <div className="bg-[#002520] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">PHONE</p>
                  <p className="text-white font-bold text-sm truncate">{currentUser.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar (Overview, Sports & Duties, Financials, Spiritual & Welfare) */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-[#ffd700]/20">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'overview'
                ? 'bg-[#ffd700] text-[#001a16] shadow-lg font-bold'
                : 'bg-[#001a16] text-[#ffd700] hover:bg-[#ffd700]/10 border border-[#ffd700]/20'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('sports')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'sports'
                ? 'bg-[#ffd700] text-[#001a16] shadow-lg font-bold'
                : 'bg-[#001a16] text-[#ffd700] hover:bg-[#ffd700]/10 border border-[#ffd700]/20'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Sports & Duties
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'financials'
                ? 'bg-[#ffd700] text-[#001a16] shadow-lg font-bold'
                : 'bg-[#001a16] text-[#ffd700] hover:bg-[#ffd700]/10 border border-[#ffd700]/20'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Financials
          </button>
          <button
            onClick={() => setActiveTab('spiritual')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'spiritual'
                ? 'bg-[#ffd700] text-[#001a16] shadow-lg font-bold'
                : 'bg-[#001a16] text-[#ffd700] hover:bg-[#ffd700]/10 border border-[#ffd700]/20'
            }`}
          >
            <Church className="w-4 h-4" /> Spiritual & Welfare
          </button>
          <button
            onClick={() => setActiveTab('constitution')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'constitution'
                ? 'bg-[#ffd700] text-[#001a16] shadow-lg font-bold'
                : 'bg-[#001a16] text-[#ffd700] hover:bg-[#ffd700]/10 border border-[#ffd700]/20'
            }`}
          >
            <BookOpen className="w-4 h-4" /> 2023 Bye-Laws
          </button>
        </div>
      </Card>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. activeTab === 'overview' Panel                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 space-y-6 rounded-2xl">
          {/* Live Floor Microphone Push-To-Talk Widget */}
          <Card className="bg-[#001a16] border-2 border-emerald-500/40 p-4 sm:p-5 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${isFloorActive ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-gray-800 text-gray-400'}`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#ffd700] text-sm sm:text-base flex items-center gap-2">
                    Meeting Floor Microphone
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isFloorActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-gray-800 text-gray-400'}`}>
                      {isFloorActive ? 'Floor Open' : 'Floor Closed'}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-300">Speak live to the general assembly during meetings</p>
                </div>
              </div>
            </div>

            {!isFloorActive ? (
              <div className="p-3.5 bg-[#002520] border border-gray-800 rounded-xl flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <MicOff className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>Floor mic is currently locked by the General Secretary.</span>
                </div>
                <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">Locked</span>
              </div>
            ) : isMyTurn ? (
              <div className="p-4 bg-red-950/40 border-2 border-red-500/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    <span className="font-bold text-red-400 text-sm">YOU ARE LIVE ON THE FLOOR</span>
                  </div>
                  <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/40 font-bold uppercase">Broadcasting</span>
                </div>
                <p className="text-xs text-gray-200">
                  Your device microphone is streaming live audio transcription into the Secretary's minutes editor.
                </p>
                <div className="flex gap-2">
                  {!isFloorMicListening ? (
                    <Button
                      onClick={startFloorMic}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer py-2.5 flex items-center justify-center gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Unmute & Start Speaking Live</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={stopFloorMic}
                      className="flex-1 bg-red-500/30 text-red-200 border border-red-500/60 hover:bg-red-500/40 font-bold text-xs cursor-pointer py-2.5 flex items-center justify-center gap-2"
                    >
                      <MicOff className="w-4 h-4 text-red-400 animate-pulse" />
                      <span>Finish & Mute Speaker</span>
                    </Button>
                  )}
                </div>
              </div>
            ) : activeSpeaker ? (
              <div className="p-3.5 bg-[#002520] border border-amber-500/40 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {activeSpeaker.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-amber-300 truncate">Speaker: {activeSpeaker.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">Currently holding the floor</p>
                  </div>
                </div>
                {isMyInQueue ? (
                  <Button
                    onClick={leaveQueue}
                    variant="outline"
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10 text-xs py-1 px-2.5 h-auto font-semibold shrink-0 cursor-pointer"
                  >
                    Leave Queue (#{myQueuePosition})
                  </Button>
                ) : (
                  <Button
                    onClick={requestFloor}
                    className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs py-1 px-2.5 h-auto font-bold shrink-0 cursor-pointer"
                  >
                    Join Speak Queue
                  </Button>
                )}
              </div>
            ) : isMyInQueue ? (
              <div className="p-3.5 bg-[#002520] border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-300">You are in Queue (Position #{myQueuePosition})</p>
                    <p className="text-[10px] text-gray-400">Waiting for Secretary to grant floor mic</p>
                  </div>
                </div>
                <Button
                  onClick={leaveQueue}
                  variant="outline"
                  className="border-red-500/40 text-red-300 hover:bg-red-500/10 text-xs py-1 px-2.5 h-auto font-semibold shrink-0 cursor-pointer"
                >
                  Cancel Request
                </Button>
              </div>
            ) : (
              <div className="p-3.5 bg-[#002520] border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-gray-200">Floor is open. Push to request speaking permission.</span>
                </div>
                <Button
                  onClick={requestFloor}
                  className="bg-emerald-500 text-[#001a16] hover:bg-emerald-400 font-bold text-xs py-1.5 px-3 h-auto shrink-0 cursor-pointer shadow-md"
                >
                  Push to Speak
                </Button>
              </div>
            )}
          </Card>
          {/* Pastoral Office Messages Alert */}
          {pastoralMessages.length > 0 && (
            <Card className="bg-[#001a16] border-2 border-[#ffd700] p-5 rounded-xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#ffd700]" />
              <div className="flex items-start gap-4 pl-2">
                <div className="p-2.5 bg-[#ffd700]/10 rounded-lg text-[#ffd700] border border-[#ffd700]/25">
                  <Sparkles className="w-5 h-5 text-[#ffd700]" />
                </div>
                <div className="flex-grow">
                  <h4 className="text-sm font-extrabold text-[#ffd700] uppercase tracking-wider mb-2">Pastoral Office Message</h4>
                  <div className="space-y-4">
                    {pastoralMessages.map((msg) => (
                      <div key={msg.id} className="border-b border-[#ffd700]/10 pb-3 last:border-0 last:pb-0">
                        <p className="text-white text-xs leading-relaxed italic">
                          "{msg.message || msg.content}"
                        </p>
                        <div className="flex justify-between items-center mt-2.5">
                          <span className="text-[10px] text-gray-400 font-mono">
                            Received: {new Date(msg.created_at || msg.timestamp || new Date()).toLocaleDateString()}
                          </span>
                          <Button
                            onClick={() => handleAcknowledgeMessage(msg.id)}
                            className="bg-[#ffd700]/15 hover:bg-[#ffd700] hover:text-[#001a16] text-[#ffd700] text-[10px] font-bold px-3 py-1 h-auto"
                          >
                            Mark as Read
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Absence Excuse Request Form & Attendance Ledger */}
          <div>
            <MemberAttendanceAndNotificationWidget currentUser={currentUser} />
          </div>

          {/* Family Portal Banner */}
          <div className="pt-2">
            {currentUser.family ? (
              <Button
                onClick={() => setCurrentPage(`family/${currentUser.family?.toLowerCase()}` as any)}
                className="w-full bg-gradient-to-r from-[#ffd700] to-[#ffd700]/80 text-[#001a16] font-bold py-3.5 px-6 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Users className="w-5 h-5" />
                Enter My {currentUser.family?.replace(/\s*Family\s*/gi, '').trim()} Portal
              </Button>
            ) : (
              <div className="bg-[#001a16] border border-yellow-500/30 p-4 rounded-xl text-center text-sm text-gray-300">
                You do not have an assigned family yet. Please edit your Profile Settings above to join a family.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. activeTab === 'sports' Panel                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'sports' && (
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 space-y-6 rounded-2xl">
          <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
            <UserCheck className="w-5 h-5" /> Sports & Match Duties
          </h3>

          {/* "Match Official Duty Assigned" Banner Cards */}
          {refereeDuties.length > 0 ? (
            <div className="space-y-4">
              {refereeDuties.map(fixture => {
                const homeTeam = (fixture.home_team as any)?.team_name ?? 'Home Team';
                const awayTeam = (fixture.away_team as any)?.team_name ?? 'Away Team';
                const matchDate = fixture.match_date ? new Date(fixture.match_date) : null;
                const isLive = fixture.status === 'Live' || fixture.status === 'Ongoing';
                return (
                  <div
                    key={fixture.id}
                    className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-slate-900 border border-yellow-500/40 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-xl shrink-0 border border-yellow-500/20">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400 bg-yellow-500/20 px-2.5 py-0.5 rounded-full border border-yellow-500/30">
                            Match Official Duty Assigned
                          </span>
                          {isLive && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                              LIVE NOW
                            </span>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white">
                          {homeTeam} <span className="text-yellow-400/60 font-normal text-sm">vs</span> {awayTeam}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                          {matchDate && (
                            <>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                                {matchDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                                {matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                          {fixture.venue && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                                {fixture.venue}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('referee_center' as any)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition-all duration-150 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      Open Referee Match Center
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#001a16] border border-[#ffd700]/20 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs">No active match official referee duties assigned currently.</p>
            </div>
          )}

          {/* Active Squad Card */}
          <div className="bg-[#001a16] border border-[#ffd700]/30 rounded-xl p-5 space-y-4 shadow-lg">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#ffd700]" /> Active Squad
              </h4>
              <Button
                onClick={() => setCurrentPage('dashboard/sports' as any)}
                className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] text-xs font-bold px-4 py-2 h-auto rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                View Team Roster &rarr;
              </Button>
            </div>

            {squadLoading ? (
              <p className="text-gray-400 text-xs text-center py-4">Loading active squad roster...</p>
            ) : squadData ? (
              <div className="bg-[#002520] border border-[#ffd700]/20 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h5 className="text-white font-bold text-lg">
                        {squadData.sports_teams?.team_name || 'Assigned Squad'}
                      </h5>
                      {squadData.jersey_number && (
                        <span className="bg-[#ffd700] text-[#001a16] font-black text-xs px-2.5 py-0.5 rounded-full shadow">
                          #{squadData.jersey_number}
                        </span>
                      )}
                    </div>
                    {squadData.sports_teams?.sports_tournaments?.title && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        Tournament: <span className="text-gray-200">{squadData.sports_teams.sports_tournaments.title}</span>
                      </p>
                    )}
                  </div>
                  {squadData.position && (
                    <span className="bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/30 font-bold text-xs px-3 py-1 rounded-lg">
                      {squadData.position}
                    </span>
                  )}
                </div>

                {squadData.sports_teams?.cmo_family && (
                  <div className="pt-2 border-t border-[#ffd700]/15 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Family Unit:</span>
                    <span className="text-[#ffd700] font-semibold">
                      {squadData.sports_teams.cmo_family} Family
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-[#ffd700]/20 rounded-lg p-4">
                <p className="text-gray-400 text-xs">You are currently not enrolled in an active tournament squad roster.</p>
                <Button
                  onClick={() => setCurrentPage('dashboard/sports' as any)}
                  className="mt-3 bg-[#ffd700]/15 hover:bg-[#ffd700] hover:text-[#001a16] text-[#ffd700] text-xs font-bold px-3.5 py-1.5 h-auto rounded-lg cursor-pointer"
                >
                  Explore Sports Hub & Register
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. activeTab === 'financials' Panel                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'financials' && (
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 space-y-6 rounded-2xl">
          <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Financials & Payment Ledgers
          </h3>

          {/* Dues & Payment Ledgers Summary Card */}
          <div className="bg-[#001a16] border border-[#ffd700]/30 rounded-xl p-5">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-3">Dues & Ledger Summary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#002520] border border-[#ffd700]/10 p-3 rounded-lg">
                <p className="text-gray-400 text-xs uppercase font-semibold">Total Paid</p>
                <p className="text-green-400 font-bold text-lg">{formatCurrency(duesPaidTotal)}</p>
              </div>
              <div className="bg-[#002520] border border-[#ffd700]/10 p-3 rounded-lg">
                <p className="text-gray-400 text-xs uppercase font-semibold">Dues Payments</p>
                <p className="text-[#ffd700] font-bold text-lg">{duesCount} Transactions</p>
              </div>
              <div className="bg-[#002520] border border-[#ffd700]/10 p-3 rounded-lg">
                <p className="text-gray-400 text-xs uppercase font-semibold">Levies & Fines</p>
                <p className="text-blue-400 font-bold text-lg">{leviesCount} Recorded</p>
              </div>
            </div>
          </div>

          {/* Transaction History list */}
          <div>
            <h4 className="text-lg text-[#ffd700] mb-3 flex items-center gap-2 font-bold">
              <FileText className="w-5 h-5" /> Your Transaction History
            </h4>
            <div className="bg-[#001a16] border border-[#ffd700]/30 rounded-xl p-4">
              {txLoading ? (
                <p className="text-gray-400 text-center py-4 text-xs">Loading transactions...</p>
              ) : liveTransactions.length === 0 ? (
                <p className="text-gray-400 text-center py-4 text-xs">No transactions recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {liveTransactions.map((txn, idx) => {
                    const paymentDate = new Date(txn.created_at || txn.timestamp || new Date());
                    const formattedTimestamp =
                      paymentDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }) +
                      ' at ' +
                      paymentDate.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                    const isWelfare =
                      txn.type === 'Welfare Payout' ||
                      txn.isWelfareBenefit ||
                      String(txn.transaction_type || txn.transactionType || '').toLowerCase().includes('welfare') ||
                      String(txn.category || '').toLowerCase() === 'welfare' ||
                      String(txn.purpose || '').toLowerCase().includes('welfare');

                    let displayPurpose =
                      txn.purpose === 'Other Levy' && txn.notes
                        ? `Other Levy (${txn.notes})`
                        : txn.purpose;

                    if (isWelfare) {
                      if (!displayPurpose || !displayPurpose.toLowerCase().includes('welfare')) {
                        displayPurpose = `Welfare Assistance (${displayPurpose || 'Benefit'})`;
                      }
                    }

                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-[#ffd700]/15 last:border-0">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-white font-semibold text-sm">{displayPurpose}</p>
                            {isWelfare ? (
                              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full inline-block">
                                + {formatCurrency(txn.amount)} (Welfare Benefit)
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full inline-block">
                                Approved Payment
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-xs font-mono mt-0.5">{formattedTimestamp}</p>
                          {(txn.receipt_number || txn.id) && (
                            <span className="text-[10px] text-amber-400 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30 inline-block mt-1 mr-2">
                              {formatRefCode(String(txn.receipt_number || txn.id), txn.type || (isWelfare ? 'Welfare Payout' : 'Payment'))}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {isWelfare ? (
                            <p className="text-emerald-400 font-extrabold text-base tracking-tight">
                              +{formatCurrency(txn.amount)}
                            </p>
                          ) : (
                            <p className="text-green-400 font-bold text-sm">{formatCurrency(txn.amount)}</p>
                          )}
                          {(!txn.status || txn.status.toUpperCase() === 'APPROVED') && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedReceiptTx(txn);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="flex items-center gap-1 text-[11px] font-bold bg-[#ffd700]/15 hover:bg-[#ffd700] hover:text-[#001a16] text-[#ffd700] px-2.5 py-1 rounded border border-[#ffd700]/40 transition-colors cursor-pointer"
                                title="View / Download Official Digital Receipt"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </button>
                              {txn.id && getCooldownRemaining(txn.id) > 0 ? (
                                <span className="text-[10px] font-semibold text-amber-400/80 bg-amber-950/40 px-2 py-1 rounded border border-amber-500/20">
                                  Wait {Math.ceil(getCooldownRemaining(txn.id) / 60)}m
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleMemberResendSms(txn)}
                                  className="flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded border border-amber-500/40 transition-colors cursor-pointer"
                                  title="Send SMS Payment Receipt Alert to My Phone"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Resend SMS</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DigitalReceiptModal
            isOpen={isReceiptModalOpen}
            onClose={() => {
              setIsReceiptModalOpen(false);
              setSelectedReceiptTx(null);
            }}
            transaction={selectedReceiptTx}
            member={currentUser}
          />
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. activeTab === 'spiritual' Panel                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'spiritual' && (
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 space-y-6 rounded-2xl">
          <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
            <Church className="w-5 h-5" /> Spiritual & Welfare Center
          </h3>

          {/* Upcoming Spiritual Assignments Card */}
          <div className="bg-[#001a16] border border-[#ffd700]/30 rounded-xl p-5 space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#ffd700]" /> Upcoming Liturgical Assignments
            </h4>
            {assignmentsLoading ? (
              <p className="text-gray-400 text-center py-4 text-xs">Loading assignments...</p>
            ) : assignments.length === 0 ? (
              <p className="text-gray-400 text-center py-4 text-xs">No upcoming spiritual assignments scheduled.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-3 bg-[#002520]/80 rounded-lg border border-[#ffd700]/25 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-white font-bold text-sm uppercase">{assignment.activity_name}</h4>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Role: <span className="text-[#ffd700] font-semibold">{assignment.duty_role}</span>
                      </p>
                      {assignment.notes && <p className="text-gray-400 text-xs italic mt-1 font-mono">Instruction: {assignment.notes}</p>}
                    </div>
                    <div className="text-right flex flex-col md:items-end gap-1.5">
                      <span className="bg-[#ffd700]/15 text-[#ffd700] px-2.5 py-0.5 rounded text-xs font-mono font-bold">
                        {new Date(assignment.activity_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {getStatusBadge(assignment.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Welfare Announcements */}
          <div className="bg-[#001a16] border border-[#ffd700]/30 rounded-xl p-5 space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#ffd700]" /> Welfare & Community Announcements
            </h4>
            {announcements && announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-3 bg-[#002520]/80 rounded-lg border border-[#ffd700]/20">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="text-white font-bold text-xs sm:text-sm">{ann.title}</h5>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date((ann as any).date || (ann as any).created_at || ann.timestamp || new Date()).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed">{ann.content}</p>
                    {(ann as any).category && (
                      <span className="inline-block mt-2 text-[10px] uppercase font-bold text-[#ffd700] bg-[#ffd700]/10 px-2 py-0.5 rounded border border-[#ffd700]/20">
                        {(ann as any).category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4 text-xs">No welfare announcements at this time.</p>
            )}
          </div>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. activeTab === 'constitution' Panel                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'constitution' && (
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 space-y-6 rounded-2xl shadow-xl">
          {/* Header Card */}
          <div className="bg-[#001a16] border border-[#ffd700]/30 rounded-xl p-6 shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#ffd700]" />
                <span className="text-xs uppercase tracking-wider text-[#ffd700] font-bold">Official Document</span>
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold text-white">
                Holy Cross Catholic Men Organization 2023 Bye-Laws & Constitution
              </h3>
              <p className="text-xs text-gray-300">
                Official governing rules, welfare guidelines, disciplinary penalties, and executive policies.
              </p>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              <a
                href="/docs/CMO_CONSTITUTION_2023.pdf"
                download="CMO_CONSTITUTION_2023.pdf"
                className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all duration-150 flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download PDF
              </a>
              <a
                href="/docs/CMO_CONSTITUTION_2023.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#002520] hover:bg-[#003830] text-[#ffd700] border border-[#ffd700]/40 text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all duration-150 flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" /> Open Fullscreen
              </a>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search Bye-Laws (e.g. Penalties, Lateness, Welfare, Bereavement, Signatories)..."
              value={constitutionSearchQuery}
              onChange={(e) => setConstitutionSearchQuery(e.target.value)}
              className="bg-[#001a16] border-[#ffd700]/40 text-white pl-10 text-xs sm:text-sm placeholder:text-gray-500 rounded-xl"
            />
          </div>

          {/* Quick Reference Cards */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-[#ffd700]" />
              <h4 className="text-white font-bold text-sm uppercase tracking-wider">Quick Reference Sections</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Section L: Penalties */}
              {('Section L (Penalties) ₦50 Lateness ₦200 Member Absence ₦300 Exec Absence fine penalty').toLowerCase().includes(constitutionSearchQuery.toLowerCase()) && (
                <div className="bg-[#001a16] border border-red-500/30 rounded-xl p-4 space-y-3 shadow-inner hover:border-red-500/60 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-red-400" />
                      <h5 className="text-red-400 font-bold text-sm">Section L (Penalties)</h5>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">Penalties</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-[#002520] p-2 rounded border border-[#ffd700]/10">
                      <span className="text-gray-300">Lateness</span>
                      <span className="text-white font-extrabold font-mono">₦50</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#002520] p-2 rounded border border-[#ffd700]/10">
                      <span className="text-gray-300">Member Absence</span>
                      <span className="text-white font-extrabold font-mono">₦200</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#002520] p-2 rounded border border-[#ffd700]/10">
                      <span className="text-gray-300">Exec Absence</span>
                      <span className="text-white font-extrabold font-mono">₦300</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section K: Welfare Caps */}
              {('Section K (Welfare Caps) ₦50k Bereavement ₦20k Surgery/Wedding ₦10k Naming welfare cap').toLowerCase().includes(constitutionSearchQuery.toLowerCase()) && (
                <div className="bg-[#001a16] border border-emerald-500/30 rounded-xl p-4 space-y-3 shadow-inner hover:border-emerald-500/60 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <h5 className="text-emerald-400 font-bold text-sm">Section K (Welfare Caps)</h5>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">Welfare Caps</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-[#002520] p-2 rounded border border-[#ffd700]/10">
                      <span className="text-gray-300">Bereavement</span>
                      <span className="text-white font-extrabold font-mono">₦50k</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#002520] p-2 rounded border border-[#ffd700]/10">
                      <span className="text-gray-300">Surgery / Wedding</span>
                      <span className="text-white font-extrabold font-mono">₦20k</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#002520] p-2 rounded border border-[#ffd700]/10">
                      <span className="text-gray-300">Naming Ceremony</span>
                      <span className="text-white font-extrabold font-mono">₦10k</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section I: Signatories */}
              {('Section I (Signatories) 2-of-3 Executive Approval Rule approval signatories executive').toLowerCase().includes(constitutionSearchQuery.toLowerCase()) && (
                <div className="bg-[#001a16] border border-amber-500/30 rounded-xl p-4 space-y-3 shadow-inner hover:border-amber-500/60 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#ffd700]" />
                      <h5 className="text-[#ffd700] font-bold text-sm">Section I (Signatories)</h5>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#ffd700] bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">Signatories</span>
                  </div>
                  <div className="bg-[#002520] p-3 rounded border border-[#ffd700]/10 space-y-1.5">
                    <p className="text-xs font-semibold text-white">2-of-3 Executive Approval Rule</p>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      All official disbursements and administrative mandates require explicit authorization from at least two (2) designated Executive Officers.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Embedded PDF Viewer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ffd700]" /> Official Document Viewer
              </h4>
              <span className="text-[11px] text-gray-400 font-mono">2023 Edition</span>
            </div>
            <div className="relative w-full rounded-xl overflow-hidden border border-[#ffd700]/30 bg-[#001a16] shadow-2xl">
              <iframe
                src="/docs/CMO_CONSTITUTION_2023.pdf"
                title="Holy Cross Catholic Men Organization 2023 Bye-Laws & Constitution"
                className="w-full h-[700px] rounded-lg border border-slate-700"
              />
              <div className="p-4 bg-[#001a16] border-t border-[#ffd700]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-300">
                <p className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#ffd700] shrink-0" />
                  PDF preview restricted or not rendering on your mobile browser?
                </p>
                <a
                  href="/docs/CMO_CONSTITUTION_2023.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffd700]/15 hover:bg-[#ffd700] text-[#ffd700] hover:text-[#001a16] font-bold transition-all border border-[#ffd700]/30 shrink-0 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Interactive Fallback Link
                </a>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PROFILE SETTINGS MODAL DIALOG                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#002520]">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-[#ffd700]">Edit Profile</h3>
                <p className="mt-2 text-sm text-gray-300 max-w-xl">
                  Fill in your personal and contact details here. When all required fields are provided, this reminder will disappear from the dashboard.
                </p>
              </div>
              <button
                onClick={handleSettingsClose}
                title="Close"
                aria-label="Close dialog"
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Personal Information */}
              <div className="border-t border-[#ffd700]/30 pt-4">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-4">Personal Information</h4>
                
                <div>
                  <label htmlFor="edit-name" className="text-gray-300 text-sm block mb-2">
                    Full Name *
                  </label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter full name"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="edit-phone" className="text-gray-300 text-sm block mb-2">
                      Phone Number *
                    </label>
                    <Input
                      id="edit-phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="08012345678"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-email" className="text-gray-300 text-sm block mb-2">
                      Email Address (Optional)
                    </label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="edit-dob" className="text-gray-300 text-sm block mb-2">
                      Date of Birth
                    </label>
                    <Input
                      id="edit-dob"
                      type="date"
                      value={editDateOfBirth}
                      onChange={(e) => setEditDateOfBirth(e.target.value)}
                      className="bg-[#001a16] border-[#ffd700] text-white w-full"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-occupation" className="text-gray-300 text-sm block mb-2">
                      Occupation
                    </label>
                    <Input
                      id="edit-occupation"
                      value={editOccupation}
                      onChange={(e) => setEditOccupation(e.target.value)}
                      placeholder="e.g. Engineer, Teacher, Doctor"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>
                </div>

                <div className="mt-4 font-sans">
                  <label htmlFor="edit-family" className="text-gray-300 text-sm block mb-2">
                    CMO Family *
                  </label>
                  <select
                    id="edit-family"
                    title="Select Family"
                    value={formCmoFamily}
                    onChange={(e) => setFormCmoFamily(e.target.value as Family)}
                    className="w-full bg-[#001a16] border border-[#ffd700] text-white p-2 rounded disabled:opacity-60 cursor-pointer"
                    disabled={settingsLoading || Boolean(currentUser?.family)}
                  >
                    {!currentUser?.family && <option value="">Select a family</option>}
                    <option value="Wisdom">Wisdom Family</option>
                    <option value="Honour">Honour Family</option>
                    <option value="Integrity">Integrity Family</option>
                    <option value="Talent">Talent Family</option>
                  </select>
                  {Boolean(currentUser?.family) && (
                    <p className="text-gray-400 text-xs mt-1">
                      Family assigned. To change your group, please contact the Financial Secretary or Chairman.
                    </p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="border-t border-[#ffd700]/30 pt-4">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-4">Address</h4>
                
                <div>
                  <label htmlFor="edit-hometown" className="text-gray-300 text-sm block mb-2">
                    Home Town Address
                  </label>
                  <Input
                    id="edit-hometown"
                    value={editHomeTownAddress}
                    onChange={(e) => setEditHomeTownAddress(e.target.value)}
                    placeholder="Enter home town address"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="edit-residential" className="text-gray-300 text-sm block mb-2">
                    Residential Address
                  </label>
                  <Input
                    id="edit-residential"
                    value={editResidentialAddress}
                    onChange={(e) => setEditResidentialAddress(e.target.value)}
                    placeholder="Enter residential address"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
              </div>

              {/* Marital & Family Status */}
              <div className="border-t border-[#ffd700]/30 pt-4">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-4">Marital & Family Status</h4>
                
                <div>
                  <label htmlFor="edit-wedding" className="text-gray-300 text-sm block mb-2">
                    Marriage Status
                  </label>
                  <select
                    id="edit-wedding"
                    value={editWeddingStatus}
                    onChange={(e) => {
                      const value = e.target.value as WeddingStatus | '';
                      setEditWeddingStatus(value);
                      if (value !== 'Wedded') {
                        setEditMaritalStatus('');
                      }
                    }}
                    className="bg-[#001a16] border-2 border-[#ffd700] text-white rounded px-3 py-2 w-full focus:outline-none focus:border-[#ffc700]"
                  >
                    <option value="">Select marriage status</option>
                    <option value="Wedded">Wedded</option>
                    <option value="Not Wedded">Not Wedded</option>
                  </select>
                </div>

                {editWeddingStatus === 'Wedded' && (
                  <div className="mt-4">
                    <label htmlFor="edit-marital" className="text-gray-300 text-sm block mb-2">
                      Marital Status
                    </label>
                    <select
                      id="edit-marital"
                      value={editMaritalStatus}
                      onChange={(e) => setEditMaritalStatus(e.target.value)}
                      className="bg-[#001a16] border-2 border-[#ffd700] text-white rounded px-3 py-2 w-full focus:outline-none focus:border-[#ffc700]"
                    >
                      <option value="">Select marital status</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="edit-children" className="text-gray-300 text-sm block mb-2">
                      Number of Children
                    </label>
                    <Input
                      id="edit-children"
                      type="number"
                      min="0"
                      value={editNumberOfChildren}
                      onChange={(e) => setEditNumberOfChildren(parseInt(e.target.value) || 0)}
                      placeholder="0 (Nil if no child)"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-gray-300 text-sm">
                      <input
                        type="checkbox"
                        checked={editCommunicant}
                        onChange={(e) => setEditCommunicant(e.target.checked)}
                        className="w-4 h-4 bg-[#001a16] border-[#ffd700] rounded"
                      />
                      Communicant
                    </label>
                  </div>
                </div>

                {(editMaritalStatus === 'Married' || editMaritalStatus === 'Widowed') && (
                  <>
                    <div className="mt-4">
                      <label htmlFor="edit-wife-name" className="text-gray-300 text-sm block mb-2">
                        Wife's Name
                      </label>
                      <Input
                        id="edit-wife-name"
                        value={editWifeName}
                        onChange={(e) => setEditWifeName(e.target.value)}
                        placeholder="Enter wife's name"
                        className="bg-[#001a16] border-[#ffd700] text-white"
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="edit-wife-phone" className="text-gray-300 text-sm block mb-2">
                        Wife's Phone Number
                      </label>
                      <Input
                        id="edit-wife-phone"
                        value={editWifePhone}
                        onChange={(e) => setEditWifePhone(e.target.value)}
                        placeholder="08012345678"
                        className="bg-[#001a16] border-[#ffd700] text-white"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="border-t border-[#ffd700]/30 pt-4">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-4">Emergency Contact</h4>
                
                <div>
                  <label htmlFor="edit-nok-name" className="text-gray-300 text-sm block mb-2">
                    Next of Kin Name
                  </label>
                  <Input
                    id="edit-nok-name"
                    value={editNokName}
                    onChange={(e) => setEditNokName(e.target.value)}
                    placeholder="Enter next of kin name"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="edit-nok-relationship" className="text-gray-300 text-sm block mb-2">
                      Next of Kin Relationship
                    </label>
                    <Input
                      id="edit-nok-relationship"
                      value={editNokRelationship}
                      onChange={(e) => setEditNokRelationship(e.target.value)}
                      placeholder="e.g. Wife, Son, Brother"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-nok-phone" className="text-gray-300 text-sm block mb-2">
                      Next of Kin Phone Number
                    </label>
                    <Input
                      id="edit-nok-phone"
                      value={editNokPhone}
                      onChange={(e) => setEditNokPhone(e.target.value)}
                      placeholder="08012345678"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Church & Position */}
              <div className="border-t border-[#ffd700]/30 pt-4">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-4">Church Position</h4>
                
                <div>
                  <label htmlFor="edit-post" className="text-gray-300 text-sm block mb-2">
                    Post Held
                  </label>
                  <Input
                    id="edit-post"
                    value={editPostHeld}
                    onChange={(e) => setEditPostHeld(e.target.value)}
                    placeholder="e.g., Treasurer, Secretary, etc."
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#ffd700]/30">
                <Button
                  onClick={handleProfileUpdate}
                  className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
                  disabled={settingsLoading}
                >
                  {settingsLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={handleSettingsClose}
                  variant="outline"
                  className="flex-1 border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16]"
                  disabled={settingsLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {(() => {
        const activePhotoUrl = 
          getPhotoUrl((currentUser as any)?.photo_url || (currentUser as any)?.avatar_url || currentUser?.profilePic) ||
          (currentUser as any)?.photo_url || 
          (currentUser as any)?.avatar_url || 
          currentUser?.profilePic || 
          '';

        return (
          <DigitalIdCardModal
            member={{
              full_name: currentUser?.full_name || currentUser?.name || 'LOHO CHRISTOPHER DONDO',
              official_member_id: currentUser?.official_member_id || currentUser?.id || 'HCC-CMO-26-003',
              phone_number: currentUser?.phone_number || currentUser?.phone || '+2348126000659',
              family_unit: currentUser?.familyUnit || currentUser?.cmo_family || currentUser?.family || 'Wisdom',
              role: currentUser?.role || 'Member',
              photo_url: activePhotoUrl,
            }}
            isOpen={isCardModalOpen}
            onClose={() => setIsCardModalOpen(false)}
          />
        );
      })()}
    </div>
  );
};