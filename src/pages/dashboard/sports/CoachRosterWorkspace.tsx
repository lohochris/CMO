import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  PlusCircle,
  Loader2,
  ShieldCheck,
  Search,
  X,
  UserCheck,
  ChevronDown,
  Crown,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Swords,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useApp } from '../../../contexts/AppContext';
import { Button } from '../../../app/components/ui/button';
import { Input } from '../../../app/components/ui/input';
import { Card } from '../../../app/components/ui/card';
import { toast } from 'sonner';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type AgeCategory = 'U-13' | 'U-17' | 'U-21' | 'Open';
type GenderCategory = 'Male' | 'Female' | 'Mixed';

interface Tournament {
  id: string;
  title: string;
  sport_type: string;
  status: string;
}

interface Team {
  id: string;
  team_name: string;
  tournament_id: string;
  age_category: AgeCategory;
  gender: GenderCategory;
  captain_id: string | null;
  coach_id: string | null;
}

interface RosterEntry {
  id: string;
  team_id: string;
  athlete_id: string;
  joined_at: string;
  athlete?: AthleteProfile;
}

interface AthleteProfile {
  id: string;
  member_id: string;
  jersey_number: string | null;
  skills_rating: number | null;
  full_name?: string;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export const CoachRosterWorkspace = () => {
  const { currentUser } = useApp();

  const role = currentUser?.role?.toLowerCase();
  const isAuthorised = role === 'coach' || role === 'sports_director' || role === 'chairman' || role === 'cmo_chairman';

  // ── Tournaments ─────────────────────────────
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');

  // ── Teams ───────────────────────────────────
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // ── Roster ──────────────────────────────────
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // ── Squad form ──────────────────────────────
  const [showSquadForm, setShowSquadForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [ageCategory, setAgeCategory] = useState<AgeCategory>('Open');
  const [gender, setGender] = useState<GenderCategory>('Male');
  const [squadSubmitting, setSquadSubmitting] = useState(false);
  const [squadError, setSquadError] = useState('');
  const [squadSuccess, setSquadSuccess] = useState('');

  // ── Add Athlete modal ────────────────────────
  const [showAthleteModal, setShowAthleteModal] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [athleteResults, setAthleteResults] = useState<AthleteProfile[]>([]);
  const [athleteSearchLoading, setAthleteSearchLoading] = useState(false);
  const [addingAthleteId, setAddingAthleteId] = useState<string | null>(null);

  // ── Captain assignment ───────────────────────
  const [captainId, setCaptainId] = useState<string>('');
  const [captainLoading, setCaptainLoading] = useState(false);

  // ── Initial load ─────────────────────────────
  useEffect(() => {
    const fetchTournaments = async () => {
      const { data } = await supabase
        .from('sports_tournaments')
        .select('id, title, sport_type, status')
        .in('status', ['Planning', 'Registration_Open', 'Ongoing'])
        .order('created_at', { ascending: false });
      setTournaments((data as Tournament[]) ?? []);
    };
    fetchTournaments();
  }, []);

  // ── Teams by tournament ──────────────────────
  const fetchTeams = useCallback(async (tournamentId: string) => {
    setTeamsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sports_teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('team_name');
      if (error) throw error;
      setTeams((data as Team[]) ?? []);
      setSelectedTeam(null);
      setRoster([]);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load teams.');
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTournament) fetchTeams(selectedTournament);
    else { setTeams([]); setSelectedTeam(null); setRoster([]); }
  }, [selectedTournament, fetchTeams]);

  // ── Roster by team ───────────────────────────
  const fetchRoster = useCallback(async (teamId: string) => {
    setRosterLoading(true);
    try {
      const { data, error } = await supabase
        .from('sports_team_rosters')
        .select(`
          id,
          team_id,
          athlete_id,
          joined_at,
          sports_athletes_registry (
            id,
            member_id,
            jersey_number,
            skills_rating
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;

      // Enrich with member names
      const entries: RosterEntry[] = await Promise.all(
        ((data as any[]) ?? []).map(async (row: any) => {
          const athleteReg = row.sports_athletes_registry;
          let full_name = 'Unknown Athlete';
          if (athleteReg?.member_id) {
            const { data: memberData } = await supabase
              .from('members')
              .select('full_name, name')
              .eq('official_member_id', athleteReg.member_id)
              .maybeSingle();
            full_name = memberData?.full_name || memberData?.name || athleteReg.member_id;
          }
          return {
            id: row.id,
            team_id: row.team_id,
            athlete_id: row.athlete_id,
            joined_at: row.joined_at,
            athlete: athleteReg ? { ...athleteReg, full_name } : undefined,
          };
        })
      );

      setRoster(entries);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load roster.');
    } finally {
      setRosterLoading(false);
    }
  }, []);

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    setCaptainId(team.captain_id ?? '');
    fetchRoster(team.id);
  };

  // ── Create squad ─────────────────────────────
  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    setSquadError('');
    setSquadSuccess('');

    if (!selectedTournament) { setSquadError('Select a tournament first.'); return; }
    if (!teamName.trim()) { setSquadError('Team name is required.'); return; }

    setSquadSubmitting(true);
    try {
      const { error } = await supabase.from('sports_teams').insert([{
        team_name: teamName.trim(),
        tournament_id: selectedTournament,
        age_category: ageCategory,
        gender,
        captain_id: null,
        coach_id: currentUser?.official_member_id ?? currentUser?.id ?? null,
      }]);

      if (error) {
        if (error.code === '23505') {
          setSquadError('A team with this name already exists in this tournament.');
        } else {
          setSquadError(error.message);
        }
        return;
      }

      setSquadSuccess('Squad created successfully!');
      setTeamName('');
      setShowSquadForm(false);
      await fetchTeams(selectedTournament);
      toast.success('Squad created!', {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
    } catch (err: any) {
      setSquadError(err?.message ?? 'Unexpected error.');
    } finally {
      setSquadSubmitting(false);
    }
  };

  // ── Athlete search ────────────────────────────
  const handleAthleteSearch = async (query: string) => {
    setAthleteSearch(query);
    if (query.trim().length < 2) { setAthleteResults([]); return; }
    setAthleteSearchLoading(true);
    try {
      // Search registry joined with members name
      const { data, error } = await supabase
        .from('sports_athletes_registry')
        .select('id, member_id, jersey_number, skills_rating')
        .limit(15);

      if (error) throw error;

      // Filter by member name
      const enriched: AthleteProfile[] = await Promise.all(
        ((data as any[]) ?? []).map(async (row: any) => {
          const { data: m } = await supabase
            .from('members')
            .select('full_name, name')
            .eq('official_member_id', row.member_id)
            .maybeSingle();
          return { ...row, full_name: m?.full_name || m?.name || row.member_id };
        })
      );

      const filtered = enriched.filter(a =>
        (a.full_name ?? '').toLowerCase().includes(query.toLowerCase())
      );
      setAthleteResults(filtered);
    } catch (err: any) {
      console.error('Athlete search error:', err);
    } finally {
      setAthleteSearchLoading(false);
    }
  };

  // ── Add athlete to roster ─────────────────────
  const handleAddAthlete = async (athlete: AthleteProfile) => {
    if (!selectedTeam) return;
    const alreadyOnRoster = roster.some(r => r.athlete_id === athlete.id);
    if (alreadyOnRoster) {
      toast.error('This athlete is already on the roster.');
      return;
    }
    setAddingAthleteId(athlete.id);
    try {
      const { error } = await supabase.from('sports_team_rosters').insert([{
        team_id: selectedTeam.id,
        athlete_id: athlete.id,
      }]);
      if (error) {
        if (error.code === '23505') {
          toast.error('Athlete already on this roster.');
        } else {
          toast.error(error.message);
        }
        return;
      }
      await fetchRoster(selectedTeam.id);
      toast.success(`${athlete.full_name} added to roster!`, {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
      setShowAthleteModal(false);
      setAthleteSearch('');
      setAthleteResults([]);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add athlete.');
    } finally {
      setAddingAthleteId(null);
    }
  };

  // ── Assign captain ────────────────────────────
  const handleAssignCaptain = async () => {
    if (!selectedTeam || !captainId) return;
    setCaptainLoading(true);
    try {
      const { error } = await supabase
        .from('sports_teams')
        .update({ captain_id: captainId })
        .eq('id', selectedTeam.id);
      if (error) throw error;
      setSelectedTeam(prev => prev ? { ...prev, captain_id: captainId } : prev);
      setTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, captain_id: captainId } : t));
      toast.success('Captain assigned!', {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to assign captain.');
    } finally {
      setCaptainLoading(false);
    }
  };

  // ── Access Denied ─────────────────────────────
  if (!isAuthorised) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="max-w-md w-full bg-[#002520] border border-red-500/30 p-8 text-center rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <ShieldCheck className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Restricted</h2>
          <p className="text-gray-400 text-sm">
            This workspace is reserved for <span className="text-[#ffd700] font-semibold">Coaches</span> and the Sports Director.
          </p>
        </Card>
      </div>
    );
  }

  // ── Render ────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center">
          <Swords className="w-5 h-5 text-[#ffd700]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Coach Roster Workspace</h1>
          <p className="text-xs text-gray-400 mt-0.5">Build squads, manage rosters, assign team captains</p>
        </div>
      </div>

      {/* Tournament selector */}
      <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Active Tournament
        </label>
        <div className="relative">
          <select
            id="tournament-selector"
            value={selectedTournament}
            onChange={e => setSelectedTournament(e.target.value)}
            className="w-full h-11 pl-4 pr-10 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/60 focus:ring-2 focus:ring-[#ffd700]/20 appearance-none transition-colors"
          >
            <option value="" className="bg-[#001a16]">— Select a tournament —</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id} className="bg-[#001a16]">
                {t.title} ({t.sport_type.replace('_', ' ')} · {t.status.replace('_', ' ')})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </Card>

      {/* Main grid: Teams + Roster */}
      {selectedTournament && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Teams panel ── */}
          <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#ffd700]/10 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#ffd700]" />
                Squads
              </h2>
              <button
                id="show-squad-form-btn"
                onClick={() => { setShowSquadForm(v => !v); setSquadError(''); setSquadSuccess(''); }}
                className="text-[#ffd700] hover:bg-[#ffd700]/10 rounded-lg p-1.5 transition-colors"
                title="Create new squad"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Squad form */}
            {showSquadForm && (
              <form onSubmit={handleCreateSquad} className="p-4 border-b border-[#ffd700]/10 space-y-3 bg-[#002520]/40 animate-in slide-in-from-top-1 duration-200">
                <Input
                  id="team-name-input"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="Team name *"
                  className="bg-[#002520] border-[#ffd700]/20 text-white placeholder:text-gray-600 text-sm h-9"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={ageCategory}
                    onChange={e => setAgeCategory(e.target.value as AgeCategory)}
                    className="h-9 px-2 rounded-md bg-[#002520] border border-[#ffd700]/20 text-white text-xs focus:outline-none focus:border-[#ffd700]/60"
                  >
                    {(['U-13', 'U-17', 'U-21', 'Open'] as AgeCategory[]).map(a => (
                      <option key={a} value={a} className="bg-[#001a16]">{a}</option>
                    ))}
                  </select>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as GenderCategory)}
                    className="h-9 px-2 rounded-md bg-[#002520] border border-[#ffd700]/20 text-white text-xs focus:outline-none focus:border-[#ffd700]/60"
                  >
                    {(['Male', 'Female', 'Mixed'] as GenderCategory[]).map(g => (
                      <option key={g} value={g} className="bg-[#001a16]">{g}</option>
                    ))}
                  </select>
                </div>
                {squadError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {squadError}
                  </p>
                )}
                {squadSuccess && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {squadSuccess}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={squadSubmitting}
                    className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs h-8 flex-1">
                    {squadSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowSquadForm(false)}
                    className="border-[#ffd700]/20 text-gray-400 bg-transparent text-xs h-8">
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Teams list */}
            <div className="flex-1 overflow-y-auto">
              {teamsLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#ffd700]" />
                  <span className="text-xs">Loading teams...</span>
                </div>
              ) : teams.length === 0 ? (
                <div className="py-10 text-center text-gray-600 text-xs">No squads yet.</div>
              ) : (
                <ul className="divide-y divide-[#ffd700]/5">
                  {teams.map(team => (
                    <li key={team.id}>
                      <button
                        onClick={() => handleSelectTeam(team)}
                        className={`w-full text-left px-5 py-3.5 hover:bg-[#ffd700]/5 transition-colors flex items-center gap-3 ${selectedTeam?.id === team.id ? 'bg-[#ffd700]/10 border-r-2 border-[#ffd700]' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-[#ffd700]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{team.team_name}</p>
                          <p className="text-xs text-gray-500">{team.age_category} · {team.gender}</p>
                        </div>
                        {team.captain_id && (
                          <Crown className="w-3.5 h-3.5 text-[#ffd700]/60 ml-auto shrink-0" aria-label="Has captain" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* ── Roster panel ── */}
          <div className="lg:col-span-2 space-y-4">
            {selectedTeam ? (
              <>
                {/* Roster table */}
                <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#ffd700]/10 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-white">{selectedTeam.team_name} — Roster</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{roster.length} athlete{roster.length !== 1 ? 's' : ''} registered</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline"
                        onClick={() => fetchRoster(selectedTeam.id)}
                        className="border-[#ffd700]/20 text-[#ffd700] hover:bg-[#ffd700]/10 bg-transparent h-8 text-xs">
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Refresh
                      </Button>
                      <Button size="sm"
                        onClick={() => { setShowAthleteModal(true); setAthleteSearch(''); setAthleteResults([]); }}
                        className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold h-8 text-xs shadow-lg shadow-[#ffd700]/20">
                        <PlusCircle className="w-3.5 h-3.5 mr-1" />
                        Add Athlete
                      </Button>
                    </div>
                  </div>

                  {rosterLoading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin text-[#ffd700]" />
                      <span className="text-sm">Loading roster...</span>
                    </div>
                  ) : roster.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                      <Users className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm">No athletes on this roster yet.</p>
                      <p className="text-xs mt-1 opacity-60">Use "Add Athlete" to link athletes.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#ffd700]/10 bg-[#002520]/40">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Athlete</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Jersey</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rating</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Captain</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ffd700]/5">
                          {roster.map((entry, idx) => {
                            const isCaptain = selectedTeam.captain_id === entry.athlete_id;
                            return (
                              <tr key={entry.id} className="hover:bg-[#002520]/40 transition-colors">
                                <td className="px-5 py-3 text-gray-500 text-xs">{idx + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center text-xs font-bold text-[#ffd700]">
                                      {(entry.athlete?.full_name ?? '?').charAt(0)}
                                    </div>
                                    <span className="text-white font-medium text-xs">{entry.athlete?.full_name ?? entry.athlete_id}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-300 text-xs">
                                  {entry.athlete?.jersey_number ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-xs">
                                  {entry.athlete?.skills_rating != null ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 bg-[#002520] rounded-full overflow-hidden border border-[#ffd700]/10">
                                        <div
                                          className="h-full bg-gradient-to-r from-[#ffd700]/60 to-[#ffd700] rounded-full"
                                          style={{ width: `${entry.athlete.skills_rating}%` }}
                                        />
                                      </div>
                                      <span className="text-gray-400">{entry.athlete.skills_rating}</span>
                                    </div>
                                  ) : <span className="text-gray-600">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  {isCaptain && (
                                    <span className="inline-flex items-center gap-1 text-[#ffd700] text-xs font-semibold">
                                      <Crown className="w-3 h-3" /> Captain
                                    </span>
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

                {/* Captain assignment */}
                {roster.length > 0 && (
                  <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                      <Crown className="w-4 h-4 text-[#ffd700]" />
                      Captain Assignment
                    </h3>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1.5">Select Captain from Roster</label>
                        <div className="relative">
                          <select
                            id="captain-selector"
                            value={captainId}
                            onChange={e => setCaptainId(e.target.value)}
                            className="w-full h-10 pl-3 pr-10 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/60 appearance-none"
                          >
                            <option value="" className="bg-[#001a16]">— Select captain —</option>
                            {roster.map(r => (
                              <option key={r.athlete_id} value={r.athlete_id} className="bg-[#001a16]">
                                {r.athlete?.full_name ?? r.athlete_id}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <Button
                        onClick={handleAssignCaptain}
                        disabled={!captainId || captainLoading}
                        className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold shadow-lg shadow-[#ffd700]/20 h-10"
                      >
                        {captainLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4 mr-1.5" />}
                        {captainLoading ? 'Saving...' : 'Assign'}
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-[#001a16] border border-[#ffd700]/10 rounded-2xl flex flex-col items-center justify-center py-20 text-gray-600">
                <Users className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">Select a squad from the left to manage its roster.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Add Athlete Modal ── */}
      {showAthleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-[#001a16] border border-[#ffd700]/30 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-[#ffd700]" />
                Search Athletes
              </h3>
              <button
                id="close-athlete-modal"
                onClick={() => { setShowAthleteModal(false); setAthleteSearch(''); setAthleteResults([]); }}
                className="text-gray-400 hover:text-white hover:bg-[#ffd700]/10 rounded-lg p-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                id="athlete-search-input"
                value={athleteSearch}
                onChange={e => handleAthleteSearch(e.target.value)}
                placeholder="Search by athlete name..."
                className="pl-9 bg-[#002520] border-[#ffd700]/20 text-white placeholder:text-gray-600 focus:border-[#ffd700]/60"
              />
            </div>

            {/* Results */}
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {athleteSearchLoading && (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#ffd700]" />
                  <span className="text-sm">Searching...</span>
                </div>
              )}
              {!athleteSearchLoading && athleteSearch.length >= 2 && athleteResults.length === 0 && (
                <p className="text-center text-gray-600 text-sm py-8">No athletes found matching "{athleteSearch}"</p>
              )}
              {athleteResults.map(athlete => {
                const isAdding = addingAthleteId === athlete.id;
                const alreadyRostered = roster.some(r => r.athlete_id === athlete.id);
                return (
                  <div key={athlete.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#002520]/60 border border-transparent hover:border-[#ffd700]/10 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center text-sm font-bold text-[#ffd700]">
                        {(athlete.full_name ?? '?').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{athlete.full_name}</p>
                        <p className="text-xs text-gray-500">
                          Jersey: {athlete.jersey_number ?? '—'} · Rating: {athlete.skills_rating ?? '—'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddAthlete(athlete)}
                      disabled={isAdding || alreadyRostered}
                      className={alreadyRostered
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed h-7 text-xs'
                        : 'bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold h-7 text-xs shadow-md shadow-[#ffd700]/20'}
                    >
                      {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : alreadyRostered ? 'Added' : 'Add'}
                    </Button>
                  </div>
                );
              })}
            </div>

            {athleteSearch.length < 2 && (
              <p className="text-center text-gray-600 text-xs mt-4">Type at least 2 characters to search</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default CoachRosterWorkspace;
