import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { Member } from '../../types';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { toast } from 'sonner';
import { Users, CalendarCheck, HeartPulse, Send, MessageSquare, Shield, PhoneCall, HeartHandshake, ClipboardList, BookOpen } from 'lucide-react';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';

export default function FamilyHeadDashboard() {
  const { currentUser, members, setMembers, setCurrentUser } = useApp();
  const rawFamily = currentUser?.cmo_family || currentUser?.family || '';
  const cleanFamilyName = rawFamily.replace(/\s*Family\s*/gi, '').trim();
  const familyOptions = [cleanFamilyName, `${cleanFamilyName} Family`];
  const familyDisplayName = `${cleanFamilyName} Family`;

  const [familyMembers, setFamilyMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [welfareTickets, setWelfareTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
  const [fellowshipLoading, setFellowshipLoading] = useState(false);

  const fetchLastFellowshipAttendance = async () => {
    if (!cleanFamilyName) return;
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
    } finally {
      setFellowshipLoading(false);
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
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel(`family-head-spiritual-${cleanFamilyName}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'liturgical_assignments', 
          filter: `assigned_family=eq.${cleanFamilyName}` 
        },
        () => {
          fetchFamilyAssignments();
        }
      )
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cleanFamilyName]);

  useEffect(() => {
    fetchLastFellowshipAttendance();
    
    const meetingsChannel = supabase
      .channel(`family-head-meetings-${cleanFamilyName}`)
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
      supabase.removeChannel(meetingsChannel);
    };
  }, [cleanFamilyName]);

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

  // Welfare Form States
  const [welfareMemberId, setWelfareMemberId] = useState('');
  const [welfareCategory, setWelfareCategory] = useState('');
  const [welfareAmount, setWelfareAmount] = useState('');
  const [welfareReason, setWelfareReason] = useState('');
  const [submittingWelfare, setSubmittingWelfare] = useState(false);



  const fetchData = async () => {
    if (!rawFamily) return;
    setLoading(true);
    try {
      // 1. Fetch family members
      const { data: membersData, error: membersErr } = await supabase
        .from('members')
        .select('*')
        .in('cmo_family', familyOptions);

      if (membersErr) throw membersErr;

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

      // 2. Fetch meetings
      const { data: meetingsData, error: meetingsErr } = await supabase
        .from('family_meetings')
        .select('*')
        .in('cmo_family', familyOptions);

      if (meetingsErr) throw meetingsErr;

      const loadedMeetings = meetingsData || [];
      setMeetings(loadedMeetings);

      // 3. Fetch attendance
      if (loadedMeetings.length > 0) {
        const meetingIds = loadedMeetings.map(m => m.id);
        const { data: attendanceData, error: attendanceErr } = await supabase
          .from('family_attendance')
          .select('*')
          .in('meeting_id', meetingIds);

        if (attendanceErr) throw attendanceErr;
        setAttendance(attendanceData || []);
      } else {
        setAttendance([]);
      }

      // 4. Fetch private family welfare tickets
      const familyMemberIds = mappedMembers.map(m => m.official_member_id).filter(Boolean);
      if (familyMemberIds.length > 0) {
        const { data: welfareData, error: welfareErr } = await supabase
          .from('welfare_tickets')
          .select('*')
          .in('official_member_id', familyMemberIds)
          .order('created_at', { ascending: false });

        if (welfareErr) throw welfareErr;
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
  }, [rawFamily]);

  // Calculations
  const activeMembers = familyMembers.filter(m => m.status !== 'Deceased');
  const totalMembersCount = activeMembers.length;
  const activeFamilyCount = familyMembers.filter(m => m.status === 'Active').length;

  const totalPresent = attendance.filter(a => a.status === 'Present').length;
  const totalAttendanceRecords = attendance.length;
  const attendanceRate = totalAttendanceRecords > 0 ? Math.round((totalPresent / totalAttendanceRecords) * 100) : 100;

  const getConsecutiveMisses = () => {
    if (meetings.length < 2) return [];

    // Sort meetings by date descending
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

      // Refresh welfare list
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#001a16] p-6 flex items-center justify-center">
        <div className="text-[#ffd700] text-lg font-semibold animate-pulse">Loading Family Head Portal...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#001a16] p-4 md:p-8 font-sans text-gray-200">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-[#002520] p-6 rounded-xl border border-[#ffd700]/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-6 h-6 text-[#ffd700]" />
              <span className="text-[#ffd700] font-bold text-xs uppercase tracking-wider">Leadership Portal</span>
            </div>
            {/* Clean Header displaying exactly Wisdom Family Hub / Honour Family Hub without duplicates */}
            <h1 className="text-3xl font-extrabold text-white">{familyDisplayName} Hub</h1>
            <p className="text-gray-400 text-sm mt-1">
              Family Head: <span className="text-white font-medium">{currentUser?.name}</span>
            </p>
          </div>
          <Button 
            onClick={fetchData} 
            className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold"
          >
            Refresh Hub
          </Button>
        </div>

        {/* Compact Horizontal Profile Card (Sleek Horizontal Space-Saver) */}
        {currentUser && (
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 mb-6 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <ProfilePictureUploader
                  currentImage={currentUser.profilePic}
                  onSave={handleProfilePictureSave}
                  memberName={currentUser.name}
                  size="sm"
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

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Total Members */}
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

          {/* Card 2: Attendance Rate */}
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

          {/* Card 3: Welfare Checks */}
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

          {/* Card 4: Thursday Fellowship Attendance Summary */}
          <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl hover:scale-102 transition-transform duration-300 col-span-1 sm:col-span-2 lg:col-span-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
              <div>
                <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Fellowship Attendance ({familyDisplayName})</p>
                <h3 className="text-4xl font-extrabold text-[#ffd700] mt-2">
                  {lastFellowshipAttendance.date ? (
                    `${Math.round((lastFellowshipAttendance.present / (activeFamilyCount || 1)) * 100)}%`
                  ) : (
                    'N/A'
                  )}
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  {lastFellowshipAttendance.date ? (
                    (() => {
                      const dateStr = lastFellowshipAttendance.date;
                      const parsedDate = new Date(dateStr.replace(/-/g, '/'));
                      const formattedDate = isNaN(parsedDate.getTime()) 
                        ? dateStr 
                        : `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()}`;
                      return `Date: ${formattedDate} (${lastFellowshipAttendance.present} / ${activeFamilyCount} Present)`;
                    })()
                  ) : (
                    'No sessions recorded yet'
                  )}
                </p>
              </div>

              {lastFellowshipAttendance.date && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t md:border-t-0 md:border-l border-[#ffd700]/20 pt-4 md:pt-0 md:pl-6 text-xs w-full md:w-auto flex-grow justify-around">
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

              <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400 border border-teal-500/20 self-start md:self-center">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Family Liturgical Duties Schedule */}
        <Card className="bg-[#002520] border border-[#ffd700]/25 p-6 rounded-xl mb-8 shadow-lg">
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
          <div className="bg-red-950/20 border-2 border-red-500/30 p-6 rounded-xl mb-8">
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
                        <a 
                          href={`tel:${m.phone_number}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors"
                          title="Call member"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </a>
                        <a 
                          href={`sms:${m.phone_number}`}
                          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors"
                          title="Send SMS"
                        >
                          <Send className="w-4 h-4" />
                        </a>
                        <a 
                          href={`https://wa.me/${m.phone_number.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors"
                          title="WhatsApp chat"
                        >
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

        {/* Welfare & Case Tracker Section (NEW INTEGRATION) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Ongoing Welfare Issues Table */}
          <div className="lg:col-span-2 bg-[#002520] border border-[#ffd700]/10 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <HeartHandshake className="w-5 h-5 text-[#ffd700]" />
              Welfare Case Tracker
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#ffd700]/10 text-gray-400 font-semibold">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Amount Requested</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submission Date</th>
                  </tr>
                </thead>
                <tbody>
                  {welfareTickets.length > 0 ? (
                    welfareTickets.map((ticket) => (
                      <tr key={ticket.id || ticket.ticket_id} className="border-b border-[#ffd700]/5 hover:bg-[#001a16]/40 transition-colors">
                        <td className="py-4 px-4 font-bold text-white uppercase">{ticket.member_name}</td>
                        <td className="py-4 px-4 text-gray-300">{ticket.category}</td>
                        <td className="py-4 px-4 text-[#ffd700] font-mono">₦{(ticket.requested_amount || ticket.amount || 0).toLocaleString()}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            ticket.status === 'Approved' || ticket.status === 'Completed' || ticket.status === 'Settled & Cleared' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            ticket.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {ticket.status}
                          </span>
                          {ticket.status === 'Declined' && (
                            <span className="text-red-500 text-xs italic mt-1 block">
                              Reason: {ticket.decline_reason || ticket.declineReason || ticket.rejection_reason || ticket.reason || 'No reason provided'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-gray-400 text-xs">
                          {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
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

        {/* Family Roster Directory */}
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
                              <a 
                                href={`tel:${member.phone_number || member.phone}`}
                                className="bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 p-2 rounded-lg border border-blue-500/20 transition-all"
                                title="Call Member"
                              >
                                <PhoneCall className="w-4 h-4" />
                              </a>
                              <a 
                                href={`sms:${member.phone_number || member.phone}`}
                                className="bg-purple-600/10 hover:bg-purple-600 hover:text-white text-purple-400 p-2 rounded-lg border border-purple-500/20 transition-all"
                                title="Send SMS"
                              >
                                <Send className="w-4 h-4" />
                              </a>
                              <a 
                                href={`https://wa.me/${(member.phone_number || member.phone || '').replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-600/10 hover:bg-green-600 hover:text-white text-green-400 p-2 rounded-lg border border-green-500/20 transition-all"
                                title="WhatsApp Chat"
                              >
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

      </div>
    </div>
  );
}
