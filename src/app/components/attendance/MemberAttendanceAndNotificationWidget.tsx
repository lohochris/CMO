import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Member, AttendanceRecord, CmoNotification } from '../../../types';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  FileCheck, 
  Send, 
  AlertCircle,
  Calendar,
  Check
} from 'lucide-react';
import { 
  submitExcuseRequest, 
  fetchMemberNotifications, 
  markNotificationAsRead 
} from '../../../utils/attendanceService';

interface MemberAttendanceAndNotificationWidgetProps {
  currentUser: Member;
}

export function MemberAttendanceAndNotificationWidget({ currentUser }: MemberAttendanceAndNotificationWidgetProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Excuse Form State
  const [excuseDate, setExcuseDate] = useState<string>(todayStr);
  const [excuseCategory, setExcuseCategory] = useState<string>('Illness / Medical');
  const [excuseReason, setExcuseReason] = useState<string>('');
  const [submittingExcuse, setSubmittingExcuse] = useState<boolean>(false);

  // Notifications State
  const [notifications, setNotifications] = useState<CmoNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(true);

  // Member Attendance History
  const [myAttendanceHistory, setMyAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingNotifs(true);
    try {
      const data = await fetchMemberNotifications(currentUser.id, currentUser.official_member_id);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching member notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  }, [currentUser]);

  const loadAttendanceHistory = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingHistory(true);
    try {
      const targetId = currentUser.official_member_id || currentUser.id;
      const { data, error } = await supabase
        .from('cmo_attendance_and_excuses')
        .select('*')
        .or(`member_id.eq.${currentUser.id},official_member_id.eq.${targetId}`)
        .order('meeting_date', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('Attendance history query warning:', error.message);
      } else {
        setMyAttendanceHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to load attendance history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();
    loadAttendanceHistory();

    if (!currentUser?.id) return;

    // Realtime Postgres subscription to cmo_notifications for this member
    const notifChannel = supabase
      .channel(`member-notifs-${currentUser.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'cmo_notifications'
        },
        (payload) => {
          const newNotif = payload.new as CmoNotification;
          if (newNotif.member_id === currentUser.id || newNotif.official_member_id === currentUser.official_member_id) {
            setNotifications(prev => [newNotif, ...prev]);
            toast.info(`🔔 ${newNotif.title}: ${newNotif.message}`);
          }
        }
      )
      .subscribe();

    // Realtime Postgres subscription to cmo_attendance_and_excuses for this member
    const attChannel = supabase
      .channel(`member-att-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cmo_attendance_and_excuses' },
        () => {
          loadAttendanceHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(attChannel);
    };
  }, [currentUser, loadNotifications, loadAttendanceHistory]);

  const handleDismissNotification = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_status: true } : n));
    } catch (err) {
      console.error('Dismiss notification error:', err);
    }
  };

  const handleSubmitExcuse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excuseReason.trim()) {
      toast.error('Please provide a detailed reason for your excuse request.');
      return;
    }

    setSubmittingExcuse(true);
    try {
      const res = await submitExcuseRequest({
        member_id: currentUser.id,
        official_member_id: currentUser.official_member_id,
        member_name: currentUser.name || currentUser.full_name || 'Member',
        meeting_date: excuseDate,
        category: excuseCategory,
        reason: excuseReason.trim()
      });

      if (res.success) {
        toast.success('Absence excuse request submitted to Provost Office successfully!');
        setExcuseReason('');
        loadAttendanceHistory();
        loadNotifications();
      } else {
        toast.error(`Failed to submit excuse: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSubmittingExcuse(false);
    }
  };

  const unreadNotifs = notifications.filter(n => !n.read_status);

  return (
    <div className="space-y-6">
      {/* 1. Real-Time Member Notification Center Banners */}
      {unreadNotifs.length > 0 && (
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-[#ffd700] animate-bounce" />
            <h4 className="text-sm font-bold text-[#ffd700] uppercase tracking-wider">
              Attendance & Executive Alerts ({unreadNotifs.length})
            </h4>
          </div>
          <div className="space-y-2">
            {unreadNotifs.map((notif) => (
              <div 
                key={notif.id || notif.title + notif.created_at}
                className="bg-[#001a16] border border-[#ffd700]/30 p-3 rounded-lg flex items-start justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <p className="text-white font-bold text-xs flex items-center gap-1.5">
                    {notif.type === 'excuse' ? '🔵' : notif.type === 'fine' ? '🔴' : '🟢'}
                    {notif.title}
                  </p>
                  <p className="text-xs text-gray-300">{notif.message}</p>
                </div>
                {notif.id && (
                  <button
                    type="button"
                    onClick={() => handleDismissNotification(notif.id!)}
                    className="text-gray-400 hover:text-[#ffd700] text-xs font-semibold p-1 shrink-0 cursor-pointer"
                    title="Dismiss"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Absence Excuse Submission Form */}
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-xl">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#ffd700]/20">
            <div className="p-2 bg-[#ffd700]/20 text-[#ffd700] rounded-lg border border-[#ffd700]/30">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-[#ffd700]">Submit Absence Excuse Request</h4>
              <p className="text-xs text-gray-300">Formally notify Provost Office ahead of general meeting</p>
            </div>
          </div>

          <form onSubmit={handleSubmitExcuse} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Target Meeting Date</label>
                <Input
                  type="date"
                  value={excuseDate}
                  onChange={(e) => setExcuseDate(e.target.value)}
                  className="bg-[#001a16] border-[#ffd700]/30 text-white text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-semibold">Excuse Category</label>
                <select
                  value={excuseCategory}
                  onChange={(e) => setExcuseCategory(e.target.value)}
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white rounded p-2 text-xs focus:border-[#ffd700] focus:outline-none"
                >
                  <option value="Illness / Medical">Illness / Medical</option>
                  <option value="Travel">Travel</option>
                  <option value="Work/Official Assignment">Work / Official Assignment</option>
                  <option value="Family Emergency">Family Emergency</option>
                  <option value="Bereavement">Bereavement</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-semibold">Detailed Reason & Context</label>
              <textarea
                value={excuseReason}
                onChange={(e) => setExcuseReason(e.target.value)}
                placeholder="Provide details regarding your absence request..."
                className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-3 rounded text-xs min-h-[90px] focus:border-[#ffd700] focus:outline-none"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submittingExcuse}
              className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#e6c200] font-bold text-xs py-2.5 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {submittingExcuse ? 'Submitting Request...' : 'Submit Excuse Request to Provost'}
            </Button>
          </form>
        </Card>

        {/* 3. My Attendance & Excuse Status History */}
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#ffd700]/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#002a24] text-[#ffd700] rounded-lg border border-[#ffd700]/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#ffd700]">My Attendance Ledger</h4>
                <p className="text-xs text-gray-300">Your recent meeting roll-call & excuse status</p>
              </div>
            </div>
          </div>

          {loadingHistory ? (
            <div className="p-6 text-center text-gray-400 text-xs">Loading ledger history...</div>
          ) : myAttendanceHistory.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs bg-[#001a16] rounded border border-gray-800">
              No meeting attendance records logged yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {myAttendanceHistory.map((rec) => (
                <div 
                  key={rec.meeting_date + (rec.id || '')}
                  className="bg-[#001a16] border border-[#ffd700]/20 p-3 rounded-lg flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-xs">{rec.meeting_title || 'General Meeting'}</span>
                      <span className="text-[11px] text-[#ffd700] font-mono">({rec.meeting_date})</span>
                    </div>
                    {rec.excuse_status && rec.excuse_status !== 'None' && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Excuse: <span className="text-amber-300 font-semibold">{rec.excuse_status}</span>
                        {rec.excuse_category ? ` (${rec.excuse_category})` : ''}
                      </p>
                    )}
                  </div>

                  <div>
                    {rec.status === 'Present' && (
                      <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded flex items-center gap-1">
                        🟢 Present
                      </span>
                    )}
                    {rec.status === 'Late' && (
                      <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold rounded flex items-center gap-1">
                        🟡 Late (₦{rec.fine_amount || 500})
                      </span>
                    )}
                    {rec.status === 'Excused' && (
                      <span className="px-2.5 py-1 bg-sky-500/20 border border-sky-500/40 text-sky-400 text-xs font-bold rounded flex items-center gap-1">
                        🔵 Excused
                      </span>
                    )}
                    {rec.status === 'Absent' && (
                      <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold rounded flex items-center gap-1">
                        🔴 Absent (₦{rec.fine_amount || 1000})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
