import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { supabase } from '../../../lib/supabaseClient';
import { AttendanceRecord } from '../../../types';
import { Users, CheckCircle, Clock, FileText, XCircle, PieChart, Calendar, Award } from 'lucide-react';
import { fetchAttendanceByDate } from '../../../utils/attendanceService';

interface ChairmanAttendanceAnalyticsWidgetProps {
  totalRosterCount: number;
}

export function ChairmanAttendanceAnalyticsWidget({ totalRosterCount }: ChairmanAttendanceAnalyticsWidgetProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [meetingTitle, setMeetingTitle] = useState<string>('General Meeting');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const records = await fetchAttendanceByDate(selectedDate);
      setAttendanceRecords(records);
      if (records.length > 0 && records[0].meeting_title) {
        setMeetingTitle(records[0].meeting_title);
      }
    } catch (err) {
      console.error('Error fetching chairman attendance data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates on cmo_attendance_and_excuses
    const channel = supabase
      .channel(`chairman-att-${selectedDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cmo_attendance_and_excuses' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, loadData]);

  // Calculations
  const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'Late').length;
  const excusedCount = attendanceRecords.filter(r => r.status === 'Excused').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;

  const totalMembers = totalRosterCount > 0 ? totalRosterCount : (attendanceRecords.length || 1);
  const adjustedTotal = Math.max(1, totalMembers - excusedCount);
  const attendeesCount = presentCount + lateCount;
  
  const quorumPercentageVal = (attendeesCount / adjustedTotal) * 100;
  const quorumPercentage = Math.min(100, Math.max(0, quorumPercentageVal)).toFixed(1);
  const numericQuorum = parseFloat(quorumPercentage);

  let quorumStatusColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  let quorumBadgeText = '🟢 Strong Executive Quorum';
  if (numericQuorum < 50) {
    quorumStatusColor = 'text-rose-400 border-rose-500/40 bg-rose-500/10';
    quorumBadgeText = '🔴 Below Quorum Threshold';
  } else if (numericQuorum < 75) {
    quorumStatusColor = 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    quorumBadgeText = '🟡 Moderate Attendance Quorum';
  }

  return (
    <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-2xl space-y-6">
      {/* Widget Header & Date Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#ffd700]/20">
        <div>
          <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
            <PieChart className="w-6 h-6 text-[#ffd700]" />
            Meeting Quorum & Attendance Analytics
          </h3>
          <p className="text-xs text-gray-300 mt-1">
            Real-time executive breakdown for <span className="font-semibold text-white">{meetingTitle}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 font-semibold shrink-0">Meeting Date:</label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#001a16] border-[#ffd700]/40 text-white text-xs font-mono py-1 w-36"
          />
        </div>
      </div>

      {/* Quorum Highlight Gauge */}
      <div className="bg-[#001a16] border border-[#ffd700]/20 p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Effective Quorum Ratio</p>
          <div className="flex items-baseline justify-center md:justify-start gap-2">
            <span className="text-4xl font-extrabold text-[#ffd700]">{quorumPercentage}%</span>
            <span className="text-xs text-gray-400">
              ({attendeesCount} / {adjustedTotal} active members)
            </span>
          </div>
        </div>

        <div className="w-full md:w-64 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${quorumStatusColor}`}>
              {quorumBadgeText}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-3 bg-[#002520] rounded-full overflow-hidden border border-[#ffd700]/30">
            <div 
              className={`h-full transition-all duration-500 ${
                numericQuorum >= 75 ? 'bg-emerald-400' : numericQuorum >= 50 ? 'bg-amber-400' : 'bg-rose-400'
              }`}
              style={{ width: `${Math.min(100, numericQuorum)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4-Part Visual Metric Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#001a16] border border-[#ffd700]/20 p-3.5 rounded-lg text-center">
          <div className="flex justify-center mb-1 text-gray-400">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Total Members</p>
          <p className="text-xl font-bold text-white mt-0.5">{totalMembers}</p>
        </div>

        <div className="bg-[#001a16] border border-emerald-500/30 p-3.5 rounded-lg text-center">
          <div className="flex justify-center mb-1 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">Present 🟢</p>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">{presentCount}</p>
        </div>

        <div className="bg-[#001a16] border border-amber-500/30 p-3.5 rounded-lg text-center">
          <div className="flex justify-center mb-1 text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-amber-400 uppercase tracking-wider font-semibold">Late 🟡</p>
          <p className="text-xl font-bold text-amber-400 mt-0.5">{lateCount}</p>
        </div>

        <div className="bg-[#001a16] border border-sky-500/30 p-3.5 rounded-lg text-center">
          <div className="flex justify-center mb-1 text-sky-400">
            <FileText className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-sky-400 uppercase tracking-wider font-semibold">Excused 🔵</p>
          <p className="text-xl font-bold text-sky-400 mt-0.5">{excusedCount}</p>
        </div>

        <div className="bg-[#001a16] border border-rose-500/30 p-3.5 rounded-lg text-center col-span-2 sm:col-span-1">
          <div className="flex justify-center mb-1 text-rose-400">
            <XCircle className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">Unexcused 🔴</p>
          <p className="text-xl font-bold text-rose-400 mt-0.5">{absentCount}</p>
        </div>
      </div>
    </Card>
  );
}
