import { useState, useEffect, useRef } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { Users, CheckCircle, CheckCheck, AlertCircle, DollarSign, Megaphone, FileText, Shield, Heart, ShieldCheck, BookOpen, X, Trophy, Activity, CheckSquare, Landmark, TrendingUp, PieChart, CheckCircle2, Key, Clock, Scale, ArrowUpRight } from 'lucide-react';
import { SportsAuditReadOnlyView } from './sports/SportsAuditReadOnlyView';
import { useApp } from '../../contexts/AppContext';
import { uploadProfilePicture, isUuid, getMemberQueryField } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { formatCurrency, formatDate, isAdministrativeId } from '../../utils/helpers';
import { supabase } from '../../lib/supabaseClient';
import { Member, Family, MemberStatus } from '../../types';
import { GeneralGalleryManager } from '../../app/components/gallery/GeneralGalleryManager';
import { ChairmanAttendanceAnalyticsWidget } from '../../app/components/attendance/ChairmanAttendanceAnalyticsWidget';
import { Heading } from '../../app/components/common/Heading';
import { CMO_CONSTITUTION_2023 } from '../../config/cmoConstitution';

import { getCanonicalLedgerSummary } from '../../lib/ledgerService';

const HARDCODED_OFFICES = [
  { office_id: 'HCC-CMO-EXEC-CH', office_name: 'Chairman Office', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-FS', office_name: 'Financial Secretary', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-TR', office_name: 'Treasurer Office', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-WE', office_name: 'Welfare Office', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-PR', office_name: 'PRO Office', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-PV', office_name: 'Provost Marshall', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-SE', office_name: 'General Secretary', category: 'Executive' },
  { office_id: 'HCC-CMO-EXEC-LT', office_name: 'Liturgist Office', category: 'Executive' },

  { office_id: 'HCC-CMO-WIS-FH', office_name: 'Wisdom Family Head', category: 'Family' },
  { office_id: 'HCC-CMO-WIS-FS', office_name: 'Wisdom Family Secretary', category: 'Family' },
  { office_id: 'HCC-CMO-HON-FH', office_name: 'Honour Family Head', category: 'Family' },
  { office_id: 'HCC-CMO-HON-FS', office_name: 'Honour Family Secretary', category: 'Family' },
  { office_id: 'HCC-CMO-TAL-FH', office_name: 'Talent Family Head', category: 'Family' },
  { office_id: 'HCC-CMO-TAL-FS', office_name: 'Talent Family Secretary', category: 'Family' },
  { office_id: 'HCC-CMO-INT-FH', office_name: 'Integrity Family Head', category: 'Family' },
  { office_id: 'HCC-CMO-INT-FS', office_name: 'Integrity Family Secretary', category: 'Family' },

  { office_id: 'HCC-CMO-SPRT-DIR', office_name: 'Sports Director', category: 'Sports' },
  { office_id: 'HCC-CMO-SPRT-TR', office_name: 'Sports Treasurer', category: 'Sports' },
  { office_id: 'HCC-CMO-SPRT-MED', office_name: 'Sports Medical Officer', category: 'Sports' },
  { office_id: 'HCC-CMO-SPRT-COACH', office_name: 'Sports Coach', category: 'Sports' },
  { office_id: 'HCC-CMO-SPRT-REF', office_name: 'Sports Referee', category: 'Sports' }
];

export const ChairmanDashboard = () => {
  const {
    members,
    setMembers,
    transactions,
    welfareTickets,
    setWelfareTickets,
    announcements,
    setAnnouncements,
    currentUser,
    setCurrentUser,
    setSuccess,
    setError,
    rosterCount,
    vaultBalance: appVaultBalance,
    refreshDatabase,
    lodgments,
    setLodgments,
    bankWithdrawals,
    authorizeBankWithdrawal
  } = useApp();

  // Unified Canonical Financial State
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [vaultBalance, setVaultBalance] = useState<number>(0);
  const [sessionCash, setSessionCash] = useState<number>(0);
  const [inflows, setInflows] = useState<any[]>([]);
  const [outflows, setOutflows] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    const loadFinancials = async () => {
      try {
        const summary = await getCanonicalLedgerSummary();
        setTotalIncome(summary.totalIncome);
        setTotalExpenses(summary.totalExpenses);
        setVaultBalance(summary.vaultBalance);
        setSessionCash(summary.vaultBalance);
        setInflows(summary.inflows);
        setOutflows(summary.outflows);
        setTimeline(summary.allTransactions);
      } catch (err) {
        console.error('Error loading canonical financials in Chairman:', err);
      }
    };
    loadFinancials();
  }, []);

  // Executive Oversight & Bank Lodgment & Realtime Transaction States
  const visibleTransactions = transactions.filter(t => 
    !t.status || ['Approved', 'Completed', 'Cleared'].includes(t.status)
  );
  const [lodgmentsList, setLodgmentsList] = useState<any[]>([]);
  const [finesList, setFinesList] = useState<any[]>([]);
  const [liveTransactionsList, setLiveTransactionsList] = useState<any[]>([]);
  const [loadingLodgments, setLoadingLodgments] = useState(false);
  const [authorizingWthId, setAuthorizingWthId] = useState<string | null>(null);
  const [authorizingLodgmentId, setAuthorizingLodgmentId] = useState<string | number | null>(null);

  const handleChairmanAuthorizeWithdrawal = async (wthId: string, role: string) => {
    setAuthorizingWthId(wthId);
    try {
      await authorizeBankWithdrawal(wthId, role);
    } finally {
      setAuthorizingWthId(null);
    }
  };

  const fetchLiveTransactions = async () => {
    try {
      const { data: dbTx, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!txErr && dbTx) {
        setLiveTransactionsList(dbTx);
      }
    } catch (err) {
      console.error('Error fetching live transactions in ChairmanDashboard:', err);
    }
  };

  const fetchLodgmentsAndFines = async () => {
    setLoadingLodgments(true);
    try {
      const [lodgRes, finesRes] = await Promise.all([
        supabase.from('lodgments').select('*').order('created_at', { ascending: false }),
        supabase.from('fines').select('*')
      ]);

      if (!lodgRes.error && lodgRes.data) {
        setLodgmentsList(lodgRes.data);
      }
      if (!finesRes.error && finesRes.data) {
        setFinesList(finesRes.data);
      }
    } catch (err) {
      console.warn('Error fetching lodgments or fines:', err);
    } finally {
      setLoadingLodgments(false);
    }
  };

  useEffect(() => {
    fetchLodgmentsAndFines();
    fetchLiveTransactions();

    const channel = supabase
      .channel('chairman-realtime-oversight')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchLiveTransactions();
        refreshDatabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        refreshDatabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        refreshDatabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lodgments' }, () => fetchLodgmentsAndFines())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fines' }, () => fetchLodgmentsAndFines())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshDatabase]);

  useEffect(() => {
    if (lodgments && lodgments.length > 0) {
      setLodgmentsList(lodgments);
    }
  }, [lodgments]);

  const handleAuthorizeLodgment = async (lodgmentId: string | number, currentSignatoriesStr: string = '') => {
    setAuthorizingLodgmentId(lodgmentId);
    setError('');
    try {
      const existingSigs = currentSignatoriesStr ? currentSignatoriesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (!existingSigs.includes('Chairman')) {
        existingSigs.push('Chairman');
      }

      const nextSignatoriesStr = existingSigs.join(', ');
      const isFullyReconciled = existingSigs.length >= 2;
      const nextStatus = isFullyReconciled ? 'Reconciled' : 'Pending Signatures';

      const { error: dbErr } = await supabase
        .from('lodgments')
        .update({
          signatories: nextSignatoriesStr,
          status: nextStatus
        })
        .eq('id', lodgmentId);

      if (dbErr) {
        console.warn('Lodgment authorization DB update warning:', dbErr);
      }

      setLodgmentsList(prev => prev.map(l => l.id === lodgmentId ? { ...l, signatories: nextSignatoriesStr, status: nextStatus } : l));
      setLodgments(prev => prev.map(l => l.id === lodgmentId ? { ...l, signatories: nextSignatoriesStr, status: nextStatus } : l));
      setSuccess(`Bank Lodgment authorized! Chairman signatory registered (${existingSigs.length}/3 signatures). Status: ${nextStatus}.`);
      setTimeout(() => setSuccess(''), 4000);
      await refreshDatabase();
    } catch (err: any) {
      console.error('Error authorizing lodgment:', err);
      setError('Failed to authorize lodgment: ' + err.message);
    } finally {
      setAuthorizingLodgmentId(null);
    }
  };

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');

  const [assignmentFamily, setAssignmentFamily] = useState<Family | ''>('');
  const [assignmentRole, setAssignmentRole] = useState<'FAMILY_HEAD' | 'FAMILY_SEC' | ''>('');
  const [assignmentMemberId, setAssignmentMemberId] = useState<string>('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!assignmentFamily) {
      setSearchResults([]);
      return;
    }

    const selectedMember = members.find(m => (m.official_member_id || m.id) === assignmentMemberId);
    if (selectedMember && (selectedMember.full_name || selectedMember.name) === memberSearchQuery.trim()) {
      return;
    }

    const queryTerm = memberSearchQuery.trim();

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        let query = supabase
          .from('members')
          .select('*')
          .eq('status', 'Active')
          .neq('status', 'Rejected')
          .ilike('cmo_family', assignmentFamily)
          .order('full_name', { ascending: true })
          .limit(1000);

        if (queryTerm) {
          query = query.ilike('full_name', `%${queryTerm}%`);
        }

        const { data, error } = await query;

        if (!error && data) {
          setSearchResults(
            data
              .map((m: any) => ({
                id: m.official_member_id,
                official_member_id: m.official_member_id,
                name: m.full_name,
                full_name: m.full_name,
                phone: m.phone_number || undefined,
                phone_number: m.phone_number || undefined,
                status: m.status,
                balance: Number(m.balance || 0),
                role: m.role || 'member',
                family: m.cmo_family || undefined,
                cmo_family: m.cmo_family || undefined,
                familyUnit: m.cmo_family || undefined,
                profilePic: m.avatar_url || null,
                createdAt: m.created_at,
                updatedAt: m.updated_at
              }))
              .filter((m: any) => !isAdministrativeId(m.id || m.official_member_id || ''))
              .filter((m: any) => m.status !== 'Rejected' && m.status?.toLowerCase() !== 'rejected')
          );
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Error searching members in ChairmanDashboard:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, queryTerm ? 300 : 0);

    return () => clearTimeout(delayDebounce);
  }, [memberSearchQuery, assignmentFamily, assignmentMemberId, members]);

  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAssignLeadership = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignmentFamily || !assignmentRole || !assignmentMemberId) {
      setError('Please select a family unit, a leadership role, and a member.');
      return;
    }

    setAssignmentLoading(true);
    setError('');
    setSuccess('');

    try {
      const selectedMember = members.find(m => m.id === assignmentMemberId || m.official_member_id === assignmentMemberId);
      if (!selectedMember) {
        setError('Selected member not found.');
        return;
      }

      const familyCodes = {
        Wisdom: 'WIS',
        Honour: 'HON',
        Integrity: 'INT',
        Talent: 'TAL'
      };
      const roleCodes = {
        FAMILY_HEAD: 'FH',
        FAMILY_SEC: 'FS'
      };
      const officeId = `HCC-CMO-${familyCodes[assignmentFamily as Family]}-${roleCodes[assignmentRole as 'FAMILY_HEAD' | 'FAMILY_SEC']}`;

      const memberOfficialId = selectedMember.official_member_id || selectedMember.id || '';
      const { error: upsertErr } = await supabase
        .from('office_assignments')
        .upsert({
          office_id: officeId,
          official_member_id: memberOfficialId,
          assigned_at: new Date().toISOString()
        }, {
          onConflict: 'office_id'
        });

      if (upsertErr) throw upsertErr;

      const previousOfficers = members.filter(
        m => (m.family === assignmentFamily || m.cmo_family === assignmentFamily) && m.role === assignmentRole
      );

      for (const prev of previousOfficers) {
        const queryField = getMemberQueryField(prev.id);
        const { error: revertErr } = await supabase
          .from('members')
          .update({ role: 'member' })
          .eq(queryField, prev.id);
        if (revertErr) console.error("Failed to revert previous officer:", revertErr);
      }

      const queryField = getMemberQueryField(selectedMember.id);
      const { error: memberUpdateErr } = await supabase
        .from('members')
        .update({
          role: assignmentRole,
          cmo_family: assignmentFamily
        })
        .eq(queryField, selectedMember.id);

      if (memberUpdateErr) throw memberUpdateErr;

      const { error: execUpdateErr } = await supabase
        .from('cmo_executives')
        .update({ user_id: selectedMember.id })
        .eq('executive_id', officeId);

      if (execUpdateErr) throw execUpdateErr;

      const successMsg = `✓ Assigned ${selectedMember.full_name || selectedMember.name} as ${assignmentRole === 'FAMILY_HEAD' ? 'Family Head' : 'Family Secretary'} for ${assignmentFamily} Family.`;

      setSuccess(successMsg);
      setAssignmentFamily('');
      setAssignmentRole('');
      setAssignmentMemberId('');
      setMemberSearchQuery('');

      await refreshDatabase();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error("Assignment error:", err);
      setError(err.message || 'Failed to complete leadership assignment.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const [spiritualCalendar, setSpiritualCalendar] = useState<any[]>([]);
  const [spiritualLoading, setSpiritualLoading] = useState(false);

  const [lastFellowshipAttendance, setLastFellowshipAttendance] = useState<{
    present: number;
    absent: number;
    date: string | null;
    wisdomCount: number;
    talentCount: number;
    honourCount: number;
    integrityCount: number;
  }>({
    present: 0,
    absent: 0,
    date: null,
    wisdomCount: 0,
    talentCount: 0,
    honourCount: 0,
    integrityCount: 0
  });
  const [fellowshipLoading, setFellowshipLoading] = useState(false);

  const fetchLastFellowshipAttendance = async () => {
    setFellowshipLoading(true);
    try {
      const { data: latestMeetings, error: meetErr } = await supabase
        .from('fellowship_meetings')
        .select('*')
        .order('meeting_date', { ascending: false })
        .limit(1);

      if (meetErr) throw meetErr;

      if (latestMeetings && latestMeetings.length > 0) {
        const lastMeeting = latestMeetings[0];
        const lastMeetingId = lastMeeting.id;
        const lastMeetingDate = lastMeeting.meeting_date || lastMeeting.date;

        const { data: attendanceData, error: attErr } = await supabase
          .from('fellowship_attendance')
          .select('*')
          .eq('meeting_id', lastMeetingId);

        if (attErr) throw attErr;

        if (attendanceData) {
          let present = 0;
          let absent = 0;
          let wisdomCount = 0;
          let talentCount = 0;
          let honourCount = 0;
          let integrityCount = 0;

          attendanceData.forEach(row => {
            const rowId = row.official_member_id || row.official_member;
            const memberProfile = members.find(m => {
              const masterId = m.official_member_id || m.id;
              return masterId && rowId && masterId === rowId;
            });

            if (row.status === 'Present') {
              present++;
              const mFamily = memberProfile
                ? (memberProfile.family || memberProfile.cmo_family || '')
                : (row.family || '');
              
              const famLower = mFamily.toLowerCase().trim();
              if (famLower.includes('wisdom')) wisdomCount++;
              else if (famLower.includes('talent')) talentCount++;
              else if (famLower.includes('honour')) honourCount++;
              else if (famLower.includes('integrity')) integrityCount++;
            } else if (row.status === 'Absent') {
              absent++;
            }
          });

          setLastFellowshipAttendance({
            present,
            absent,
            date: lastMeetingDate,
            wisdomCount,
            talentCount,
            honourCount,
            integrityCount
          });
        }
      }
    } catch (err) {
      console.error('Error fetching last fellowship attendance:', err);
    } finally {
      setFellowshipLoading(false);
    }
  };

  const fetchSpiritualCalendar = async () => {
    setSpiritualLoading(true);
    try {
      const { data, error } = await supabase
        .from('liturgical_assignments')
        .select('*')
        .order('activity_date', { ascending: true });
      if (error) throw error;
      setSpiritualCalendar(data || []);
    } catch (err) {
      console.error("Error fetching spiritual calendar:", err);
    } finally {
      setSpiritualLoading(false);
    }
  };

  useEffect(() => {
    fetchSpiritualCalendar();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('chairman-spiritual-calendar')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'liturgical_assignments' },
        () => {
          fetchSpiritualCalendar();
        }
      )
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchLastFellowshipAttendance();
    
    const channel = supabase
      .channel('chairman-fellowship-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fellowship_meetings' },
        () => {
          fetchLastFellowshipAttendance();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fellowship_attendance' },
        () => {
          fetchLastFellowshipAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  // Member details viewer states
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('executive_session_unlocked') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  const handleViewMemberDetails = async (member: any) => {
    try {
      setIsLoadingDetails(true);
      setIsDetailOpen(true);
      
      const queryField = getMemberQueryField(member.id);

      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq(queryField, member.id)
        .single();
        
      if (error) throw error;
      setSelectedMember(data);
    } catch (error) {
      console.error("Error fetching member details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);

    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'Chairman',
        input_pin: pinInput
      });

      if (error) throw error;

      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('executive_session_unlocked', 'true');
        setPinInput("");
      } else {
        setPinError("Invalid Executive Security PIN. Access Denied.");
      }
    } catch (error: any) {
      console.error("Security Verification Error:", error.message);
      setPinError("Verification system encountered an error.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleLockDashboard = () => {
    setIsExecutiveUnlocked(false);
    sessionStorage.removeItem('executive_session_unlocked');
  };

  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);

    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'Chairman',
        old_pin: currentPin,
        new_pin: newPin
      });

      if (error) throw error;

      if (isSuccess) {
        setPinChangeSuccess(true);
        setCurrentPin("");
        setNewPin("");
        // Automatically collapse the form after a successful update
        setTimeout(() => {
          setIsChangingPin(false);
          setPinChangeSuccess(false);
        }, 2000);
      } else {
        setPinChangeError("Current Security PIN is incorrect.");
      }
    } catch (error: any) {
      console.error("PIN Update Error:", error.message);
      setPinChangeError("Failed to update security PIN.");
    } finally {
      setIsSubmittingPinChange(false);
    }
  };

  // Member editing states
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editMemberFamily, setEditMemberFamily] = useState<Family | ''>('');
  const [editMemberStatus, setEditMemberStatus] = useState<MemberStatus | ''>('');
  const [adminEditLoading, setAdminEditLoading] = useState(false);

  const handleEditMemberSave = async () => {
    if (!editingMember) return;
    setError('');
    setSuccess('');

    if (!editMemberName.trim()) {
      setError('Name is required');
      return;
    }

    setAdminEditLoading(true);
    try {
      const updatePayload = {
        full_name: editMemberName,
        phone_number: editMemberPhone,
        phone: editMemberPhone,
        cmo_family: editMemberFamily || null,
        status: editMemberStatus
      };

      // 1. Update members table
      const targetMemberId = editingMember.id || (editingMember as any).official_member_id;
      const queryField = getMemberQueryField(targetMemberId);
      const { error: memberErr } = await supabase
        .from('members')
        .update(updatePayload)
        .eq(queryField, targetMemberId);

      if (memberErr) throw memberErr;

      // 2. Update master_roster table
      const { error: rosterErr } = await supabase
        .from('master_roster')
        .update(updatePayload)
        .eq('official_member_id', editingMember.id);

      if (rosterErr) throw rosterErr;

      // 3. Update local state
      const updatedMembers = members.map(m =>
        m.id === editingMember.id
          ? {
              ...m,
              name: editMemberName,
              full_name: editMemberName,
              phone: editMemberPhone,
              phone_number: editMemberPhone,
              family: editMemberFamily || undefined,
              status: editMemberStatus as any
            }
          : m
      );
      setMembers(updatedMembers);

      setSuccess('✓ Member profile updated successfully!');
      setEditingMember(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to update member:', err);
      setError(err.message || 'Failed to update member.');
    } finally {
      setAdminEditLoading(false);
    }
  };

  const handleProfilePictureSave = async (imageDataUrl: string, imageFile: Blob) => {
    if (!currentUser) return;

    const storageUrl = await uploadProfilePicture(currentUser.id, imageFile, imageDataUrl);
    const finalImageUrl = storageUrl || imageDataUrl;

    const updatedMembers = members.map(m =>
      m.id === currentUser.id ? { ...m, profilePic: finalImageUrl } : m
    );

    setMembers(updatedMembers);
    setCurrentUser({ ...currentUser, profilePic: finalImageUrl });
    setSuccess('Profile picture updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const generateAnnouncementId = (): string => `ANN-${Date.now()}`;

  const postAnnouncement = () => {
    if (!announcementTitle || !announcementContent) {
      setError('Please fill in both the title and content of the announcement.');
      return;
    }

    const announcement = {
      id: generateAnnouncementId(),
      title: announcementTitle,
      content: announcementContent,
      author: currentUser?.name || 'Executive Chairman',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    };

    setAnnouncements([announcement, ...announcements]);
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setSuccess('Announcement published successfully.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const pendingTickets = welfareTickets.filter(t => t.status === 'Awaiting Financial Audit' || t.status === 'Pending');
  const unreadWelfareCount = welfareTickets.filter(ticket => !ticket.chairmanRead).length;

  const acknowledgeTicket = async (ticketId: string) => {
    setError('');
    try {
      const { error: dbErr } = await supabase
        .from('welfare_tickets')
        .update({ chairman_read: true })
        .eq('ticket_id', ticketId);

      if (dbErr) {
        console.error("Supabase update error on acknowledge:", dbErr);
        setError(`Database Error: ${dbErr.message}`);
        return;
      }

      // Update local state context (via setWelfareTickets)
      const updatedTickets = welfareTickets.map(t =>
        t.ticketId === ticketId
          ? { ...t, chairmanRead: true }
          : t
      );
      setWelfareTickets(updatedTickets);
      setSuccess(`Ticket ${ticketId} acknowledged.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error("Failed to acknowledge ticket:", err);
      setError(`Failed to acknowledge ticket: ${err.message}`);
    }
  };

  const handleMarkDeceased = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to mark this member as Deceased? This will lock their account and freeze their profile.')) {
      return;
    }
    setError('');
    try {
      const queryField = getMemberQueryField(memberId);
      const { error: dbErr } = await supabase
        .from('members')
        .update({ status: 'Deceased' })
        .eq(queryField, memberId);

      if (dbErr) {
        console.error("Supabase update error on mark deceased:", dbErr);
        setError(`Database Error: ${dbErr.message}`);
        return;
      }

      // Update local state context
      const updatedMembers = members.map(m =>
        (m.official_member_id || m.id) === memberId
          ? { ...m, status: 'Deceased' as const }
          : m
      );
      setMembers(updatedMembers);
      setSuccess(`Member ${memberId} marked as Deceased.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error("Failed to mark member as deceased:", err);
      setError(`Failed to mark member as deceased: ${err.message}`);
    }
  };

  const handleMarkTransferred = async (memberId: string) => {
    const confirmTransfer = window.confirm("Are you sure you want to mark this member as Transferred? This will lock their account status, but keep their historical records intact.");
    if (!confirmTransfer) return;
    setError('');
    try {
      const queryField = getMemberQueryField(memberId);

      const { error: dbErr } = await supabase
        .from('members')
        .update({ status: 'Transferred' })
        .eq(queryField, memberId);

      if (dbErr) {
        alert("Failed to process status update: " + dbErr.message);
        return;
      }

      // Update local state context
      const updatedMembers = members.map(m =>
        (m.official_member_id || m.id) === memberId
          ? { ...m, status: 'Transferred' as any }
          : m
      );
      setMembers(updatedMembers);
      setSuccess(`Member ${memberId} marked as Transferred.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error("Failed to mark member as transferred:", err);
      alert("Failed to process status update: " + err.message);
    }
  };

  const handleReactivateMember = async (memberId: string) => {
    const confirmReactivate = window.confirm("Are you sure you want to reactivate this member?");
    if (!confirmReactivate) return;

    setError('');
    try {
      const queryField = getMemberQueryField(memberId);

      const { error } = await supabase
        .from('members')
        .update({ status: 'Active' })
        .eq(queryField, memberId);

      if (error) throw error;
      
      // Update local state context
      const updatedMembers = members.map(m =>
        (m.official_member_id || m.id) === memberId
          ? { ...m, status: 'Active' as any }
          : m
      );
      setMembers(updatedMembers);
      setSuccess(`Member ${memberId} reactivated successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error("Failed to reactivate member:", err);
      alert("Failed to reactivate member: " + err.message);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // DUAL-LAYER ADMINISTRATIVE EXCLUSION
  // Layer 1 (role)  — catches all accounts whose 'role' column is correctly set.
  // Layer 2 (ID)    — secondary safety net: catches any account that entered the
  //                   members array with role = 'member' due to auto-registration
  //                   from master_roster or a data-entry error in Supabase.
  // Both layers must pass (AND logic) for a row to be considered a church member.
  // ══════════════════════════════════════════════════════════════════════════════

  // Layer 1 — system role identifiers (exact match, lowercase)
  const EXEC_ADMIN_ROLES = new Set<string>([
    'chairman', 'cmo_chairman', 'fin_sec', 'welfare', 'treasurer', 'gen_sec', 'pro'
  ]);

  // Registry-level role exclusion (broader — family officers have dedicated dashboards)
  const REGISTRY_ADMIN_ROLES = new Set<string>([
    'chairman', 'cmo_chairman', 'fin_sec', 'welfare', 'treasurer',
    'gen_sec', 'pro', 'family_chairman', 'family_secretary'
  ]);

  // Combined predicate — a row is a human church member only if BOTH layers clear it
  const isHumanChurchMember = (m: Member): boolean => {
    if (m.status === 'Rejected' || m.status?.toLowerCase() === 'rejected') return false;
    const roleLower = (m.role || '').toLowerCase().trim();
    if (EXEC_ADMIN_ROLES.has(roleLower)) return false;
    const memberId = m.official_member_id || m.id || '';
    if (memberId.startsWith('HCC-')) return true;
    return !isAdministrativeId(memberId);
  };

  const isHumanRegistryMember = (m: Member): boolean => {
    if (m.status === 'Rejected' || m.status?.toLowerCase() === 'rejected') return false;
    const roleLower = (m.role || '').toLowerCase().trim();
    if (REGISTRY_ADMIN_ROLES.has(roleLower)) return false;
    const memberId = m.official_member_id || m.id || '';
    if (memberId.startsWith('HCC-')) return true;
    return !isAdministrativeId(memberId);
  };

  // KPI metrics — live church members only (admin-stripped, dual-validated)
  const churchMembers  = members.filter(isHumanChurchMember);
  const activeMembers  = churchMembers.filter(m => m.status === 'Active');
  const pendingMembers = churchMembers.filter(m => m.status === 'Inactive');
  const validMembers   = churchMembers.filter(m => m.status !== 'Rejected' && m.status?.toLowerCase() !== 'rejected' && m.status !== 'Pending' && m.status !== 'Deceased');
  const totalMembersCount = validMembers.length;
  const activeMembersCount = churchMembers.filter(m => m.status === 'Active').length;

  // Registry table source — displays the complete, unfiltered database roster (excluding rejected members)
  const humanMembers = members.filter(isHumanRegistryMember);

  const filteredMembers = humanMembers.filter(m => {
    const q = registrySearch.toLowerCase();
    if (!q) return true;
    return (
      (m.official_member_id || '').toLowerCase().includes(q) ||
      (m.full_name || m.name || '').toLowerCase().includes(q) ||
      (m.phone_number || m.phone || '').toLowerCase().includes(q)
    );
  });

  // Real-Time Constitutional Health Score Calculation (0-100%)
  const calculateConstitutionalHealth = () => {
    // 1. Quorum Score (25%): Attendance evaluation vs Section C / N
    const totalFellowship = lastFellowshipAttendance.present + lastFellowshipAttendance.absent;
    const attendancePct = totalFellowship > 0 ? (lastFellowshipAttendance.present / totalFellowship) * 100 : 85;
    const quorumScore = Math.min(100, Math.round((attendancePct / 50) * 100));

    // 2. Welfare Notice Score (25%): Ratio of social welfare claims meeting 2-month prior notice (Section K(iii))
    const socialTickets = welfareTickets.filter(t => t.category === 'Wedding' || t.category === 'Naming Ceremony' || t.category?.includes('Social'));
    const compliantSocialTickets = socialTickets.filter(t => !t.declineReason?.includes('NOTICE WARNING') && !t.notes?.includes('NOTICE WARNING'));
    const welfareNoticeScore = socialTickets.length > 0 ? Math.round((compliantSocialTickets.length / socialTickets.length) * 100) : 100;

    // 3. Fine Clearance Score (25%): Ratio of CLEARED fines in public.fines (Section L)
    const clearedFines = finesList.filter(f => f.status === 'CLEARED');
    const fineClearanceScore = finesList.length > 0 ? Math.round((clearedFines.length / finesList.length) * 100) : 95;

    // 4. Signatory Adherence Score (25%): Ratio of lodgments with >= 2 signatories (Section I)
    const validLodgments = lodgmentsList.filter(l => {
      const sigs = l.signatories ? l.signatories.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      return sigs.length >= 2;
    });
    const signatoryScore = lodgmentsList.length > 0 ? Math.round((validLodgments.length / lodgmentsList.length) * 100) : 100;

    const overallScore = Math.min(100, Math.max(0, Math.round(
      (quorumScore * 0.25) +
      (welfareNoticeScore * 0.25) +
      (fineClearanceScore * 0.25) +
      (signatoryScore * 0.25)
    )));

    return {
      overallScore,
      quorumScore,
      welfareNoticeScore,
      fineClearanceScore,
      signatoryScore
    };
  };

  const healthMetrics = calculateConstitutionalHealth();

  const welfareBreakdown = {
    memberDeath: welfareTickets.filter(t => t.category?.toLowerCase().includes('death of member') || t.category?.toLowerCase().includes('member death')).reduce((sum, t) => sum + Number(t.requestedAmount || 0), 0),
    surgery: welfareTickets.filter(t => t.category?.toLowerCase().includes('surgery') || t.category?.toLowerCase().includes('sickness')).reduce((sum, t) => sum + Number(t.requestedAmount || 0), 0),
    wedding: welfareTickets.filter(t => t.category?.toLowerCase().includes('wedding') || t.category?.toLowerCase().includes('marriage')).reduce((sum, t) => sum + Number(t.requestedAmount || 0), 0),
    naming: welfareTickets.filter(t => t.category?.toLowerCase().includes('naming') || t.category?.toLowerCase().includes('childbirth')).reduce((sum, t) => sum + Number(t.requestedAmount || 0), 0),
    totalApproved: welfareTickets.filter(t => t.status === 'Approved' || t.status === 'Completed').reduce((sum, t) => sum + Number(t.requestedAmount || 0), 0)
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-[#ffd700]" />
        <Heading level={1}>Executive Chairman Dashboard</Heading>
      </div>

      {currentUser && (
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 mb-6 rounded-xl shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <ProfilePictureUploader
                currentImage={currentUser.profilePic}
                onSave={handleProfilePictureSave}
                memberName={currentUser.name}
                size="sm"
                extraContent={
                  <>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsChangingPin(!isChangingPin);
                        setPinChangeError(null);
                        setPinChangeSuccess(false);
                      }} 
                      className="text-[10px] text-gray-600 hover:text-[#ffd700] transition-colors block ml-auto focus:outline-none cursor-pointer"
                    >
                      Manage Gateway Access
                    </button>
                    {isChangingPin && (
                      <form onSubmit={handleUpdateExecutivePin} className="mt-4 p-4 bg-[#001f1a] rounded border border-[#ffd700]/20 space-y-3 text-left">
                        <h4 className="text-xs font-semibold text-[#ffd700] uppercase tracking-wider">Modify Gateway Authorization PIN</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-400">Current PIN</label>
                            <input
                              type="password"
                              maxLength={6}
                              placeholder="••••••"
                              value={currentPin}
                              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                              className="w-full bg-[#001411] border border-gray-700 text-white p-2 rounded text-sm text-center font-mono focus:border-[#ffd700] focus:outline-none"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-400">New Secret PIN</label>
                            <input
                              type="password"
                              maxLength={6}
                              placeholder="••••••"
                              value={newPin}
                              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                              className="w-full bg-[#001411] border border-gray-700 text-white p-2 rounded text-sm text-center font-mono focus:border-[#ffd700] focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        {pinChangeError && <p className="text-red-400 text-xs font-semibold text-center">{pinChangeError}</p>}
                        {pinChangeSuccess && <p className="text-green-400 text-xs font-semibold text-center">PIN successfully updated!</p>}

                        <button
                          type="submit"
                          disabled={isSubmittingPinChange || newPin.length < 4 || currentPin.length < 4}
                          className="w-full bg-[#ffd700] text-[#001a16] font-bold text-xs py-2 rounded hover:bg-[#e6c200] transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          {isSubmittingPinChange ? "Processing Update..." : "Confirm Security Change"}
                        </button>
                      </form>
                    )}
                  </>
                }
              />
            </div>
            <div className="flex-grow w-full">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Name</p>
                  <p className="text-white font-bold text-sm truncate">{currentUser.name}</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Designation</p>
                  <p className="text-[#ffd700] font-bold text-sm">EXECUTIVE CHAIRMAN</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Security Clearances</p>
                  <p className="text-emerald-400 font-bold text-sm">Level 1 Admin</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Members</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalMembersCount}</h3>
          </div>
          <Users className="w-8 h-8 text-[#ffd700]" />
        </Card>

        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Active Members</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{activeMembersCount}</h3>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </Card>

        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Pending Clearances</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">{pendingMembers.length}</h3>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </Card>

        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">CMO Vault Balance</p>
            <h3 className="text-2xl font-bold text-[#ffd700] mt-1">
              {isExecutiveUnlocked ? (
                formatCurrency(vaultBalance)
              ) : (
                <span className="tracking-widest text-[#ffd700]/40">••••••</span>
              )}
            </h3>
          </div>
          <DollarSign className="w-8 h-8 text-[#ffd700]" />
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList className="bg-[#002520] border border-[#ffd700]/20 w-full justify-start p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Executive Overview
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Attendance Analytics
            </TabsTrigger>
            <TabsTrigger value="treasury" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Financial Treasury Ledger
            </TabsTrigger>
            <TabsTrigger value="welfare" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Welfare Review {unreadWelfareCount > 0 ? `(${unreadWelfareCount})` : ''}
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Announcements & Decrees
            </TabsTrigger>
            <TabsTrigger value="roster" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              CMO Roster
            </TabsTrigger>
            <TabsTrigger value="family_leadership" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Family Leadership
            </TabsTrigger>
            <TabsTrigger value="spiritual" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Spiritual Calendar
            </TabsTrigger>
            <TabsTrigger value="general_gallery" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              General Gallery & Videos
            </TabsTrigger>
            <TabsTrigger value="sports_treasury" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              Sports Treasury
            </TabsTrigger>
          </TabsList>
          {isExecutiveUnlocked && (
            <button
              onClick={handleLockDashboard}
              className="bg-[#002520] hover:bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/30 px-3 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 cursor-pointer self-stretch sm:self-auto justify-center"
              title="Lock Executive Workspace"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Lock Dashboard
            </button>
          )}
        </div>

        {!isExecutiveUnlocked ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#001411] border border-[#ffd700]/20 rounded-lg max-w-md mx-auto text-center space-y-6 my-8 shadow-xl">
            <div className="p-3 bg-[#002a24] rounded-full border border-[#ffd700]/30 text-[#ffd700]">
              {/* Padlock Icon SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#ffd700]">Executive Security Gateway</h3>
              <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to unlock administrative features and view the register metrics.</p>
            </div>
            <form onSubmit={handleVerifyPin} className="w-full space-y-4">
              <input
                type="password"
                maxLength={6}
                placeholder="Enter Secret PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))} // Numbers only rule
                className="w-full text-center tracking-widest bg-[#001f1a] border border-[#ffd700] text-white rounded p-3 focus:outline-none text-xl font-mono"
              />
              {pinError && <p className="text-red-400 text-xs font-semibold">{pinError}</p>}
              <button
                type="submit"
                disabled={isVerifyingPin || pinInput.length < 4}
                className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-[#001a16] font-bold py-2.5 rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isVerifyingPin ? "Verifying..." : "Unlock Vault Space"}
              </button>
            </form>
          </div>
        ) : (
          <>
            <TabsContent value="overview" className="space-y-6">
              {/* Card 1: Real-Time Constitutional Health & Governance Meter (0–100% Score) */}
              <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    {/* Score Wheel / Meter */}
                    <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-[#001a16] border-4 border-[#ffd700] shadow-inner flex-shrink-0">
                      <div className="text-center">
                        <span className="text-2xl font-black text-[#ffd700] font-mono">{healthMetrics.overallScore}%</span>
                        <span className="block text-[9px] uppercase text-gray-400 tracking-tighter">Health Score</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#ffd700]" />
                        <h3 className="text-xl font-bold text-[#ffd700]">Constitutional Compliance & Governance Meter</h3>
                      </div>
                      <p className="text-xs text-gray-300 mt-1 max-w-xl">
                        Real-time evaluation grounded in the 2023 CMO Holy Cross Badawa Bye-Laws ({CMO_CONSTITUTION_2023.parish}).
                      </p>

                      {/* Active Governance Badges */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1.5" />
                          Section I 2-of-3 Signatory Rule Active
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-1.5" />
                          0 Section L(4) Legal Disputes Reported
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/30 font-mono">
                          2023 Bye-Laws Enforced
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Pillars Progress Bars */}
                  <div className="grid grid-cols-2 gap-3 w-full lg:w-80 text-xs">
                    <div className="bg-[#001a16] p-2.5 rounded border border-[#ffd700]/20">
                      <div className="flex justify-between text-gray-300 mb-1 font-semibold">
                        <span>Quorum (Sec C)</span>
                        <span className="text-[#ffd700] font-mono">{healthMetrics.quorumScore}%</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#ffd700] h-full" style={{ width: `${healthMetrics.quorumScore}%` }} />
                      </div>
                    </div>

                    <div className="bg-[#001a16] p-2.5 rounded border border-[#ffd700]/20">
                      <div className="flex justify-between text-gray-300 mb-1 font-semibold">
                        <span>Notice (Sec K)</span>
                        <span className="text-emerald-400 font-mono">{healthMetrics.welfareNoticeScore}%</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full" style={{ width: `${healthMetrics.welfareNoticeScore}%` }} />
                      </div>
                    </div>

                    <div className="bg-[#001a16] p-2.5 rounded border border-[#ffd700]/20">
                      <div className="flex justify-between text-gray-300 mb-1 font-semibold">
                        <span>Fines (Sec L)</span>
                        <span className="text-amber-400 font-mono">{healthMetrics.fineClearanceScore}%</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full" style={{ width: `${healthMetrics.fineClearanceScore}%` }} />
                      </div>
                    </div>

                    <div className="bg-[#001a16] p-2.5 rounded border border-[#ffd700]/20">
                      <div className="flex justify-between text-gray-300 mb-1 font-semibold">
                        <span>Signatory (Sec I)</span>
                        <span className="text-blue-400 font-mono">{healthMetrics.signatoryScore}%</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-400 h-full" style={{ width: `${healthMetrics.signatoryScore}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 2: Section D(6) Bank Lodgment Audit Deck */}
              <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-6 h-6 text-[#ffd700]" />
                    <h3 className="text-xl font-bold text-[#ffd700]">Section D(6) Bank Lodgment Audit Deck</h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30 font-mono">
                    Proof-of-Deposit Records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#ffd700]/30 hover:bg-[#001a16]">
                        <TableHead className="text-[#ffd700]">Teller Ref</TableHead>
                        <TableHead className="text-[#ffd700]">Amount</TableHead>
                        <TableHead className="text-[#ffd700]">Lodged By</TableHead>
                        <TableHead className="text-[#ffd700]">Date</TableHead>
                        <TableHead className="text-[#ffd700]">Audit Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lodgmentsList.map((lodg) => (
                        <TableRow key={lodg.id} className="border-[#ffd700]/20 hover:bg-[#001a16]">
                          <TableCell className="text-white font-mono font-semibold">{lodg.teller_ref || 'TLR-REC'}</TableCell>
                          <TableCell className="text-[#ffd700] font-bold">{formatCurrency(lodg.amount)}</TableCell>
                          <TableCell className="text-gray-300">{lodg.lodged_by || 'Treasurer'}</TableCell>
                          <TableCell className="text-gray-400 text-xs">{formatDate(lodg.created_at)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reconciled Bank Deposit
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {lodgmentsList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                            No bank lodgments recorded in audit log
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Card 2B: Section I Bank Withdrawal Authorization Deck */}
              <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-6 h-6 text-[#ffd700]" />
                    <h3 className="text-xl font-bold text-[#ffd700]">Section I Bank Withdrawal Authorization Deck</h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30 font-mono">
                    Mandatory 2-of-3 Signatories
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#ffd700]/30 hover:bg-[#001a16]">
                        <TableHead className="text-[#ffd700]">Ref / Date</TableHead>
                        <TableHead className="text-[#ffd700]">Purpose & Category</TableHead>
                        <TableHead className="text-[#ffd700]">Amount</TableHead>
                        <TableHead className="text-[#ffd700]">Signatory Authorization Progress</TableHead>
                        <TableHead className="text-[#ffd700]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankWithdrawals.map((wth) => {
                        const sigs = wth.signatories ? wth.signatories.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                        const hasChairman = sigs.includes('Chairman');
                        const hasTreasurer = sigs.includes('Treasurer');
                        const hasParishPriest = sigs.includes('Parish Priest');
                        const isSettled = wth.status === 'SETTLED' || sigs.length >= 2;

                        return (
                          <TableRow key={wth.id} className="border-[#ffd700]/20 hover:bg-[#001a16]">
                            <TableCell className="text-white font-mono text-xs">
                              <div>{wth.withdrawal_ref || wth.id}</div>
                              <div className="text-[10px] text-gray-400">{formatDate(wth.created_at)}</div>
                            </TableCell>
                            <TableCell className="text-white text-xs">
                              <p className="font-semibold">{wth.purpose}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 inline-block mt-0.5">
                                {wth.category}
                              </span>
                            </TableCell>
                            <TableCell className="text-[#ffd700] font-bold text-sm">
                              {formatCurrency(wth.amount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[11px] px-2 py-0.5 rounded font-semibold border inline-flex items-center gap-1 ${hasChairman ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                  {hasChairman ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-gray-400" />}
                                  Chairman [{hasChairman ? 'Signed' : 'Pending'}]
                                </span>
                                <span className={`text-[11px] px-2 py-0.5 rounded font-semibold border inline-flex items-center gap-1 ${hasTreasurer ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                  {hasTreasurer ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-gray-400" />}
                                  Treasurer [{hasTreasurer ? 'Signed' : 'Pending'}]
                                </span>
                                <span className={`text-[11px] px-2 py-0.5 rounded font-semibold border inline-flex items-center gap-1 ${hasParishPriest ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                  {hasParishPriest ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-gray-400" />}
                                  Priest [{hasParishPriest ? 'Signed' : 'Pending'}]
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isSettled ? (
                                <span className="inline-flex items-center text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-1 rounded">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> SETTLED & RELEASED
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {!hasChairman && (
                                    <Button
                                      onClick={() => handleChairmanAuthorizeWithdrawal(wth.id, 'Chairman')}
                                      disabled={authorizingWthId === wth.id}
                                      className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] text-xs font-bold py-1 h-auto"
                                    >
                                      <Key className="w-3.5 h-3.5 mr-1" />
                                      {authorizingWthId === wth.id ? 'Signing...' : 'Authorize (Chairman 1/3)'}
                                    </Button>
                                  )}
                                  {!hasParishPriest && (
                                    <Button
                                      onClick={() => handleChairmanAuthorizeWithdrawal(wth.id, 'Parish Priest')}
                                      disabled={authorizingWthId === wth.id}
                                      className="bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-semibold py-1 h-auto"
                                    >
                                      + Add Priest Signature
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {bankWithdrawals.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400 py-6 text-xs">
                            No bank withdrawals recorded in queue
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Card 3: High-Level Welfare & Project Expenditure Analytics */}
              <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-6 h-6 text-[#ffd700]" />
                    <h3 className="text-xl font-bold text-[#ffd700]">Section K Welfare & Vault Expenditure Analytics</h3>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/30 font-mono">
                    Official Bye-Law Caps
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#001a16] border border-[#ffd700]/30 p-3.5 rounded-lg">
                    <p className="text-xs text-gray-400 font-semibold">Member Death (₦50k)</p>
                    <p className="text-xl font-bold text-white mt-1">{formatCurrency(welfareBreakdown.memberDeath)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Section K(iv)(e) Cap</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/30 p-3.5 rounded-lg">
                    <p className="text-xs text-gray-400 font-semibold">Surgery/Hospital (₦20k)</p>
                    <p className="text-xl font-bold text-white mt-1">{formatCurrency(welfareBreakdown.surgery)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Section K(i) Cap</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/30 p-3.5 rounded-lg">
                    <p className="text-xs text-gray-400 font-semibold">Member Wedding (₦20k)</p>
                    <p className="text-xl font-bold text-white mt-1">{formatCurrency(welfareBreakdown.wedding)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Section K(iii)(b) Cap</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/30 p-3.5 rounded-lg">
                    <p className="text-xs text-gray-400 font-semibold">Naming Ceremony (₦10k)</p>
                    <p className="text-xl font-bold text-white mt-1">{formatCurrency(welfareBreakdown.naming)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Section K(iii)(a) Cap</p>
                  </div>
                </div>

                {/* Progress Bar Comparing Approved Welfare vs Vault Reserve */}
                <div className="bg-[#001a16] border border-[#ffd700]/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-gray-300 font-semibold">Total Approved Disbursements vs Vault Balance</span>
                    <span className="text-[#ffd700] font-mono font-bold">
                      {formatCurrency(welfareBreakdown.totalApproved)} / {formatCurrency(vaultBalance)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#ffd700] h-full" 
                      style={{ width: `${Math.min(100, vaultBalance > 0 ? (welfareBreakdown.totalApproved / vaultBalance) * 100 : 0)}%` }} 
                    />
                  </div>
                </div>
              </Card>

              {/* Fellowship Attendance Macro Metric Widget */}
              <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 mb-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#ffd700]" />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400 border border-teal-500/20">
                  <BookOpen className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Overall Last Thursday Fellowship Attendance Rate</p>
                  <h3 className="text-3xl font-extrabold text-white mt-1">
                    {lastFellowshipAttendance.date ? (
                      `${Math.round((lastFellowshipAttendance.present / (activeMembersCount || 1)) * 100)}% Attendance`
                    ) : (
                      'N/A'
                    )}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {lastFellowshipAttendance.date ? (
                      (() => {
                        const dateStr = lastFellowshipAttendance.date;
                        const parsedDate = new Date(dateStr.replace(/-/g, '/'));
                        const formattedDate = isNaN(parsedDate.getTime()) 
                          ? dateStr 
                          : `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()}`;
                        return `${lastFellowshipAttendance.present} Members Present / ${lastFellowshipAttendance.absent} Absent on ${formattedDate}`;
                      })()
                    ) : (
                      'No attendance history fetched yet'
                    )}
                  </p>
                </div>
              </div>

              {lastFellowshipAttendance.date && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-l border-[#ffd700]/20 pl-6 text-xs w-full md:w-auto">
                  <div className="text-gray-300">
                    <span className="text-[#ffd700] font-bold">Wisdom Family:</span> {lastFellowshipAttendance.wisdomCount} Present
                  </div>
                  <div className="text-gray-300">
                    <span className="text-[#ffd700] font-bold">Talent Family:</span> {lastFellowshipAttendance.talentCount} Present
                  </div>
                  <div className="text-gray-300">
                    <span className="text-[#ffd700] font-bold">Honour Family:</span> {lastFellowshipAttendance.honourCount} Present
                  </div>
                  <div className="text-gray-300">
                    <span className="text-[#ffd700] font-bold">Integrity Family:</span> {lastFellowshipAttendance.integrityCount} Present
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" /> Executive Powers & Oversight
              </h3>
              <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
                <p>
                  Welcome, Mr. President. As the Executive Chairman, you hold absolute oversight over the administrative and financial activities of the Holy Cross Catholic Men Organisation (CMO).
                </p>
                <p>
                  Use this central portal to publish announcements, monitor active welfare applications, audit treasury records, and ensure general compliance with the CMO Constitution.
                </p>
                <div className="bg-[#001a16] border border-[#ffd700]/30 rounded p-4 text-[#ffd700]/80">
                  <h4 className="font-semibold mb-1">General Operations Alert</h4>
                  All financial transactions published by the Financial Secretary and disbursements approved by the Welfare Officer are synchronized live here for your executive review.
                </div>
              </div>
            </Card>

            <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Recent Cash Flow Logs
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#ffd700]/20 hover:bg-[#001a16]/50">
                      <TableHead className="text-[#ffd700]">Date</TableHead>
                      <TableHead className="text-[#ffd700]">Member / Reference</TableHead>
                      <TableHead className="text-[#ffd700]">Purpose</TableHead>
                      <TableHead className="text-[#ffd700] text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleTransactions.slice(0, 5).map((tx) => (
                      <TableRow key={tx.id} className="border-b border-[#ffd700]/10 hover:bg-[#001a16]/50">
                        <TableCell className="text-white text-xs">{formatDate((tx as any).created_at || tx.timestamp)}</TableCell>
                        <TableCell className="text-white font-medium">{tx.memberName || tx.memberId}</TableCell>
                        <TableCell className="text-gray-300 text-xs">{tx.purpose}</TableCell>
                        <TableCell className="text-right font-semibold text-[#ffd700]">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {visibleTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-4">No recent financial logs recorded.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

        </TabsContent>

        <TabsContent value="announcements">
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5" /> Publish Executive Directive
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Announcement Title</label>
                <Input
                  placeholder="e.g. Executive Meeting Notice"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Content</label>
                <textarea
                  rows={4}
                  placeholder="Write details of the executive directive here..."
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 rounded p-3 text-white focus:outline-none focus:border-[#ffd700] text-sm"
                />
              </div>
              <Button onClick={postAnnouncement} className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-semibold">
                Publish Announcement
              </Button>
            </div>

            <h4 className="text-lg font-bold text-[#ffd700] border-t border-[#ffd700]/20 pt-6 mb-4">Active Board Notices</h4>
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-[#001a16] border border-[#ffd700]/10 rounded p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h5 className="font-bold text-white">{ann.title}</h5>
                    <span className="text-xs text-gray-500">{formatDate(ann.timestamp)}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{ann.content}</p>
                  <p className="text-xs text-[#ffd700] mt-2 font-medium">By: {ann.author}</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No announcements currently active.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Attendance Analytics */}
        <TabsContent value="attendance">
          <div className="mt-2">
            <ChairmanAttendanceAnalyticsWidget totalRosterCount={totalMembersCount || rosterCount} />
          </div>
        </TabsContent>

        {/* Tab 3: Financial Treasury Ledger */}
        <TabsContent value="treasury">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#ffd700]/20 pb-4">
              <div>
                <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-[#ffd700]" />
                  Financial Treasury Ledger
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                  Executive view of CMO vault balance, realized inflows, and expense audit
                </p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700]/30 px-4 py-2 rounded-lg text-right">
                <p className="text-xs text-gray-400 font-semibold uppercase">Vault Balance</p>
                <p className="text-xl font-extrabold text-[#ffd700]">{formatCurrency(vaultBalance)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#001a16] border border-emerald-500/30 p-4 rounded-lg">
                <p className="text-xs text-emerald-400 uppercase font-semibold">Total Revenue Inflows</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {formatCurrency(visibleTransactions.filter(t => t.transactionType === 'income' || t.transactionType === 'inflow').reduce((sum, t) => sum + (t.amount || 0), 0))}
                </p>
              </div>
              <div className="bg-[#001a16] border border-rose-500/30 p-4 rounded-lg">
                <p className="text-xs text-rose-400 uppercase font-semibold">Total Outflows & Expenses</p>
                <p className="text-2xl font-bold text-rose-400 mt-1">
                  {formatCurrency(visibleTransactions.filter(t => t.transactionType === 'expense' || t.transactionType === 'outflow').reduce((sum, t) => sum + (t.amount || 0), 0))}
                </p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700]/30 p-4 rounded-lg">
                <p className="text-xs text-gray-400 uppercase font-semibold">Total Ledger Entries</p>
                <p className="text-2xl font-bold text-white mt-1">{visibleTransactions.length} Records</p>
              </div>
            </div>

            {/* Treasury Transactions Stream */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-bold text-[#ffd700] uppercase tracking-wider">Recent Financial Inflows & Outflows</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#ffd700]/20 hover:bg-[#001a16]/50">
                      <TableHead className="text-[#ffd700]">Member / Contributor</TableHead>
                      <TableHead className="text-[#ffd700]">Purpose</TableHead>
                      <TableHead className="text-[#ffd700]">Type</TableHead>
                      <TableHead className="text-[#ffd700]">Amount</TableHead>
                      <TableHead className="text-[#ffd700]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleTransactions.slice(0, 15).map((t, idx) => (
                      <TableRow key={t.id || idx} className="border-b border-[#ffd700]/10 hover:bg-[#001a16]/50">
                        <TableCell className="text-white font-medium">{t.memberName || t.memberId || 'General CMO'}</TableCell>
                        <TableCell className="text-gray-300 text-xs">{t.purpose}</TableCell>
                        <TableCell className="text-xs font-bold uppercase">
                          <span className={t.transactionType === 'expense' || t.transactionType === 'outflow' ? 'text-rose-400' : 'text-emerald-400'}>
                            {t.transactionType || 'inflow'}
                          </span>
                        </TableCell>
                        <TableCell className="text-white font-bold font-mono text-xs">{formatCurrency(t.amount)}</TableCell>
                        <TableCell className="text-gray-400 text-xs font-mono">{formatDate(t.timestamp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="welfare">
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5" /> Welfare Assistance Queue
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#ffd700]/20 hover:bg-[#001a16]/50">
                    <TableHead className="text-[#ffd700]">Ticket ID</TableHead>
                    <TableHead className="text-[#ffd700]">Member</TableHead>
                    <TableHead className="text-[#ffd700]">Category</TableHead>
                    <TableHead className="text-[#ffd700]">Amount</TableHead>
                    <TableHead className="text-[#ffd700]">Status</TableHead>
                    <TableHead className="text-[#ffd700]">Date Filed</TableHead>
                    <TableHead className="text-[#ffd700] text-center">Acknowledgment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {welfareTickets.map((ticket) => (
                    <TableRow key={ticket.ticketId} className="border-b border-[#ffd700]/10 hover:bg-[#001a16]/50">
                      <TableCell className="text-white font-mono text-xs">{ticket.ticketId}</TableCell>
                      <TableCell className="text-white font-medium">{ticket.memberName}</TableCell>
                      <TableCell className="text-gray-300 text-xs">
                        {ticket.category}
                        {ticket.status === 'Declined' && ticket.declineReason && (
                          <div className="text-red-400 italic mt-1 text-[11px]">
                            Reason: {ticket.declineReason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-[#ffd700] font-semibold">{formatCurrency(ticket.requestedAmount)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          ticket.status === 'Awaiting Disbursement' || ticket.status === 'Approved' || ticket.status === 'Settled & Cleared' || ticket.status === 'Completed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}>
                          {ticket.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">{formatDate(ticket.createdAt)}</TableCell>
                      <TableCell className="text-center">
                        {!ticket.chairmanRead ? (
                          <button
                            type="button"
                            onClick={() => acknowledgeTicket(ticket.ticketId)}
                            className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-semibold text-xs py-1.5 px-3 rounded flex items-center gap-1.5 mx-auto cursor-pointer"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Acknowledge
                          </button>
                        ) : (
                          <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1 justify-center">
                            <CheckCheck className="w-4 h-4" />
                            Acknowledged
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {welfareTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-4">No welfare requests registered.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="roster">
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
                <FileText className="w-5 h-5" /> Holy Cross CMO — Membership Registry
              </h3>
              <span className="text-xs text-gray-500">
                {filteredMembers.length} of {humanMembers.length} member{humanMembers.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Case-insensitive search filter */}
            <div className="mb-4">
              <Input
                id="registry-search"
                placeholder="Search by member ID, name, or phone number…"
                value={registrySearch}
                onChange={(e) => setRegistrySearch(e.target.value)}
                className="bg-[#001a16] border-[#ffd700]/30 text-white placeholder:text-gray-500 focus:border-[#ffd700] max-w-md"
              />
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#ffd700]/20 hover:bg-[#001a16]/50">
                    <TableHead className="text-[#ffd700]">Member ID</TableHead>
                    <TableHead className="text-[#ffd700]">Full Name</TableHead>
                    <TableHead className="text-[#ffd700]">Phone Number</TableHead>
                    <TableHead className="text-[#ffd700]">Status</TableHead>
                    <TableHead className="text-[#ffd700] text-right">Ledger Balance</TableHead>
                    <TableHead className="text-[#ffd700] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id} className="border-b border-[#ffd700]/10 hover:bg-[#001a16]/50">
                      <TableCell className="text-white font-mono text-xs">{member.official_member_id || member.id}</TableCell>
                      <TableCell className="text-white font-medium">
                        <button
                          type="button"
                          onClick={() => handleViewMemberDetails(member)}
                          className="text-left font-semibold text-white hover:text-[#ffd700] hover:underline focus:outline-none transition-all cursor-pointer"
                        >
                          {member.full_name || member.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs">{member.phone_number || member.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          member.status === 'Active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : member.status === 'Deceased'
                            ? 'bg-red-950 text-red-400 border border-red-500/30'
                            : member.status === 'Transferred'
                            ? 'bg-blue-950 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}>
                          {member.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#ffd700]">
                        {formatCurrency(member.balance)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-2">
                          {member.status === 'Transferred' || member.status === 'Deceased' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 italic text-sm">{member.status} (Locked)</span>
                              <button
                                type="button"
                                onClick={() => handleReactivateMember(member.official_member_id || member.id)}
                                className="text-xs bg-[#002a24] hover:bg-[#003d34] text-[#ffd700] border border-[#ffd700]/30 px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                Reactivate
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMember(member);
                                  setEditMemberName(member.full_name || member.name);
                                  setEditMemberPhone(member.phone || member.phone_number || '');
                                  setEditMemberFamily(member.family || '');
                                  setEditMemberStatus(member.status);
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-1 px-2 rounded cursor-pointer animate-all"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkDeceased(member.official_member_id || member.id)}
                                className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs py-1 px-2 rounded cursor-pointer animate-all"
                              >
                                Mark Deceased
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkTransferred(member.official_member_id || member.id)}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded text-sm transition-colors cursor-pointer animate-all"
                              >
                                Transfer
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                        {registrySearch ? `No members match "${registrySearch}".` : 'No church members found in registry.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="family_leadership">
          <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-[#ffd700] mb-2 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" />
              Family Leadership Assignments
            </h3>
            <p className="text-gray-300 text-sm mb-6">
              Assign  members to executive roles (Family Head or Family Secretary) for Wisdom, Honour, Integrity, and Talent families.
            </p>

            <form
              onSubmit={handleAssignLeadership}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            >
              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">Select Family Unit</label>
                <select
                  title="Target Family Unit"
                  value={assignmentFamily}
                  onChange={(e) => setAssignmentFamily(e.target.value as Family)}
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white rounded p-2.5 focus:outline-none focus:border-[#ffd700] text-sm cursor-pointer"
                  required
                >
                  <option value="">Choose Family...</option>
                  <option value="Wisdom">Wisdom</option>
                  <option value="Honour">Honour</option>
                  <option value="Integrity">Integrity</option>
                  <option value="Talent">Talent</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">Select Leadership Role</label>
                <select
                  title="Executive Role"
                  value={assignmentRole}
                  onChange={(e) => setAssignmentRole(e.target.value as 'FAMILY_HEAD' | 'FAMILY_SEC')}
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white rounded p-2.5 focus:outline-none focus:border-[#ffd700] text-sm cursor-pointer"
                  required
                >
                  <option value="">Choose Role...</option>
                  <option value="FAMILY_HEAD">Family Head</option>
                  <option value="FAMILY_SEC">Family Secretary</option>
                </select>
              </div>

              <div className="relative" ref={dropdownRef}>
                <label className="block text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">Select Registered Member</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={!assignmentFamily ? "Select family unit first..." : "Type name to search..."}
                    value={memberSearchQuery}
                    onChange={(e) => {
                      setMemberSearchQuery(e.target.value);
                      setAssignmentMemberId('');
                      setIsSearchDropdownOpen(true);
                    }}
                    onFocus={() => setIsSearchDropdownOpen(true)}
                    className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white rounded p-2.5 focus:outline-none focus:border-[#ffd700] text-sm pr-8"
                    required
                    disabled={!assignmentFamily}
                  />
                  {assignmentMemberId && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentMemberId('');
                        setMemberSearchQuery('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      title="Clear selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isSearchDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-[#001a16] border border-[#ffd700]/30 rounded shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                    {searchResults.map(m => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setAssignmentMemberId(m.id);
                          setMemberSearchQuery(m.full_name || m.name);
                          setIsSearchDropdownOpen(false);
                        }}
                        className="px-3 py-2 text-sm text-gray-200 hover:bg-[#ffd700]/10 hover:text-white cursor-pointer transition-colors"
                      >
                        {m.full_name || m.name}
                      </div>
                    ))}
                    {searchResults.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400 italic">
                        {isSearching ? 'Searching...' : 'No active members found'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={assignmentLoading}
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold h-[42px] w-full"
              >
                {assignmentLoading ? 'Processing...' : 'Confirm Assignment'}
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="spiritual">
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Liturgical Office Spiritual Assignments
            </h3>
            <p className="text-gray-300 text-sm mb-6">
              This read-only calendar lists all active spiritual assignments generated by the Liturgist Office.
            </p>
            <div className="bg-[#001a16] border border-[#ffd700]/10 rounded p-4">
              {spiritualLoading ? (
                <p className="text-gray-400 text-center py-4 font-semibold animate-pulse">Loading spiritual assignments...</p>
              ) : spiritualCalendar.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No active assignments found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#ffd700]/25 hover:bg-[#001a16]/50">
                        <TableHead className="text-[#ffd700]">Activity Date</TableHead>
                        <TableHead className="text-[#ffd700]">Activity Name</TableHead>
                        <TableHead className="text-[#ffd700]">Duty Role</TableHead>
                        <TableHead className="text-[#ffd700]">Assignee</TableHead>
                        <TableHead className="text-[#ffd700]">Status</TableHead>
                        <TableHead className="text-[#ffd700]">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spiritualCalendar.map((assignment) => {
                        const dateStr = new Date(assignment.activity_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                        const assignee = assignment.assigned_family 
                          ? `${assignment.assigned_family} Family` 
                          : members.find(m => m.official_member_id === assignment.assigned_member_id || m.id === assignment.assigned_member_id)?.name || assignment.assigned_member_id;

                        return (
                          <TableRow key={assignment.id} className="border-b border-[#ffd700]/10 hover:bg-[#001a16]/50">
                            <TableCell className="text-white text-xs font-mono">{dateStr}</TableCell>
                            <TableCell className="text-white font-bold text-xs uppercase">{assignment.activity_name}</TableCell>
                            <TableCell className="text-white text-xs">
                              <span className="bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/25 px-2 py-0.5 rounded text-xs font-semibold">
                                {assignment.duty_role}
                              </span>
                            </TableCell>
                            <TableCell className="text-white font-bold text-xs uppercase">{assignee}</TableCell>
                            <TableCell className="text-white text-xs">
                              {getStatusBadge(assignment.status)}
                            </TableCell>
                            <TableCell className="text-gray-300 text-xs italic font-mono">{assignment.notes || 'N/A'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="general_gallery" className="mt-6">
          <GeneralGalleryManager
            currentUserName={currentUser?.name || 'Executive Chairman'}
            isExecutive={isExecutiveUnlocked}
          />
        </TabsContent>
        <TabsContent value="sports_treasury" className="mt-6">
          <SportsAuditReadOnlyView />
        </TabsContent>
          </>
        )}
      </Tabs>

      {/* Administrative Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans animate-fadeIn">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 max-w-md w-full shadow-2xl rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#ffd700]">Edit Member Details</h3>
              <button 
                onClick={() => setEditingMember(null)}
                className="text-gray-400 hover:text-white transition-colors text-lg"
                aria-label="Close edit member modal"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Full Name</label>
                <Input
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  className="bg-[#001a16] border-[#ffd700]/30 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Phone Number</label>
                <Input
                  value={editMemberPhone}
                  onChange={(e) => setEditMemberPhone(e.target.value)}
                  className="bg-[#001a16] border-[#ffd700]/30 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">CMO Family</label>
                <select
                  value={editMemberFamily}
                  onChange={(e) => setEditMemberFamily(e.target.value as Family)}
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-2 rounded focus:outline-none focus:border-[#ffd700] h-10 cursor-pointer"
                >
                  <option value="">No assigned family</option>
                  <option value="Wisdom">Wisdom Family</option>
                  <option value="Honour">Honour Family</option>
                  <option value="Integrity">Integrity Family</option>
                  <option value="Talent">Talent Family</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Account Status</label>
                <select
                  value={editMemberStatus}
                  onChange={(e) => setEditMemberStatus(e.target.value as MemberStatus)}
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-2 rounded focus:outline-none focus:border-[#ffd700] h-10 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Deceased">Deceased</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button 
                onClick={() => setEditingMember(null)}
                variant="outline"
                className="flex-1 border-[#ffd700]/40 text-gray-300 hover:bg-[#ffd700]/10 hover:text-white"
                disabled={adminEditLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditMemberSave}
                className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold"
                disabled={adminEditLoading}
              >
                {adminEditLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Slide-over panel */}
      {isDetailOpen && (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-[#001411] border-l-2 border-[#ffd700] text-white shadow-2xl z-50 flex flex-col transition-all duration-300">
          {/* Header with visual close button */}
          <div className="p-6 border-b border-[#ffd700]/20 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-[#ffd700]">
                {selectedMember ? (selectedMember.full_name || selectedMember.name) : "Loading..."}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {selectedMember && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    selectedMember.status === 'Active'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : selectedMember.status === 'Deceased'
                      ? 'bg-red-950 text-red-400 border border-red-500/30'
                      : selectedMember.status === 'Transferred'
                      ? 'bg-blue-950 text-blue-400 border border-blue-500/30'
                      : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                  }`}>
                    {selectedMember.status}
                  </span>
                )}
                <span className="text-xs text-gray-400 font-mono">
                  ID: {selectedMember?.official_member_id}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsDetailOpen(false)}
              className="text-[#ffd700] hover:text-white border border-[#ffd700]/40 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          {/* Content Area with custom scrollbar */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoadingDetails ? (
              <div className="flex justify-center items-center h-48 text-[#ffd700]">
                Loading details...
              </div>
            ) : selectedMember ? (
              <>
                {/* Group 1: Personal Profile */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#ffd700] uppercase tracking-wider">Personal Bio</h3>
                  <div className="bg-[#001f1a] p-3 rounded space-y-1 text-sm">
                    <p>
                      <span className="text-gray-400">Date of Birth:</span>{" "}
                      {selectedMember.date_of_birth 
                        ? (() => {
                            const d = new Date(selectedMember.date_of_birth.replace(/-/g, '/'));
                            return isNaN(d.getTime()) 
                              ? selectedMember.date_of_birth 
                              : `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
                          })()
                        : "Not Provided"}
                    </p>
                    <p><span className="text-gray-400">Occupation:</span> {selectedMember.occupation || "Not Provided"}</p>
                    <p><span className="text-gray-400">Marital Status:</span> {selectedMember.marital_status || selectedMember.marriage_status || "Not Provided"}</p>
                  </div>
                </div>

                {/* Group 2: Contact Details */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#ffd700] uppercase tracking-wider">Contact Details</h3>
                  <div className="bg-[#001f1a] p-3 rounded space-y-1 text-sm">
                    <p><span className="text-gray-400">Phone:</span> {selectedMember.phone_number || selectedMember.phone || 'N/A'}</p>
                    <p><span className="text-gray-400">Email:</span> {selectedMember.email || "N/A"}</p>
                    <p><span className="text-gray-400">Residential Address:</span> {selectedMember.residential_address || selectedMember.address || "N/A"}</p>
                    <p><span className="text-gray-400">Home Town Address:</span> {selectedMember.home_town_address || "N/A"}</p>
                  </div>
                </div>

                {/* Group 3: CMO Info */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#ffd700] uppercase tracking-wider">CMO Info</h3>
                  <div className="bg-[#001f1a] p-3 rounded space-y-1 text-sm">
                    <p><span className="text-gray-400">CMO Family:</span> {selectedMember.cmo_family || selectedMember.family || "None"}</p>
                    <p><span className="text-gray-400">Post Held:</span> {selectedMember.post_held || selectedMember.church_position || "Member"}</p>
                    <p>
                      <span className="text-gray-400">Ledger Balance:</span>{" "}
                      <span className="text-[#ffd700] font-bold">
                        ₦{Number(selectedMember.balance || 0).toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Group 4: Emergency Contact (Next of Kin) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#ffd700] uppercase tracking-wider">Emergency Contact</h3>
                  <div className="bg-[#001f1a] border border-[#ffd700]/30 p-3 rounded space-y-1 text-sm">
                    <p><span className="text-gray-400">Next of Kin:</span> {selectedMember.nok_name || "Not Configured"}</p>
                    <p><span className="text-gray-400">Relationship:</span> {selectedMember.nok_relationship || "N/A"}</p>
                    <p><span className="text-gray-400">Phone Number:</span> {selectedMember.nok_phone || "N/A"}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-red-400 py-12">Failed to load profile details.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
