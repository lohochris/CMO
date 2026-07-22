import { useState, useEffect, useCallback } from 'react';
import {
  HeartPulse,
  ShieldCheck,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Activity,
  Lock,
  PlusCircle,
  Save,
  X,
  Search,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useApp } from '../../../contexts/AppContext';
import { Button } from '../../../app/components/ui/button';
import { Input } from '../../../app/components/ui/input';
import { Card } from '../../../app/components/ui/card';
import { toast } from 'sonner';
import { ProfilePictureUploader } from '../../../app/components/common/ProfilePictureUploader';
import { uploadProfilePicture } from '../../../utils/supabaseHelpers';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MedicalStatus = 'Fit' | 'Injured' | 'Recovering' | 'Suspended';

interface AthleteRecord {
  id: string;           // sports_athletes.id
  member_id: string;
  jersey_number: string | null;
  registration_status: string | null;
  full_name: string;
  latest_log?: MedicalLog;
}

interface MedicalLog {
  id: string;
  athlete_id: string;
  medical_status: MedicalStatus;
  clearance_status: boolean;
  clearance_alert: boolean;
  log_date: string;
  injury_description: string | null;
  progress_notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<MedicalStatus, { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }> = {
  Fit: {
    label: 'Fit',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/30',
    dot: 'bg-emerald-400',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  Injured: {
    label: 'Injured',
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/30',
    dot: 'bg-red-400',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  Recovering: {
    label: 'Recovering',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/30',
    dot: 'bg-yellow-400',
    icon: <Activity className="w-3.5 h-3.5" />,
  },
  Suspended: {
    label: 'Suspended',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10 border-orange-400/30',
    dot: 'bg-orange-400',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

const MEDICAL_STATUSES: MedicalStatus[] = ['Fit', 'Injured', 'Recovering', 'Suspended'];

const toastStyle = { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' };
const toastErrorStyle = { background: '#1a0000', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' };

// ─────────────────────────────────────────────────────────────────────────────
// Log Form Modal
// ─────────────────────────────────────────────────────────────────────────────

interface LogFormProps {
  athlete: AthleteRecord;
  existingLog: MedicalLog | null;
  onClose: () => void;
  onSaved: () => void;
  officerName: string;
}

const LogForm = ({ athlete, existingLog, onClose, onSaved, officerName }: LogFormProps) => {
  const [status, setStatus] = useState<MedicalStatus>(existingLog?.medical_status ?? 'Fit');
  const [clearance, setClearance] = useState<boolean>(existingLog?.clearance_status ?? true);
  const [clearanceAlert, setClearanceAlert] = useState<boolean>(existingLog?.clearance_alert ?? false);
  const [injury, setInjury] = useState(existingLog?.injury_description ?? '');
  const [progress, setProgress] = useState(existingLog?.progress_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        athlete_id: athlete.id,
        medical_status: status,
        clearance_status: clearance,
        clearance_alert: clearanceAlert,
        log_date: new Date().toISOString().split('T')[0],
        injury_description: injury.trim() || null,
        progress_notes: progress.trim() || null,
        recorded_by: officerName,
      };

      let error;
      if (existingLog?.id) {
        ({ error } = await supabase
          .from('sports_medical_logs')
          .update(payload)
          .eq('id', existingLog.id));
      } else {
        ({ error } = await supabase
          .from('sports_medical_logs')
          .insert([payload]));
      }

      if (error) throw error;

      toast.success(`Health record ${existingLog ? 'updated' : 'created'} for ${athlete.full_name}.`, { style: toastStyle });
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save medical log.', { style: toastErrorStyle });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-[#001a16] border border-[#ffd700]/20 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ffd700]/10 bg-[#002520]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <HeartPulse className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{athlete.full_name}</h3>
              <p className="text-xs text-gray-500">
                {existingLog ? 'Update Health Record' : 'New Health Record'}
                {athlete.jersey_number && ` · Jersey #${athlete.jersey_number}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Privacy Banner */}
        <div className="mx-6 mt-4 flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-400">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          Confidential medical data — restricted to authorised clinical personnel only.
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Fitness Status *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MEDICAL_STATUSES.map(s => {
                const meta = STATUS_META[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${
                      status === s
                        ? `${meta.bg} ${meta.color} border-current`
                        : 'border-[#ffd700]/10 text-gray-500 hover:border-[#ffd700]/20 hover:text-gray-300 bg-[#002520]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${status === s ? meta.dot : 'bg-gray-700'}`} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clearance Flags */}
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setClearance(c => !c)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                clearance
                  ? 'bg-emerald-400/10 border-emerald-400/30'
                  : 'bg-red-400/10 border-red-400/30'
              }`}
            >
              <span className={`text-xs font-semibold ${clearance ? 'text-emerald-400' : 'text-red-400'}`}>
                {clearance ? '✓ Cleared' : '✗ Not Cleared'}
              </span>
              <span className="text-xs text-gray-500">Match Clearance</span>
            </div>
            <div
              onClick={() => setClearanceAlert(a => !a)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                clearanceAlert
                  ? 'bg-orange-400/10 border-orange-400/30'
                  : 'bg-[#002520] border-[#ffd700]/10'
              }`}
            >
              <span className={`text-xs font-semibold ${clearanceAlert ? 'text-orange-400' : 'text-gray-500'}`}>
                {clearanceAlert ? '⚠ Alert On' : 'No Alert'}
              </span>
              <span className="text-xs text-gray-500">Clearance Alert</span>
            </div>
          </div>

          {/* Sensitive fields toggle */}
          <button
            onClick={() => setShowSensitive(s => !s)}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showSensitive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showSensitive ? 'Hide' : 'Show'} clinical details
          </button>

          {showSensitive && (
            <div className="space-y-3 p-4 bg-[#002520]/60 rounded-xl border border-red-500/10">
              <div className="flex items-center gap-1.5 text-xs text-red-400/70 mb-2">
                <Lock className="w-3 h-3" />
                Clinical details — visually isolated from public areas
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Injury / Diagnosis Description</label>
                <textarea
                  value={injury}
                  onChange={e => setInjury(e.target.value)}
                  placeholder="e.g. Hamstring grade II tear, left leg…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#001a16] border border-red-500/20 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-red-400/40 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Progress / Recovery Notes</label>
                <textarea
                  value={progress}
                  onChange={e => setProgress(e.target.value)}
                  placeholder="Recovery protocol, expected return date…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#001a16] border border-red-500/20 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-red-400/40 resize-none"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-gray-600">Recorded by: <span className="text-gray-400">{officerName}</span></p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold shadow-lg shadow-[#ffd700]/20"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save Record</>}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#ffd700]/20 text-gray-400 hover:text-white bg-transparent"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const SportsMedicalPortal = () => {
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('medical_officer_session_unlocked') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);
    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'Medical_Officer',
        input_pin: pinInput
      });
      if (error) throw error;
      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('medical_officer_session_unlocked', 'true');
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
    sessionStorage.removeItem('medical_officer_session_unlocked');
  };

  const { currentUser, setCurrentUser, members, setMembers, setSuccess } = useApp();

  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

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
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      toast.error('Failed to upload profile picture: ' + err.message);
    }
  };

  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);
    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'Medical_Officer',
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
        setPinChangeError("Current Security PIN is incorrect.");
      }
    } catch (error: any) {
      console.error("PIN Update Error:", error.message);
      setPinChangeError("Failed to update security PIN.");
    } finally {
      setIsSubmittingPinChange(false);
    }
  };

  const role = currentUser?.role?.toLowerCase();
  const isAuthorised =
    role === 'medical_officer' ||
    role === 'sports_director' ||
    role === 'chairman' ||
    role === 'cmo_chairman';

  const [athletes, setAthletes] = useState<AthleteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<MedicalStatus | 'All'>('All');
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statsOpen, setStatsOpen] = useState(true);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAthletes = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all athletes with their latest medical log
      const { data: athleteData, error: athleteErr } = await supabase
        .from('sports_athletes')
        .select(`
          id, member_id, jersey_number, registration_status,
          members!inner(full_name)
        `);

      if (athleteErr) throw athleteErr;

      // Fetch all medical logs
      const { data: logData, error: logErr } = await supabase
        .from('sports_medical_logs')
        .select('*')
        .order('log_date', { ascending: false });

      if (logErr) throw logErr;

      // Map logs to athletes (latest per athlete)
      const logsByAthlete = new Map<string, MedicalLog>();
      for (const log of (logData as MedicalLog[]) ?? []) {
        if (!logsByAthlete.has(log.athlete_id)) {
          logsByAthlete.set(log.athlete_id, log);
        }
      }

      const records: AthleteRecord[] = ((athleteData as any[]) ?? []).map(a => ({
        id: a.id,
        member_id: a.member_id,
        jersey_number: a.jersey_number,
        registration_status: a.registration_status,
        full_name: a.members?.full_name ?? 'Unknown Athlete',
        latest_log: logsByAthlete.get(a.id),
      }));

      setAthletes(records);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load athlete records.', { style: toastErrorStyle });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAthletes(); }, [fetchAthletes]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = {
    total: athletes.length,
    fit: athletes.filter(a => a.latest_log?.medical_status === 'Fit').length,
    injured: athletes.filter(a => a.latest_log?.medical_status === 'Injured').length,
    recovering: athletes.filter(a => a.latest_log?.medical_status === 'Recovering').length,
    suspended: athletes.filter(a => a.latest_log?.medical_status === 'Suspended').length,
    noRecord: athletes.filter(a => !a.latest_log).length,
    alerts: athletes.filter(a => a.latest_log?.clearance_alert).length,
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = athletes.filter(a => {
    const matchesSearch = a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.jersey_number ?? '').includes(searchQuery);
    const matchesStatus = filterStatus === 'All' ||
      a.latest_log?.medical_status === filterStatus ||
      (filterStatus === 'Fit' && !a.latest_log);
    return matchesSearch && matchesStatus;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Access Guard
  // ─────────────────────────────────────────────────────────────────────────

  if (!isAuthorised) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="max-w-md w-full bg-[#002520] border border-red-500/30 p-8 text-center rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Restricted</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            The Medical Portal is quarantined to <span className="text-[#ffd700] font-semibold">Medical Officers</span> and
            senior sports administration. Unauthorised access attempts are logged.
          </p>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">

      {/* Log Form Modal */}
      {showForm && selectedAthlete && (
        <LogForm
          athlete={selectedAthlete}
          existingLog={selectedAthlete.latest_log ?? null}
          onClose={() => { setShowForm(false); setSelectedAthlete(null); }}
          onSaved={fetchAthletes}
          officerName={currentUser?.name ?? currentUser?.full_name ?? 'Medical Officer'}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sports Medical Portal</h1>
            <p className="text-xs text-gray-400 mt-0.5">Athlete health clearance & diagnostics — confidential</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            <Lock className="w-3 h-3" />
            Restricted Access
          </div>
          <button
            onClick={fetchAthletes}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#ffd700]/20 text-[#ffd700] text-sm hover:bg-[#ffd700]/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

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
                        <button type="submit" disabled={isSubmittingPinChange || newPin.length < 4 || currentPin.length < 4} className="w-full bg-[#ffd700] text-[#001a16] font-bold text-xs py-2 rounded hover:bg-[#e6c200] transition-colors disabled:opacity-40">
                          {isSubmittingPinChange ? "Processing Update..." : "Confirm Security Change"}
                        </button>
                      </form>
                    )}
                  </>
                }
              />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold text-white">{currentUser.full_name || currentUser.name}</h3>
              <p className="text-[#ffd700] text-xs font-semibold uppercase tracking-wider mt-1">
                {currentUser.office_title || 'Medical Officer Workspace'}
              </p>
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
            <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to unlock athlete clinical diagnostics and logs.</p>
          </div>
          <form onSubmit={handleVerifyPin} className="w-full space-y-4">
            <input
              type="password"
              maxLength={6}
              placeholder="Enter Secret PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              className="w-full text-center tracking-widest bg-[#001f1a] border border-[#ffd700] text-white rounded p-3 focus:outline-none text-xl font-mono"
            />
            {pinError && <p className="text-red-400 text-xs font-semibold">{pinError}</p>}
            <button type="submit" disabled={isVerifyingPin || pinInput.length < 4} className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-[#001a16] font-bold py-2.5 rounded transition-colors disabled:opacity-50 cursor-pointer">
              {isVerifyingPin ? "Verifying..." : "Unlock Vault Space"}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* ── Stats Cards ── */}
          <button
            onClick={() => setStatsOpen(s => !s)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Health Overview</span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${statsOpen ? 'rotate-180' : ''}`} />
          </button>

      {statsOpen && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {[
            { label: 'Total Athletes', value: stats.total, color: 'text-white', bg: 'border-[#ffd700]/15' },
            { label: 'Fit', value: stats.fit, color: 'text-emerald-400', bg: 'border-emerald-400/20' },
            { label: 'Injured', value: stats.injured, color: 'text-red-400', bg: 'border-red-400/20' },
            { label: 'Recovering', value: stats.recovering, color: 'text-yellow-400', bg: 'border-yellow-400/20' },
            { label: 'Suspended', value: stats.suspended, color: 'text-orange-400', bg: 'border-orange-400/20' },
            { label: 'No Record', value: stats.noRecord, color: 'text-gray-500', bg: 'border-gray-600/20' },
            { label: '⚠ Alerts', value: stats.alerts, color: 'text-orange-400', bg: 'border-orange-400/30 bg-orange-400/5' },
          ].map(stat => (
            <Card key={stat.label} className={`bg-[#001a16] border ${stat.bg} rounded-xl p-4 text-center`}>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or jersey number…"
            className="pl-9 bg-[#001a16] border-[#ffd700]/20 text-white placeholder:text-gray-600 focus:border-[#ffd700]/50"
          />
        </div>
        <div className="flex gap-1 p-1 bg-[#001a16] border border-[#ffd700]/10 rounded-xl">
          {(['All', ...MEDICAL_STATUSES] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s as MedicalStatus | 'All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filterStatus === s
                  ? s === 'All'
                    ? 'bg-[#ffd700] text-[#001a16]'
                    : `${STATUS_META[s as MedicalStatus]?.bg ?? ''} ${STATUS_META[s as MedicalStatus]?.color ?? ''}`
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Clearance Table ── */}
      <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#ffd700]/10 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#ffd700]" />
            Athlete Health Clearance Sheet
          </h2>
          <span className="text-xs text-gray-500 bg-[#002520] px-2.5 py-1 rounded-full border border-[#ffd700]/10">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin text-red-400" />
            <span className="text-sm">Loading medical records…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-600">
            <HeartPulse className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">No athlete records match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#ffd700]/10 bg-[#002520]/40">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Athlete</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Clearance</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Alert</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Updated</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffd700]/5">
                {filtered.map(a => {
                  const log = a.latest_log;
                  const statusMeta = log ? STATUS_META[log.medical_status] : STATUS_META['Fit'];
                  return (
                    <tr key={a.id} className="hover:bg-[#002520]/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#002520] border border-[#ffd700]/10 flex items-center justify-center shrink-0">
                            {a.jersey_number
                              ? <span className="text-xs font-black text-[#ffd700]">#{a.jersey_number}</span>
                              : <span className="text-xs text-gray-600">—</span>}
                          </div>
                          <div>
                            <p className="font-semibold text-white group-hover:text-[#ffd700] transition-colors">{a.full_name}</p>
                            <p className="text-xs text-gray-600">{a.registration_status ?? 'Registered'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        {log ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.bg} ${statusMeta.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            {statusMeta.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600 italic">No record</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        {log ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            log.clearance_status
                              ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                              : 'bg-red-400/10 border-red-400/30 text-red-400'
                          }`}>
                            {log.clearance_status ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {log.clearance_status ? 'Cleared' : 'Blocked'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        {log?.clearance_alert ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-400/10 border border-orange-400/30 text-orange-400 animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            Alert
                          </span>
                        ) : (
                          <span className="text-xs text-gray-700">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className="text-xs text-gray-500">
                          {log?.log_date
                            ? new Date(log.log_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          id={`medical-log-btn-${a.id}`}
                          onClick={() => { setSelectedAthlete(a); setShowForm(true); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ffd700]/20 text-[#ffd700] text-xs font-medium hover:bg-[#ffd700]/10 hover:border-[#ffd700]/40 transition-all duration-200"
                        >
                          {log ? <><Activity className="w-3.5 h-3.5" />Update</> : <><PlusCircle className="w-3.5 h-3.5" />Add Log</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </>
      )}
    </div>
  );
};

export default SportsMedicalPortal;
