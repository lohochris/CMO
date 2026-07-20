import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Member, AttendanceRecord, CmoMeetingSession } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileCheck, 
  Search, 
  Calendar, 
  UserCheck,
  FileText,
  BadgeCheck,
  Lock,
  Play,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { 
  fetchAttendanceByDate, 
  fetchPendingExcuses, 
  upsertAttendanceRecord, 
  processPendingExcuse,
  fetchMeetingSession,
  openMeetingSession,
  lockMeetingSession,
  DEFAULT_LATE_FINE,
  DEFAULT_ABSENT_FINE
} from '../../../utils/attendanceService';

interface ProvostAttendanceWorkspaceProps {
  members: Member[];
}

export function ProvostAttendanceWorkspace({ members }: ProvostAttendanceWorkspaceProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [meetingDate, setMeetingDate] = useState<string>(todayStr);
  const [meetingTitle, setMeetingTitle] = useState<string>('Monthly General Meeting');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [pendingExcuses, setPendingExcuses] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [processingExcuseId, setProcessingExcuseId] = useState<string | null>(null);

  // 4-Hour Session Lock States
  const [session, setSession] = useState<CmoMeetingSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [openingSession, setOpeningSession] = useState<boolean>(false);
  const [lockingSession, setLockingSession] = useState<boolean>(false);

  const loadAttendanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [records, excuses, sess] = await Promise.all([
        fetchAttendanceByDate(meetingDate),
        fetchPendingExcuses(),
        fetchMeetingSession(meetingDate)
      ]);
      setAttendanceRecords(records);
      setPendingExcuses(excuses);
      setSession(sess);
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setLoading(false);
    }
  }, [meetingDate]);

  useEffect(() => {
    loadAttendanceData();

    // Subscribe to realtime updates on cmo_attendance_and_excuses & cmo_meeting_sessions
    const channel = supabase
      .channel(`provost-att-${meetingDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cmo_attendance_and_excuses' },
        () => {
          loadAttendanceData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cmo_meeting_sessions' },
        () => {
          loadAttendanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingDate, loadAttendanceData]);

  // Live countdown timer ticker hook with zero memory leaks
  useEffect(() => {
    if (!session || session.is_manually_locked) {
      setRemainingSeconds(0);
      return;
    }

    const updateCountdown = () => {
      const locksAtMs = new Date(session.locks_at).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((locksAtMs - nowMs) / 1000));
      setRemainingSeconds(diffSec);
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [session]);

  const isSessionActive = !!session;
  const isSessionLocked = !session || !!session.is_manually_locked || remainingSeconds <= 0;

  const formatCountdown = (totalSec: number): string => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const handleOpenSession = async () => {
    setOpeningSession(true);
    try {
      const newSess = await openMeetingSession(meetingDate, meetingTitle, 'Provost Marshal');
      setSession(newSess);
      toast.success('Meeting Session Opened! 4-Hour Roll-Call Window activated.');
    } catch (err: any) {
      toast.error(`Failed to start session: ${err.message}`);
    } finally {
      setOpeningSession(false);
    }
  };

  const handleLockSession = async () => {
    setLockingSession(true);
    try {
      await lockMeetingSession(meetingDate);
      setSession(prev => prev ? { ...prev, is_manually_locked: true } : null);
      toast.success('Attendance Register Sealed & Finalized!');
    } catch (err: any) {
      toast.error(`Failed to lock session: ${err.message}`);
    } finally {
      setLockingSession(false);
    }
  };

  // Mark/Correct attendance status for a member
  const handleMarkStatus = async (
    member: Member, 
    status: 'Present' | 'Late' | 'Excused' | 'Absent'
  ) => {
    if (isSessionLocked) {
      toast.error('Attendance Register is locked. Open an active session to make corrections.');
      return;
    }

    setUpdatingMemberId(member.id);
    try {
      let fineAmount = 0;
      if (status === 'Late') fineAmount = DEFAULT_LATE_FINE;
      else if (status === 'Absent') fineAmount = DEFAULT_ABSENT_FINE;
      // Note: Changing to 'Present' or 'Excused' sets fineAmount = 0, instantly clearing previous fines!

      const result = await upsertAttendanceRecord({
        meeting_date: meetingDate,
        meeting_title: meetingTitle,
        member_id: member.id,
        official_member_id: member.official_member_id || member.id,
        member_name: member.name || member.full_name || '',
        status,
        fine_amount: fineAmount,
        check_in_time: status === 'Present' || status === 'Late' ? new Date().toISOString() : null
      });

      if (result.success) {
        toast.success(`Updated ${member.name} -> ${status}${fineAmount > 0 ? ` (Fine: ₦${fineAmount.toLocaleString()})` : ' (Fine Cleared)'}`);
        // Optimistic local state update
        setAttendanceRecords(prev => {
          const existingIdx = prev.findIndex(r => r.member_id === member.id && r.meeting_date === meetingDate);
          const updatedRecord: AttendanceRecord = {
            meeting_date: meetingDate,
            meeting_title: meetingTitle,
            member_id: member.id,
            official_member_id: member.official_member_id || member.id,
            member_name: member.name || member.full_name || '',
            status,
            fine_amount: fineAmount,
            check_in_time: status === 'Present' || status === 'Late' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          };

          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = updatedRecord;
            return next;
          }
          return [...prev, updatedRecord];
        });
      } else {
        toast.error(`Failed to update attendance: ${result.error}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  // Handle pending excuse action
  const handleExcuseAction = async (excuse: AttendanceRecord, action: 'Approve' | 'Reject') => {
    setProcessingExcuseId(excuse.member_id);
    try {
      const result = await processPendingExcuse(
        excuse.meeting_date,
        excuse.member_id,
        excuse.official_member_id,
        excuse.member_name,
        action
      );

      if (result.success) {
        toast.success(`Excuse ${action === 'Approve' ? 'Approved' : 'Rejected'} for ${excuse.member_name}`);
        setPendingExcuses(prev => prev.filter(e => !(e.member_id === excuse.member_id && e.meeting_date === excuse.meeting_date)));
        loadAttendanceData();
      } else {
        toast.error(`Failed to process excuse: ${result.error}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setProcessingExcuseId(null);
    }
  };

  // Filter active members for attendance grid
  const activeMembers = members.filter(m => m.status !== 'Deceased');
  const filteredMembers = activeMembers.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = m.name?.toLowerCase().includes(q) || m.full_name?.toLowerCase().includes(q);
    const idMatch = (m.official_member_id || m.id).toLowerCase().includes(q);
    const familyMatch = m.family?.toLowerCase().includes(q) || m.cmo_family?.toLowerCase().includes(q);
    return nameMatch || idMatch || familyMatch;
  });

  // Analytics summary for selected meeting
  const totalRoster = activeMembers.length;
  const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'Late').length;
  const excusedCount = attendanceRecords.filter(r => r.status === 'Excused').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;

  return (
    <div className="space-y-6">
      {/* 1. Meeting Session Selector & 4-Hour Timer Banner */}
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 shadow-xl rounded-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 pb-4 border-b border-[#ffd700]/20">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-[#ffd700] flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[#ffd700]" />
              Live Meeting Session Manager
            </h3>
            <p className="text-sm text-gray-300 mt-1">
              Select date, manage live roll-call attendance, and enforce 4-hour window locking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 font-semibold mb-1">Meeting Date</label>
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="bg-[#001a16] border-[#ffd700]/40 text-white font-mono text-sm py-1"
              />
            </div>
            <div className="flex flex-col flex-1 sm:w-64">
              <label className="text-xs text-gray-400 font-semibold mb-1">Session Title</label>
              <Input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Monthly General Meeting"
                className="bg-[#001a16] border-[#ffd700]/40 text-white text-sm py-1"
              />
            </div>
          </div>
        </div>

        {/* 4-HOUR SESSION TIMER CONTROL BANNER */}
        <div className="mb-4">
          {!isSessionActive ? (
            <div className="bg-[#001a16] border-2 border-[#ffd700] p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#ffd700]/10 rounded-lg text-[#ffd700] border border-[#ffd700]/30">
                  <Play className="w-5 h-5 text-[#ffd700]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#ffd700]">No Active Session Opened for {meetingDate}</h4>
                  <p className="text-xs text-gray-300">Open a 4-hour window session to enable interactive roll-call attendance and corrections.</p>
                </div>
              </div>
              <Button
                onClick={handleOpenSession}
                disabled={openingSession}
                className="bg-[#ffd700] hover:bg-[#e6c200] text-[#001a16] font-extrabold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
              >
                <Play className="w-4 h-4" />
                {openingSession ? 'Opening Session...' : 'Open Meeting Session (Start 4-Hour Timer)'}
              </Button>
            </div>
          ) : !isSessionLocked ? (
            <div className="bg-[#001a16] border-2 border-emerald-500/50 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/30">
                  <Clock className="w-5 h-5 text-emerald-400 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-extrabold text-sm uppercase tracking-wider">⏳ Session Active</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold rounded border border-emerald-500/40">
                      Auto-Locks in {formatCountdown(remainingSeconds)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">Full status corrections enabled. Changes clear or adjust fines automatically.</p>
                </div>
              </div>
              <Button
                onClick={handleLockSession}
                disabled={lockingSession}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
              >
                <Lock className="w-4 h-4" />
                {lockingSession ? 'Sealing...' : 'Seal & Lock Register'}
              </Button>
            </div>
          ) : (
            <div className="bg-[#001a16] border border-gray-700 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-800 rounded-lg text-gray-400 border border-gray-700">
                  <ShieldCheck className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 font-bold text-sm uppercase">🔒 Attendance Finalized</span>
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs font-semibold rounded border border-gray-700">
                      {session?.is_manually_locked ? 'Manually Sealed' : '4-Hour Timer Expired'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Register is locked to prevent unauthorized alterations.</p>
                </div>
              </div>
              <Button
                onClick={handleOpenSession}
                disabled={openingSession}
                className="bg-[#002a24] hover:bg-[#003d35] text-[#ffd700] border border-[#ffd700]/40 font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Re-Open 4-Hour Session
              </Button>
            </div>
          )}
        </div>

        {/* Live Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="bg-[#001a16] p-3 rounded-lg border border-[#ffd700]/20 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Roster</p>
            <p className="text-xl font-bold text-white mt-1">{totalRoster}</p>
          </div>
          <div className="bg-[#001a16] p-3 rounded-lg border border-emerald-500/30 text-center">
            <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Present 🟢</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{presentCount}</p>
          </div>
          <div className="bg-[#001a16] p-3 rounded-lg border border-amber-500/30 text-center">
            <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Late 🟡</p>
            <p className="text-xl font-bold text-amber-400 mt-1">{lateCount}</p>
          </div>
          <div className="bg-[#001a16] p-3 rounded-lg border border-sky-500/30 text-center">
            <p className="text-xs text-sky-400 uppercase tracking-wider font-semibold">Excused 🔵</p>
            <p className="text-xl font-bold text-sky-400 mt-1">{excusedCount}</p>
          </div>
          <div className="bg-[#001a16] p-3 rounded-lg border border-rose-500/30 text-center col-span-2 sm:col-span-1">
            <p className="text-xs text-rose-400 uppercase tracking-wider font-semibold">Absent 🔴</p>
            <p className="text-xl font-bold text-rose-400 mt-1">{absentCount}</p>
          </div>
        </div>
      </Card>

      {/* 2. Pending Excuses Queue Card (High Priority) */}
      <Card className="bg-[#002520] border-2 border-amber-500/50 p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-[#ffd700]">Pending Absence Excuses Queue</h4>
              <p className="text-xs text-gray-300">High-priority review requests submitted by members</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-full">
            {pendingExcuses.length} Pending
          </span>
        </div>

        {pendingExcuses.length === 0 ? (
          <div className="p-6 bg-[#001a16] border border-[#ffd700]/10 rounded-lg text-center">
            <BadgeCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
            <p className="text-gray-300 text-sm font-medium">No pending excuse requests in queue.</p>
            <p className="text-xs text-gray-500 mt-1">Submitted member excuses will appear here for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingExcuses.map((excuse) => (
              <div 
                key={`${excuse.member_id}-${excuse.meeting_date}`}
                className="bg-[#001a16] border border-amber-500/30 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{excuse.member_name}</span>
                    <span className="text-xs text-[#ffd700] font-mono">({excuse.official_member_id || excuse.member_id})</span>
                    <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] uppercase font-bold rounded">
                      {excuse.excuse_category || 'General Excuse'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 italic">
                    &ldquo;{excuse.excuse_reason || 'No detailed reason provided.'}&rdquo;
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Target Date: <span className="font-mono text-gray-300">{excuse.meeting_date}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleExcuseAction(excuse, 'Approve')}
                    disabled={processingExcuseId === excuse.member_id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Excuse
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExcuseAction(excuse, 'Reject')}
                    disabled={processingExcuseId === excuse.member_id}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject (Fine ₦1,000)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 3. 4-Button Interactive Attendance Grid */}
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h4 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#ffd700]" />
              Active Roster Roll-Call Grid
              {isSessionLocked && (
                <span className="px-2.5 py-1 bg-gray-800 border border-gray-700 text-gray-400 text-xs font-bold rounded-full ml-2">
                  🔒 Finalized
                </span>
              )}
            </h4>
            <p className="text-xs text-gray-300 mt-0.5">
              {isSessionLocked 
                ? 'Register locked. Open an active 4-hour session above to make status corrections.'
                : 'Click any status button to mark or correct attendance. Status changes adjust fines instantly.'}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <Input
              type="text"
              placeholder="Filter by name, ID, or family..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#001a16] border-[#ffd700]/30 text-white pl-9 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading attendance records...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 bg-[#001a16] rounded border border-gray-800">
            No matching active members found.
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredMembers.map((member) => {
              const rec = attendanceRecords.find(r => r.member_id === member.id);
              const currentStatus = rec?.status;
              const isUpdating = updatingMemberId === member.id;

              return (
                <div 
                  key={member.id}
                  className="bg-[#001a16] border border-[#ffd700]/20 p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-[#ffd700]/50 transition-colors"
                >
                  {/* Member Details */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-yellow-400 flex items-center justify-center text-yellow-400 font-extrabold text-xs shrink-0 select-none">
                      {(() => {
                        const name = member.name || member.full_name;
                        if (!name || !name.trim()) return 'HC';
                        const parts = name.trim().split(/\s+/).filter(Boolean);
                        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
                        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                      })()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{member.name || member.full_name}</span>
                        {member.family && (
                          <span className="px-2 py-0.5 bg-[#002a24] text-[#ffd700] text-[10px] font-semibold rounded border border-[#ffd700]/20">
                            {member.family}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        ID: {member.official_member_id || member.id}
                      </p>
                    </div>
                  </div>

                  {/* Current Status Badge & Controls */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    {/* Status Badge */}
                    <div className="mr-2 text-right">
                      {currentStatus === 'Present' && (
                        <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PRESENT
                        </span>
                      )}
                      {currentStatus === 'Late' && (
                        <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold rounded flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> LATE (₦{rec?.fine_amount || 500})
                        </span>
                      )}
                      {currentStatus === 'Excused' && (
                        <span className="px-2.5 py-1 bg-sky-500/20 border border-sky-500/40 text-sky-400 text-xs font-bold rounded flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> EXCUSED
                        </span>
                      )}
                      {currentStatus === 'Absent' && (
                        <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold rounded flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> ABSENT (₦{rec?.fine_amount || 1000})
                        </span>
                      )}
                      {!currentStatus && (
                        <span className="px-2.5 py-1 bg-gray-800 text-gray-400 text-xs font-medium rounded border border-gray-700">
                          UNMARKED
                        </span>
                      )}
                    </div>

                    {/* 4 Action Buttons (Disabled when Session is Locked) */}
                    <div className="grid grid-cols-4 gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isSessionLocked || isUpdating}
                        onClick={() => handleMarkStatus(member, 'Present')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors border ${
                          isSessionLocked
                            ? 'opacity-40 cursor-not-allowed bg-gray-800 text-gray-500 border-gray-700'
                            : currentStatus === 'Present' 
                              ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400/50 cursor-pointer' 
                              : 'bg-[#002520] hover:bg-emerald-950 text-emerald-400 border-emerald-500/40 cursor-pointer'
                        }`}
                        title={isSessionLocked ? 'Register Locked' : 'Mark / Correct to Present (Clears Fine)'}
                      >
                        🟢 Present
                      </button>

                      <button
                        type="button"
                        disabled={isSessionLocked || isUpdating}
                        onClick={() => handleMarkStatus(member, 'Late')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors border ${
                          isSessionLocked
                            ? 'opacity-40 cursor-not-allowed bg-gray-800 text-gray-500 border-gray-700'
                            : currentStatus === 'Late' 
                              ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/50 cursor-pointer' 
                              : 'bg-[#002520] hover:bg-amber-950 text-amber-400 border-amber-500/40 cursor-pointer'
                        }`}
                        title={isSessionLocked ? 'Register Locked' : 'Mark / Correct to Late (₦500 Fine)'}
                      >
                        🟡 Late
                      </button>

                      <button
                        type="button"
                        disabled={isSessionLocked || isUpdating}
                        onClick={() => handleMarkStatus(member, 'Excused')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors border ${
                          isSessionLocked
                            ? 'opacity-40 cursor-not-allowed bg-gray-800 text-gray-500 border-gray-700'
                            : currentStatus === 'Excused' 
                              ? 'bg-sky-600 text-white border-sky-400 ring-2 ring-sky-400/50 cursor-pointer' 
                              : 'bg-[#002520] hover:bg-sky-950 text-sky-400 border-sky-500/40 cursor-pointer'
                        }`}
                        title={isSessionLocked ? 'Register Locked' : 'Mark / Correct to Excused (Clears Fine)'}
                      >
                        🔵 Excused
                      </button>

                      <button
                        type="button"
                        disabled={isSessionLocked || isUpdating}
                        onClick={() => handleMarkStatus(member, 'Absent')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors border ${
                          isSessionLocked
                            ? 'opacity-40 cursor-not-allowed bg-gray-800 text-gray-500 border-gray-700'
                            : currentStatus === 'Absent' 
                              ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-400/50 cursor-pointer' 
                              : 'bg-[#002520] hover:bg-rose-950 text-rose-400 border-rose-500/40 cursor-pointer'
                        }`}
                        title={isSessionLocked ? 'Register Locked' : 'Mark / Correct to Absent (₦1,000 Fine)'}
                      >
                        🔴 Absent
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
