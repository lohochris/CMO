import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Loader2,
  RefreshCw,
  Play,
  Pause,
  Square,
  Clock,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Swords,
  Trophy,
  Timer,
  Camera,
  Upload,
  Image,
  CircleDot,
  ArrowLeftRight,
  Plus,
  Trash2,
  CalendarX
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useApp } from '../../../contexts/AppContext';
import { Button } from '../../../app/components/ui/button';
import { Card } from '../../../app/components/ui/card';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

type FixtureStatus = 'SCHEDULED' | '1ST_HALF' | 'HALF_TIME' | '2ND_HALF' | 'FINISHED' | 'Scheduled' | 'Ongoing' | 'Completed' | 'Postponed';
type EventType = 'Goal' | 'Yellow_Card' | 'Red_Card' | 'Substitution';

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
  current_match_minute: number;
  home_team?: { team_name: string };
  away_team?: { team_name: string };
}

interface MatchEvent {
  id: string;
  fixture_id: string;
  tournament_id: string;
  event_type: EventType;
  minute: number;
  team_name: string;
  player_id: string;
  assisted_by_id: string | null;
  notes: string | null;
  created_at: string;
  player?: { full_name: string };
  assistant?: { full_name: string };
}

interface LineupAthlete {
  id: string; // sports_athletes.id (UUID)
  member_id: string; // members.id (e.g. HCC-CMO-26-0001)
  full_name: string;
  jersey_number: string | null;
}

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

  // ── Selectors & Data States ────────────────────────────────────────────────
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [fixturesLoading, setFixturesLoading] = useState(false);

  // ── Gallery State ──────────────────────────────────────────────────────────
  const [galleryItems, setGalleryItems] = useState<{ id: string; media_url: string }[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Lineups ────────────────────────────────────────────────────────────────
  const [homeLineup, setHomeLineup] = useState<LineupAthlete[]>([]);
  const [awayLineup, setAwayLineup] = useState<LineupAthlete[]>([]);
  const [lineupsLoading, setLineupsLoading] = useState(false);

  // ── Events ─────────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // ── Clock State ────────────────────────────────────────────────────────────
  const [clockRunning, setClockRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // in seconds
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Modals State ───────────────────────────────────────────────────────────
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  // ── Modal Forms State ──────────────────────────────────────────────────────
  const [goalTeamSide, setGoalTeamSide] = useState<'home' | 'away'>('home');
  const [goalScorer, setGoalScorer] = useState('');
  const [goalAssist, setGoalAssist] = useState('');
  const [goalMinute, setGoalMinute] = useState(0);
  const [goalSubmitting, setGoalSubmitting] = useState(false);

  const [cardTeamSide, setCardTeamSide] = useState<'home' | 'away'>('home');
  const [cardAthlete, setCardAthlete] = useState('');
  const [cardType, setCardType] = useState<'Yellow_Card' | 'Red_Card'>('Yellow_Card');
  const [cardReason, setCardReason] = useState('');
  const [cardMinute, setCardMinute] = useState(0);
  const [cardSubmitting, setCardSubmitting] = useState(false);

  const [subTeamSide, setSubTeamSide] = useState<'home' | 'away'>('home');
  const [subOut, setSubOut] = useState('');
  const [subIn, setSubIn] = useState('');
  const [subMinute, setSubMinute] = useState(0);
  const [subSubmitting, setSubSubmitting] = useState(false);

  // Conclude match dialog
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

  // Synchronize elapsed time with DB every minute
  useEffect(() => {
    if (selectedFixture && clockRunning) {
      const syncMinute = Math.floor(elapsed / 60);
      supabase
        .from('sports_fixtures')
        .update({ current_match_minute: syncMinute })
        .eq('id', selectedFixture.id)
        .then();
    }
  }, [currentMinute, selectedFixture?.id, clockRunning]);

  // Set the timer on fixture selection
  useEffect(() => {
    if (selectedFixture) {
      setElapsed((selectedFixture.current_match_minute || 0) * 60);
      const isOngoing = selectedFixture.status === '1ST_HALF' || selectedFixture.status === '2ND_HALF';
      setClockRunning(isOngoing);
    } else {
      setElapsed(0);
      setClockRunning(false);
    }
  }, [selectedFixture?.id]);

  // Helper to standardise and display status strings
  const getDisplayStatus = (status: FixtureStatus): string => {
    const s = status ? status.toUpperCase() : 'SCHEDULED';
    if (s === 'SCHEDULED') return 'SCHEDULED';
    if (s === '1ST_HALF' || s === 'ONGOING') return '1ST HALF';
    if (s === 'HALF_TIME') return 'HALF TIME';
    if (s === '2ND_HALF') return '2ND HALF';
    if (s === 'FINISHED' || s === 'COMPLETED') return 'FINISHED';
    return s;
  };

  const isMatchFinished = selectedFixture
    ? (selectedFixture.status === 'FINISHED' || selectedFixture.status === 'Completed')
    : false;

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
          home_score, away_score, match_date, venue, status, round_number, current_match_minute,
          home_team:sports_teams!sports_fixtures_home_team_id_fkey(team_name),
          away_team:sports_teams!sports_fixtures_away_team_id_fkey(team_name)
        `)
        .eq('tournament_id', tournamentId)
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
        .from('official_match_events')
        .select(`
          id, fixture_id, tournament_id, event_type, minute, team_name, player_id, assisted_by_id, notes, created_at,
          player:members!official_match_events_player_id_fkey(
            full_name
          ),
          assistant:members!official_match_events_assisted_by_id_fkey(
            full_name
          )
        `)
        .eq('fixture_id', fixtureId)
        .order('minute', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEvents((data as any[]) ?? []);
    } catch (err: any) {
      toast.error('Could not load events: ' + err.message);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // ── Fetch gallery items ────────────────────────────────────────────────────
  const fetchGallery = useCallback(async (fixtureId: string) => {
    setGalleryLoading(true);
    try {
      const { data, error } = await supabase
        .from('cmo_match_gallery')
        .select('id, media_url')
        .eq('fixture_id', fixtureId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGalleryItems(data || []);
    } catch (err: any) {
      console.error('Error fetching gallery:', err);
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  // When a fixture is selected
  useEffect(() => {
    if (selectedFixture) {
      fetchLineups(selectedFixture);
      fetchEvents(selectedFixture.id);
      fetchGallery(selectedFixture.id);
    } else {
      setHomeLineup([]);
      setAwayLineup([]);
      setEvents([]);
      setGalleryItems([]);
    }
  }, [selectedFixture?.id, fetchLineups, fetchEvents, fetchGallery]);

  // Real-time subscription for events
  useEffect(() => {
    if (!selectedFixture) return;
    const channel = supabase
      .channel(`match-events-${selectedFixture.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'official_match_events',
          filter: `fixture_id=eq.${selectedFixture.id}`,
        },
        () => { fetchEvents(selectedFixture.id); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedFixture?.id, fetchEvents]);

  // Real-time subscription for scores and status
  useEffect(() => {
    if (!selectedFixture) return;
    const channel = supabase
      .channel(`fixture-updates-${selectedFixture.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sports_fixtures',
          filter: `id=eq.${selectedFixture.id}`,
        },
        (payload) => {
          const updated = payload.new as Fixture;
          setSelectedFixture(prev => prev ? { ...prev, ...updated } : null);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedFixture?.id]);

  // ── Upload media to gallery ────────────────────────────────────────────────
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedFixture) return;
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedFixture.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('cmo-gallery')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('cmo-gallery')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('cmo_match_gallery')
          .insert([{
            fixture_id: selectedFixture.id,
            media_url: publicUrl
          }]);

        if (dbError) throw dbError;
      }

      toast.success('Media uploaded successfully to match gallery!', {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });

      await fetchGallery(selectedFixture.id);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || 'Failed to upload media.', {
        style: { background: '#002520', border: '1px solid #ef4444', color: '#ef4444' },
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [selectedFixture, fetchGallery]);

  // ── Delete media from gallery ──────────────────────────────────────────────
  const handleDeleteMedia = useCallback(async (id: string, mediaUrl: string) => {
    try {
      const { error: dbError } = await supabase
        .from('cmo_match_gallery')
        .delete()
        .eq('id', id);
      if (dbError) throw dbError;

      const urlParts = mediaUrl.split('/cmo-gallery/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error: storageError } = await supabase.storage
          .from('cmo-gallery')
          .remove([filePath]);
        if (storageError) {
          console.warn("Storage deletion warning:", storageError);
        }
      }

      toast.success('Media removed from gallery.', {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });

      if (selectedFixture) {
        await fetchGallery(selectedFixture.id);
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err?.message || 'Failed to remove media.');
    }
  }, [selectedFixture, fetchGallery]);

  // ── Goal submission ────────────────────────────────────────────────────────
  const handleGoalSubmit = async () => {
    if (!selectedFixture || !goalScorer) return;
    setGoalSubmitting(true);
    const isHome = goalTeamSide === 'home';
    const teamName = isHome
      ? (selectedFixture.home_team?.team_name ?? 'Home')
      : (selectedFixture.away_team?.team_name ?? 'Away');

    try {
      // 1. Insert event into official_match_events
      const { error: eventError } = await supabase.from('official_match_events').insert([{
        fixture_id: selectedFixture.id,
        tournament_id: selectedFixture.tournament_id,
        event_type: 'Goal' as EventType,
        minute: goalMinute,
        team_name: teamName,
        player_id: goalScorer, // member_id of the scorer
        assisted_by_id: goalAssist || null, // member_id of the assistant
        notes: 'Goal'
      }]);

      if (eventError) throw eventError;

      // 2. Increment score in sports_fixtures
      const scoreField = isHome ? 'home_score' : 'away_score';
      const newScore = isHome
        ? (selectedFixture.home_score + 1)
        : (selectedFixture.away_score + 1);

      const { error: scoreError } = await supabase
        .from('sports_fixtures')
        .update({ [scoreField]: newScore })
        .eq('id', selectedFixture.id);

      if (scoreError) {
        toast.error('Goal logged but score sync failed. Please check scoreboard.');
      } else {
        setSelectedFixture(prev => prev ? { ...prev, [scoreField]: newScore } : null);
      }

      setGoalScorer('');
      setGoalAssist('');
      setShowGoalModal(false);
      await fetchEvents(selectedFixture.id);

      toast.success(`Goal confirmed for ${teamName}!`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to log goal.');
    } finally {
      setGoalSubmitting(false);
    }
  };

  // ── Card submission ────────────────────────────────────────────────────────
  const handleCardSubmit = async () => {
    if (!selectedFixture || !cardAthlete) return;
    setCardSubmitting(true);
    const isHome = cardTeamSide === 'home';
    const teamName = isHome
      ? (selectedFixture.home_team?.team_name ?? 'Home')
      : (selectedFixture.away_team?.team_name ?? 'Away');

    try {
      const { error } = await supabase.from('official_match_events').insert([{
        fixture_id: selectedFixture.id,
        tournament_id: selectedFixture.tournament_id,
        event_type: cardType as EventType,
        minute: cardMinute,
        team_name: teamName,
        player_id: cardAthlete, // member_id of offending player
        assisted_by_id: null,
        notes: cardReason || 'Card penalization'
      }]);

      if (error) throw error;

      setCardAthlete('');
      setCardReason('');
      setShowCardModal(false);
      await fetchEvents(selectedFixture.id);

      toast.success(`${cardType.replace('_', ' ')} logged for ${teamName}.`);
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
    const teamName = isHome
      ? (selectedFixture.home_team?.team_name ?? 'Home')
      : (selectedFixture.away_team?.team_name ?? 'Away');

    try {
      const { error } = await supabase.from('official_match_events').insert([{
        fixture_id: selectedFixture.id,
        tournament_id: selectedFixture.tournament_id,
        event_type: 'Substitution' as EventType,
        minute: subMinute,
        team_name: teamName,
        player_id: subOut, // member_id of player off
        assisted_by_id: subIn, // member_id of player on
        notes: 'Substitution'
      }]);

      if (error) throw error;

      setSubOut('');
      setSubIn('');
      setShowSubModal(false);
      await fetchEvents(selectedFixture.id);

      toast.success(`Substitution logged for ${teamName}.`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to log substitution.');
    } finally {
      setSubSubmitting(false);
    }
  };

  // ── Delete match event ─────────────────────────────────────────────────────
  const handleDeleteEvent = async (eventId: string, eventType: string, eventTeamName: string) => {
    if (!selectedFixture || isMatchFinished) return;
    try {
      // If it was a Goal event, we need to decrement the score
      if (eventType === 'Goal') {
        const isHome = eventTeamName === (selectedFixture.home_team?.team_name ?? 'Home');
        const scoreField = isHome ? 'home_score' : 'away_score';
        const currentScore = isHome ? selectedFixture.home_score : selectedFixture.away_score;
        const newScore = Math.max(0, currentScore - 1);

        const { error: scoreErr } = await supabase
          .from('sports_fixtures')
          .update({ [scoreField]: newScore })
          .eq('id', selectedFixture.id);

        if (scoreErr) throw scoreErr;

        setSelectedFixture(prev => prev ? { ...prev, [scoreField]: newScore } : null);
      }

      const { error: deleteErr } = await supabase
        .from('official_match_events')
        .delete()
        .eq('id', eventId);

      if (deleteErr) throw deleteErr;

      toast.success('Event successfully undone.');
      await fetchEvents(selectedFixture.id);
    } catch (err: any) {
      toast.error('Failed to delete event: ' + err.message);
    }
  };

  // ── Conclude match ─────────────────────────────────────────────────────────
  const handleConcludeMatch = async () => {
    if (!selectedFixture) return;
    setConcluding(true);
    try {
      const { error } = await supabase
        .from('sports_fixtures')
        .update({ status: 'FINISHED' as FixtureStatus })
        .eq('id', selectedFixture.id);
      if (error) throw error;

      setSelectedFixture(prev => prev ? { ...prev, status: 'FINISHED' } : null);
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

  // ── Status Advancement Controls ────────────────────────────────────────────
  const handleAdvanceStatus = async (targetStatus: FixtureStatus) => {
    if (!selectedFixture) return;
    try {
      const { error } = await supabase
        .from('sports_fixtures')
        .update({ status: targetStatus })
        .eq('id', selectedFixture.id);

      if (error) throw error;

      setSelectedFixture(prev => prev ? { ...prev, status: targetStatus } : null);
      if (targetStatus === '1ST_HALF' || targetStatus === '2ND_HALF') {
        setClockRunning(true);
      } else {
        setClockRunning(false);
      }

      toast.success(`Match state transitioned to ${getDisplayStatus(targetStatus)}.`);
    } catch (err: any) {
      toast.error('Failed to change match state: ' + err.message);
    }
  };

  // Lineup subsets
  const sideLineup = (side: 'home' | 'away') =>
    side === 'home' ? homeLineup : awayLineup;

  const selectStyle =
    'w-full h-10 px-3 rounded-xl bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/50 transition-colors duration-200';

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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans text-gray-200">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center">
            <Swords className="w-5 h-5 text-[#ffd700]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Referee Match Center Hub</h1>
            <p className="text-xs text-gray-400 mt-0.5">Live match stopwatch controls & official timeline logs</p>
          </div>
        </div>

        {selectedFixture && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border capitalize shadow-inner ${
              isMatchFinished
                ? 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                : selectedFixture.status === '1ST_HALF' || selectedFixture.status === '2ND_HALF'
                  ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                  : 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
            }`}>
              {selectedFixture.status === '1ST_HALF' || selectedFixture.status === '2ND_HALF' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
              {getDisplayStatus(selectedFixture.status)}
            </span>
          </div>
        )}
      </div>

      {/* ── Tournament & Fixture Selection Header ── */}
      <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
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
              <option value="" className="bg-[#001a16]">Select active tournament…</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id} className="bg-[#001a16]">
                  {t.title} ({t.sport_type.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Fixture
            </label>
            <select
              id="ref-fixture-select"
              value={selectedFixture?.id ?? ''}
              onChange={e => {
                const fx = fixtures.find(f => f.id === e.target.value) ?? null;
                setSelectedFixture(fx);
                setConcludeConfirm(false);
              }}
              disabled={fixturesLoading || !selectedTournamentId}
              className={`${selectStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="" className="bg-[#001a16]">
                {fixturesLoading ? 'Loading fixtures…' : 'Select a fixture…'}
              </option>
              {fixtures.map(f => (
                <option key={f.id} value={f.id} className="bg-[#001a16]">
                  Round {f.round_number} — {f.home_team?.team_name ?? 'Home'} vs {f.away_team?.team_name ?? 'Away'} ({getDisplayStatus(f.status)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main Panel once fixture is selected */}
      {selectedFixture ? (
        <>
          {/* ── Match Timer & Scoreboard HUD ── */}
          <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffd700]/5 via-transparent to-[#ffd700]/5 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              
              {/* Scoreboard display */}
              <div className="flex items-center gap-6 justify-center flex-1 w-full">
                <div className="text-right flex-1 min-w-[120px]">
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {selectedFixture.home_team?.team_name ?? 'Home Team'}
                  </h3>
                  <span className="text-xs text-gray-400 uppercase font-medium">Home</span>
                </div>

                <div className="flex flex-col items-center shrink-0">
                  <div className="inline-flex items-center gap-4 bg-[#002520]/80 border border-[#ffd700]/30 rounded-2xl px-6 py-2.5 shadow-lg">
                    <span className="text-4xl font-extrabold text-[#ffd700] tabular-nums tracking-tight">
                      {selectedFixture.home_score}
                    </span>
                    <span className="text-xl text-gray-500 font-light">—</span>
                    <span className="text-4xl font-extrabold text-[#ffd700] tabular-nums tracking-tight">
                      {selectedFixture.away_score}
                    </span>
                  </div>
                  {selectedFixture.venue && (
                    <span className="text-[11px] text-gray-500 mt-2 font-medium tracking-wide">
                      {selectedFixture.venue}
                    </span>
                  )}
                </div>

                <div className="text-left flex-1 min-w-[120px]">
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {selectedFixture.away_team?.team_name ?? 'Away Team'}
                  </h3>
                  <span className="text-xs text-gray-400 uppercase font-medium">Away</span>
                </div>
              </div>

              {/* Digital Timer HUD */}
              <div className="flex items-center gap-4 shrink-0 bg-[#002520]/60 p-3 rounded-2xl border border-[#ffd700]/10">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 bg-[#001a16] border border-[#ffd700]/25 rounded-xl px-4 py-2">
                    <Timer className="w-4 h-4 text-[#ffd700]" />
                    <span className="font-mono text-2xl font-bold text-[#ffd700] tabular-nums">
                      {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
                    </span>
                    {clockRunning && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mt-1">Live Stopwatch</span>
                </div>

                {/* Clock Actions */}
                {!isMatchFinished && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setClockRunning(c => !c)}
                      className={`p-2.5 rounded-xl border transition-all duration-200 ${
                        clockRunning
                          ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20'
                          : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20'
                      }`}
                      title={clockRunning ? 'Pause Match' : 'Resume Match'}
                    >
                      {clockRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setClockRunning(false); setElapsed(0); }}
                      className="p-2.5 rounded-xl border border-gray-600/30 bg-gray-600/10 text-gray-400 hover:bg-gray-600/20 transition-all duration-200"
                      title="Reset Timer"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Status Advancement Button Controller */}
            {!isMatchFinished && (
              <div className="mt-6 pt-4 border-t border-[#ffd700]/10 flex flex-wrap gap-2 justify-center">
                {selectedFixture.status === 'SCHEDULED' && (
                  <Button
                    onClick={() => handleAdvanceStatus('1ST_HALF')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" /> Start 1st Half
                  </Button>
                )}
                {selectedFixture.status === '1ST_HALF' && (
                  <Button
                    onClick={() => handleAdvanceStatus('HALF_TIME')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    <Pause className="w-3.5 h-3.5 mr-1.5" /> End 1st Half (Half Time)
                  </Button>
                )}
                {selectedFixture.status === 'HALF_TIME' && (
                  <Button
                    onClick={() => handleAdvanceStatus('2ND_HALF')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" /> Start 2nd Half
                  </Button>
                )}
                {selectedFixture.status === '2ND_HALF' && (
                  <Button
                    onClick={() => setConcludeConfirm(true)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Conclude Match
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Quick Action Event Loggers Grid */}
          {!isMatchFinished && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setGoalMinute(currentMinute);
                  setGoalTeamSide('home');
                  setShowGoalModal(true);
                }}
                className="flex items-center justify-center gap-2 p-4 bg-[#002520] hover:bg-[#002520]/80 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl text-emerald-400 font-bold transition-all shadow-md group"
              >
                <CircleDot className="w-5 h-5 group-hover:scale-110 transition-transform" /> Log Goal
              </button>

              <button
                onClick={() => {
                  setCardMinute(currentMinute);
                  setCardTeamSide('home');
                  setCardType('Yellow_Card');
                  setShowCardModal(true);
                }}
                className="flex items-center justify-center gap-2 p-4 bg-[#002520] hover:bg-[#002520]/80 border border-yellow-500/20 hover:border-yellow-500/40 rounded-2xl text-yellow-400 font-bold transition-all shadow-md group"
              >
                <Square className="w-5 h-5 fill-yellow-400 group-hover:scale-110 transition-transform" /> Log Card
              </button>

              <button
                onClick={() => {
                  setSubMinute(currentMinute);
                  setSubTeamSide('home');
                  setShowSubModal(true);
                }}
                className="flex items-center justify-center gap-2 p-4 bg-[#002520] hover:bg-[#002520]/80 border border-blue-500/20 hover:border-blue-500/40 rounded-2xl text-blue-400 font-bold transition-all shadow-md group"
              >
                <ArrowLeftRight className="w-5 h-5 group-hover:scale-110 transition-transform" /> Substitution
              </button>
            </div>
          )}

          {/* Core Hub Layout split */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Left: Lineups & Match Media */}
            <div className="xl:col-span-2 space-y-6">
              
              {/* Lineups Validator */}
              <Card className="bg-[#001a16] border border-[#ffd700]/25 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#ffd700]" />
                    Team Lineups & Squad Rosters
                  </h2>
                  {lineupsLoading && <Loader2 className="w-4 h-4 animate-spin text-[#ffd700]" />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(['home', 'away'] as const).map(side => (
                    <div key={side} className="space-y-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-[#ffd700]/10 pb-1 flex justify-between">
                        <span>
                          {side === 'home'
                            ? (selectedFixture.home_team?.team_name ?? 'Home')
                            : (selectedFixture.away_team?.team_name ?? 'Away')}
                        </span>
                        <span className="text-gray-500">({sideLineup(side).length} Athletes)</span>
                      </p>
                      
                      {sideLineup(side).length === 0 ? (
                        <p className="text-xs text-gray-600 italic py-2">Roster is empty</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
                          {sideLineup(side).map(a => (
                            <div key={a.id} className="flex items-center gap-2 text-sm text-gray-300 bg-[#002520]/80 rounded-xl px-3 py-2 border border-[#ffd700]/5">
                              {a.jersey_number && (
                                <span className="text-[10px] font-extrabold text-[#ffd700] bg-[#ffd700]/10 rounded px-1.5 py-0.5 shrink-0">
                                  #{a.jersey_number}
                                </span>
                              )}
                              <span className="truncate font-medium">{a.full_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Match Media Gallery */}
              <Card className="bg-[#001a16] border border-[#ffd700]/25 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#ffd700]" />
                    Match Media & Action Shots
                  </h2>
                  <span className="text-xs text-gray-500">{galleryItems.length} Images</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Upload */}
                  <div className="md:col-span-1">
                    <div className="border-2 border-dashed border-[#ffd700]/20 hover:border-[#ffd700]/50 bg-[#002520]/30 hover:bg-[#002520]/50 transition-all rounded-xl p-5 text-center cursor-pointer flex flex-col items-center justify-center min-h-[140px] relative group">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleUpload}
                        disabled={uploading}
                        className="opacity-0 absolute inset-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#ffd700]" />
                          <span className="text-xs text-[#ffd700] font-medium">Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-5 h-5 text-[#ffd700] group-hover:scale-115 transition-transform" />
                          <span className="text-xs text-gray-300 font-bold">Upload Media</span>
                          <span className="text-[9px] text-gray-500">PNG, JPG, MP4</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Strip */}
                  <div className="md:col-span-3">
                    {galleryItems.length === 0 ? (
                      <div className="h-[140px] border border-[#ffd700]/10 bg-[#002520]/10 rounded-xl flex flex-col items-center justify-center text-gray-600 text-sm">
                        <Image className="w-6 h-6 mb-1 opacity-20 text-[#ffd700]" />
                        <span>No media uploaded for this match yet.</span>
                      </div>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto py-2 pr-2 scrollbar-thin h-[140px] items-center">
                        {galleryItems.map(item => (
                          <div
                            key={item.id}
                            className="w-24 h-24 rounded-lg overflow-hidden bg-slate-950 border border-[#ffd700]/10 hover:border-[#ffd700]/45 relative group shrink-0 shadow-md transition-all duration-200 flex items-center justify-center p-0.5"
                          >
                            <img
                              src={item.media_url}
                              alt="Match Media"
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-[#001a16]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                              <a
                                href={item.media_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-[#ffd700]/10 text-[#ffd700] hover:bg-[#ffd700]/20 transition-colors"
                              >
                                <Image className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleDeleteMedia(item.id, item.media_url)}
                                className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

            </div>

            {/* Right: Live Chronological Timeline */}
            <div>
              <Card className="bg-[#001a16] border border-[#ffd700]/25 rounded-2xl p-5 shadow-xl h-full flex flex-col min-h-[480px]">
                <div className="flex items-center justify-between mb-4 border-b border-[#ffd700]/10 pb-2">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ffd700]" />
                    Official Match Timeline
                  </h2>
                  <button
                    onClick={() => fetchEvents(selectedFixture.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-[#ffd700] hover:bg-[#ffd700]/10 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${eventsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {eventsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 flex-1">
                    <Loader2 className="w-6 h-6 animate-spin text-[#ffd700] mb-2" />
                    <span className="text-sm">Loading events...</span>
                  </div>
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-600 text-sm flex-1">
                    <Clock className="w-8 h-8 mb-2 opacity-25" />
                    No match events logged yet
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-4 relative scrollbar-thin">
                    {/* Vertical timeline connector */}
                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-[#ffd700]/10" />

                    {events.map(ev => {
                      // Event icon mapping
                      let eventIcon = <CircleDot className="w-4 h-4 text-emerald-400" />;
                      let badgeColor = 'bg-emerald-400/15 border-emerald-400/30 text-emerald-400';
                      if (ev.event_type === 'Yellow_Card') {
                        eventIcon = <Square className="w-4 h-4 fill-yellow-400 text-yellow-400" />;
                        badgeColor = 'bg-yellow-400/15 border-yellow-400/30 text-yellow-400';
                      } else if (ev.event_type === 'Red_Card') {
                        eventIcon = <Square className="w-4 h-4 fill-red-500 text-red-500" />;
                        badgeColor = 'bg-red-500/15 border-red-500/30 text-red-500';
                      } else if (ev.event_type === 'Substitution') {
                        eventIcon = <ArrowLeftRight className="w-4 h-4 text-blue-400" />;
                        badgeColor = 'bg-blue-400/15 border-blue-400/30 text-blue-400';
                      }

                      return (
                        <div key={ev.id} className="flex gap-4 items-start relative pl-1 group">
                          {/* Timeline node icon */}
                          <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center shrink-0 border z-10 ${badgeColor} bg-[#001a16]`}>
                            {eventIcon}
                          </div>

                          {/* Event content */}
                          <div className="flex-1 bg-[#002520]/50 border border-[#ffd700]/10 hover:border-[#ffd700]/20 rounded-xl p-3 shadow-sm transition-all duration-200">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-white tracking-wide">
                                {ev.event_type.replace('_', ' ')}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {ev.minute != null && (
                                  <span className="text-[10px] text-[#ffd700] font-bold font-mono bg-[#ffd700]/10 px-1.5 py-0.5 rounded">
                                    {ev.minute}'
                                  </span>
                                )}
                                {!isMatchFinished && (
                                  <button
                                    onClick={() => handleDeleteEvent(ev.id, ev.event_type, ev.team_name)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-all duration-150"
                                    title="Delete Event"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="mt-1 space-y-0.5">
                              {ev.event_type === 'Substitution' ? (
                                <>
                                  <p className="text-xs text-gray-300">
                                    <span className="text-red-400 font-semibold">OFF:</span> {ev.player?.full_name ?? 'Unknown Player'}
                                  </p>
                                  <p className="text-xs text-gray-300">
                                    <span className="text-emerald-400 font-semibold">ON:</span> {ev.assistant?.full_name ?? 'Unknown Player'}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-gray-300 font-medium">
                                  {ev.player?.full_name ?? 'Unknown Player'}
                                </p>
                              )}

                              {ev.event_type === 'Goal' && ev.assistant?.full_name && (
                                <p className="text-[10px] text-gray-500 italic">
                                  Assist: {ev.assistant.full_name}
                                </p>
                              )}

                              {ev.notes && ev.event_type !== 'Substitution' && ev.event_type !== 'Goal' && (
                                <p className="text-[10px] text-gray-500">
                                  Note: {ev.notes}
                                </p>
                              )}

                              <p className="text-[9px] text-[#ffd700]/60 font-semibold uppercase tracking-wider mt-1">
                                {ev.team_name}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

          </div>

          {/* Conclude Match confirmation modal */}
          {concludeConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-[#001a16] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <h3 className="text-lg font-bold">Conclude Match and Lock?</h3>
                </div>
                <p className="text-sm text-gray-400">
                  This action sets the status to <strong className="text-white">FINISHED</strong>. The clock will be paused and event logging will be locked permanently. Are you sure you want to end the match?
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleConcludeMatch}
                    disabled={concluding}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                  >
                    {concluding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Yes, Conclude'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setConcludeConfirm(false)}
                    className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="bg-[#001a16] border border-[#ffd700]/10 rounded-2xl p-12 text-center shadow-xl">
          <CalendarX className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">No Fixture Selected</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Please choose an active tournament and select a scheduled fixture above to open the referee controls dashboard.
          </p>
        </Card>
      )}

      {/* ── Goal Modal ── */}
      {showGoalModal && selectedFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#001a16] border border-[#ffd700]/25 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-gray-200">
            <div className="flex items-center justify-between border-b border-[#ffd700]/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CircleDot className="w-5 h-5 text-emerald-400" />
                Log Goal Event
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-850 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Scoring Team</label>
                <select
                  value={goalTeamSide}
                  onChange={e => { setGoalTeamSide(e.target.value as 'home' | 'away'); setGoalScorer(''); setGoalAssist(''); }}
                  className={selectStyle}
                >
                  <option value="home">Home — {selectedFixture.home_team?.team_name ?? 'Home'}</option>
                  <option value="away">Away — {selectedFixture.away_team?.team_name ?? 'Away'}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Scorer</label>
                <select
                  value={goalScorer}
                  onChange={e => setGoalScorer(e.target.value)}
                  className={selectStyle}
                >
                  <option value="">Select Scorer...</option>
                  {sideLineup(goalTeamSide).map(a => (
                    <option key={a.id} value={a.member_id}>
                      {a.jersey_number ? `#${a.jersey_number} ` : ''}{a.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Assisted By</label>
                <select
                  value={goalAssist}
                  onChange={e => setGoalAssist(e.target.value)}
                  className={selectStyle}
                >
                  <option value="">No Assist / Unassisted</option>
                  {sideLineup(goalTeamSide)
                    .filter(a => a.member_id !== goalScorer)
                    .map(a => (
                      <option key={a.id} value={a.member_id}>
                        {a.jersey_number ? `#${a.jersey_number} ` : ''}{a.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase font-mono">Minute</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={goalMinute}
                  onChange={e => setGoalMinute(Math.max(0, parseInt(e.target.value) || 0))}
                  className={selectStyle}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleGoalSubmit}
                  disabled={goalSubmitting || !goalScorer}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                >
                  {goalSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CircleDot className="w-4 h-4 mr-2" />}
                  Log Goal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowGoalModal(false)}
                  className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Card Modal ── */}
      {showCardModal && selectedFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#001a16] border border-[#ffd700]/25 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-gray-200">
            <div className="flex items-center justify-between border-b border-[#ffd700]/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Square className={`w-5 h-5 ${cardType === 'Yellow_Card' ? 'fill-yellow-400 text-yellow-400' : 'fill-red-500 text-red-500'}`} />
                Log Disciplinary Card
              </h3>
              <button
                onClick={() => setShowCardModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-850 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Team</label>
                <select
                  value={cardTeamSide}
                  onChange={e => { setCardTeamSide(e.target.value as 'home' | 'away'); setCardAthlete(''); }}
                  className={selectStyle}
                >
                  <option value="home">Home — {selectedFixture.home_team?.team_name ?? 'Home'}</option>
                  <option value="away">Away — {selectedFixture.away_team?.team_name ?? 'Away'}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Card Severity</label>
                <select
                  value={cardType}
                  onChange={e => setCardType(e.target.value as 'Yellow_Card' | 'Red_Card')}
                  className={selectStyle}
                >
                  <option value="Yellow_Card">Yellow Card</option>
                  <option value="Red_Card">Red Card</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Offending Player</label>
                <select
                  value={cardAthlete}
                  onChange={e => setCardAthlete(e.target.value)}
                  className={selectStyle}
                >
                  <option value="">Select Player...</option>
                  {sideLineup(cardTeamSide).map(a => (
                    <option key={a.id} value={a.member_id}>
                      {a.jersey_number ? `#${a.jersey_number} ` : ''}{a.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Rough tackle, Hand ball, Dissent"
                  value={cardReason}
                  onChange={e => setCardReason(e.target.value)}
                  className={selectStyle}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase font-mono">Minute</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={cardMinute}
                  onChange={e => setCardMinute(Math.max(0, parseInt(e.target.value) || 0))}
                  className={selectStyle}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCardSubmit}
                  disabled={cardSubmitting || !cardAthlete}
                  className={`flex-1 font-bold text-black ${cardType === 'Yellow_Card' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-500 hover:bg-red-650 text-white'}`}
                >
                  {cardSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Log Card Penalty
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCardModal(false)}
                  className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Substitution Modal ── */}
      {showSubModal && selectedFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#001a16] border border-[#ffd700]/25 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-gray-200">
            <div className="flex items-center justify-between border-b border-[#ffd700]/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                Log Substitution
              </h3>
              <button
                onClick={() => setShowSubModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-855 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Team</label>
                <select
                  value={subTeamSide}
                  onChange={e => { setSubTeamSide(e.target.value as 'home' | 'away'); setSubOut(''); setSubIn(''); }}
                  className={selectStyle}
                >
                  <option value="home">Home — {selectedFixture.home_team?.team_name ?? 'Home'}</option>
                  <option value="away">Away — {selectedFixture.away_team?.team_name ?? 'Away'}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase text-red-400">Player Out (OFF)</label>
                <select
                  value={subOut}
                  onChange={e => setSubOut(e.target.value)}
                  className={selectStyle}
                >
                  <option value="">Select Outgoing Player...</option>
                  {sideLineup(subTeamSide).map(a => (
                    <option key={a.id} value={a.member_id}>
                      {a.jersey_number ? `#${a.jersey_number} ` : ''}{a.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase text-emerald-400">Player In (ON)</label>
                <select
                  value={subIn}
                  onChange={e => setSubIn(e.target.value)}
                  className={selectStyle}
                >
                  <option value="">Select Incoming Player...</option>
                  {sideLineup(subTeamSide)
                    .filter(a => a.member_id !== subOut)
                    .map(a => (
                      <option key={a.id} value={a.member_id}>
                        {a.jersey_number ? `#${a.jersey_number} ` : ''}{a.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase font-mono">Minute</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={subMinute}
                  onChange={e => setSubMinute(Math.max(0, parseInt(e.target.value) || 0))}
                  className={selectStyle}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSubSubmit}
                  disabled={subSubmitting || !subOut || !subIn}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold"
                >
                  {subSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
                  Confirm Substitution
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSubModal(false)}
                  className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RefereeMatchCenter;
