import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { Member, Family, FamilyExpense, FamilyTransaction, FamilyAnnouncement } from '../../types';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { Heading } from '../../app/components/common/Heading';
import { toast } from 'sonner';
import { Calendar, ClipboardList, Clock, Shield, Plus, Save, Megaphone, FileText, Banknote, BookOpen, Users, CalendarCheck, TrendingUp, Receipt, DollarSign, Printer, ArrowUpRight } from 'lucide-react';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { calculateTotal, formatCurrency, formatDate, getCombinedTransactions, formatDateTime } from '../../utils/helpers';
import { generateExpenseId, generateAnnouncementId } from '../../utils/idGenerators';

export default function FamilySecDashboard() {
  const {
    currentUser,
    members,
    setMembers,
    setCurrentUser,
    familyTransactions: appFamilyTxs,
    setFamilyTransactions: setAppFamilyTxs,
    familyExpenses: appFamilyExps,
    setFamilyExpenses: setAppFamilyExps,
    familyAnnouncements: appFamilyAnnouncements,
    setFamilyAnnouncements: setAppFamilyAnnouncements,
    executives
  } = useApp();

  const getFamilyHeadName = (familyName: string) => {
    const officer = members.find(m => m.family === familyName && (m.role === 'FAMILY_HEAD' || m.role === 'family_head')) ||
                    executives?.find(e => e.family === familyName && (e.role === 'FAMILY_HEAD' || e.role === 'family_head'));
    if (officer && officer.name && officer.name !== officer.id && !officer.name.startsWith('HCC-CMO-')) {
      return officer.full_name || officer.name;
    }
    return 'Unassigned';
  };

  const getFamilySecName = (familyName: string) => {
    const officer = members.find(m => m.family === familyName && (m.role === 'FAMILY_SEC' || m.role === 'family_secretary' || m.role === 'family_sec')) ||
                    executives?.find(e => e.family === familyName && (e.role === 'FAMILY_SEC' || e.role === 'family_secretary' || e.role === 'family_sec'));
    if (officer && officer.name && officer.name !== officer.id && !officer.name.startsWith('HCC-CMO-')) {
      return officer.full_name || officer.name;
    }
    return 'Unassigned';
  };

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
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'reports' | 'announcements'>('overview');

  useEffect(() => {
    const targetFamily = resolveUnitFromUser(currentUser);
    setActiveFamilyUnit(targetFamily);
  }, [currentUser]);

  const cleanFamilyName = activeFamilyUnit.replace(/\s*Family\s*/gi, '').trim() || 'Wisdom';
  const familyOptions = [cleanFamilyName, `${cleanFamilyName} Family`];
  const familyDisplayName = `${cleanFamilyName} Family`;

  const [familyMembers, setFamilyMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);
  const [dbFamilyTransactions, setDbFamilyTransactions] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'Present' | 'Absent' | 'Excused'>>({});
  
  // Meeting form
  const [newMeetingDate, setNewMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMeetingType, setNewMeetingType] = useState('Monthly General');
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  // Announcement form
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  // Financial Entry Form States
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

  const [txMemberId, setTxMemberId] = useState('');
  const [txPurpose, setTxPurpose] = useState('Monthly Dues');
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [submittingTx, setSubmittingTx] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Lock Engine States
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('family_secretary_session_unlocked') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Hidden PIN Config States
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  // Avatar upload
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

  // Lock Handler
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);
    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'FAMILY_SECRETARY',
        input_pin: pinInput
      });
      if (error) throw error;
      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('family_secretary_session_unlocked', 'true');
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
    sessionStorage.removeItem('family_secretary_session_unlocked');
  };

  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);
    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'FAMILY_SECRETARY',
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

  // Duties & Fellowship
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
      .channel(`family-sec-spiritual-${cleanFamilyName}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'liturgical_assignments', filter: `assigned_family=eq.${cleanFamilyName}` }, () => fetchFamilyAssignments())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cleanFamilyName]);

  useEffect(() => {
    fetchLastFellowshipAttendance();
    const meetingsChannel = supabase
      .channel(`family-sec-meetings-${cleanFamilyName}`)
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
        .in('cmo_family', familyOptions)
        .order('meeting_date', { ascending: false });

      if (meetingsErr) console.warn("Error loading meetings:", meetingsErr);
      const loadedMeetings = meetingsData || [];
      setMeetings(loadedMeetings);

      if (loadedMeetings.length > 0) {
        handleSelectMeeting(loadedMeetings[0], mappedMembers);
      } else {
        setActiveMeeting(null);
      }

      const familyMemberIds = mappedMembers.map(m => m.official_member_id).filter(Boolean);
      if (familyMemberIds.length > 0) {
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .in('official_member_id', familyMemberIds)
          .order('created_at', { ascending: false });
        setDbFamilyTransactions(txData || []);
      }
    } catch (err) {
      console.error("Error loading Family Secretary data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeFamilyUnit, currentUser]);

  const handleSelectMeeting = async (meeting: any, currentRoster?: Member[]) => {
    setActiveMeeting(meeting);
    const activeRoster = currentRoster || familyMembers;

    try {
      const { data: existingAttendance } = await supabase
        .from('family_attendance')
        .select('*')
        .eq('meeting_id', meeting.id);

      const map: Record<string, 'Present' | 'Absent' | 'Excused'> = {};
      activeRoster.forEach(m => {
        const mId = m.official_member_id || m.id;
        const rec = existingAttendance?.find((a: any) => a.official_member_id === mId);
        map[mId] = rec ? (rec.status as any) : 'Absent';
      });

      setAttendanceMap(map);
    } catch (err) {
      console.error("Error loading attendance map:", err);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingDate) {
      toast.error("Please choose a date for the meeting.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('family_meetings')
        .insert([{
          meeting_date: newMeetingDate,
          meeting_type: newMeetingType,
          cmo_family: familyDisplayName,
          created_by: currentUser?.id
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success("New meeting workspace created successfully!");
      setIsCreatingMeeting(false);

      const updatedMeetings = [data, ...meetings];
      setMeetings(updatedMeetings);

      if (data) {
        setActiveMeeting(data);
        const defaultMap: Record<string, 'Present' | 'Absent' | 'Excused'> = {};
        familyMembers.forEach(m => {
          defaultMap[m.official_member_id || m.id] = 'Absent';
        });
        setAttendanceMap(defaultMap);
      }
    } catch (err: any) {
      console.error("Failed to create meeting:", err);
      toast.error(`Failed to create meeting: ${err.message}`);
    }
  };

  const handleSaveAttendance = async () => {
    if (!activeMeeting) {
      toast.error("No active meeting selected.");
      return;
    }

    setSaveLoading(true);
    try {
      const recordsToInsert = Object.entries(attendanceMap).map(([mId, status]) => ({
        meeting_id: activeMeeting.id,
        official_member_id: mId,
        status: status
      }));

      const { error: deleteErr } = await supabase
        .from('family_attendance')
        .delete()
        .eq('meeting_id', activeMeeting.id);

      if (deleteErr) throw deleteErr;

      if (recordsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('family_attendance')
          .insert(recordsToInsert);

        if (insertErr) throw insertErr;
      }

      toast.success("Attendance register updated successfully!");
    } catch (err: any) {
      console.error("Failed to save attendance register:", err);
      toast.error(`Failed to save register: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      toast.error("Please fill in title and content.");
      return;
    }

    try {
      const { error } = await supabase
        .from('family_announcements')
        .insert([{
          title: announcementTitle,
          content: announcementContent,
          created_by: currentUser?.name || currentUser?.full_name || 'Family Secretary',
          cmo_family: familyDisplayName
        }]);

      if (error) throw error;

      // Also update in AppContext state
      const newAnn: FamilyAnnouncement = {
        id: generateAnnouncementId(),
        title: announcementTitle,
        content: announcementContent,
        author: currentUser?.name || 'Family Secretary',
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        family: cleanFamilyName as Family
      };
      setAppFamilyAnnouncements([newAnn, ...appFamilyAnnouncements]);

      toast.success("Family Announcement published successfully!");
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (err: any) {
      console.error("Failed to post family announcement:", err);
      toast.error(`Posting failed: ${err.message}`);
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txMemberId || !txPurpose || !txAmount) {
      toast.error("Please fill in all fields.");
      return;
    }
    const member = familyMembers.find(m => (m.official_member_id || m.id) === txMemberId);
    if (!member) {
      toast.error("Selected member not found.");
      return;
    }
    const amountVal = parseFloat(txAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Please enter a valid positive amount.");
      return;
    }

    setSubmittingTx(true);
    try {
      const { error: txErr } = await supabase
        .from('transactions')
        .insert([{
          official_member_id: txMemberId,
          member_name: member.full_name || member.name,
          amount: amountVal,
          purpose: `[${familyDisplayName}] ${txPurpose}`,
          notes: txNotes.trim() || null,
          transaction_type: 'income',
          recorded_by: currentUser?.id || 'Family Secretary',
          status: 'Approved'
        }]);

      if (txErr) throw txErr;

      const { data: dbMem, error: memFetchErr } = await supabase
        .from('members')
        .select('balance')
        .eq('official_member_id', txMemberId)
        .maybeSingle();

      if (memFetchErr) throw memFetchErr;

      if (dbMem) {
        const newBalance = Number(dbMem.balance || 0) + amountVal;
        await supabase
          .from('members')
          .update({ balance: newBalance })
          .eq('official_member_id', txMemberId);
      }

      // AppContext sync
      const transaction: FamilyTransaction = {
        memberId: txMemberId,
        amount: amountVal,
        purpose: txPurpose,
        timestamp: new Date().toISOString(),
        family: cleanFamilyName as Family
      };
      setAppFamilyTxs([...appFamilyTxs, transaction]);

      toast.success("Family transaction logged and member balance updated!");
      setTxMemberId('');
      setTxPurpose('Monthly Dues');
      setTxAmount('');
      setTxNotes('');

      const familyMemberIds = familyMembers.map(m => m.official_member_id).filter(Boolean);
      if (familyMemberIds.length > 0) {
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .in('official_member_id', familyMemberIds)
          .order('created_at', { ascending: false });
        setDbFamilyTransactions(txData || []);
      }
    } catch (err: any) {
      console.error("Error logging transaction:", err);
      toast.error(`Recording failed: ${err.message}`);
    } finally {
      setSubmittingTx(false);
    }
  };

  // Financial Handlers for Finance Tab
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
    setAppFamilyTxs([...appFamilyTxs, transaction]);
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
      recordedBy: currentUser?.name || 'Family Secretary',
      family: cleanFamilyName as Family
    };
    setAppFamilyExps([...appFamilyExps, expense]);
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
    setAppFamilyTxs([...appFamilyTxs, transaction]);
    toast.success(`Manual transaction recorded: ${formatCurrency(amount)} for ${member.name}`);
    setManualMemberId('');
    setManualSearchQuery('');
    setManualAmount('');
    setManualPurpose('');
  };

  const handleUpdateStatus = (memberId: string, status: 'Present' | 'Absent' | 'Excused') => {
    setAttendanceMap(prev => ({
      ...prev,
      [memberId]: status
    }));
  };

  const handlePrintLedger = () => {
    window.print();
  };

  // Filtered calculations for Ledger
  const activeFamilyCount = familyMembers.filter(m => m.status === 'Active').length;
  const currentFamilyTxs = appFamilyTxs.filter(tx => tx.family === cleanFamilyName);
  const currentFamilyExps = appFamilyExps.filter(exp => exp.family === cleanFamilyName);
  const currentFamilyAnnouncements = appFamilyAnnouncements.filter(ann => ann.family === cleanFamilyName);
  const familyLedger = getCombinedTransactions(currentFamilyTxs, currentFamilyExps);
  const totalIncomeVal = calculateTotal(currentFamilyTxs);
  const totalExpensesVal = calculateTotal(currentFamilyExps);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#001a16] p-6 flex items-center justify-center">
        <div className="text-[#ffd700] text-lg font-semibold animate-pulse">Loading Family Secretary Portal...</div>
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
                <span className="text-[#ffd700] font-bold text-xs uppercase tracking-wider">Administrative Secretariat</span>
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

            <Heading level={1}>{familyDisplayName} Secretariat</Heading>
            <p className="text-gray-400 text-sm mt-1">
              Family Secretary: <span className="text-white font-medium">{currentUser?.name}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreatingMeeting(true)}
              className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Meeting
            </Button>
            <Button
              onClick={fetchData}
              variant="outline"
              className="border-[#ffd700] text-[#ffd700]"
            >
              Refresh
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
                    {currentUser.office_title && (
                      <span className="text-[10px] text-gray-400 block mt-0.5">{currentUser.office_title}</span>
                    )}
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Designation</p>
                    <p className="text-[#ffd700] font-bold text-sm">FAMILY SECRETARY</p>
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

        {/* Create Meeting Modal */}
        {isCreatingMeeting && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 max-w-md w-full shadow-2xl rounded-xl">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Initialize New Meeting
              </h3>
              <form onSubmit={handleCreateMeeting} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Meeting Date</label>
                  <input
                    type="date"
                    value={newMeetingDate}
                    onChange={(e) => setNewMeetingDate(e.target.value)}
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-white focus:outline-none focus:border-[#ffd700]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Meeting Type</label>
                  <select
                    value={newMeetingType}
                    onChange={(e) => setNewMeetingType(e.target.value)}
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-white focus:outline-none focus:border-[#ffd700]/50"
                  >
                    <option value="Monthly General">Monthly General Meeting</option>
                    <option value="Emergency Meeting">Emergency Meeting</option>
                    <option value="Executive Meeting">Executive Meeting</option>
                    <option value="Welfare Committee">Welfare Committee Session</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button type="submit" className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold">
                    Create Entry
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreatingMeeting(false)}
                    className="flex-1 border-[#ffd700] text-[#ffd700]"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
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
              <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to access Family Secretary administrative features.</p>
            </div>
            <form onSubmit={handleVerifyPin} className="w-full space-y-4">
              <input type="password" maxLength={6} placeholder="Enter Secret PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))} className="w-full text-center tracking-widest bg-[#001f1a] border border-[#ffd700] text-white rounded p-3 focus:outline-none text-xl font-mono" />
              {pinError && <p className="text-red-400 text-xs font-semibold">{pinError}</p>}
              <button type="submit" disabled={isVerifyingPin || pinInput.length < 4} className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-[#001a16] font-bold py-2.5 rounded transition-colors disabled:opacity-50 cursor-pointer">
                {isVerifyingPin ? "Verifying..." : "Unlock Family Secretary Portal"}
              </button>
            </form>
          </div>
        ) : (
          /* UNLOCKED 4-TAB SECRETARIAL WORKSPACE */
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full space-y-6">
            <TabsList className="bg-[#002520] border border-[#ffd700]/30 p-1.5 rounded-xl flex flex-wrap gap-2">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] font-bold text-xs md:text-sm px-4 py-2 rounded-lg transition-all cursor-pointer">
                Overview
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
              {/* Family Overview Cards */}
              <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-[#ffd700] mb-4">Family Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#001a16] border border-[#ffd700]/10 p-4 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Family Name</p>
                    <p className="text-white font-bold text-lg mt-1">{familyDisplayName}</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 p-4 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Family Head</p>
                    <p className="text-white font-bold text-lg mt-1">{getFamilyHeadName(cleanFamilyName)}</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 p-4 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Secretary</p>
                    <p className="text-white font-bold text-lg mt-1">{getFamilySecName(cleanFamilyName)}</p>
                  </div>
                </div>
              </Card>

              {/* Metrics Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl hover:scale-102 transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Active Members</p>
                      <h3 className="text-4xl font-extrabold text-white mt-2">{activeFamilyCount}</h3>
                      <p className="text-xs text-gray-400 mt-2">Registered in {cleanFamilyName}</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl hover:scale-102 transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Meetings Recorded</p>
                      <h3 className="text-4xl font-extrabold text-[#ffd700] mt-2">{meetings.length}</h3>
                      <p className="text-xs text-gray-400 mt-2">Family assemblies held</p>
                    </div>
                    <div className="p-3 bg-[#ffd700]/10 rounded-lg text-[#ffd700] border border-[#ffd700]/20">
                      <CalendarCheck className="w-6 h-6" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl hover:scale-102 transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Fellowship Att.</p>
                      <h3 className="text-3xl font-extrabold text-[#ffd700] mt-2">
                        {lastFellowshipAttendance.date ? `${Math.round((lastFellowshipAttendance.present / (activeFamilyCount || 1)) * 100)}%` : 'N/A'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2">Latest Thursday session</p>
                    </div>
                    <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400 border border-teal-500/20">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl hover:scale-102 transition-transform duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Financial Collections</p>
                      <h3 className="text-2xl font-extrabold text-green-400 mt-2">{formatCurrency(totalIncomeVal)}</h3>
                      <p className="text-xs text-gray-400 mt-1">Total subgroup entries</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg text-green-400 border border-green-500/20">
                      <Banknote className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Attendance Panel & Active Meeting Selector */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Active Meeting Selection Header */}
                  <div className="bg-[#002520] border border-[#ffd700]/10 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#ffd700]/10 text-[#ffd700] rounded-lg">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase">Active Attendance Registry</p>
                        {activeMeeting ? (
                          <h3 className="text-lg font-bold text-white uppercase">
                            {activeMeeting.meeting_type} — {new Date(activeMeeting.meeting_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </h3>
                        ) : (
                          <h3 className="text-lg font-bold text-yellow-500">No Meetings Configured</h3>
                        )}
                      </div>
                    </div>

                    {meetings.length > 0 && (
                      <div className="w-full md:w-auto">
                        <select
                          value={activeMeeting?.id || ''}
                          onChange={(e) => {
                            const selected = meetings.find(m => m.id === e.target.value);
                            if (selected) handleSelectMeeting(selected);
                          }}
                          className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                        >
                          {meetings.map((meeting) => (
                            <option key={meeting.id} value={meeting.id}>
                              {meeting.meeting_type} ({meeting.meeting_date})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Attendance Roster Directory */}
                  <div className="bg-[#002520] border border-[#ffd700]/10 rounded-xl p-6 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-[#ffd700]" />
                        Attendance Register
                      </h2>
                      {activeMeeting && (
                        <Button
                          onClick={handleSaveAttendance}
                          disabled={saveLoading}
                          className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          {saveLoading ? 'Saving...' : 'Save Register'}
                        </Button>
                      )}
                    </div>

                    {activeMeeting ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-[#ffd700]/10 text-gray-400 font-semibold">
                              <th className="py-3 px-4">Member Name</th>
                              <th className="py-3 px-4">Member ID</th>
                              <th className="py-3 px-4 text-center">Roster Attendance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {familyMembers.map((member) => {
                              const mId = member.official_member_id || member.id;
                              const status = attendanceMap[mId] || 'Absent';

                              return (
                                <tr key={member.id} className="border-b border-[#ffd700]/5 hover:bg-[#001a16]/40 transition-colors">
                                  <td className="py-4 px-4 font-bold text-white uppercase">{member.name}</td>
                                  <td className="py-4 px-4 font-mono text-gray-300">{member.official_member_id || 'Pending'}</td>
                                  <td className="py-4 px-4">
                                    <div className="flex gap-2 justify-center">
                                      {(['Present', 'Absent', 'Excused'] as const).map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => handleUpdateStatus(mId, opt)}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                            status === opt
                                              ? opt === 'Present' ? 'bg-green-500/10 text-green-400 border-green-500/40' :
                                                opt === 'Absent' ? 'bg-red-500/10 text-red-400 border-red-500/40' :
                                                'bg-yellow-500/10 text-yellow-400 border-yellow-500/40'
                                              : 'bg-[#001a16] text-gray-400 border-[#ffd700]/10 hover:border-[#ffd700]/30'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                        <Calendar className="w-12 h-12 text-gray-600 mb-2" />
                        <p className="font-bold">No Meeting Set Up Yet</p>
                        <p className="text-xs max-w-sm">Click "New Meeting" in the top bar to create your first family meeting register entry.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar Panel: Secretariat Instructions & Quick Actions */}
                <div className="flex flex-col gap-6">
                  <Card className="bg-[#002520]/60 border border-[#ffd700]/10 p-6 rounded-xl">
                    <h4 className="font-bold text-[#ffd700] mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#ffd700]" />
                      Secretariat Guidelines
                    </h4>
                    <ul className="text-xs text-gray-300 flex flex-col gap-2 list-disc pl-4 leading-relaxed">
                      <li>Create a meeting session first before marking member roll-call.</li>
                      <li>Toggle member statuses (`Present`, `Absent`, `Excused`) and click <strong>Save Register</strong>.</li>
                      <li>Financial entries logged under the Finance tab directly update member balances.</li>
                      <li>Announcements published under the Announcements tab alert all family unit members.</li>
                    </ul>
                  </Card>
                </div>
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
            </TabsContent>

            {/* TAB 2: FINANCE */}
            <TabsContent value="finance" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Manual Transaction Entry Card */}
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
                        placeholder="e.g., Monthly Dues, Levy"
                        className="bg-[#001a16] border-[#ffd700]/30 text-white"
                      />
                    </div>
                    <Button onClick={handleManualTransaction} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold">
                      Record Manual Entry
                    </Button>
                  </div>
                </Card>

                {/* Record Family Income Card */}
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
                        placeholder="e.g., Family Covenant Offering"
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

                {/* Record Family Expense Card */}
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
                        placeholder="e.g., Secretariat Supplies, Logistics"
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

              {/* Log Family Contribution Direct Form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#002520] border border-[#ffd700]/10 rounded-xl p-6 shadow-lg">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-[#ffd700]" />
                        Family Financial Ledger
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">Transaction history and collection statement</p>
                    </div>
                    <Button onClick={handlePrintLedger} className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold">
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
                              No localized ledger transactions recorded yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Log Member Contribution Card */}
                <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-[#ffd700]" />
                    Log Direct Member Dues
                  </h3>
                  <form onSubmit={handleTransactionSubmit} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Select Member</label>
                      <select
                        value={txMemberId}
                        onChange={(e) => setTxMemberId(e.target.value)}
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
                      <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Payment Purpose</label>
                      <select
                        value={txPurpose}
                        onChange={(e) => setTxPurpose(e.target.value)}
                        className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                      >
                        <option value="Monthly Dues">Monthly Dues</option>
                        <option value="Welfare Contribution">Welfare Contribution</option>
                        <option value="Special Levy">Special Levy</option>
                        <option value="Development Fund">Development Fund</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Amount Paid (₦)</label>
                      <input
                        type="number"
                        placeholder="e.g. 5000"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Memo / Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Optional memo (receipt reference, remarks, etc.)..."
                        value={txNotes}
                        onChange={(e) => setTxNotes(e.target.value)}
                        className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 resize-none font-sans"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submittingTx}
                      className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold flex items-center justify-center gap-2 mt-2"
                    >
                      {submittingTx ? 'Logging Contribution...' : 'Record Payment'}
                    </Button>
                  </form>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 3: REPORTS */}
            <TabsContent value="reports" className="space-y-6">
              <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-[#ffd700] mb-4">Secretariat & Financial Summary Reports</h3>
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

            {/* TAB 4: ANNOUNCEMENTS */}
            <TabsContent value="announcements" className="space-y-6">
              <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Family Announcements & Circulars
                </h3>
                <div className="space-y-4 mb-8 bg-[#001a16] p-4 rounded-xl border border-[#ffd700]/20">
                  <h4 className="text-white font-semibold text-sm">Publish Subgroup Announcement</h4>
                  <Input
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Announcement Title"
                    className="bg-[#002520] border-[#ffd700]/30 text-white"
                  />
                  <textarea
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    placeholder="Write detailed announcements here..."
                    className="w-full bg-[#002520] border border-[#ffd700]/30 text-white p-3 rounded-lg min-h-[120px] focus:outline-none focus:border-[#ffd700]"
                  />
                  <Button onClick={handlePostAnnouncement} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold">
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
