import { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  PlusCircle,
  RefreshCw,
  Calendar,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle2,
  X,
  Flame,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useApp } from '../../../contexts/AppContext';
import { Button } from '../../../app/components/ui/button';
import { Input } from '../../../app/components/ui/input';
import { Card } from '../../../app/components/ui/card';
import { toast } from 'sonner';
import { ProfilePictureUploader } from '../../../app/components/common/ProfilePictureUploader';
import { uploadProfilePicture } from '../../../utils/supabaseHelpers';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type SportType =
  | 'Football'
  | 'Basketball'
  | 'Chess'
  | 'Athletics'
  | 'Volleyball'
  | 'Table_Tennis'
  | 'Swimming'
  | 'Badminton';

type TournamentStatus = 'Planning' | 'Registration_Open' | 'Ongoing' | 'Completed' | 'Cancelled';

interface Tournament {
  id: string;
  title: string;
  sport_type: SportType;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  created_at: string;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const SPORT_TYPES: SportType[] = [
  'Football', 'Basketball', 'Chess', 'Athletics',
  'Volleyball', 'Table_Tennis', 'Swimming', 'Badminton',
];

const STATUS_CYCLE: TournamentStatus[] = [
  'Planning', 'Registration_Open', 'Ongoing', 'Completed',
];

const STATUS_META: Record<TournamentStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  Planning: {
    label: 'Planning',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/30',
    icon: <Calendar className="w-3.5 h-3.5" />,
  },
  Registration_Open: {
    label: 'Registration Open',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/30',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  Ongoing: {
    label: 'Ongoing',
    color: 'text-[#ffd700]',
    bg: 'bg-[#ffd700]/10 border-[#ffd700]/30',
    icon: <Flame className="w-3.5 h-3.5" />,
  },
  Completed: {
    label: 'Completed',
    color: 'text-gray-400',
    bg: 'bg-gray-400/10 border-gray-400/30',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  Cancelled: {
    label: 'Cancelled',
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/30',
    icon: <X className="w-3.5 h-3.5" />,
  },
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const nextStatus = (current: TournamentStatus): TournamentStatus => {
  const idx = STATUS_CYCLE.indexOf(current);
  return idx === -1 || idx === STATUS_CYCLE.length - 1
    ? STATUS_CYCLE[0]
    : STATUS_CYCLE[idx + 1];
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export const SportsAdminPanel = () => {
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
        target_role: 'Sports_Director',
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

  // Role guard
  const role = currentUser?.role?.toLowerCase();
  const isAuthorised =
    role === 'sports_director' ||
    role === 'chairman' ||
    role === 'cmo_chairman';

  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sports_director_session_unlocked') === 'true';
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
        input_role: 'Sports_Director',
        input_pin: pinInput
      });
      if (error) throw error;
      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('sports_director_session_unlocked', 'true');
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
    sessionStorage.removeItem('sports_director_session_unlocked');
  };

  // ── State ──────────────────────────────────
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [sportType, setSportType] = useState<SportType>('Football');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Data fetching ──────────────────────────
  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sports_tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments((data as Tournament[]) ?? []);
    } catch (err: any) {
      console.error('Failed to fetch tournaments:', err);
      toast.error(err?.message ?? 'Could not load tournaments.', {
        style: { background: '#002520', border: '1px solid #ffd700/20', color: '#ffd700' },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  // ── Form submit ────────────────────────────
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!title.trim()) { setFormError('Tournament title is required.'); return; }
    if (!startDate) { setFormError('Start date is required.'); return; }
    if (!endDate) { setFormError('End date is required.'); return; }
    if (new Date(endDate) <= new Date(startDate)) {
      setFormError('End date must be after the start date.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('sports_tournaments').insert([{
        title: title.trim(),
        sport_type: sportType,
        start_date: startDate,
        end_date: endDate,
        status: 'Planning' as TournamentStatus,
      }]);

      if (error) {
        if (error.code === '23505') {
          setFormError('A tournament with this title already exists. Please use a unique name.');
        } else {
          setFormError(error.message);
        }
        return;
      }

      setFormSuccess('Tournament created successfully!');
      setTitle('');
      setSportType('Football');
      setStartDate('');
      setEndDate('');
      setShowForm(false);
      await fetchTournaments();
      toast.success('Tournament created!', {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
    } catch (err: any) {
      setFormError(err?.message ?? 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status toggle ──────────────────────────
  const handleToggleStatus = async (tournament: Tournament) => {
    const newStatus = nextStatus(tournament.status);
    setTogglingId(tournament.id);
    try {
      const { error } = await supabase
        .from('sports_tournaments')
        .update({ status: newStatus })
        .eq('id', tournament.id);

      if (error) throw error;

      setTournaments(prev =>
        prev.map(t => t.id === tournament.id ? { ...t, status: newStatus } : t)
      );
      toast.success(`Status updated to "${STATUS_META[newStatus].label}"`, {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Access Denied ──────────────────────────
  if (!isAuthorised) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="max-w-md w-full bg-[#002520] border border-red-500/30 p-8 text-center rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <ShieldCheck className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Restricted</h2>
          <p className="text-gray-400 text-sm">
            This panel is reserved for the <span className="text-[#ffd700] font-semibold">Sports Director</span> and
            executive administration.
          </p>
        </Card>
      </div>
    );
  }

  // ── Render ─────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 font-sans">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-[#ffd700]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sports Admin Panel</h1>
            <p className="text-xs text-gray-400 mt-0.5">Seasonal schedule & tournament configuration</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTournaments}
            disabled={loading}
            className="border-[#ffd700]/30 text-[#ffd700] hover:bg-[#ffd700]/10 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isExecutiveUnlocked && (
            <Button
              size="sm"
              onClick={() => { setShowForm(v => !v); setFormError(''); setFormSuccess(''); }}
              className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold shadow-lg shadow-[#ffd700]/20 transition-all duration-200"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              New Tournament
            </Button>
          )}
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
              <p className="text-[#ffd700] text-xs font-semibold uppercase tracking-wider mt-1">Sports Director Workspace</p>
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
            <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to unlock administrative features and configure tournaments.</p>
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
              {isVerifyingPin ? "Verifying..." : "Unlock Workspace"}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* ── Create Form ── */}
          {showForm && (
            <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-2 duration-300">
              <h2 className="text-lg font-semibold text-[#ffd700] mb-5 flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                Season & Sport Configurator
              </h2>
              <form onSubmit={handleCreateTournament} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                      Tournament Title *
                    </label>
                    <Input
                      id="tournament-title"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. CMO Inter-Family Football Cup 2026"
                      className="bg-[#002520] border-[#ffd700]/20 text-white placeholder:text-gray-600 focus:border-[#ffd700]/60 focus:ring-[#ffd700]/20"
                    />
                  </div>

                  {/* Sport Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                      Sport Type *
                    </label>
                    <select
                      id="sport-type"
                      value={sportType}
                      onChange={e => setSportType(e.target.value as SportType)}
                      className="w-full h-10 px-3 rounded-md bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/60 focus:ring-2 focus:ring-[#ffd700]/20 transition-colors"
                    >
                      {SPORT_TYPES.map(s => (
                        <option key={s} value={s} className="bg-[#001a16]">
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dates */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                      Start Date *
                    </label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-[#002520] border-[#ffd700]/20 text-white focus:border-[#ffd700]/60 focus:ring-[#ffd700]/20 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                      End Date *
                    </label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-[#002520] border-[#ffd700]/20 text-white focus:border-[#ffd700]/60 focus:ring-[#ffd700]/20 [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Feedback */}
                {formError && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-400 text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {formSuccess}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold shadow-lg shadow-[#ffd700]/20"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                    {submitting ? 'Creating...' : 'Create Tournament'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="border-[#ffd700]/20 text-gray-400 hover:text-white bg-transparent"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ── Tournament List ── */}
          <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-[#ffd700]/10 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">All Tournaments</h2>
              <span className="text-xs text-gray-500 bg-[#002520] px-2.5 py-1 rounded-full border border-[#ffd700]/10">
                {tournaments.length} record{tournaments.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading && tournaments.length === 0 ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin text-[#ffd700]" />
                <span className="text-sm">Loading tournaments...</span>
              </div>
            ) : tournaments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <Trophy className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">No tournaments yet. Create the first one above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#ffd700]/10 bg-[#002520]/40">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sport</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Dates</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cycle Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ffd700]/5">
                    {tournaments.map(t => {
                      const meta = STATUS_META[t.status] ?? STATUS_META['Planning'];
                      const isToggling = togglingId === t.id;
                      const isTerminal = t.status === 'Completed' || t.status === 'Cancelled';
                      return (
                        <tr key={t.id} className="hover:bg-[#002520]/50 transition-colors group">
                          {/* Title */}
                          <td className="px-6 py-4">
                            <span className="font-semibold text-white group-hover:text-[#ffd700] transition-colors">
                              {t.title}
                            </span>
                          </td>
                          {/* Sport */}
                          <td className="px-4 py-4">
                            <span className="text-gray-300">{t.sport_type.replace('_', ' ')}</span>
                          </td>
                          {/* Dates */}
                          <td className="px-4 py-4 text-gray-400 whitespace-nowrap">
                            {new Date(t.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <ChevronRight className="w-3 h-3 inline mx-1 opacity-40" />
                            {new Date(t.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          {/* Status badge */}
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color}`}>
                              {meta.icon}
                              {meta.label}
                            </span>
                          </td>
                          {/* Toggle */}
                          <td className="px-6 py-4 text-right">
                            {isTerminal ? (
                              <span className="text-xs text-gray-600 italic">Finalised</span>
                            ) : (
                              <button
                                id={`toggle-status-${t.id}`}
                                onClick={() => handleToggleStatus(t)}
                                disabled={isToggling}
                                title={`Advance to: ${STATUS_META[nextStatus(t.status)]?.label}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ffd700]/20 text-[#ffd700] text-xs font-medium hover:bg-[#ffd700]/10 hover:border-[#ffd700]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                              >
                                {isToggling
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : t.status === 'Planning'
                                    ? <ToggleLeft className="w-3.5 h-3.5" />
                                    : <ToggleRight className="w-3.5 h-3.5" />}
                                {isToggling ? 'Updating...' : `→ ${STATUS_META[nextStatus(t.status)]?.label}`}
                              </button>
                            )}
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

export default SportsAdminPanel;
