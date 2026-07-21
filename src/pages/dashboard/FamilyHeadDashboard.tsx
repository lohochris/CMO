import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { Member, Family, FamilyExpense, FamilyTransaction, FamilyAnnouncement } from '../../types';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { toast } from 'sonner';
import { Users, CalendarCheck, HeartPulse, Send, MessageSquare, Shield, PhoneCall, HeartHandshake, ClipboardList, BookOpen, TrendingUp, Receipt, DollarSign, Printer, Megaphone } from 'lucide-react';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { calculateTotal, formatCurrency, formatDate, getCombinedTransactions, formatDateTime } from '../../utils/helpers';
import { generateExpenseId, generateAnnouncementId } from '../../utils/idGenerators';

export default function FamilyHeadDashboard() {
  const {
    currentUser,
    members,
    setMembers,
    setCurrentUser,
    familyTransactions,
    setFamilyTransactions,
    familyExpenses,
    setFamilyExpenses,
    familyWelfareTickets,
    setFamilyWelfareTickets,
    familyAnnouncements,
    setFamilyAnnouncements
  } = useApp();

  const resolveUnitFromUser = (user: any): string => {
    let unit = user?.familyUnit || user?.cmo_family || user?.family;
    if (!unit && (user?.official_member_id || user?.id)) {
      const uId = String(user.official_member_id || user.id).toUpperCase();
      if (uId.includes('HONOUR')) unit = 'Honour';
      else if (uId.includes('INTEGRITY')) unit = 'Integrity';
      else if (uId.includes('TALENT')) unit = 'Talent';
      else if (uId.includes('WISDOM')) unit = 'Wisdom';
    }
    return (unit || 'Wisdom').replace(/\s*Family\s*/gi, '').trim() || 'Wisdom';
  };

  const assignedFamily = resolveUnitFromUser(currentUser);
  const roleStr = String(currentUser?.role || '').toLowerCase();
  const isFamilyOfficer = ['family_sec', 'family_head', 'family_secretary', 'family_chairman', 'familysecretary', 'familychairman'].includes(roleStr);

  const [activeFamilyUnit, setActiveFamilyUnit] = useState<string>(assignedFamily);
  const [activeTab, setActiveTab] = useState<'overview' | 'welfare' | 'finance' | 'reports' | 'announcements'>('overview');

  useEffect(() => {
    const targetFamily = resolveUnitFromUser(currentUser);
    setActiveFamilyUnit(targetFamily);
  }, [currentUser]);

  const cleanFamilyName = activeFamilyUnit.replace(/\s*Family\s*/gi, '').trim() || 'Wisdom';
  const familyOptions = [cleanFamilyName, `${cleanFamilyName} Family`];
  const familyDisplayName = `${cleanFamilyName} Family`;

  const [familyMembers, setFamilyMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [welfareTickets, setWelfareTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Lock Engine States
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('family_head_session_unlocked') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Hidden PIN Configuration States
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  // Welfare Form States
  const [welfareMemberId, setWelfareMemberId] = useState('');
  const [welfareCategory, setWelfareCategory] = useState('');
  const [welfareAmount, setWelfareAmount] = useState('');
  const [welfareReason, setWelfareReason] = useState('');
  const [submittingWelfare, setSubmittingWelfare] = useState(false);

  // Finance Form States
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualSearchIndex, setManualSearchIndex] = useState(-1);
  const [manualMemberId, setManualMemberId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualPurpose, setManualPurpose] = useState('');

  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomePurpose, setNewIncomePurpose] = useState('');
  const [newIncomeDate, setNewIncomeDate] = useState(new Date().toISOString().split('T')[0]);

  const [familyExpenseAmount, setFamilyExpenseAmount] = useState('');
  const [familyExpensePurpose, setFamilyExpensePurpose] = useState('');
  const [familyExpenseDate, setFamilyExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Announcement Form States
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  // Avatar upload hook
  const handleProfilePictureSave = async (imageDataUrl: string, imageFile: Blob) => {
    if (!currentUser) return;
    try {
      const storageUrl = await uploadProfilePicture(currentUser.id, imageFile, imageDataUrl);
      const finalImageUrl = storageUrl || imageDataUrl;

      const updatedMembers = members.map(m =>
        m.id === currentUser.id ? { ...m, profilePic: finalImageUrl } : m
      );
      setMembers(updatedMembers);
      setCurrentUser({ ...currentUser, profilePic: finalImageUrl });
      toast.success('✓ Profile picture updated successfully!');
    } catch (err: any) {
      console.error('Failed to upload avatar:', err);
      toast.error('Failed to update profile picture.');
    }
  };

  // Handler A: Verify Input Credentials
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);
    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'FAMILY_HEAD',
        input_pin: pinInput
      });
      if (error) throw error;
      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('family_head_session_unlocked', 'true');
        setPinInput("");
      } else {
        setPinError("Invalid Executive Security PIN. Access Denied.");
      }
    } catch (error: any) {
      console.error("Security Gateway Exception:", error.message);
      setPinError("Verification gateway encountered an error.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleLockDashboard = () => {
    setIsExecutiveUnlocked(false);
    sessionStorage.removeItem('family_head_session_unlocked');
  };

  // Handler B: PIN Mutation API
  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);
    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'FAMILY_HEAD',
        old_pin: currentPin,
        new_pin: newPin
      });
      if (error) throw error;
      if (isSuccess) {
        setPinChangeSuccess(true);
        setCurrentPin("");
        setNewPin("");
        setTimeout(() => {
          setIsChangingPin(false);
          setPinChangeSuccess(false);
        }, 2000);
      } else {
        setPinChangeError("Current Gateway PIN is invalid.");
      }
    } catch (error: any) {
      console.error("PIN Update Error:", error.message);
      setPinChangeError("Failed to persist security token update.");
    } finally {
      setIsSubmittingPinChange(false);
    }
  };

  // Family Liturgical duties state & fetch
  const [familyAssignments, setFamilyAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

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

  const fetchLastFellowshipAttendance = async () => {
    if (!cleanFamilyName) return;
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

            const mFamily = memberProfile
              ? (memberProfile.family || memberProfile.cmo_family || '')
              : (row.family || '');

            const isMyFamily = mFamily.toLowerCase().includes(cleanFamilyName.toLowerCase());

            if (isMyFamily) {
              if (row.status === 'Present') present++;
              else if (row.status === 'Absent') absent++;
            }

            if (row.status === 'Present') {
              const famLower = mFamily.toLowerCase().trim();
              if (famLower.includes('wisdom')) wisdomCount++;
              else if (famLower.includes('talent')) talentCount++;
              else if (famLower.includes('honour')) honourCount++;
              else if (famLower.includes('integrity')) integrityCount++;
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
    }
  };

  const fetchFamilyAssignments = async () => {
    if (!cleanFamilyName) return;
    setAssignmentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('liturgical_assignments')
        .select('*')
        .eq('assigned_family', cleanFamilyName)
        .order('activity_date', { ascending: true });
      if (error) throw error;
      setFamilyAssignments(data || []);
    } catch (err) {
      console.error("Error fetching family spiritual duties:", err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyAssignments();
    const channel = supabase
      .channel(`family-head-spiritual-${cleanFamilyName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'liturgical_assignments', filter: `assigned_family=eq.${cleanFamilyName}` },
        () => fetchFamilyAssignments()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cleanFamilyName]);

  useEffect(() => {
    fetchLastFellowshipAttendance();
    const meetingsChannel = supabase
      .channel(`family-head-meetings-${cleanFamilyName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fellowship_meetings' }, () => fetchLastFellowshipAttendance())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fellowship_attendance' }, () => fetchLastFellowshipAttendance())
      .subscribe();

    return () => {
      supabase.removeChannel(meetingsChannel);
    };
  }, [cleanFamilyName]);

  const getStatusBadge = (status: string) => {
    const statusVal = status || 'Assigned';
    if (statusVal === 'Completed') {
      return <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">Completed</span>;
    }
    if (statusVal === 'Pending') {
      return <span className="bg-orange-950/60 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">Pending</span>;
    }
    return <span className="bg-blue-950/60 text-[#ffd700] border border-blue-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">Assigned</span>;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: membersData, error: membersErr } = await supabase
        .from('members')
        .select('*')
        .in('cmo_family', familyOptions);

      if (membersErr) console.warn("Error loading members:", membersErr);

      const mappedMembers = (membersData || []).map((m: any) => ({
        id: m.official_member_id || m.id,
        name: m.full_name || m.name,
        full_name: m.full_name || m.name,
        official_member_id: m.official_member_id || undefined,
        phone_number: m.phone_number || undefined,
        status: m.status as any,
        balance: Number(m.balance) || 0,
        role: m.role as any,
        family: m.cmo_family || m.family as any,
        cmo_family: m.cmo_family || m.family || undefined,
        phone: m.phone_number || m.phone || undefined,
        email: m.email || undefined,
        profilePic: m.avatar_url || m.profile_picture_url || null
      }));

      setFamilyMembers(mappedMembers);

      const { data: meetingsData, error: meetingsErr } = await supabase
        .from('family_meetings')
        .select('*')
        .in('cmo_family', familyOptions);

      if (meetingsErr) console.warn("Error loading meetings:", meetingsErr);
      const loadedMeetings = meetingsData || [];
      setMeetings(loadedMeetings);

      if (loadedMeetings.length > 0) {
        const meetingIds = loadedMeetings.map(m => m.id);
        const { data: attendanceData, error: attendanceErr } = await supabase
          .from('family_attendance')
          .select('*')
          .in('meeting_id', meetingIds);

        if (attendanceErr) console.warn("Error loading attendance:", attendanceErr);
        setAttendance(attendanceData || []);
      } else {
        setAttendance([]);
      }

      const familyMemberIds = mappedMembers.map(m => m.official_member_id).filter(Boolean);
      if (familyMemberIds.length > 0) {
        const { data: welfareData, error: welfareErr } = await supabase
          .from('welfare_tickets')
          .select('*')
          .in('official_member_id', familyMemberIds)
          .order('created_at', { ascending: false });

        if (welfareErr) console.warn("Error loading welfare tickets:", welfareErr);
        setWelfareTickets(welfareData || []);
      } else {
        setWelfareTickets([]);
      }
    } catch (err) {
      console.error("Error fetching Family Head portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeFamilyUnit, currentUser]);

  // Calculations
  const activeMembers = familyMembers.filter(m => m.status !== 'Deceased');
  const totalMembersCount = activeMembers.length;

  const totalPresent = attendance.filter(a => a.status === 'Present').length;
  const totalAttendanceRecords = attendance.length;
  const attendanceRate = totalAttendanceRecords > 0 ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 100;

  const getConsecutiveMisses = () => {
    if (meetings.length < 2) return [];
    const sortedMeetings = [...meetings].sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());
    const lastTwoMeetings = sortedMeetings.slice(0, 2);
    const lastTwoIds = lastTwoMeetings.map(m => m.id);

    return activeMembers.filter(member => {
      const memberId = member.official_member_id || member.id;
      const records = attendance.filter(a => a.official_member_id === memberId && lastTwoIds.includes(a.meeting_id));
      return records.length === 2 && records.every(r => r.status === 'Absent');
    });
  };

  const flaggedMembers = getConsecutiveMisses();

  const filteredRoster = familyMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.official_member_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Submit Family Welfare Request
  const handleWelfareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!welfareMemberId || !welfareCategory || !welfareAmount) {
      toast.error("Please fill in all fields.");
      return;
    }
    const member = familyMembers.find(m => m.official_member_id === welfareMemberId);
    if (!member) {
      toast.error("Selected member could not be found.");
      return;
    }
    const amountVal = parseFloat(welfareAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Please specify a valid amount.");
      return;
    }

    setSubmittingWelfare(true);
    try {
      const { error } = await supabase
        .from('welfare_tickets')
        .insert([{
          official_member_id: welfareMemberId,
          member_name: member.full_name || member.name,
          category: welfareCategory,
          requested_amount: amountVal,
          reason_details: welfareReason.trim(),
          status: 'Pending'
        }]);

      if (error) throw error;

      toast.success("Welfare request logged successfully!");
      setWelfareMemberId('');
      setWelfareCategory('');
      setWelfareAmount('');
      setWelfareReason('');

      const familyMemberIds = familyMembers.map(m => m.official_member_id).filter(Boolean);
      if (familyMemberIds.length > 0) {
        const { data: updatedWelfare } = await supabase
          .from('welfare_tickets')
          .select('*')
          .in('official_member_id', familyMemberIds)
          .order('created_at', { ascending: false });
        setWelfareTickets(updatedWelfare || []);
      }
    } catch (err: any) {
      console.error("Welfare logging error:", err);
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingWelfare(false);
    }
  };

  // Settle Welfare Ticket & Record Expense
  const handleSettleFamilyTicket = (ticketId: string) => {
    const ticket = welfareTickets.find(t => t.id === ticketId || t.ticket_id === ticketId);
    if (!ticket) return;

    const amount = ticket.requested_amount || ticket.amount || 0;
    const updatedTickets = welfareTickets.map(t =>
      (t.id === ticketId || t.ticket_id === ticketId)
        ? { ...t, status: 'Settled & Cleared' }
        : t
    );
    setWelfareTickets(updatedTickets);

    const expense: FamilyExpense = {
      id: generateExpenseId(),
      amount: amount,
      purpose: `Welfare disbursement for ${ticket.member_name}`,
      date: new Date().toISOString().split('T')[0],
      recordedBy: currentUser?.name || 'Family Head',
      family: cleanFamilyName as Family
    };
    setFamilyExpenses([...familyExpenses, expense]);
    toast.success(`Ticket settled and recorded as expense.`);
  };

  // Financial Handlers
  const handleRecordFamilyIncome = () => {
    if (!newIncomeAmount || !newIncomePurpose || !newIncomeDate) {
      toast.error('Please fill all income fields');
      return;
    }
    const amount = parseFloat(newIncomeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }
    const transaction: FamilyTransaction = {
      memberId: 'FAMILY',
      amount,
      purpose: newIncomePurpose,
      timestamp: new Date(newIncomeDate).toISOString(),
      family: cleanFamilyName as Family
    };
    setFamilyTransactions([...familyTransactions, transaction]);
    toast.success(`Family income recorded: ${formatCurrency(amount)}`);
    setNewIncomeAmount('');
    setNewIncomePurpose('');
    setNewIncomeDate(new Date().toISOString().split('T')[0]);
  };

  const handleRecordFamilyExpense = () => {
    if (!familyExpenseAmount || !familyExpensePurpose || !familyExpenseDate) {
      toast.error('Please fill all expense fields');
      return;
    }
    const amount = parseFloat(familyExpenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }
    const expense: FamilyExpense = {
      id: generateExpenseId(),
      amount,
      purpose: familyExpensePurpose,
      date: familyExpenseDate,
      recordedBy: currentUser?.name || 'Family Head',
      family: cleanFamilyName as Family
    };
    setFamilyExpenses([...familyExpenses, expense]);
    toast.success(`Family expense recorded: ${formatCurrency(amount)}`);
    setFamilyExpenseAmount('');
    setFamilyExpensePurpose('');
    setFamilyExpenseDate(new Date().toISOString().split('T')[0]);
  };

  const manualSearchResults = manualSearchQuery.trim()
    ? familyMembers
        .filter(m => `${m.name} ${m.official_member_id || m.id}`.toLowerCase().includes(manualSearchQuery.toLowerCase()))
        .slice(0, 10)
    : [];
  const selectedManualMember = familyMembers.find(m => (m.official_member_id || m.id) === manualMemberId);
  const showManualSearchResults = Boolean(
    manualSearchQuery.trim() &&
    manualSearchResults.length > 0 &&
    (!selectedManualMember || manualSearchQuery !== `${selectedManualMember.name} (${selectedManualMember.official_member_id || selectedManualMember.id})`)
  );

  const selectManualMember = (memberId: string, displayText: string) => {
    setManualMemberId(memberId);
    setManualSearchQuery(displayText);
    setManualSearchIndex(-1);
  };

  const handleManualTransaction = () => {
    if (!manualMemberId || !manualAmount || !manualPurpose) {
      toast.error('Please fill all manual transaction fields');
      return;
    }
    const member = familyMembers.find(m => (m.official_member_id || m.id) === manualMemberId);
    if (!member) {
      toast.error('Family member not found');
      return;
    }
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount.');
      return;
    }
    const updatedMembers = members.map(m =>
      (m.official_member_id || m.id) === manualMemberId
        ? { ...m, balance: m.balance + amount, status: 'Active' as const }
        : m
    );
    setMembers(updatedMembers);

    const transaction: FamilyTransaction = {
      memberId: manualMemberId,
      amount,
      purpose: manualPurpose,
      timestamp: new Date().toISOString(),
      family: cleanFamilyName as Family
    };
    setFamilyTransactions([...familyTransactions, transaction]);
    toast.success(`Manual transaction recorded: ${formatCurrency(amount)} for ${member.name}`);
    setManualMemberId('');
    setManualSearchQuery('');
    setManualAmount('');
    setManualPurpose('');
  };

  const handlePrintLedger = () => {
    window.print();
  };

  // Post Announcement Handler
  const handlePostFamilyAnnouncement = () => {
    if (!announcementTitle || !announcementContent) {
      toast.error('Please fill title and content');
      return;
    }
    const announcement: FamilyAnnouncement = {
      id: generateAnnouncementId(),
      title: announcementTitle,
      content: announcementContent,
      author: currentUser?.name || 'Family Head',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      family: cleanFamilyName as Family
    };
    setFamilyAnnouncements([announcement, ...familyAnnouncements]);
    setAnnouncementTitle('');
    setAnnouncementContent('');
    toast.success('Family announcement posted successfully!');
  };

  // Filtered Finance Data
  const currentFamilyTxs = familyTransactions.filter(tx => tx.family === cleanFamilyName);
  const currentFamilyExps = familyExpenses.filter(exp => exp.family === cleanFamilyName);
  const currentFamilyAnnouncements = familyAnnouncements.filter(ann => ann.family === cleanFamilyName);
  const familyLedger = getCombinedTransactions(currentFamilyTxs, currentFamilyExps);
  const totalIncomeVal = calculateTotal(currentFamilyTxs);
  const totalExpensesVal = calculateTotal(currentFamilyExps);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#001a16] p-6 flex items-center justify-center">
        <div className="text-[#ffd700] text-lg font-semibold animate-pulse">Loading Family Head Portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#001a16] p-4 md:p-8 font-sans text-gray-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#002520] p-6 rounded-xl border border-[#ffd700]/20 shadow-xl">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#ffd700]/10 border border-[#ffd700]/30 px-2.5 py-0.5 rounded-full">
                <Shield className="w-4 h-4 text-[#ffd700]" />
                <span className="text-[#ffd700] font-bold text-xs uppercase tracking-wider">Leadership Portal</span>
              </div>

              {isFamilyOfficer ? (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Assigned Family Unit:</span>
                  <span className="bg-yellow-400 text-black font-bold px-3 py-1 rounded-full text-xs uppercase">
                    {cleanFamilyName}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-[#001a16] border border-[#ffd700]/30 p-1 rounded-lg text-xs font-semibold text-gray-300">
                  <span className="text-gray-400 pl-1 text-[11px]">Active Unit:</span>
                  {(['Wisdom', 'Honour', 'Integrity', 'Talent'] as const).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setActiveFamilyUnit(unit)}
                      className={`px-2.5 py-0.5 rounded transition-all cursor-pointer text-xs ${
                        cleanFamilyName.toLowerCase() === unit.toLowerCase()
                          ? 'bg-[#ffd700] text-[#001a16] font-extrabold shadow-sm'
                          : 'hover:text-[#ffd700] hover:bg-[#ffd700]/10'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-white">{familyDisplayName} Leadership Hub</h1>
            <p className="text-gray-400 text-sm mt-1">
              Family Head: <span className="text-white font-medium">{currentUser?.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchData}
              className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold"
            >
              Refresh Hub
            </Button>
            {isExecutiveUnlocked && (
              <button
                onClick={handleLockDashboard}
                className="bg-[#002520] hover:bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/30 px-3 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                title="Lock Executive Workspace"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Lock
              </button>
            )}
          </div>
        </div>

        {/* Profile Card */}
        {currentUser && (
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <ProfilePictureUploader
                  currentImage={currentUser.profilePic}
                  onSave={handleProfilePictureSave}
                  memberName={currentUser.name}
                  size="sm"
                  extraContent={
                    <>
                      <div className="border-t border-white/10 my-4" />
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
                              <input type="password" maxLength={6} placeholder="••••••" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))} className="w-full bg-[#001411] border border-gray-700 text-white p-2 rounded text-sm text-center font-mono focus:border-[#ffd700] focus:outline-none" required />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] text-gray-400">New Secret PIN</label>
                              <input type="password" maxLength={6} placeholder="••••••" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} className="w-full bg-[#001411] border border-gray-700 text-white p-2 rounded text-sm text-center font-mono focus:border-[#ffd700] focus:outline-none" required />
                            </div>
                          </div>
                          {pinChangeError && <p className="text-red-400 text-xs font-semibold text-center">{pinChangeError}</p>}
                          {pinChangeSuccess && <p className="text-green-400 text-xs font-semibold text-center">PIN successfully updated!</p>}
                          <button type="submit" disabled={isSubmittingPinChange || newPin.length < 4 || currentPin.length < 4} className="w-full bg-[#ffd700] text-[#001a16] font-bold text-xs py-2 rounded hover:bg-[#e6c200] transition-colors disabled:opacity-40 cursor-pointer">
                            {isSubmittingPinChange ? "Processing Update..." : "Confirm Security Change"}
                          </button>
                        </form>
                      )}
                    </>
                  }
                />
              </div>
              <div className="flex-grow w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Name</p>
                    <p className="text-white font-bold text-sm truncate">{currentUser.name}</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Designation</p>
                    <p className="text-[#ffd700] font-bold text-sm">FAMILY HEAD</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Family Unit</p>
                    <p className="text-white font-bold text-sm truncate">{familyDisplayName}</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Phone</p>
                    <p className="text-white font-bold text-sm truncate">{currentUser.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {!isExecutiveUnlocked ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#001411] border border-[#ffd700]/20 rounded-lg max-w-md mx-auto text-center space-y-6 my-8 shadow-xl">
            <div className="p-3 bg-[#002a24] rounded-full border border-[#ffd700]/30 text-[#ffd700]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#ffd700]">Executive Security Gateway</h3>
              <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to access Family Head administrative features.</p>
            </div>
            <form onSubmit={handleVerifyPin} className="w-full space-y-4">
              <input type="password" maxLength={6} placeholder="Enter Secret PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))} className="w-full text-center tracking-widest bg-[#001f1a] border border-[#ffd700] text-white rounded p-3 focus:outline-none text-xl font-mono" />
              {pinError && <p className="text-red-400 text-xs font-semibold">{pinError}</p>}
              <button type="submit" disabled={isVerifyingPin || pinInput.length < 4} className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-[#001a16] font-bold py-2.5 rounded transition-colors disabled:opacity-50 cursor-pointer">
                {isVerifyingPin ? "Verifying..." : "Unlock Family Head Portal"}
              </button>
            </form>
          </div>
        ) : (
          /* UNLOCKED 5-TAB OPERATIONAL WORKSPACE */
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-6">
            <TabsList className="bg-[#002520] border border-[#ffd700]/30 p-1.5 rounded-xl flex flex-wrap gap-2">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] font-bold text-xs md:text-sm px-4 py-2 rounded-lg transition-all cursor-pointer">
                Overview
              </TabsTrigger>
              <TabsTrigger value="welfare" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] font-bold text-xs md:text-sm px-4 py-2 rounded-lg transition-all cursor-pointer">
                Welfare & Disbursement
              </TabsTrigger>
              <TabsTrigger value="finance" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] font-bold text-xs md:text-sm px-4 py-2 rounded-lg transition-all cursor-pointer">
                Finance
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] font-bold text-xs md:text-sm px-4 py-2 rounded-lg transition-all cursor-pointer">
                Reports
              </TabsTrigger>
              <TabsTrigger value="announcements" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] font-bold text-xs md:text-sm px-4 py-2 rounded-lg transition-all cursor-pointer">
                Announcements
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl hover:scale-102 transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Total Members</p>
                      <h3 className="text-4xl font-extrabold text-white mt-2">{totalMembersCount}</h3>
                      <p className="text-xs text-gray-400 mt-2">Active registered profiles</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl hover:scale-102 transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Attendance Rate</p>
                      <h3 className="text-4xl font-extrabold text-[#ffd700] mt-2">{attendanceRate}%</h3>
                      <p className="text-xs text-gray-400 mt-2">Based on {meetings.length} family meeting(s)</p>
                    </div>
                    <div className="p-3 bg-[#ffd700]/10 rounded-lg text-[#ffd700] border border-[#ffd700]/20">
                      <CalendarCheck className="w-6 h-6" />
                    </div>
                  </div>
                </Card>

                <Card className={`bg-[#002520] border p-6 rounded-xl hover:scale-102 transition-transform duration-300 ${flaggedMembers.length > 0 ? 'border-red-500/30 bg-red-950/10' : 'border-[#ffd700]/10'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Welfare Checks</p>
                      <h3 className={`text-4xl font-extrabold mt-2 ${flaggedMembers.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {flaggedMembers.length}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2">Missed last 2 consecutive meetings</p>
                    </div>
                    <div className={`p-3 rounded-lg border ${flaggedMembers.length > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                      <HeartPulse className="w-6 h-6" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl hover:scale-102 transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Income / Expenses</p>
                      <h3 className="text-2xl font-extrabold text-green-400 mt-2">{formatCurrency(totalIncomeVal)}</h3>
                      <p className="text-xs text-red-400 mt-1">Exp: {formatCurrency(totalExpensesVal)}</p>
                    </div>
                    <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400 border border-teal-500/20">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Liturgical Duties */}
              <Card className="bg-[#002520] border border-[#ffd700]/25 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-[#ffd700]" />
                  Family Liturgical Duties Schedule
                </h2>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded p-4">
                  {assignmentsLoading ? (
                    <p className="text-gray-400 text-center py-4 font-semibold animate-pulse">Loading family duties...</p>
                  ) : familyAssignments.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No upcoming liturgical duties scheduled for the {familyDisplayName}.</p>
                  ) : (
                    <div className="space-y-3">
                      {familyAssignments.map((assignment) => (
                        <div key={assignment.id} className="p-3 bg-[#002520]/60 rounded border border-[#ffd700]/15 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:scale-[1.01] transition-transform">
                          <div>
                            <h4 className="text-white font-bold text-sm uppercase">{assignment.activity_name}</h4>
                            <p className="text-gray-400 text-xs mt-0.5">
                              Duty Role: <span className="text-[#ffd700] font-semibold">{assignment.duty_role}</span>
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
              </Card>

              {/* Welfare Alert Section */}
              {flaggedMembers.length > 0 && (
                <div className="bg-red-950/20 border-2 border-red-500/30 p-6 rounded-xl">
                  <h2 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 animate-pulse" />
                    Urgent Welfare Outreach Required
                  </h2>
                  <p className="text-gray-300 text-sm mb-4">
                    The following members have been absent for the last 2 consecutive family meetings. Please reach out to check on their well-being.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {flaggedMembers.map((m) => (
                      <div key={m.id} className="bg-[#002520] p-4 rounded-lg border border-red-500/20 flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-white uppercase">{m.name}</h4>
                          <p className="text-xs text-gray-400">{m.official_member_id || 'No ID assigned'}</p>
                        </div>
                        <div className="flex gap-2">
                          {m.phone_number && (
                            <>
                              <a href={`tel:${m.phone_number}`} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors" title="Call member">
                                <PhoneCall className="w-4 h-4" />
                              </a>
                              <a href={`sms:${m.phone_number}`} className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors" title="Send SMS">
                                <Send className="w-4 h-4" />
                              </a>
                              <a href={`https://wa.me/${m.phone_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors" title="WhatsApp chat">
                                <MessageSquare className="w-4 h-4" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Roster Directory */}
              <div className="bg-[#002520] border border-[#ffd700]/10 rounded-xl p-6 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#ffd700]" />
                    Family Roster Directory
                  </h2>
                  <input
                    type="text"
                    placeholder="Search members by name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#001a16] border border-[#ffd700]/20 rounded px-4 py-2 text-sm w-full md:w-80 focus:outline-none focus:border-[#ffd700]/50"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[#ffd700]/10 text-gray-400 font-semibold">
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Member ID</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Phone Number</th>
                        <th className="py-3 px-4 text-center">Contact Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoster.length > 0 ? (
                        filteredRoster.map((member) => (
                          <tr key={member.id} className="border-b border-[#ffd700]/5 hover:bg-[#001a16]/40 transition-colors">
                            <td className="py-4 px-4 font-bold text-white uppercase">{member.name}</td>
                            <td className="py-4 px-4 font-mono text-gray-300">{member.official_member_id || 'Pending'}</td>
                            <td className="py-4 px-4 text-xs text-gray-400 uppercase">{member.role.replace('_', ' ')}</td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                member.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                member.status === 'Inactive' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                              }`}>
                                {member.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-gray-300">{member.phone_number || member.phone || 'N/A'}</td>
                            <td className="py-4 px-4">
                              <div className="flex gap-2 justify-center">
                                {member.phone_number || member.phone ? (
                                  <>
                                    <a href={`tel:${member.phone_number || member.phone}`} className="bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 p-2 rounded-lg border border-blue-500/20 transition-all" title="Call Member">
                                      <PhoneCall className="w-4 h-4" />
                                    </a>
                                    <a href={`sms:${member.phone_number || member.phone}`} className="bg-purple-600/10 hover:bg-purple-600 hover:text-white text-purple-400 p-2 rounded-lg border border-purple-500/20 transition-all" title="Send SMS">
                                      <Send className="w-4 h-4" />
                                    </a>
                                    <a href={`https://wa.me/${(member.phone_number || member.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-green-600/10 hover:bg-green-600 hover:text-white text-green-400 p-2 rounded-lg border border-green-500/20 transition-all" title="WhatsApp Chat">
                                      <MessageSquare className="w-4 h-4" />
                                    </a>
                                  </>
                                ) : (
                                  <span className="text-gray-500 text-xs">No Contact Details</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400">
                            No matching family members found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: WELFARE & DISBURSEMENT */}
            <TabsContent value="welfare" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Welfare Case Tracker */}
                <div className="lg:col-span-2 bg-[#002520] border border-[#ffd700]/10 rounded-xl p-6 shadow-lg">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                    <HeartHandshake className="w-5 h-5 text-[#ffd700]" />
                    Welfare Case Tracker & Disbursement
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#ffd700]/10 text-gray-400 font-semibold">
                          <th className="py-3 px-4">Member</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {welfareTickets.length > 0 ? (
                          welfareTickets.map((ticket) => {
                            const tId = ticket.id || ticket.ticket_id;
                            const isSettled = ticket.status === 'Settled & Cleared' || ticket.status === 'Approved' || ticket.status === 'Completed';
                            return (
                              <tr key={tId} className="border-b border-[#ffd700]/5 hover:bg-[#001a16]/40 transition-colors">
                                <td className="py-4 px-4 font-bold text-white uppercase">{ticket.member_name}</td>
                                <td className="py-4 px-4 text-gray-300">{ticket.category}</td>
                                <td className="py-4 px-4 text-[#ffd700] font-mono">₦{(ticket.requested_amount || ticket.amount || 0).toLocaleString()}</td>
                                <td className="py-4 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    isSettled ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                    ticket.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                    'bg-red-500/10 text-red-400 border border-red-500/20'
                                  }`}>
                                    {ticket.status}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  {!isSettled ? (
                                    <Button
                                      onClick={() => handleSettleFamilyTicket(tId)}
                                      className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs py-1 px-3"
                                    >
                                      Settle & Record Expense
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-400">Cleared</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-400">
                              No ongoing family welfare cases recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Log Welfare Ticket Form */}
                <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#ffd700]" />
                    Submit Welfare Request
                  </h3>
                  <form onSubmit={handleWelfareSubmit} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Select Member</label>
                      <select
                        value={welfareMemberId}
                        onChange={(e) => setWelfareMemberId(e.target.value)}
                        className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                      >
                        <option value="">Choose member...</option>
                        {familyMembers.map((m) => (
                          <option key={m.id} value={m.official_member_id}>
                            {m.name} ({m.official_member_id})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Package Category</label>
                      <select
                        value={welfareCategory}
                        onChange={(e) => setWelfareCategory(e.target.value)}
                        className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                      >
                        <option value="">Choose category...</option>
                        <option value="Medical Assistance">Medical Assistance</option>
                        <option value="Death Levy">Death Levy Support</option>
                        <option value="Child Birth Support">Child Birth Support</option>
                        <option value="Emergency Assistance">Emergency Assistance</option>
                        <option value="Wife's Death">Wife's Death Support</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Requested Amount (₦)</label>
                      <input
                        type="number"
                        placeholder="e.g. 20000"
                        value={welfareAmount}
                        onChange={(e) => setWelfareAmount(e.target.value)}
                        className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Case Reason / Details</label>
                      <textarea
                        rows={3}
                        placeholder="Describe the medical, emergency, or support scenario..."
                        value={welfareReason}
                        onChange={(e) => setWelfareReason(e.target.value)}
                        className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 resize-none"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submittingWelfare}
                      className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold flex items-center justify-center gap-2 mt-2"
                    >
                      {submittingWelfare ? 'Logging Request...' : 'Submit Request'}
                    </Button>
                  </form>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 3: FINANCE */}
            <TabsContent value="finance" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Manual Transaction Entry */}
                <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Manual Transaction Entry
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-300 text-sm block mb-2">Search Member</label>
                      <Input
                        value={manualSearchQuery}
                        onChange={(e) => {
                          setManualSearchQuery(e.target.value);
                          setManualSearchIndex(-1);
                          if (!e.target.value) setManualMemberId('');
                        }}
                        placeholder="Search by name or ID"
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                        autoComplete="off"
                      />
                      {showManualSearchResults && (
                        <div className="mt-2 max-h-52 overflow-y-auto rounded border border-[#ffd700]/50 bg-[#001a16]">
                          {manualSearchResults.map((member, index) => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => selectManualMember(member.official_member_id || member.id, `${member.name} (${member.official_member_id || member.id})`)}
                              className={`w-full text-left px-3 py-2 text-sm ${manualSearchIndex === index ? 'bg-[#ffd700]/30 text-white' : 'text-white hover:bg-[#ffd700]/20'}`}
                            >
                              {member.name} — {member.official_member_id || member.id}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm block mb-2">Member ID</label>
                      <Input
                        value={manualMemberId}
                        onChange={(e) => setManualMemberId(e.target.value.toUpperCase())}
                        placeholder="HCC-CMO-26-XXXX"
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm block mb-2">Amount (₦)</label>
                      <Input
                        type="number"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm block mb-2">Purpose</label>
                      <Input
                        value={manualPurpose}
                        onChange={(e) => setManualPurpose(e.target.value)}
                        placeholder="e.g., Welfare Dues, Monthly Dues"
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                      />
                    </div>
                    <Button onClick={handleManualTransaction} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold">
                      Record Manual Entry
                    </Button>
                  </div>
                </Card>

                {/* Record Family Income */}
                <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Record Family Income
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-300 text-sm block mb-2">Amount (₦)</label>
                      <Input
                        type="number"
                        value={newIncomeAmount}
                        onChange={(e) => setNewIncomeAmount(e.target.value)}
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm block mb-2">Purpose</label>
                      <Input
                        value={newIncomePurpose}
                        onChange={(e) => setNewIncomePurpose(e.target.value)}
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                        placeholder="e.g., Family Covenant Levy"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm block mb-2">Date</label>
                      <Input
                        type="date"
                        value={newIncomeDate}
                        onChange={(e) => setNewIncomeDate(e.target.value)}
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                      />
                    </div>
                    <Button onClick={handleRecordFamilyIncome} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold">
                      Record Income
                    </Button>
                  </div>
                </Card>

                {/* Record Family Expense */}
                <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-red-400" />
                    Record Family Expense
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-300 text-sm block mb-2">Amount (₦)</label>
                      <Input
                        type="number"
                        value={familyExpenseAmount}
                        onChange={(e) => setFamilyExpenseAmount(e.target.value)}
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm block mb-2">Purpose</label>
                      <Input
                        value={familyExpensePurpose}
                        onChange={(e) => setFamilyExpensePurpose(e.target.value)}
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                        placeholder="e.g., Supplies, Welfare Support"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm block mb-2">Date</label>
                      <Input
                        type="date"
                        value={familyExpenseDate}
                        onChange={(e) => setFamilyExpenseDate(e.target.value)}
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                      />
                    </div>
                    <Button onClick={handleRecordFamilyExpense} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold">
                      Record Expense
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Ledger Table */}
              <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
                  <h3 className="text-xl font-bold text-[#ffd700]">Family Financial Ledger</h3>
                  <Button onClick={handlePrintLedger} className="w-full md:w-auto bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold">
                    <Printer className="w-4 h-4 mr-2 inline" />
                    Print Statement
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#ffd700]/30 hover:bg-[#001a16]">
                        <TableHead className="text-[#ffd700]">Date</TableHead>
                        <TableHead className="text-[#ffd700]">Type</TableHead>
                        <TableHead className="text-[#ffd700]">Description</TableHead>
                        <TableHead className="text-[#ffd700]">Credit</TableHead>
                        <TableHead className="text-[#ffd700]">Debit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {familyLedger.length > 0 ? (
                        familyLedger.map((item, idx) => (
                          <TableRow key={idx} className="border-[#ffd700]/15 hover:bg-[#001a16]">
                            <TableCell className="text-gray-400 text-sm">{formatDate(item.timestamp)}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded font-semibold ${item.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {item.type === 'income' ? 'Income' : 'Expense'}
                              </span>
                            </TableCell>
                            <TableCell className="text-white">{item.purpose}</TableCell>
                            <TableCell className="text-green-400 font-semibold">{item.type === 'income' ? formatCurrency(item.amount) : '-'}</TableCell>
                            <TableCell className="text-red-400 font-semibold">{item.type === 'expense' ? formatCurrency(item.amount) : '-'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6 text-center text-gray-400">
                            No ledger transactions recorded yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 4: REPORTS */}
            <TabsContent value="reports" className="space-y-6">
              <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-[#ffd700] mb-4">Family Operational & Financial Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Contributors */}
                  <div className="bg-[#001a16] border border-[#ffd700]/20 p-5 rounded-xl">
                    <h4 className="text-white font-bold text-base mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      Top Contributors (by Total Amount)
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const byMember: Record<string, number> = {};
                        currentFamilyTxs.forEach(t => { byMember[t.memberId] = (byMember[t.memberId] || 0) + t.amount; });
                        const top = Object.entries(byMember).sort((a,b) => b[1]-a[1]).slice(0,5);
                        if (top.length === 0) return <p className="text-gray-400 text-sm">No recorded contributions yet.</p>;
                        return top.map(([mId, amt]) => {
                          const mName = familyMembers.find(m => (m.official_member_id || m.id) === mId)?.name || mId;
                          return (
                            <div key={mId} className="flex justify-between items-center bg-[#002520] p-2.5 rounded border border-[#ffd700]/10">
                              <span className="text-white text-sm font-semibold truncate">{mName}</span>
                              <span className="text-green-400 font-bold font-mono">{formatCurrency(amt)}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Expense Breakdown */}
                  <div className="bg-[#001a16] border border-[#ffd700]/20 p-5 rounded-xl">
                    <h4 className="text-white font-bold text-base mb-3 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-red-400" />
                      Expense Category Breakdown
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const byPurpose: Record<string, number> = {};
                        currentFamilyExps.forEach(e => { byPurpose[e.purpose] = (byPurpose[e.purpose] || 0) + e.amount; });
                        const list = Object.entries(byPurpose).sort((a,b) => b[1]-a[1]).slice(0,6);
                        if (list.length === 0) return <p className="text-gray-400 text-sm">No recorded family expenses yet.</p>;
                        return list.map(([purpose, amt]) => (
                          <div key={purpose} className="flex justify-between items-center bg-[#002520] p-2.5 rounded border border-[#ffd700]/10">
                            <span className="text-white text-sm truncate">{purpose}</span>
                            <span className="text-red-400 font-bold font-mono">{formatCurrency(amt)}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 5: ANNOUNCEMENTS */}
            <TabsContent value="announcements" className="space-y-6">
              <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Family Announcements
                </h3>
                <div className="space-y-4 mb-8 bg-[#001a16] p-4 rounded-xl border border-[#ffd700]/20">
                  <h4 className="text-white font-semibold text-sm">Post New Subgroup Notice</h4>
                  <Input
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Announcement Title"
                    className="bg-[#002520] border-[#ffd700]/30 text-white"
                  />
                  <textarea
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    placeholder="Type notice message details..."
                    className="w-full bg-[#002520] border border-[#ffd700]/30 text-white p-3 rounded-lg min-h-[120px] focus:outline-none focus:border-[#ffd700]"
                  />
                  <Button onClick={handlePostFamilyAnnouncement} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold">
                    <Megaphone className="w-4 h-4 mr-2 inline" />
                    Publish Announcement
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-white font-semibold text-sm">Active Subgroup Announcements</h4>
                  {currentFamilyAnnouncements.length > 0 ? (
                    currentFamilyAnnouncements.map(ann => (
                      <div key={ann.id} className="bg-[#001a16] border border-[#ffd700]/20 p-4 rounded-xl space-y-1">
                        <h5 className="text-[#ffd700] font-bold text-base">{ann.title}</h5>
                        <p className="text-gray-300 text-sm leading-relaxed">{ann.content}</p>
                        <p className="text-xs text-gray-500 pt-2 font-mono">Posted by {ann.author} on {formatDateTime(ann.timestamp)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm py-4 text-center">No active announcements for {familyDisplayName}.</p>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
