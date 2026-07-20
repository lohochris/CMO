import { useState, useEffect } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { Users, CheckCircle, CheckCheck, AlertCircle, DollarSign, Megaphone, FileText, Shield, Heart, ShieldCheck, BookOpen, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { formatCurrency, formatDate, isAdministrativeId } from '../../utils/helpers';
import { supabase } from '../../lib/supabaseClient';
import { Member, Family, MemberStatus } from '../../types';
import { GeneralGalleryManager } from '../../app/components/gallery/GeneralGalleryManager';
import { ChairmanAttendanceAnalyticsWidget } from '../../app/components/attendance/ChairmanAttendanceAnalyticsWidget';


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
    vaultBalance
  } = useApp();

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');

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
      
      const queryField = member.id.includes('-') && member.id.length === 36 ? 'id' : 'official_member_id';

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
      const { error: memberErr } = await supabase
        .from('members')
        .update(updatePayload)
        .eq('official_member_id', editingMember.id);

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
      const { error: dbErr } = await supabase
        .from('members')
        .update({ status: 'Deceased' })
        .eq('official_member_id', memberId);

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
      const queryField = memberId.includes('-') && memberId.length === 36 ? 'id' : 'official_member_id';

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
      const queryField = memberId.includes('-') && memberId.length === 36 ? 'id' : 'official_member_id';

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
  const isHumanChurchMember = (m: { role?: string; official_member_id?: string; id?: string }): boolean => {
    const memberId = m.official_member_id || m.id || '';
    if (memberId.startsWith('HCC-')) return true;
    return !isAdministrativeId(memberId);
  };

  const isHumanRegistryMember = (m: { role?: string; official_member_id?: string; id?: string }): boolean => {
    const memberId = m.official_member_id || m.id || '';
    if (memberId.startsWith('HCC-')) return true;
    return !isAdministrativeId(memberId);
  };

  // KPI metrics — live church members only (admin-stripped, dual-validated)
  const churchMembers  = members.filter(isHumanChurchMember);
  const activeMembers  = churchMembers.filter(m => m.status === 'Active');
  const pendingMembers = churchMembers.filter(m => m.status === 'Inactive');
  const totalMembersCount = churchMembers.filter(m => m.status !== 'Deceased').length;
  const activeMembersCount = churchMembers.filter(m => m.status === 'Active').length;

  // Registry table source — displays the complete, unfiltered database roster
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

  // Vault balance — sums dues from verified church members only

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-[#ffd700]" />
        <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700]">Executive Chairman Dashboard</h2>
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
            <TabsTrigger value="spiritual" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Spiritual Calendar
            </TabsTrigger>
            <TabsTrigger value="general_gallery" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              General Gallery & Videos
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
            <TabsContent value="overview">
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
                    {transactions.slice(0, 5).map((tx) => (
                      <TableRow key={tx.id} className="border-b border-[#ffd700]/10 hover:bg-[#001a16]/50">
                        <TableCell className="text-white text-xs">{formatDate((tx as any).created_at || tx.timestamp)}</TableCell>
                        <TableCell className="text-white font-medium">{tx.memberName || tx.memberId}</TableCell>
                        <TableCell className="text-gray-300 text-xs">{tx.purpose}</TableCell>
                        <TableCell className="text-right font-semibold text-[#ffd700]">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
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
                  {formatCurrency(transactions.filter(t => t.transactionType === 'income' || t.transactionType === 'inflow').reduce((sum, t) => sum + (t.amount || 0), 0))}
                </p>
              </div>
              <div className="bg-[#001a16] border border-rose-500/30 p-4 rounded-lg">
                <p className="text-xs text-rose-400 uppercase font-semibold">Total Outflows & Expenses</p>
                <p className="text-2xl font-bold text-rose-400 mt-1">
                  {formatCurrency(transactions.filter(t => t.transactionType === 'expense' || t.transactionType === 'outflow').reduce((sum, t) => sum + (t.amount || 0), 0))}
                </p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700]/30 p-4 rounded-lg">
                <p className="text-xs text-gray-400 uppercase font-semibold">Total Ledger Entries</p>
                <p className="text-2xl font-bold text-white mt-1">{transactions.length} Records</p>
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
                    {transactions.slice(0, 15).map((t, idx) => (
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
