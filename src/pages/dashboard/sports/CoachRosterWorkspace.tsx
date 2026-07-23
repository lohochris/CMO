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
  Trash2,
  Filter,
  UserPlus
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useApp } from '../../../contexts/AppContext';
import { Button } from '../../../app/components/ui/button';
import { Input } from '../../../app/components/ui/input';
import { Card } from '../../../app/components/ui/card';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
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
  family_unit?: string;
  position?: string;
}

const selectStyle =
  'w-full h-9 px-3 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/50 transition-colors';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const CoachRosterWorkspace = () => {
  const { currentUser } = useApp();

  const role = currentUser?.role?.toLowerCase();
  const isAuthorised = role === 'coach' || role === 'sports_director' || role === 'chairman' || role === 'cmo_chairman';

  // ── Selectors & Tournaments ────────────────────────────────────────────────
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');

  // ── Teams ──────────────────────────────────────────────────────────────────
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // ── Roster ─────────────────────────────────────────────────────────────────
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // ── Custom Squad Creation Modal ────────────────────────────────────────────
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [squadTournamentId, setSquadTournamentId] = useState('');
  const [squadAgeCategory, setSquadAgeCategory] = useState<AgeCategory>('Open');
  const [squadGender, setSquadGender] = useState<GenderCategory>('Male');
  const [squadSubmitting, setSquadSubmitting] = useState(false);

  // ── Add Athlete Modal ──────────────────────────────────────────────────────
  const [showAthleteModal, setShowAthleteModal] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [membersList, setMembersList] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [filterByFamily, setFilterByFamily] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, { selected: boolean; jerseyNumber: string; position: string }>>({});
  const [savingAthletes, setSavingAthletes] = useState(false);

  // ── Captain assignment ─────────────────────────────────────────────────────
  const [captainId, setCaptainId] = useState<string>('');
  const [captainLoading, setCaptainLoading] = useState(false);

  // ── Initial load ───────────────────────────────────────────────────────────
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

  // ── Teams by tournament ────────────────────────────────────────────────────
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

  // ── Roster by team ─────────────────────────────────────────────────────────
  const fetchRoster = useCallback(async (teamId: string, teamName?: string) => {
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
            skills_rating,
            members (
              official_member_id,
              full_name,
              cmo_family
            )
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;

      // Extract squad family name as fallback from passed teamName or selectedTeam
      const finalTeamName = teamName || selectedTeam?.team_name || '';
      const fallbackFamily = finalTeamName.replace(/family/i, '').trim();

      const entries: RosterEntry[] = ((data as any[]) ?? []).map((row: any) => {
        const athleteReg = row.sports_athletes_registry;
        const memberData = athleteReg?.members;
        
        const full_name = memberData?.full_name || athleteReg?.member_id || 'Unknown Athlete';
        const family_unit = memberData?.cmo_family || fallbackFamily || '—';
        
        // Retrieve position virtually from local storage
        let position = 'CM';
        if (athleteReg?.member_id) {
          const localPosKey = `athlete_pos_${teamId}_${athleteReg.member_id}`;
          position = localStorage.getItem(localPosKey) || 'CM';
        }

        return {
          id: row.id,
          team_id: row.team_id,
          athlete_id: row.athlete_id,
          joined_at: row.joined_at,
          athlete: athleteReg ? {
            id: athleteReg.id,
            member_id: athleteReg.member_id,
            jersey_number: athleteReg.jersey_number,
            skills_rating: athleteReg.skills_rating,
            full_name,
            family_unit,
            position
          } : undefined,
        };
      });

      setRoster(entries);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load roster.');
    } finally {
      setRosterLoading(false);
    }
  }, [selectedTeam]);

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    setCaptainId(team.captain_id ?? '');
    fetchRoster(team.id, team.team_name);
  };

  // ── Custom Squad creation ──────────────────────────────────────────────────
  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadName.trim()) {
      toast.error('Squad name is required.');
      return;
    }
    if (!squadTournamentId) {
      toast.error('Please select a tournament.');
      return;
    }

    setSquadSubmitting(true);
    try {
      const { error } = await supabase.from('sports_teams').insert([{
        team_name: squadName.trim(),
        tournament_id: squadTournamentId,
        age_category: squadAgeCategory,
        gender: squadGender,
        captain_id: null,
        coach_id: currentUser?.official_member_id ?? currentUser?.id ?? null,
      }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('A squad with this name already exists in this tournament.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success(`Squad "${squadName}" created successfully!`);
      setSquadName('');
      setShowSquadModal(false);
      
      // Auto-focus the tournament and reload
      setSelectedTournament(squadTournamentId);
      await fetchTeams(squadTournamentId);
    } catch (err: any) {
      toast.error(err?.message ?? 'Unexpected error.');
    } finally {
      setSquadSubmitting(false);
    }
  };

  // ── Fetch all members for "Add Athlete" Modal ──────────────────────────────
  const fetchAllMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('official_member_id, full_name, cmo_family, email, role')
        .order('full_name');
      if (error) throw error;
      setMembersList(data || []);
    } catch (err: any) {
      toast.error('Failed to load member records: ' + err.message);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showAthleteModal) {
      fetchAllMembers();
      setSelectedCandidates({});
      setFilterByFamily(true);
    }
  }, [showAthleteModal, fetchAllMembers]);

  // Candidate selection controls
  const handleToggleCandidate = (memberId: string) => {
    setSelectedCandidates(prev => {
      const current = prev[memberId] || { selected: false, jerseyNumber: '', position: 'CM' };
      return {
        ...prev,
        [memberId]: {
          ...current,
          selected: !current.selected
        }
      };
    });
  };

  const handleUpdateJersey = (memberId: string, val: string) => {
    setSelectedCandidates(prev => {
      const current = prev[memberId] || { selected: false, jerseyNumber: '', position: 'CM' };
      return {
        ...prev,
        [memberId]: {
          ...current,
          jerseyNumber: val
        }
      };
    });
  };

  const handleUpdatePosition = (memberId: string, val: string) => {
    setSelectedCandidates(prev => {
      const current = prev[memberId] || { selected: false, jerseyNumber: '', position: 'CM' };
      return {
        ...prev,
        [memberId]: {
          ...current,
          position: val
        }
      };
    });
  };

  // ── Add multiple athletes ──
  const handleSaveAthletes = async () => {
    if (!selectedTeam) return;
    const selections = Object.entries(selectedCandidates).filter(([_, val]) => val.selected);
    if (selections.length === 0) {
      toast.error('No members selected.');
      return;
    }

    setSavingAthletes(true);
    try {
      for (const [memberId, info] of selections) {
        // 1. Fetch or create athlete profile in sports_athletes_registry
        let { data: regProfile } = await supabase
          .from('sports_athletes_registry')
          .select('id')
          .eq('member_id', memberId)
          .maybeSingle();

        let athleteId = regProfile?.id;

        if (!athleteId) {
          const { data: newReg, error: regError } = await supabase
            .from('sports_athletes_registry')
            .insert([{
              member_id: memberId,
              jersey_number: info.jerseyNumber || null
            }])
            .select('id')
            .single();

          if (regError) throw regError;
          athleteId = newReg.id;
        } else {
          // If jersey number is supplied, sync it back to registry profile
          if (info.jerseyNumber) {
            await supabase
              .from('sports_athletes_registry')
              .update({ jersey_number: info.jerseyNumber })
              .eq('id', athleteId);
          }
        }

        // Save position virtually in localStorage
        if (info.position) {
          localStorage.setItem(`athlete_pos_${selectedTeam.id}_${memberId}`, info.position);
        }

        // 2. Add mapping into sports_team_rosters
        const { data: alreadyRostered } = await supabase
          .from('sports_team_rosters')
          .select('id')
          .eq('team_id', selectedTeam.id)
          .eq('athlete_id', athleteId)
          .maybeSingle();

        if (!alreadyRostered) {
          const { error: rosterError } = await supabase
            .from('sports_team_rosters')
            .insert([{
              team_id: selectedTeam.id,
              athlete_id: athleteId
            }]);
          if (rosterError) throw rosterError;
        }
      }

      toast.success('Athletes successfully added to roster!');
      setShowAthleteModal(false);
      await fetchRoster(selectedTeam.id);
    } catch (err: any) {
      toast.error('Failed to add athletes: ' + err.message);
    } finally {
      setSavingAthletes(false);
    }
  };

  // ── Remove athlete from roster ──────────────────────────────────────────────
  const handleRemoveAthlete = async (entry: RosterEntry) => {
    if (!selectedTeam) return;
    try {
      const { error } = await supabase
        .from('sports_team_rosters')
        .delete()
        .eq('id', entry.id);

      if (error) throw error;

      // Clean virtual position
      if (entry.athlete?.member_id) {
        localStorage.removeItem(`athlete_pos_${selectedTeam.id}_${entry.athlete.member_id}`);
      }

      toast.success(`${entry.athlete?.full_name ?? 'Athlete'} removed from roster.`);
      await fetchRoster(selectedTeam.id);
    } catch (err: any) {
      toast.error('Failed to remove athlete: ' + err.message);
    }
  };

  // ── Assign captain ─────────────────────────────────────────────────────────
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

  // ── Smart Family Filter Helpers ──
  const isFamilyTeam = selectedTeam?.team_name.toLowerCase().includes('family');
  const getFamilyName = (name: string): string => {
    return name.replace(/family/i, '').trim();
  };
  const teamFamilyName = selectedTeam ? getFamilyName(selectedTeam.team_name) : '';

  // Filter candidates list
  const filteredCandidates = membersList.filter(member => {
    // 1. Smart family unit filtering
    if (filterByFamily && isFamilyTeam && teamFamilyName) {
      const mFamily = member.cmo_family || '';
      if (!mFamily.toLowerCase().includes(teamFamilyName.toLowerCase())) {
        return false;
      }
    }

    // 2. Search query filter
    if (athleteSearch.trim()) {
      const q = athleteSearch.toLowerCase();
      const matchName = (member.full_name || '').toLowerCase().includes(q);
      const matchId = (member.official_member_id || '').toLowerCase().includes(q);
      const matchRole = (member.role || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchRole) {
        return false;
      }
    }

    // 3. Exclude members already on the team roster
    const isRostered = roster.some(r => r.athlete?.member_id === member.official_member_id);
    if (isRostered) return false;

    return true;
  });

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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans text-gray-200">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center">
          <Swords className="w-5 h-5 text-[#ffd700]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Coach Roster Workspace</h1>
          <p className="text-xs text-gray-400 mt-0.5">Build tournament squads, manage roster sheets, and assign team captains</p>
        </div>
      </div>

      {/* Tournament Selector */}
      <Card className="bg-[#001a16] border border-[#ffd700]/25 rounded-2xl p-5 shadow-xl">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Active Tournament / League
        </label>
        <div className="relative">
          <select
            id="tournament-selector"
            value={selectedTournament}
            onChange={e => setSelectedTournament(e.target.value)}
            className="w-full h-11 pl-4 pr-10 rounded-xl bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/60 appearance-none transition-colors"
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

      {/* Main Grid Panels */}
      {selectedTournament && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Panel: Squads Sidebar */}
          <Card className="bg-[#001a16] border border-[#ffd700]/25 rounded-2xl overflow-hidden flex flex-col h-full min-h-[420px] shadow-xl">
            <div className="px-5 py-4 border-b border-[#ffd700]/10 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#ffd700]" />
                Tournament Squads
              </h2>
              <button
                id="show-squad-form-btn"
                onClick={() => {
                  setSquadTournamentId(selectedTournament);
                  setShowSquadModal(true);
                }}
                className="text-[#ffd700] hover:bg-[#ffd700]/10 rounded-lg p-1.5 transition-colors border border-transparent hover:border-[#ffd700]/20"
                title="Create custom squad"
              >
                <PlusCircle className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
              {teamsLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#ffd700]" />
                  <span className="text-xs">Loading squads...</span>
                </div>
              ) : teams.length === 0 ? (
                <div className="py-12 text-center text-gray-600 text-xs">No registered squads for this tournament.</div>
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
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate">{team.team_name}</p>
                          <p className="text-xs text-gray-500 font-medium">{team.age_category} · {team.gender}</p>
                        </div>
                        {team.captain_id && (
                          <span title="Squad Captain Designated">
                            <Crown className="w-3.5 h-3.5 text-[#ffd700]/80 shrink-0" />
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* Right Panel: Roster Worksheet */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTeam ? (
              <>
                {/* Roster Table */}
                <Card className="bg-[#001a16] border border-[#ffd700]/25 rounded-2xl overflow-hidden shadow-xl">
                  <div className="px-5 py-4 border-b border-[#ffd700]/10 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-wide">{selectedTeam.team_name} — Squad Roster</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{roster.length} athlete{roster.length !== 1 ? 's' : ''} registered</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline"
                        onClick={() => fetchRoster(selectedTeam.id)}
                        className="border-[#ffd700]/20 text-[#ffd700] hover:bg-[#ffd700]/10 bg-transparent h-8 text-xs font-bold"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Refresh
                      </Button>
                      <Button size="sm"
                        onClick={() => setShowAthleteModal(true)}
                        className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold h-8 text-xs shadow-md shadow-[#ffd700]/20"
                      >
                        <PlusCircle className="w-3.5 h-3.5 mr-1" />
                        Add Athlete
                      </Button>
                    </div>
                  </div>

                  {rosterLoading ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin text-[#ffd700]" />
                      <span className="text-sm font-semibold">Loading squad roster...</span>
                    </div>
                  ) : roster.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                      <Users className="w-10 h-10 mb-2 opacity-25 text-[#ffd700]" />
                      <p className="text-sm font-bold">Roster list is currently empty</p>
                      <p className="text-xs mt-1 opacity-70">Click "Add Athlete" to register members to this squad.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#ffd700]/10 bg-[#002520]/40">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Athlete</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Official ID</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">Family Unit</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Position</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Jersey #</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ffd700]/5">
                          {roster.map((entry, idx) => {
                            const isCaptain = selectedTeam.captain_id === entry.athlete_id;
                            return (
                              <tr key={entry.id} className="hover:bg-[#002520]/40 transition-colors">
                                <td className="px-5 py-3.5 text-gray-500 text-xs font-mono">{idx + 1}</td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center text-xs font-extrabold text-[#ffd700]">
                                      {(entry.athlete?.full_name ?? '?').charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-white font-bold text-xs truncate flex items-center gap-1.5">
                                        {entry.athlete?.full_name ?? entry.athlete_id}
                                        {isCaptain && (
                                          <span title="Squad Captain" className="inline-flex items-center">
                                            <Crown className="w-3 h-3 text-[#ffd700]" />
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-gray-400 text-xs font-mono">
                                  {entry.athlete?.member_id ?? '—'}
                                </td>
                                <td className="px-4 py-3.5 text-gray-400 text-xs font-medium">
                                  {entry.athlete?.family_unit ?? '—'}
                                </td>
                                <td className="px-4 py-3.5 text-[#ffd700]/80 text-xs font-semibold">
                                  {entry.athlete?.position ?? '—'}
                                </td>
                                <td className="px-4 py-3.5 text-gray-300 text-xs font-bold font-mono">
                                  {entry.athlete?.jersey_number ? `#${entry.athlete.jersey_number}` : '—'}
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <button
                                    onClick={() => handleRemoveAthlete(entry)}
                                    className="p-1 rounded text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                    title="Remove Athlete"
                                  >
                                    <Trash2 className="w-4 h-4" />
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

                {/* Captain Assignment */}
                {roster.length > 0 && (
                  <Card className="bg-[#001a16] border border-[#ffd700]/25 rounded-2xl p-5 shadow-xl">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                      <Crown className="w-4 h-4 text-[#ffd700]" />
                      Designate Squad Captain
                    </h3>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-400 mb-1.5">Select Leader from Roster</label>
                        <div className="relative">
                          <select
                            id="captain-selector"
                            value={captainId}
                            onChange={e => setCaptainId(e.target.value)}
                            className="w-full h-10 pl-3 pr-10 rounded-xl bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/60 appearance-none"
                          >
                            <option value="" className="bg-[#001a16]">— Select squad captain —</option>
                            {roster.map(r => (
                              <option key={r.athlete_id} value={r.athlete_id} className="bg-[#001a16]">
                                {r.athlete?.full_name ? `${r.athlete.full_name} - ${r.athlete.member_id}` : r.athlete_id}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <Button
                        onClick={handleAssignCaptain}
                        disabled={!captainId || captainLoading}
                        className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold shadow-lg shadow-[#ffd700]/20 h-10 rounded-xl"
                      >
                        {captainLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4 mr-1.5" />}
                        Assign Leader
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-[#001a16] border border-[#ffd700]/10 rounded-2xl flex flex-col items-center justify-center py-24 text-gray-600 shadow-inner">
                <Users className="w-12 h-12 mb-3 opacity-20 text-[#ffd700]" />
                <p className="text-sm font-bold text-gray-500">Select a Squad</p>
                <p className="text-xs text-gray-600 mt-1">Select a squad from the sidebar list to view and configure its roster.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Custom Squad Creation Modal ── */}
      {showSquadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-[#001a16] border border-[#ffd700]/30 rounded-2xl shadow-2xl p-6 space-y-4 text-gray-200">
            <div className="flex items-center justify-between border-b border-[#ffd700]/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#ffd700]" />
                Create New Squad
              </h3>
              <button
                onClick={() => { setShowSquadModal(false); setSquadName(''); }}
                className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSquad} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Squad / Team Name *</label>
                <Input
                  id="squad-name-input"
                  value={squadName}
                  onChange={e => setSquadName(e.target.value)}
                  placeholder="e.g. Wisdom Family A, St. Jude FC"
                  className="bg-[#002520] border-[#ffd700]/25 text-white placeholder:text-gray-600 focus:border-[#ffd700]/60 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Tournament / League Category</label>
                <select
                  value={squadTournamentId}
                  onChange={e => setSquadTournamentId(e.target.value)}
                  className={selectStyle}
                  required
                >
                  <option value="" className="bg-[#001a16]">Select Tournament...</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id} className="bg-[#001a16]">
                      {t.title} ({t.sport_type.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Age Category</label>
                  <select
                    value={squadAgeCategory}
                    onChange={e => setSquadAgeCategory(e.target.value as AgeCategory)}
                    className={selectStyle}
                  >
                    <option value="Open" className="bg-[#001a16]">Open</option>
                    <option value="U-21" className="bg-[#001a16]">U-21</option>
                    <option value="U-17" className="bg-[#001a16]">U-17</option>
                    <option value="U-13" className="bg-[#001a16]">U-13</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase">Gender Restriction</label>
                  <select
                    value={squadGender}
                    onChange={e => setSquadGender(e.target.value as GenderCategory)}
                    className={selectStyle}
                  >
                    <option value="Male" className="bg-[#001a16]">Male</option>
                    <option value="Female" className="bg-[#001a16]">Female</option>
                    <option value="Mixed" className="bg-[#001a16]">Mixed</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#ffd700]/10">
                <Button
                  type="submit"
                  disabled={squadSubmitting}
                  className="flex-1 bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-bold rounded-xl"
                >
                  {squadSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                  Create Squad
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowSquadModal(false); setSquadName(''); }}
                  className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Add Athlete Modal ── */}
      {showAthleteModal && selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl bg-[#001a16] border border-[#ffd700]/30 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] text-gray-200">
            
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-[#ffd700]/10 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#ffd700]" />
                <h3 className="text-lg font-bold text-white">Add Athletes to {selectedTeam.team_name}</h3>
              </div>
              <button
                onClick={() => setShowAthleteModal(false)}
                className="text-gray-400 hover:text-white hover:bg-[#ffd700]/10 rounded-lg p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#002520]/40 p-3 rounded-xl border border-[#ffd700]/10 shrink-0 mb-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="athlete-search-input"
                  value={athleteSearch}
                  onChange={e => setAthleteSearch(e.target.value)}
                  placeholder="Search name, ID, role..."
                  className="pl-9 h-9.5 bg-[#001a16] border-[#ffd700]/25 text-white placeholder:text-gray-600 focus:border-[#ffd700]/60 rounded-lg"
                />
              </div>

              {isFamilyTeam && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-300">
                  <input
                    type="checkbox"
                    checked={filterByFamily}
                    onChange={e => setFilterByFamily(e.target.checked)}
                    className="rounded bg-[#001a16] border-[#ffd700]/20 text-[#ffd700] focus:ring-0 w-4 h-4"
                  />
                  <Filter className="w-3.5 h-3.5 text-[#ffd700]" />
                  <span>Filter by Family Unit ({teamFamilyName})</span>
                </label>
              )}
            </div>

            {/* Candidate selection sheet */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin max-h-[45vh]">
              {membersLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin text-[#ffd700]" />
                  <span className="text-xs">Fetching members roster...</span>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-25 text-[#ffd700]" />
                  No matching candidates available for squad registration.
                </div>
              ) : (
                filteredCandidates.map(member => {
                  const state = selectedCandidates[member.official_member_id] || { selected: false, jerseyNumber: '', position: 'CM' };
                  return (
                    <div
                      key={member.official_member_id}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border transition-all duration-150 ${
                        state.selected
                          ? 'bg-[#ffd700]/10 border-[#ffd700]/40 shadow-inner'
                          : 'bg-[#002520]/50 border-[#ffd700]/5 hover:border-[#ffd700]/15 hover:bg-[#002520]'
                      }`}
                    >
                      {/* Checkbox + Details */}
                      <div
                        onClick={() => handleToggleCandidate(member.official_member_id)}
                        className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                      >
                        <input
                          type="checkbox"
                          checked={state.selected}
                          readOnly
                          className="rounded bg-[#001a16] border-[#ffd700]/25 text-[#ffd700] focus:ring-0 w-4.5 h-4.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{member.full_name}</p>
                          <p className="text-[10px] text-gray-500 font-medium">
                            ID: <span className="font-mono text-gray-400">{member.official_member_id}</span> · Family: <span className="text-gray-400">{member.cmo_family || '—'}</span> · Role: <span className="text-gray-400">{member.role}</span>
                          </p>
                        </div>
                      </div>

                      {/* Position & Jersey Options - only show input if checked */}
                      {state.selected && (
                        <div className="flex gap-2 items-center mt-3 sm:mt-0 w-full sm:w-auto shrink-0 animate-in slide-in-from-right-1 duration-150">
                          <div>
                            <select
                              value={state.position}
                              onChange={e => handleUpdatePosition(member.official_member_id, e.target.value)}
                              className="h-8.5 px-2 rounded-lg bg-[#001a16] border border-[#ffd700]/30 text-white text-xs focus:outline-none"
                            >
                              <optgroup label="Goalkeeper" className="bg-[#001a16]">
                                <option value="GK">Goalkeeper (GK)</option>
                              </optgroup>
                              <optgroup label="Defenders" className="bg-[#001a16]">
                                <option value="CB">Centre-Back (CB)</option>
                                <option value="LB">Left-Back (LB)</option>
                                <option value="RB">Right-Back (RB)</option>
                                <option value="LWB">Left Wing-Back (LWB)</option>
                                <option value="RWB">Right Wing-Back (RWB)</option>
                              </optgroup>
                              <optgroup label="Midfielders" className="bg-[#001a16]">
                                <option value="CDM">Central Defensive Midfielder (CDM)</option>
                                <option value="CM">Central Midfielder (CM)</option>
                                <option value="CAM">Central Attacking Midfielder (CAM)</option>
                                <option value="LM">Left Midfielder (LM)</option>
                                <option value="RM">Right Midfielder (RM)</option>
                              </optgroup>
                              <optgroup label="Forwards / Attackers" className="bg-[#001a16]">
                                <option value="ST/CF">Striker / Centre-Forward (ST/CF)</option>
                                <option value="LW">Left Winger (LW)</option>
                                <option value="RW">Right Winger (RW)</option>
                                <option value="SS">Second Striker (SS)</option>
                              </optgroup>
                            </select>
                          </div>
                          <div className="w-20">
                            <Input
                              type="number"
                              placeholder="No #"
                              value={state.jerseyNumber}
                              onChange={e => handleUpdateJersey(member.official_member_id, e.target.value)}
                              className="h-8.5 text-center text-xs bg-[#001a16] border-[#ffd700]/30 text-white placeholder:text-gray-700 rounded-lg font-bold font-mono"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Panel */}
            <div className="border-t border-[#ffd700]/10 pt-4 mt-4 flex justify-between items-center shrink-0">
              <span className="text-xs text-gray-400 font-bold">
                {Object.values(selectedCandidates).filter(c => c.selected).length} Athletes Selected
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveAthletes}
                  disabled={savingAthletes || Object.values(selectedCandidates).filter(c => c.selected).length === 0}
                  className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-bold text-xs shadow-lg rounded-xl h-9.5 px-4"
                >
                  {savingAthletes ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <UserCheck className="w-4 h-4 mr-1.5" />}
                  Save Squad Roster
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAthleteModal(false)}
                  className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent rounded-xl h-9.5 text-xs px-4"
                >
                  Cancel
                </Button>
              </div>
            </div>

          </Card>
        </div>
      )}

    </div>
  );
};

export default CoachRosterWorkspace;
