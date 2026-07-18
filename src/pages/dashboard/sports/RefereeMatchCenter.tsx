import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Loader2,
  RefreshCw,
  Play,
  Pause,
  Square,
  Goal,
  CreditCard,
  ArrowLeftRight,
  Clock,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Swords,
  Flag,
  Trophy,
  Timer,
  ZapOff,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useApp } from '../../../contexts/AppContext';
import { Button } from '../../../app/components/ui/button';
import { Card } from '../../../app/components/ui/card';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FixtureStatus = 'Scheduled' | 'Ongoing' | 'Completed' | 'Postponed';
type EventType = 'Goal' | 'Yellow_Card' | 'Red_Card' | 'Substitution' | 'Foul' | 'Penalty';

interface Tournament {
  id: string;
  title: string;
  sport_type: string;
  status: string;
}

interface Fixture {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  match_date: string | null;
  venue: string | null;
  status: FixtureStatus;
  round_number: number;
  home_team?: { team_name: string };
  away_team?: { team_name: string };
}

interface MatchEvent {
  id: string;
  fixture_id: string;
  event_type: EventType;
  minute: number | null;
  athlete_id: string | null;
  secondary_athlete_id: string | null;
  team_id: string | null;
  notes: string | null;
  created_at: string;
  athlete?: { full_name?: string };
  secondary_athlete?: { full_name?: string };
}

interface LineupAthlete {
  id: string;
  member_id: string;
  full_name: string;
  jersey_number: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  Goal: {
    label: 'Goal',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/30',
    icon: <Goal className="w-3.5 h-3.5" />,
  },
  Yellow_Card: {
    label: 'Yellow Card',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/30',
    icon: <CreditCard className="w-3.5 h-3.5" />,
  },
  Red_Card: {
    label: 'Red Card',
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/30',
    icon: <CreditCard className="w-3.5 h-3.5" />,
  },
  Substitution: {
    label: 'Substitution',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/30',
    icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
  },
  Foul: {
    label: 'Foul',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10 border-orange-400/30',
    icon: <Flag className="w-3.5 h-3.5" />,
  },
  Penalty: {
    label: 'Penalty',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/30',
    icon: <ZapOff className="w-3.5 h-3.5" />,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Match Clock
// ─────────────────────────────────────────────────────────────────────────────

interface MatchClockProps {
  isRunning: boolean;
  elapsed: number; // seconds
  onToggle: () => void;
  onReset: () => void;
}

const MatchClock = ({ isRunning, elapsed, onToggle, onReset }: MatchClockProps) => {
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-[#001a16] border border-[#ffd700]/20 rounded-xl px-4 py-2">
        <Timer className="w-4 h-4 text-[#ffd700]" />
        <span className="font-mono text-2xl font-bold text-[#ffd700] tabular-nums">
          {mins}:{secs}
        </span>
        {isRunning && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </div>
      <button
        onClick={onToggle}
        className={`p-2 rounded-lg border transition-all duration-200 ${
          isRunning
            ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20'
            : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20'
        }`}
      >
        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <button
        onClick={onReset}
        className="p-2 rounded-lg border border-gray-600/30 bg-gray-600/10 text-gray-400 hover:bg-gray-600/20 transition-all duration-200"
      >
        <Square className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Collapsible Event Panel
// ─────────────────────────────────────────────────────────────────────────────

interface EventPanelProps {
  label: string;
  icon: React.ReactNode;
  color: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const EventPanel = ({ label, icon, color, isOpen, onToggle, children }: EventPanelProps) => (
  <div className="border border-[#ffd700]/10 rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-[#002520] hover:bg-[#002520]/80 transition-colors"
    >
      <span className={`flex items-center gap-2 font-semibold text-sm ${color}`}>
        {icon}
        {label}
      </span>
      <ChevronDown
        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="px-4 py-4 bg-[#001a16] space-y-3">
        {children}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const RefereeMatchCenter = () => {
  const { currentUser } = useApp();

  const role = currentUser?.role?.toLowerCase();
  const isAuthorised =
    role === 'referee' ||
    role === 'sports_director' ||
    role === 'chairman' ||
    role === 'cmo_chairman';

  // ── Selectors ──────────────────────────────────────────────────────────────
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [fixturesLoading, setFixturesLoading] = useState(false);

  // ── Lineups ────────────────────────────────────────────────────────────────
  const [homeLineup, setHomeLineup] = useState<LineupAthlete[]>([]);
  const [awayLineup, setAwayLineup] = useState<LineupAthlete[]>([]);
  const [lineupsLoading, setLineupsLoading] = useState(false);

  // ── Events ─────────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // ── Clock ──────────────────────────────────────────────────────────────────
  const [clockRunning, setClockRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Action panels ──────────────────────────────────────────────────────────
  const [openPanel, setOpenPanel] = useState<'goal' | 'card' | 'sub' | null>(null);

  // Goal form
  const [goalScorer, setGoalScorer] = useState('');
  const [goalAssist, setGoalAssist] = useState('');
  const [goalTeamSide, setGoalTeamSide] = useState<'home' | 'away'>('home');
  const [goalSubmitting, setGoalSubmitting] = useState(false);

  // Card form
  const [cardAthlete, setCardAthlete] = useState('');
  const [cardType, setCardType] = useState<'Yellow_Card' | 'Red_Card'>('Yellow_Card');
  const [cardTeamSide, setCardTeamSide] = useState<'home' | 'away'>('home');
  const [cardSubmitting, setCardSubmitting] = useState(false);

  // Substitution form
  const [subOut, setSubOut] = useState('');
  const [subIn, setSubIn] = useState('');
  const [subTeamSide, setSubTeamSide] = useState<'home' | 'away'>('home');
  const [subSubmitting, setSubSubmitting] = useState(false);

  // Conclude match
  const [concludeConfirm, setConcludeConfirm] = useState(false);
  const [concluding, setConcluding] = useState(false);

  // ── Clock logic ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (clockRunning) {
      clockRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (clockRef.current) clearInterval(clockRef.current);
    }
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, [clockRunning]);

  const currentMinute = Math.floor(elapsed / 60);

  // ── Fetch tournaments ──────────────────────────────────────────────────────
  const fetchTournaments = useCallback(async () => {
    const { data, error } = await supabase
      .from('sports_tournaments')
      .select('id, title, sport_type, status')
      .in('status', ['Ongoing', 'Registration_Open'])
      .order('created_at', { ascending: false });
    if (!error && data) setTournaments(data as Tournament[]);
  }, []);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  // ── Fetch fixtures ──────────────────────────────────────────────────────────
  const fetchFixtures = useCallback(async (tournamentId: string) => {
    if (!tournamentId) return;
    setFixturesLoading(true);
    try {
      const { data, error } = await supabase
        .from('sports_fixtures')
        .select(`
          id, tournament_id, home_team_id, away_team_id,
          home_score, away_score, match_date, venue, status, round_number,
          home_team:sports_teams!sports_fixtures_home_team_id_fkey(team_name),
          away_team:sports_teams!sports_fixtures_away_team_id_fkey(team_name)
        `)
        .eq('tournament_id', tournamentId)
        .in('status', ['Scheduled', 'Ongoing'])
        .order('round_number', { ascending: true });
      if (error) throw error;
      setFixtures((data as unknown as Fixture[]) ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not load fixtures.', {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
    } finally {
      setFixturesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTournamentId) fetchFixtures(selectedTournamentId);
  }, [selectedTournamentId, fetchFixtures]);

  // ── Fetch lineups ──────────────────────────────────────────────────────────
  const fetchLineups = useCallback(async (fixture: Fixture) => {
    setLineupsLoading(true);
    try {
      const fetchTeamRoster = async (teamId: string): Promise<LineupAthlete[]> => {
        const { data, error } = await supabase
          .from('sports_team_rosters')
          .select(`
            athlete_id,
            sports_athletes!inner(id, member_id, jersey_number,
              members!inner(full_name)
            )
          `)
          .eq('team_id', teamId);

        if (error || !data) return [];
        return (data as any[]).map((row) => ({
          id: row.sports_athletes.id,
          member_id: row.sports_athletes.member_id,
          jersey_number: row.sports_athletes.jersey_number,
          full_name: row.sports_athletes.members?.full_name ?? 'Unknown Athlete',
        }));
      };

      const [home, away] = await Promise.all([
        fetchTeamRoster(fixture.home_team_id),
        fetchTeamRoster(fixture.away_team_id),
      ]);
      setHomeLineup(home);
      setAwayLineup(away);
    } finally {
      setLineupsLoading(false);
    }
  }, []);

  // ── Fetch events ──────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (fixtureId: string) => {
    setEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sports_match_events')
        .select(`
          id, fixture_id, event_type, minute, athlete_id, secondary_athlete_id, team_id, notes, created_at,
          athlete:sports_athletes!sports_match_events_athlete_id_fkey(
            members!inner(full_name)
          ),
          secondary_athlete:sports_athletes!sports_match_events_secondary_athlete_id_fkey(
            members!inner(full_name)
          )
        `)
        .eq('fixture_id', fixtureId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = ((data as any[]) ?? []).map((e) => ({
        ...e,
        athlete: e.athlete ? { full_name: e.athlete.members?.full_name } : undefined,
        secondary_athlete: e.secondary_athlete
          ? { full_name: e.secondary_athlete.members?.full_name }
          : undefined,
      }));
      setEvents(mapped);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // When a fixture is selected
  useEffect(() => {
    if (selectedFixture) {
      fetchLineups(selectedFixture);
      fetchEvents(selectedFixture.id);
    } else {
      setHomeLineup([]);
      setAwayLineup([]);
      setEvents([]);
    }
  }, [selectedFixture, fetchLineups, fetchEvents]);

  // ── Real-time subscription: events ────────────────────────────────────────
  useEffect(() => {
    if (!selectedFixture) return;
    const channel = supabase
      .channel(`match-events-${selectedFixture.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sports_match_events',
          filter: `fixture_id=eq.${selectedFixture.id}`,
        },
        () => { fetchEvents(selectedFixture.id); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedFixture, fetchEvents]);

  // ── Goal submission ────────────────────────────────────────────────────────
  const handleGoalSubmit = async () => {
    if (!selectedFixture || !goalScorer) return;
    setGoalSubmitting(true);
    const isHome = goalTeamSide === 'home';

    try {
      // Step 1: Insert event
      const { error: eventError } = await supabase.from('sports_match_events').insert([{
        fixture_id: selectedFixture.id,
        event_type: 'Goal' as EventType,
        minute: currentMinute || null,
        athlete_id: goalScorer,
        secondary_athlete_id: goalAssist || null,
        team_id: isHome ? selectedFixture.home_team_id : selectedFixture.away_team_id,
        notes: null,
      }]);

      if (eventError) throw eventError;

      // Step 2: Increment score
      const scoreField = isHome ? 'home_score' : 'away_score';
      const newScore = isHome
        ? (selectedFixture.home_score + 1)
        : (selectedFixture.away_score + 1);

      const { error: scoreError } = await supabase
        .from('sports_fixtures')
        .update({
          [scoreField]: newScore,
          status: 'Ongoing' as FixtureStatus,
        })
        .eq('id', selectedFixture.id);

      if (scoreError) {
        // Score update failed — warn but don't block the event
        toast.error('Goal logged but score update failed. Please refresh.', {
          style: { background: '#002520', border: '1px solid #ef4444', color: '#ef4444' },
        });
      } else {
        // Optimistically update local state
        setSelectedFixture(prev => prev
          ? { ...prev, [scoreField]: newScore, status: 'Ongoing' }
          : prev
        );
      }

      setGoalScorer('');
      setGoalAssist('');
      setOpenPanel(null);
      await fetchEvents(selectedFixture.id);

      toast.success(`⚽ Goal! ${isHome ? selectedFixture.home_team?.team_name : selectedFixture.away_team?.team_name} scores.`, {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to log goal.', {
        style: { background: '#002520', border: '1px solid #ef4444', color: '#ef4444' },
      });
    } finally {
      setGoalSubmitting(false);
    }
  };

  // ── Card submission ────────────────────────────────────────────────────────
  const handleCardSubmit = async () => {
    if (!selectedFixture || !cardAthlete) return;
    setCardSubmitting(true);
    const isHome = cardTeamSide === 'home';
    try {
      const { error } = await supabase.from('sports_match_events').insert([{
        fixture_id: selectedFixture.id,
        event_type: cardType as EventType,
        minute: currentMinute || null,
        athlete_id: cardAthlete,
        secondary_athlete_id: null,
        team_id: isHome ? selectedFixture.home_team_id : selectedFixture.away_team_id,
        notes: null,
      }]);
      if (error) throw error;

      setCardAthlete('');
      setOpenPanel(null);
      await fetchEvents(selectedFixture.id);

      toast.success(`${cardType === 'Yellow_Card' ? '🟨' : '🟥'} Card logged.`, {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to log card.');
    } finally {
      setCardSubmitting(false);
    }
  };

  // ── Substitution submission ────────────────────────────────────────────────
  const handleSubSubmit = async () => {
    if (!selectedFixture || !subOut || !subIn) return;
    setSubSubmitting(true);
    const isHome = subTeamSide === 'home';
    try {
      const { error } = await supabase.from('sports_match_events').insert([{
        fixture_id: selectedFixture.id,
        event_type: 'Substitution' as EventType,
        minute: currentMinute || null,
        athlete_id: subOut,
        secondary_athlete_id: subIn,
        team_id: isHome ? selectedFixture.home_team_id : selectedFixture.away_team_id,
        notes: 'Substitution',
      }]);
      if (error) throw error;

      setSubOut('');
      setSubIn('');
      setOpenPanel(null);
      await fetchEvents(selectedFixture.id);

      toast.success('🔄 Substitution logged.', {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to log substitution.');
    } finally {
      setSubSubmitting(false);
    }
  };

  // ── Conclude match ─────────────────────────────────────────────────────────
  const handleConclude = async () => {
    if (!selectedFixture) return;
    setConcluding(true);
    try {
      const { error } = await supabase
        .from('sports_fixtures')
        .update({ status: 'Completed' as FixtureStatus })
        .eq('id', selectedFixture.id);
      if (error) throw error;

      setSelectedFixture(prev => prev ? { ...prev, status: 'Completed' } : prev);
      setConcludeConfirm(false);
      setClockRunning(false);

      toast.success('Match concluded. Standings will update automatically.', {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to conclude match.');
    } finally {
      setConcluding(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const allPlayers = [...homeLineup, ...awayLineup];
  const sideLineup = (side: 'home' | 'away') =>
    side === 'home' ? homeLineup : awayLineup;

  const selectStyle =
    'w-full h-9 px-3 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/50 transition-colors';

  // ─────────────────────────────────────────────────────────────────────────
  // Access Guard
  // ─────────────────────────────────────────────────────────────────────────

  if (!isAuthorised) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="max-w-md w-full bg-[#002520] border border-red-500/30 p-8 text-center rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <ShieldCheck className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Restricted</h2>
          <p className="text-gray-400 text-sm">
            The Live Match Center is reserved for <span className="text-[#ffd700] font-semibold">Referees</span> and Sports administration.
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

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center">
            <Swords className="w-5 h-5 text-[#ffd700]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Referee Match Center</h1>
            <p className="text-xs text-gray-400 mt-0.5">Live match control & event logging</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedFixture && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              selectedFixture.status === 'Ongoing'
                ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                : selectedFixture.status === 'Completed'
                  ? 'bg-gray-400/10 border-gray-400/30 text-gray-400'
                  : 'bg-blue-400/10 border-blue-400/30 text-blue-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${selectedFixture.status === 'Ongoing' ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`} />
              {selectedFixture.status}
            </span>
          )}
        </div>
      </div>

      {/* ── Tournament & Fixture Selectors ── */}
      <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Tournament
            </label>
            <select
              id="ref-tournament-select"
              value={selectedTournamentId}
              onChange={e => {
                setSelectedTournamentId(e.target.value);
                setSelectedFixture(null);
                setFixtures([]);
              }}
              className={selectStyle}
            >
              <option value="" className="bg-[#001a16]">Select a tournament…</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id} className="bg-[#001a16]">
                  {t.title} ({t.sport_type.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Fixture
            </label>
            <select
              id="ref-fixture-select"
              value={selectedFixture?.id ?? ''}
              onChange={e => {
                const fx = fixtures.find(f => f.id === e.target.value) ?? null;
                setSelectedFixture(fx);
                setClockRunning(false);
                setElapsed(0);
                setConcludeConfirm(false);
                setOpenPanel(null);
              }}
              disabled={fixturesLoading || !selectedTournamentId}
              className={`${selectStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="" className="bg-[#001a16]">
                {fixturesLoading ? 'Loading fixtures…' : 'Select a fixture…'}
              </option>
              {fixtures.map(f => (
                <option key={f.id} value={f.id} className="bg-[#001a16]">
                  Rd {f.round_number} — {(f.home_team as any)?.team_name ?? 'TBD'} vs {(f.away_team as any)?.team_name ?? 'TBD'}
                  {f.match_date ? ` · ${new Date(f.match_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {selectedFixture && (
        <>
          {/* ── Live Scoreboard ── */}
          <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <h2 className="text-base font-semibold text-[#ffd700] flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Live Scoreboard
              </h2>
              <MatchClock
                isRunning={clockRunning}
                elapsed={elapsed}
                onToggle={() => setClockRunning(r => !r)}
                onReset={() => { setClockRunning(false); setElapsed(0); }}
              />
            </div>

            <div className="grid grid-cols-3 items-center gap-4">
              {/* Home */}
              <div className="text-center space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Home</p>
                <p className="text-lg font-bold text-white">
                  {(selectedFixture.home_team as any)?.team_name ?? 'Home Team'}
                </p>
              </div>

              {/* Score */}
              <div className="text-center">
                <div className="inline-flex items-center gap-3 bg-[#002520] border border-[#ffd700]/30 rounded-2xl px-6 py-3">
                  <span className="text-4xl font-black text-[#ffd700] tabular-nums">
                    {selectedFixture.home_score}
                  </span>
                  <span className="text-2xl text-gray-600 font-light">—</span>
                  <span className="text-4xl font-black text-[#ffd700] tabular-nums">
                    {selectedFixture.away_score}
                  </span>
                </div>
                {selectedFixture.venue && (
                  <p className="text-xs text-gray-600 mt-2">{selectedFixture.venue}</p>
                )}
              </div>

              {/* Away */}
              <div className="text-center space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Away</p>
                <p className="text-lg font-bold text-white">
                  {(selectedFixture.away_team as any)?.team_name ?? 'Away Team'}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* ── Left Column: Lineups + Actions ── */}
            <div className="xl:col-span-2 space-y-4">

              {/* Pre-Match Lineup */}
              <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5 shadow-xl">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#ffd700]" />
                  Pre-Match Lineup Validator
                  {lineupsLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500 ml-auto" />}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {(['home', 'away'] as const).map(side => (
                    <div key={side}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        {side === 'home'
                          ? (selectedFixture.home_team as any)?.team_name ?? 'Home'
                          : (selectedFixture.away_team as any)?.team_name ?? 'Away'}
                        <span className="ml-1 text-gray-600">({sideLineup(side).length})</span>
                      </p>
                      {sideLineup(side).length === 0 ? (
                        <p className="text-xs text-gray-600 italic py-2">No roster data</p>
                      ) : (
                        <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {sideLineup(side).map(a => (
                            <li key={a.id}
                              className="flex items-center gap-2 text-sm text-gray-300 bg-[#002520] rounded-lg px-3 py-1.5"
                            >
                              {a.jersey_number && (
                                <span className="text-[10px] font-bold text-[#ffd700] bg-[#ffd700]/10 rounded px-1.5 py-0.5 shrink-0">
                                  #{a.jersey_number}
                                </span>
                              )}
                              <span className="truncate">{a.full_name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Micro-Action Logger */}
              <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5 shadow-xl">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#ffd700]" />
                  Event Logger
                </h2>

                {selectedFixture.status === 'Completed' ? (
                  <div className="flex items-center gap-2 bg-gray-400/10 border border-gray-400/20 rounded-xl px-4 py-3 text-gray-400 text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Match concluded — event logging disabled.
                  </div>
                ) : (
                  <div className="space-y-3">

                    {/* Goal Panel */}
                    <EventPanel
                      label="Log Goal"
                      icon={<Goal className="w-4 h-4" />}
                      color="text-emerald-400"
                      isOpen={openPanel === 'goal'}
                      onToggle={() => setOpenPanel(p => p === 'goal' ? null : 'goal')}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Side</label>
                          <select
                            value={goalTeamSide}
                            onChange={e => setGoalTeamSide(e.target.value as 'home' | 'away')}
                            className={selectStyle}
                          >
                            <option value="home">Home — {(selectedFixture.home_team as any)?.team_name ?? 'Home'}</option>
                            <option value="away">Away — {(selectedFixture.away_team as any)?.team_name ?? 'Away'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Scorer *</label>
                          <select
                            value={goalScorer}
                            onChange={e => setGoalScorer(e.target.value)}
                            className={selectStyle}
                          >
                            <option value="">Select scorer…</option>
                            {sideLineup(goalTeamSide).map(a => (
                              <option key={a.id} value={a.id}>
                                {a.jersey_number ? `#${a.jersey_number} ` : ''}{a.full_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 mb-1 block">Assist (optional)</label>
                          <select
                            value={goalAssist}
                            onChange={e => setGoalAssist(e.target.value)}
                            className={selectStyle}
                          >
                            <option value="">No assist</option>
                            {sideLineup(goalTeamSide)
                              .filter(a => a.id !== goalScorer)
                              .map(a => (
                                <option key={a.id} value={a.id}>
                                  {a.jersey_number ? `#${a.jersey_number} ` : ''}{a.full_name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                      <Button
                        onClick={handleGoalSubmit}
                        disabled={goalSubmitting || !goalScorer}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold mt-1"
                      >
                        {goalSubmitting
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging…</>
                          : <><Goal className="w-4 h-4 mr-2" />Confirm Goal</>}
                      </Button>
                    </EventPanel>

                    {/* Card Panel */}
                    <EventPanel
                      label="Log Card"
                      icon={<CreditCard className="w-4 h-4" />}
                      color="text-yellow-400"
                      isOpen={openPanel === 'card'}
                      onToggle={() => setOpenPanel(p => p === 'card' ? null : 'card')}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Side</label>
                          <select
                            value={cardTeamSide}
                            onChange={e => setCardTeamSide(e.target.value as 'home' | 'away')}
                            className={selectStyle}
                          >
                            <option value="home">Home</option>
                            <option value="away">Away</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Card Type</label>
                          <select
                            value={cardType}
                            onChange={e => setCardType(e.target.value as 'Yellow_Card' | 'Red_Card')}
                            className={selectStyle}
                          >
                            <option value="Yellow_Card">🟨 Yellow Card</option>
                            <option value="Red_Card">🟥 Red Card</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 mb-1 block">Offending Athlete *</label>
                          <select
                            value={cardAthlete}
                            onChange={e => setCardAthlete(e.target.value)}
                            className={selectStyle}
                          >
                            <option value="">Select athlete…</option>
                            {sideLineup(cardTeamSide).map(a => (
                              <option key={a.id} value={a.id}>
                                {a.jersey_number ? `#${a.jersey_number} ` : ''}{a.full_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <Button
                        onClick={handleCardSubmit}
                        disabled={cardSubmitting || !cardAthlete}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold mt-1"
                      >
                        {cardSubmitting
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging…</>
                          : <><CreditCard className="w-4 h-4 mr-2" />Log Card</>}
                      </Button>
                    </EventPanel>

                    {/* Substitution Panel */}
                    <EventPanel
                      label="Substitution"
                      icon={<ArrowLeftRight className="w-4 h-4" />}
                      color="text-blue-400"
                      isOpen={openPanel === 'sub'}
                      onToggle={() => setOpenPanel(p => p === 'sub' ? null : 'sub')}
                    >
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Team Side</label>
                          <select
                            value={subTeamSide}
                            onChange={e => { setSubTeamSide(e.target.value as 'home' | 'away'); setSubOut(''); setSubIn(''); }}
                            className={selectStyle}
                          >
                            <option value="home">Home</option>
                            <option value="away">Away</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Player Out *</label>
                          <select
                            value={subOut}
                            onChange={e => setSubOut(e.target.value)}
                            className={selectStyle}
                          >
                            <option value="">Select player leaving…</option>
                            {sideLineup(subTeamSide).map(a => (
                              <option key={a.id} value={a.id}>
                                {a.jersey_number ? `#${a.jersey_number} ` : ''}{a.full_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Player In *</label>
                          <select
                            value={subIn}
                            onChange={e => setSubIn(e.target.value)}
                            className={selectStyle}
                          >
                            <option value="">Select player entering…</option>
                            {sideLineup(subTeamSide)
                              .filter(a => a.id !== subOut)
                              .map(a => (
                                <option key={a.id} value={a.id}>
                                  {a.jersey_number ? `#${a.jersey_number} ` : ''}{a.full_name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                      <Button
                        onClick={handleSubSubmit}
                        disabled={subSubmitting || !subOut || !subIn}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold mt-1"
                      >
                        {subSubmitting
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging…</>
                          : <><ArrowLeftRight className="w-4 h-4 mr-2" />Confirm Sub</>}
                      </Button>
                    </EventPanel>

                  </div>
                )}

                {/* Conclude Match */}
                {selectedFixture.status !== 'Completed' && (
                  <div className="mt-5 pt-4 border-t border-[#ffd700]/10">
                    {!concludeConfirm ? (
                      <Button
                        id="conclude-match-btn"
                        onClick={() => setConcludeConfirm(true)}
                        variant="outline"
                        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Conclude Match
                      </Button>
                    ) : (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-2 text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          This will mark the fixture as <strong>Completed</strong> and lock event logging. This action cannot be undone.
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleConclude}
                            disabled={concluding}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                          >
                            {concluding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {concluding ? 'Concluding…' : 'Yes, Conclude'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setConcludeConfirm(false)}
                            className="flex-1 border-gray-600 text-gray-400 bg-transparent hover:bg-gray-600/10"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* ── Right Column: Event Timeline ── */}
            <div>
              <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5 shadow-xl h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ffd700]" />
                    Event Timeline
                  </h2>
                  <button
                    onClick={() => fetchEvents(selectedFixture.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-[#ffd700] hover:bg-[#ffd700]/10 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${eventsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {eventsLoading ? (
                  <div className="flex items-center justify-center py-8 text-gray-600">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">Loading events…</span>
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-600 text-sm">
                    <Clock className="w-8 h-8 mb-2 opacity-20" />
                    No events logged yet
                  </div>
                ) : (
                  <ul className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                    {events.map(ev => {
                      const meta = EVENT_META[ev.event_type] ?? EVENT_META['Goal'];
                      return (
                        <li key={ev.id}
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${meta.bg}`}
                        >
                          <span className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                              {ev.minute != null && (
                                <span className="text-xs text-gray-600 font-mono shrink-0">{ev.minute}'</span>
                              )}
                            </div>
                            {ev.athlete?.full_name && (
                              <p className="text-xs text-gray-300 truncate mt-0.5">{ev.athlete.full_name}</p>
                            )}
                            {ev.secondary_athlete?.full_name && (
                              <p className="text-xs text-gray-500 truncate">
                                {ev.event_type === 'Goal' ? '↳ Assist: ' : '↳ In: '}
                                {ev.secondary_athlete.full_name}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>

          </div>
        </>
      )}

      {!selectedFixture && selectedTournamentId && !fixturesLoading && fixtures.length === 0 && (
        <Card className="bg-[#001a16] border border-[#ffd700]/10 rounded-2xl p-10 text-center shadow-xl">
          <Swords className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No active fixtures found for this tournament.</p>
        </Card>
      )}
    </div>
  );
};

export default RefereeMatchCenter;
