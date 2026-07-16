import { useState, useEffect } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Plus, 
  History, 
  RotateCcw,
  Sparkles,
  FileText,
  Bookmark,
  Gavel,
  MessageSquare
} from 'lucide-react';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';



interface LiturgicalGuide {
  id: string;
  title: string;
  type: 'Feast Day' | 'General Guideline' | 'Rehearsal Notice' | 'Mass Program';
  date?: string;
  content: string;
}

export default function LiturgistDashboard() {
  const { currentUser, members, setMembers, setCurrentUser, announcements, setAnnouncements } = useApp();

  // Thursday Fellowship Planner Form States
  const [fellowshipActivityName, setFellowshipActivityName] = useState('Thursday Fellowship');
  const [fellowshipDate, setFellowshipDate] = useState(new Date().toISOString().split('T')[0]);
  const [fellowshipAssigneeType, setFellowshipAssigneeType] = useState<'family' | 'member'>('family');
  const [fellowshipFamily, setFellowshipFamily] = useState('Wisdom');
  const [fellowshipMemberId, setFellowshipMemberId] = useState('');
  const [fellowshipRole, setFellowshipRole] = useState('Exhortation');
  const [fellowshipNotes, setFellowshipNotes] = useState('');
  const [fellowshipLoading, setFellowshipLoading] = useState(false);
  const [dbAssignments, setDbAssignments] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Thursday Fellowship Attendance Tracker States
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeMeetingId, setActiveMeetingId] = useState<any>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'Present' | 'Absent'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState('');

  const getWhatsAppUrl = (phone: string, name: string) => {
    let cleanPhone = phone ? phone.replace(/[^\d]/g, '') : '';
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '234' + cleanPhone.slice(1);
    }
    const message = `Dear ${name || 'Brother'}, we missed you at the Thursday Fellowship on ${new Date(attendanceDate).toLocaleDateString()}. We hope you are doing well and send you our prayers. God bless you!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleInitializeAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceDate) {
      toast.error('Please select an attendance date.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('fellowship_meetings')
        .insert([{
          meeting_date: attendanceDate,
          date: attendanceDate
        }])
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No data returned from fellowship_meetings insert.');
      }

      const generatedMeetingId = data[0].id;
      setActiveMeetingId(generatedMeetingId);
      
      const activeMembers = members.filter(m => m.status !== 'Deceased' && m.name);
      const initialMap: Record<string, 'Present' | 'Absent'> = {};
      activeMembers.forEach(m => {
        initialMap[m.official_member_id || m.id] = 'Absent';
      });
      setAttendanceMap(initialMap);
      setAttendanceSearch('');
      toast.success('Thursday Fellowship Attendance initialized!');
    } catch (err: any) {
      console.error('Failed to initialize attendance:', err);
      toast.error(`Failed to initialize attendance: ${err.message}`);
    }
  };

  const handleSaveAttendance = async () => {
    if (!activeMeetingId) return;
    setSavingAttendance(true);
    try {
      const activeMembers = members.filter(m => m.status !== 'Deceased' && m.name);
      
      const attendanceInserts = activeMembers.map(m => {
        const memberId = m.official_member_id || m.id;
        const statusVal = attendanceMap[memberId] || 'Present';
        const rawFam = m.family || m.cmo_family || '';
        const familyVal = rawFam ? (rawFam.toLowerCase().endsWith(' family') ? rawFam : `${rawFam} Family`) : '';
        return {
          meeting_id: activeMeetingId,
          official_member_id: memberId,
          status: statusVal,
          member_name: m.name || m.full_name || '',
          family: familyVal
        };
      });

      const { error: attError } = await supabase
        .from('fellowship_attendance')
        .insert(attendanceInserts);

      if (attError) throw attError;

      const absentMembers = activeMembers.filter(m => {
        const memberId = m.official_member_id || m.id;
        return attendanceMap[memberId] === 'Absent';
      });

      if (absentMembers.length > 0) {
        const messageInserts = absentMembers.map(m => {
          const memberId = m.official_member_id || m.id;
          const warmMessage = `Dear ${m.name || 'Brother'}, we missed you at the Thursday Fellowship on ${new Date(attendanceDate).toLocaleDateString()}. We hope you are doing well and send you our prayers. God bless you!`;
          return {
            id: `MSG-${Date.now()}-${memberId}`,
            official_member_id: memberId,
            member_id: memberId,
            message: warmMessage,
            content: warmMessage,
            message_text: warmMessage,
            read: false,
            is_read: false,
            sender: 'LITURGIST',
            author: 'LITURGIST',
            created_by: 'HCC-CMO-EXEC-LT',
            created_at: new Date().toISOString()
          };
        });

        const { error: msgError } = await supabase
          .from('pastoral_messages')
          .insert(messageInserts);

        if (msgError) {
          console.error("Pastoral message inserts failed:", msgError);
        }
      }

      toast.success('Fellowship attendance saved successfully!');
      setActiveMeetingId(null);
      setAttendanceMap({});
      setAttendanceSearch('');
    } catch (err: any) {
      console.error('Failed to save attendance:', err);
      toast.error(`Failed to save attendance: ${err.message}`);
    } finally {
      setSavingAttendance(false);
    }
  };

  const fetchDbAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('liturgical_assignments')
        .select('*')
        .order('activity_date', { ascending: true });
      if (error) throw error;
      setDbAssignments(data || []);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  useEffect(() => {
    fetchDbAssignments();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('liturgical-assignments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'liturgical_assignments' },
        () => {
          fetchDbAssignments();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddFellowshipAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fellowshipActivityName.trim() || !fellowshipDate || !fellowshipRole.trim()) {
      toast.error('Please fill in Activity Name, Date, and Duty Role.');
      return;
    }

    let assignedMemberIdVal = null;
    let assignedFamilyVal = null;
    let assigneeName = '';

    if (fellowshipAssigneeType === 'member') {
      if (!fellowshipMemberId) {
        toast.error('Please select an individual member.');
        return;
      }
      const member = members.find(m => m.official_member_id === fellowshipMemberId || m.id === fellowshipMemberId);
      if (!member) {
        toast.error('Selected member not found.');
        return;
      }
      assignedMemberIdVal = member.official_member_id || member.id;
      assigneeName = member.full_name || member.name;
    } else {
      if (!fellowshipFamily) {
        toast.error('Please select a family unit.');
        return;
      }
      assignedFamilyVal = fellowshipFamily;
      assigneeName = `${fellowshipFamily} Family`;
    }

    setFellowshipLoading(true);
    try {
      // 1. Insert assignment into 'liturgical_assignments' table
      const { error: insertErr } = await supabase
        .from('liturgical_assignments')
        .insert([{
          activity_name: fellowshipActivityName,
          activity_date: fellowshipDate,
          assigned_family: assignedFamilyVal,
          assigned_member_id: assignedMemberIdVal,
          duty_role: fellowshipRole,
          notes: fellowshipNotes.trim() || null,
          status: 'Assigned'
        }]);

      if (insertErr) throw insertErr;

      // 2. Insert announcement into 'announcements' table
      const newAnnId = `ANN-${Date.now()}`;
      const annTitle = `[Spiritual Assignment] ${fellowshipActivityName}`;
      const annContent = `Spiritual assignment scheduled for ${new Date(fellowshipDate).toLocaleDateString()}:
Role: ${fellowshipRole}
Assignee: ${assigneeName}
Notes: ${fellowshipNotes.trim() || 'No special instructions'}`;

      const { error: annErr } = await supabase
        .from('announcements')
        .insert([{
          id: newAnnId,
          title: annTitle,
          content: annContent,
          author: currentUser?.name || 'Liturgist Office',
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        }]);

      if (annErr) {
        console.error("Announcement insert error:", annErr);
      } else {
        // Also update local state
        const newAnnouncement = {
          id: newAnnId,
          title: annTitle,
          content: annContent,
          author: currentUser?.name || 'Liturgist Office',
          timestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        };
        setAnnouncements([newAnnouncement, ...announcements]);
      }

      toast.success('Assignment scheduled and announcement published!');
      
      // Reset form states
      setFellowshipNotes('');
      setFellowshipMemberId('');
      setMemberSearch('');
      fetchDbAssignments();
    } catch (err: any) {
      console.error("Failed to add assignment:", err);
      toast.error(`Assignment scheduling failed: ${err.message}`);
    } finally {
      setFellowshipLoading(false);
    }
  };

  const handleRemoveFellowshipAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('liturgical_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Assignment removed successfully!');
      fetchDbAssignments();
    } catch (err: any) {
      console.error("Failed to delete assignment:", err);
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const handleMarkCompleted = async (id: string) => {
    try {
      const { error } = await supabase
        .from('liturgical_assignments')
        .update({ status: 'Completed' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Assignment marked as Completed!');
      fetchDbAssignments();
    } catch (err: any) {
      console.error("Failed to update assignment status:", err);
      toast.error(`Failed to update status: ${err.message}`);
    }
  };

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
  
  const [guides, setGuides] = useState<LiturgicalGuide[]>([]);

  // Guide Form States
  const [guideTitle, setGuideTitle] = useState('');
  const [guideType, setGuideType] = useState<'Feast Day' | 'General Guideline' | 'Rehearsal Notice' | 'Mass Program'>('Feast Day');
  const [guideDate, setGuideDate] = useState('');
  const [guideContent, setGuideContent] = useState('');

  useEffect(() => {
    // Hydrate guides from local storage

    const savedGuides = localStorage.getItem('cmo_liturgical_guides');
    if (savedGuides) {
      try {
        setGuides(JSON.parse(savedGuides));
      } catch (e) {
        console.error('Failed to parse liturgical guides', e);
      }
    } else {
      // Seed some initial guides
      const initialGuides: LiturgicalGuide[] = [
        {
          id: 'GUIDE-1',
          title: 'Feast of Our Lady of Mount Carmel',
          type: 'Feast Day',
          date: '2026-07-16',
          content: 'CMO members are requested to dress in official parish wear. Special prayers will be held during the morning mass.'
        },
        {
          // Updated guideline description
          id: 'GUIDE-2',
          title: 'Reader Dress Code & Preparedness Guidelines',
          type: 'General Guideline',
          content: 'All assigned readers must report to the Sacristy 15 minutes before Mass, ensuring formal attire matching parish leadership regulations.'
        }
      ];
      setGuides(initialGuides);
      localStorage.setItem('cmo_liturgical_guides', JSON.stringify(initialGuides));
    }
  }, []);



  const saveGuides = (newGuides: LiturgicalGuide[]) => {
    setGuides(newGuides);
    localStorage.setItem('cmo_liturgical_guides', JSON.stringify(newGuides));
  };

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
      toast.success('Profile avatar updated successfully!');
    } catch (e: any) {
      toast.error('Failed to upload profile picture: ' + e.message);
    }
  };



  const handleAddGuide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guideTitle || !guideContent) {
      toast.error('Please enter a guide title and content.');
      return;
    }

    const newGuide: LiturgicalGuide = {
      id: `GUIDE-${Date.now()}`,
      title: guideTitle,
      type: guideType,
      date: guideDate || undefined,
      content: guideContent.trim()
    };

    saveGuides([newGuide, ...guides]);
    toast.success('Liturgical guide published successfully!');
    setGuideTitle('');
    setGuideContent('');
    setGuideDate('');
  };

  const handleRemoveGuide = (id: string) => {
    const updated = guides.filter(g => g.id !== id);
    saveGuides(updated);
    toast.success('Liturgical guide removed');
  };

  return (
    <div className="p-4 md:p-8 font-sans text-gray-200 min-h-screen bg-[#001a16]">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-[#002520] p-6 rounded-xl border border-[#ffd700]/20 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg text-[#ffd700] border border-blue-500/20 animate-pulse">
              <Sparkles className="w-8 h-8 text-[#ffd700]" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">Liturgical Coordination</h1>
              <p className="text-gray-400 text-sm mt-1">
                Liturgy Coordinator Portal
              </p>
            </div>
          </div>
        </div>

        {/* Compact Horizontal Profile Card (Sleek Horizontal Space-Saver) */}
        {currentUser && (
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 mb-8 rounded-xl shadow-lg">
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
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Role</p>
                    <p className="text-[#ffd700] font-bold text-sm">LITURGIST</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Assigned Duties</p>
                    <p className="text-white font-bold text-sm">{dbAssignments.length} Assignments</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Active Guide Book</p>
                    <p className="text-white font-bold text-sm">{guides.length} Published</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Workspaces */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Duty Roster & Scheduler */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Thursday Fellowship & Spiritual Activities Calendar */}
            <div className="bg-[#002520] border border-[#ffd700]/10 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-[#ffd700]" />
                Thursday Fellowship & Spiritual Assignments
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#ffd700]/10 text-gray-400 font-semibold">
                      <th className="py-3 px-4">Activity Date</th>
                      <th className="py-3 px-4">Activity Name</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbAssignments.length > 0 ? (
                      dbAssignments.map((assignment) => {
                        const dateStr = new Date(assignment.activity_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                        const assignee = assignment.assigned_family 
                          ? `${assignment.assigned_family} Family` 
                          : members.find(m => m.official_member_id === assignment.assigned_member_id || m.id === assignment.assigned_member_id)?.name || assignment.assigned_member_id;

                        return (
                          <tr key={assignment.id} className="border-b border-[#ffd700]/5 hover:bg-[#001a16]/40 transition-colors">
                            <td className="py-4 px-4 font-mono text-gray-300 whitespace-nowrap">
                              {dateStr}
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-white font-semibold text-xs uppercase">{assignment.activity_name}</p>
                              {assignment.notes && <p className="text-gray-400 text-[11px] mt-0.5">{assignment.notes}</p>}
                            </td>
                            <td className="py-4 px-4">
                              <span className="bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/25 px-2 py-0.5 rounded text-xs font-semibold">
                                {assignment.duty_role}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-bold text-white uppercase text-xs">
                              {assignee}
                            </td>
                            <td className="py-4 px-4">
                              {getStatusBadge(assignment.status)}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex justify-center items-center gap-2">
                                {assignment.status !== 'Completed' && (
                                  <Button
                                    onClick={() => handleMarkCompleted(assignment.id)}
                                    className="bg-emerald-500/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-1 h-auto"
                                  >
                                    Mark Completed
                                  </Button>
                                )}
                                <Button
                                  onClick={() => handleRemoveFellowshipAssignment(assignment.id)}
                                  className="bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/30 text-red-400 text-xs px-2.5 py-1 h-auto"
                                >
                                  Unassign
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No spiritual activities or fellowship duties scheduled yet. Use the planner panel to assign a duty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Thursday Fellowship Planner Form */}
            <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#ffd700]" />
                Schedule Spiritual Fellowship Activity
              </h3>
              <form onSubmit={handleAddFellowshipAssignment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Activity Name</label>
                  <Input
                    type="text"
                    value={fellowshipActivityName}
                    onChange={(e) => setFellowshipActivityName(e.target.value)}
                    placeholder="e.g. Thursday Fellowship"
                    className="bg-[#001a16] border-[#ffd700]/20 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Activity Date</label>
                  <input
                    type="date"
                    value={fellowshipDate}
                    onChange={(e) => setFellowshipDate(e.target.value)}
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Duty Role</label>
                  <select
                    value={fellowshipRole}
                    onChange={(e) => setFellowshipRole(e.target.value)}
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                  >
                    <option value="Exhortation">Exhortation</option>
                    <option value="Intercessions">Intercessions</option>
                    <option value="Praise & Worship">Praise & Worship</option>
                    <option value="First Reading">First Reading</option>
                    <option value="Second Reading">Second Reading</option>
                    <option value="Closing Prayer">Closing Prayer</option>
                    <option value="Warden duty">Warden duty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Assignment Type</label>
                  <div className="flex gap-4 mt-2">
                    <label className="inline-flex items-center text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="fellowshipAssigneeType"
                        checked={fellowshipAssigneeType === 'member'}
                        onChange={() => setFellowshipAssigneeType('member')}
                        className="form-radio text-[#ffd700] mr-2"
                      />
                      Specific Member
                    </label>
                    <label className="inline-flex items-center text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="fellowshipAssigneeType"
                        checked={fellowshipAssigneeType === 'family'}
                        onChange={() => setFellowshipAssigneeType('family')}
                        className="form-radio text-[#ffd700] mr-2"
                      />
                      Entire Family Unit
                    </label>
                  </div>
                </div>

                {fellowshipAssigneeType === 'member' ? (
                  <div className="flex flex-col gap-1">
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Select Member</label>
                    <Input
                      type="text"
                      placeholder="Type to search member..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="bg-[#001a16] border-[#ffd700]/20 text-white text-xs mb-1.5"
                    />
                    <select
                      value={fellowshipMemberId}
                      onChange={(e) => setFellowshipMemberId(e.target.value)}
                      className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                    >
                      <option value="">Choose assignee member...</option>
                      {members.filter(m => {
                        if (m.status === 'Deceased' || !m.name) return false;
                        if (!memberSearch) return true;
                        const searchLower = memberSearch.toLowerCase();
                        const nameMatch = (m.full_name || m.name || '').toLowerCase().includes(searchLower);
                        const idMatch = (m.official_member_id || m.id || '').toLowerCase().includes(searchLower);
                        return nameMatch || idMatch;
                      }).map(m => (
                        <option key={m.id} value={m.official_member_id || m.id}>{m.name} ({m.official_member_id || m.id})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Select CMO Family Unit</label>
                    <select
                      value={fellowshipFamily}
                      onChange={(e) => setFellowshipFamily(e.target.value)}
                      className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                    >
                      <option value="Wisdom">Wisdom Family</option>
                      <option value="Honour">Honour Family</option>
                      <option value="Integrity">Integrity Family</option>
                      <option value="Talent">Talent Family</option>
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Instruction Notes / Details</label>
                  <textarea
                    rows={2}
                    value={fellowshipNotes}
                    onChange={(e) => setFellowshipNotes(e.target.value)}
                    placeholder="Enter spiritual directions, prayer guidelines, or coordinator comments..."
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 resize-none font-sans"
                  />
                </div>

                <div className="md:col-span-2">
                  <Button type="submit" disabled={fellowshipLoading} className="w-full bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-bold">
                    {fellowshipLoading ? 'Scheduling...' : 'Schedule Spiritual Duty Assignment'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Thursday Fellowship Attendance Tracker Card */}
            <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg mt-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#ffd700]" />
                Thursday Fellowship Attendance Tracker
              </h3>

              {!activeMeetingId ? (
                <form onSubmit={handleInitializeAttendance} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Select Fellowship Date</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50"
                    />
                  </div>
                  <Button type="submit" className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-bold px-6 h-10">
                    Initialize Attendance
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-[#001a16] p-3 rounded-lg border border-[#ffd700]/10">
                    <p className="text-sm text-white">
                      Active Session Date: <span className="text-[#ffd700] font-bold">{new Date(attendanceDate).toLocaleDateString()}</span>
                    </p>
                    <Button 
                      onClick={() => {
                        setActiveMeetingId(null);
                        setAttendanceMap({});
                        setAttendanceSearch('');
                      }}
                      className="bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/30 text-red-400 text-xs px-3 py-1 h-auto"
                    >
                      Cancel
                    </Button>
                  </div>

                  <Input
                    type="text"
                    placeholder="Search member to mark..."
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    className="bg-[#001a16] border-[#ffd700]/20 text-white text-xs mb-1"
                  />

                  <div className="overflow-x-auto max-h-[300px] border border-[#ffd700]/10 rounded-lg">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#ffd700]/10 text-gray-400 font-semibold bg-[#001a16]">
                          <th className="py-2.5 px-4 text-xs uppercase">Member Name</th>
                          <th className="py-2.5 px-4 text-xs uppercase">CMO Family</th>
                          <th className="py-2.5 px-4 text-xs uppercase text-center">Status Selection</th>
                          <th className="py-2.5 px-4 text-xs uppercase text-center">WhatsApp Outreach</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.filter(m => m.status !== 'Deceased' && m.name).filter(m => {
                          if (!attendanceSearch) return true;
                          const s = attendanceSearch.toLowerCase();
                          const nameVal = (m.name || m.full_name || '').toLowerCase();
                          const idVal = (m.official_member_id || m.id || '').toLowerCase();
                          return nameVal.includes(s) || idVal.includes(s);
                        }).map((m) => {
                          const mId = m.official_member_id || m.id;
                          const currentStatus = attendanceMap[mId] || 'Absent';
                          return (
                            <tr key={m.id} className="border-b border-[#ffd700]/5 hover:bg-[#001a16]/40 transition-colors">
                              <td className="py-3 px-4 text-white font-medium text-xs">
                                {m.name}
                                <span className="block text-[10px] text-gray-400 font-mono mt-0.5">{mId}</span>
                              </td>
                              <td className="py-3 px-4 text-gray-300 text-xs font-semibold">
                                {m.family || m.cmo_family || 'N/A'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex gap-4">
                                  <label className="inline-flex items-center text-xs text-gray-300 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`attendance-${mId}`}
                                      value="Present"
                                      checked={currentStatus === 'Present'}
                                      onChange={() => setAttendanceMap(prev => ({ ...prev, [mId]: 'Present' }))}
                                      className="form-radio text-green-500 mr-1.5 focus:ring-0"
                                    />
                                    Present
                                  </label>
                                  <label className="inline-flex items-center text-xs text-gray-300 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`attendance-${mId}`}
                                      value="Absent"
                                      checked={currentStatus === 'Absent'}
                                      onChange={() => setAttendanceMap(prev => ({ ...prev, [mId]: 'Absent' }))}
                                      className="form-radio text-red-500 mr-1.5 focus:ring-0"
                                    />
                                    Absent
                                  </label>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {currentStatus === 'Absent' ? (
                                  <a
                                    href={getWhatsAppUrl(m.phone || m.phone_number || '', m.name)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center p-1.5 bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                                    title="Send WhatsApp Outreach Message"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </a>
                                ) : (
                                  <span className="text-gray-500 text-xs italic">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Button
                    onClick={handleSaveAttendance}
                    disabled={savingAttendance}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold h-10 shadow-lg"
                  >
                    {savingAttendance ? 'Saving Attendance Record...' : 'Submit & Save Fellowship Attendance'}
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Liturgical Guide & feast days */}
          <div className="space-y-6">
            <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                <Bookmark className="w-5 h-5 text-[#ffd700]" />
                Liturgical Calendar & Guide
              </h2>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {guides.map((g) => (
                  <div key={g.id} className="bg-[#001a16] border border-[#ffd700]/10 p-4 rounded-lg relative">
                    <button
                      onClick={() => handleRemoveGuide(g.id)}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs cursor-pointer"
                      title="Delete guideline"
                    >
                      Delete
                    </button>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        g.type === 'Feast Day' ? 'bg-yellow-500/20 text-yellow-400' :
                        g.type === 'Rehearsal Notice' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {g.type}
                      </span>
                      {g.date && <span className="text-[10px] text-gray-500 font-mono">{g.date}</span>}
                    </div>
                    <h4 className="text-white font-bold text-xs uppercase tracking-tight">{g.title}</h4>
                    <p className="text-gray-300 text-[11px] leading-relaxed mt-1">{g.content}</p>
                  </div>
                ))}
                {guides.length === 0 && (
                  <p className="text-gray-400 text-center py-6 text-sm">No guidelines or guides published.</p>
                )}
              </div>
            </Card>

            {/* Post/Publish Guide Form */}
            <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ffd700]" />
                Publish Guideline / Event
              </h3>
              <form onSubmit={handleAddGuide} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Title</label>
                  <Input
                    type="text"
                    value={guideTitle}
                    onChange={(e) => setGuideTitle(e.target.value)}
                    placeholder="e.g. Reader Rehearsal Notice"
                    className="bg-[#001a16] border-[#ffd700]/20 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Type</label>
                    <select
                      value={guideType}
                      onChange={(e) => setGuideType(e.target.value as any)}
                      className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-xs text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                    >
                      <option value="Feast Day">Feast Day</option>
                      <option value="General Guideline">Guideline</option>
                      <option value="Rehearsal Notice">Rehearsal</option>
                      <option value="Mass Program">Mass Program</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Event Date</label>
                    <input
                      type="date"
                      value={guideDate}
                      onChange={(e) => setGuideDate(e.target.value)}
                      className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-1.5 text-xs text-white focus:outline-none focus:border-[#ffd700]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Guideline Content</label>
                  <textarea
                    rows={3}
                    value={guideContent}
                    onChange={(e) => setGuideContent(e.target.value)}
                    placeholder="Enter liturgical directions, announcements, or mass duty notes..."
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 resize-none font-sans"
                  />
                </div>

                <Button type="submit" className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-bold mt-1">
                  Publish Guide
                </Button>
              </form>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
