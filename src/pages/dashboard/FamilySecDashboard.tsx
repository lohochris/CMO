import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { Member } from '../../types';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { toast } from 'sonner';
import { Calendar, ClipboardList, Clock, Shield, Plus, Save, Megaphone, FileText, Banknote, ListCollapse, ArrowUpRight } from 'lucide-react';

export default function FamilySecDashboard() {
  const { currentUser } = useApp();
  const [familyMembers, setFamilyMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);
  const [familyTransactions, setFamilyTransactions] = useState<any[]>([]);
  
  // Attendance state: mapping official_member_id -> status ('Present' | 'Absent' | 'Excused')
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'Present' | 'Absent' | 'Excused'>>({});
  
  // Form states
  const [newMeetingDate, setNewMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMeetingType, setNewMeetingType] = useState('Monthly General');
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  // Financial Transaction Entry Form States
  const [txMemberId, setTxMemberId] = useState('');
  const [txPurpose, setTxPurpose] = useState('Monthly Dues');
  const [txAmount, setTxAmount] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [submittingTx, setSubmittingTx] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const rawFamily = currentUser?.cmo_family || currentUser?.family || '';
  const cleanFamilyName = rawFamily.replace(' Family', '');
  const familyOptions = [cleanFamilyName, `${cleanFamilyName} Family`];
  
  // Dynamic header display cleanup
  const familyDisplayName = rawFamily.toLowerCase().includes('family') 
    ? rawFamily 
    : `${rawFamily} Family`;

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
      })).filter(m => m.status !== 'Deceased');

      setFamilyMembers(mappedMembers);

      // 2. Fetch meetings
      const { data: meetingsData, error: meetingsErr } = await supabase
        .from('family_meetings')
        .select('*')
        .in('cmo_family', familyOptions)
        .order('meeting_date', { ascending: false });

      if (meetingsErr) throw meetingsErr;

      const loadedMeetings = meetingsData || [];
      setMeetings(loadedMeetings);

      // Set first meeting as active if present
      if (loadedMeetings.length > 0) {
        const initialMeeting = loadedMeetings[0];
        setActiveMeeting(initialMeeting);
        await fetchAttendanceForMeeting(initialMeeting.id, mappedMembers);
      }

      // 3. Fetch family transactions by member ID matching
      const familyMemberIds = mappedMembers.map(m => m.official_member_id).filter(Boolean);
      if (familyMemberIds.length > 0) {
        const { data: txData, error: txErr } = await supabase
          .from('transactions')
          .select('*')
          .in('official_member_id', familyMemberIds)
          .order('created_at', { ascending: false });

        if (txErr) throw txErr;
        setFamilyTransactions(txData || []);
      } else {
        setFamilyTransactions([]);
      }

    } catch (err: any) {
      console.error("Error fetching Family Sec portal data:", err);
      toast.error(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForMeeting = async (meetingId: string, currentMembers: Member[]) => {
    try {
      const { data: attendanceData, error } = await supabase
        .from('family_attendance')
        .select('*')
        .eq('meeting_id', meetingId);

      if (error) throw error;

      const newMap: Record<string, 'Present' | 'Absent' | 'Excused'> = {};
      
      // Default all members to Absent
      currentMembers.forEach(m => {
        const mId = m.official_member_id || m.id;
        newMap[mId] = 'Absent';
      });

      // Overwrite with actual DB records
      (attendanceData || []).forEach((att: any) => {
        if (att.official_member_id) {
          newMap[att.official_member_id] = att.status as any;
        }
      });

      setAttendanceMap(newMap);
    } catch (err: any) {
      console.error("Error fetching attendance records:", err);
      toast.error(`Could not load attendance: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchData();
  }, [rawFamily]);

  const handleSelectMeeting = async (meeting: any) => {
    setActiveMeeting(meeting);
    await fetchAttendanceForMeeting(meeting.id, familyMembers);
  };

  // Create New Meeting
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingDate || !newMeetingType) {
      toast.error("Please fill in meeting details.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('family_meetings')
        .insert([{
          meeting_date: newMeetingDate,
          meeting_type: newMeetingType,
          cmo_family: familyDisplayName
        }])
        .select('*')
        .single();

      if (error) throw error;

      toast.success("Meeting entry created successfully!");
      setIsCreatingMeeting(false);
      
      // Reload meetings list and set this new meeting active
      const { data: updatedMeetings, error: meetingsErr } = await supabase
        .from('family_meetings')
        .select('*')
        .in('cmo_family', familyOptions)
        .order('meeting_date', { ascending: false });

      if (meetingsErr) throw meetingsErr;
      setMeetings(updatedMeetings || []);
      
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

  // Save Attendance List
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

      // Delete existing records for safety
      const { error: deleteErr } = await supabase
        .from('family_attendance')
        .delete()
        .eq('meeting_id', activeMeeting.id);

      if (deleteErr) throw deleteErr;

      // Insert new ones
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

  // Create Family Announcement
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

      toast.success("Family Announcement published successfully!");
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (err: any) {
      console.error("Failed to post family announcement:", err);
      toast.error(`Posting failed: ${err.message}`);
    }
  };

  // Submit Family Contribution Transaction
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txMemberId || !txPurpose || !txAmount) {
      toast.error("Please fill in all fields.");
      return;
    }
    const member = familyMembers.find(m => m.official_member_id === txMemberId);
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
      // 1. Log the transaction in the 'transactions' table
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

      // 2. Update the member's balance in the 'members' table
      const { data: dbMem, error: memFetchErr } = await supabase
        .from('members')
        .select('balance')
        .eq('official_member_id', txMemberId)
        .maybeSingle();

      if (memFetchErr) throw memFetchErr;

      if (dbMem) {
        const newBalance = Number(dbMem.balance || 0) + amountVal;
        const { error: memUpdateErr } = await supabase
          .from('members')
          .update({ balance: newBalance })
          .eq('official_member_id', txMemberId);

        if (memUpdateErr) throw memUpdateErr;
      }

      toast.success("Family transaction logged and member balance updated!");
      setTxMemberId('');
      setTxPurpose('Monthly Dues');
      setTxAmount('');
      setTxNotes('');

      // Refresh list
      const familyMemberIds = familyMembers.map(m => m.official_member_id).filter(Boolean);
      if (familyMemberIds.length > 0) {
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .in('official_member_id', familyMemberIds)
          .order('created_at', { ascending: false });
        setFamilyTransactions(txData || []);
      }
    } catch (err: any) {
      console.error("Error logging transaction:", err);
      toast.error(`Recording failed: ${err.message}`);
    } finally {
      setSubmittingTx(false);
    }
  };

  const handleUpdateStatus = (memberId: string, status: 'Present' | 'Absent' | 'Excused') => {
    setAttendanceMap(prev => ({
      ...prev,
      [memberId]: status
    }));
  };

  // Calculations for Ledger
  const totalFundsCollected = familyTransactions
    .filter(tx => tx.transaction_type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#001a16] p-6 flex items-center justify-center">
        <div className="text-[#ffd700] text-lg font-semibold animate-pulse">Loading Family Secretary Portal...</div>
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
              <span className="text-[#ffd700] font-bold text-xs uppercase tracking-wider">Administrative Secretariat</span>
            </div>
            {/* Clean Header displaying exactly Wisdom Family Secretariat / Honour Family Secretariat without duplicates */}
            <h1 className="text-3xl font-extrabold text-white">{familyDisplayName} Secretariat</h1>
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
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Attendance Panel */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Active Meeting Selection Info */}
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
              
              {/* Meeting Selector Dropdown */}
              {meetings.length > 0 && (
                <div className="w-full md:w-auto">
                  <select
                    value={activeMeeting?.id || ''}
                    onChange={(e) => {
                      const selected = meetings.find(m => m.id === e.target.value);
                      if (selected) handleSelectMeeting(selected);
                    }}
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50"
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

          {/* Sidebar Panels (Write Announcement) */}
          <div className="flex flex-col gap-6">
            
            {/* Write Announcement Card */}
            <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#ffd700]" />
                Write Announcement
              </h3>
              <form onSubmit={handlePostAnnouncement} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Announcement Title</label>
                  <input
                    type="text"
                    placeholder="Enter short title..."
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Message Content</label>
                  <textarea
                    rows={4}
                    placeholder="Write detailed announcements here..."
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 resize-none"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold flex items-center justify-center gap-2 mt-2"
                >
                  <FileText className="w-4 h-4" />
                  Publish to Family
                </Button>
              </form>
            </Card>

            {/* Quick Helper Panel */}
            <Card className="bg-[#002520]/60 border border-[#ffd700]/10 p-6 rounded-xl">
              <h4 className="font-bold text-[#ffd700] mb-2 uppercase text-xs tracking-wider">Secretariat Instructions</h4>
              <ul className="text-xs text-gray-400 flex flex-col gap-2 list-disc pl-4">
                <li>Create a meeting first to record attendance.</li>
                <li>Verify status labels ('Present', 'Absent', 'Excused') before saving.</li>
                <li>Announcements posted here are immediately visible to all {familyDisplayName} members.</li>
              </ul>
            </Card>
            
          </div>

        </div>

        {/* Family Financial Ledger Panel (NEW INTEGRATION) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ledger Table */}
          <div className="lg:col-span-2 bg-[#002520] border border-[#ffd700]/10 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-[#ffd700]" />
                  Family Financial Ledger
                </h2>
                <p className="text-xs text-gray-400 mt-1">Transaction history and collection logs</p>
              </div>
              <div className="bg-[#001a16] p-3 rounded-lg border border-[#ffd700]/10 flex items-center gap-2">
                <span className="text-xs text-gray-400 font-semibold uppercase">Total Local Collections:</span>
                <span className="text-[#ffd700] font-bold text-lg font-mono">₦{totalFundsCollected.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#ffd700]/10 text-gray-400 font-semibold">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {familyTransactions.length > 0 ? (
                    familyTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-[#ffd700]/5 hover:bg-[#001a16]/40 transition-colors">
                        <td className="py-4 px-4 font-bold text-white uppercase">{tx.member_name}</td>
                        <td className="py-4 px-4 text-gray-300">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 mr-2">
                            Family Log
                          </span>
                          {tx.purpose.replace(`[${familyDisplayName}] `, '')}
                        </td>
                        <td className="py-4 px-4 text-green-400 font-mono font-bold">+₦{Number(tx.amount).toLocaleString()}</td>
                        <td className="py-4 px-4 text-gray-400 text-xs">
                          {new Date(tx.created_at || tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-4 px-4 text-gray-400 text-xs italic max-w-[150px] truncate" title={tx.notes || ''}>
                          {tx.notes || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No localized transactions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Record Transaction Form */}
          <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-[#ffd700]" />
              Log Family Contribution
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

      </div>
    </div>
  );
}
