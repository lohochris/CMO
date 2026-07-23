import { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Loader2,
  RefreshCw,
  TrendingUp,
  BarChart3,
  ChevronRight,
  ArrowUpDown,
  Shield,
  Swords,
  Camera,
  Image,
  Eye,
  X,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { Card } from '../../../app/components/ui/card';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Tournament {
  id: string;
  title: string;
  sport_type: string;
  status: string;
}

interface CompletedFixture {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  round_number: number;
  status: string;
  match_date: string | null;
  venue: string | null;
  home_team?: { id: string; team_name: string };
  away_team?: { id: string; team_name: string };
}

interface LeagueRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface BracketMatch {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  status: string;
  winnerTeamId: string | null;
}

interface BracketRound {
  roundNumber: number;
  roundLabel: string;
  matches: BracketMatch[];
}

// ─────────────────────────────────────────────────────────────────────────────
// League Table Calculator (Client-Side)
// ─────────────────────────────────────────────────────────────────────────────

function computeLeagueTable(fixtures: CompletedFixture[]): LeagueRow[] {
  const table = new Map<string, LeagueRow>();

  const getOrCreate = (teamId: string, teamName: string): LeagueRow => {
    if (!table.has(teamId)) {
      table.set(teamId, {
        teamId,
        teamName,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      });
    }
    return table.get(teamId)!;
  };

  for (const f of fixtures) {
    if (f.status !== 'Completed' && f.status !== 'FINISHED') continue;

    const homeTeamId = f.home_team_id;
    const awayTeamId = f.away_team_id;
    const homeName = (f.home_team as any)?.team_name ?? homeTeamId;
    const awayName = (f.away_team as any)?.team_name ?? awayTeamId;

    const home = getOrCreate(homeTeamId, homeName);
    const away = getOrCreate(awayTeamId, awayName);

    const hs = f.home_score ?? 0;
    const as_ = f.away_score ?? 0;

    home.played++;
    away.played++;
    home.goalsFor += hs;
    home.goalsAgainst += as_;
    away.goalsFor += as_;
    away.goalsAgainst += hs;

    if (hs > as_) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (hs < as_) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }

    home.goalDiff = home.goalsFor - home.goalsAgainst;
    away.goalDiff = away.goalsFor - away.goalsAgainst;
  }

  const rows = Array.from(table.values());

  // Sort: Pts → GD → GF → head-to-head (approximated by alphabetical as final fallback)
  const headToHead = (a: LeagueRow, b: LeagueRow): number => {
    const h2h = fixtures.filter(
      f =>
        (f.status === 'Completed' || f.status === 'FINISHED') &&
        ((f.home_team_id === a.teamId && f.away_team_id === b.teamId) ||
          (f.home_team_id === b.teamId && f.away_team_id === a.teamId)),
    );
    let aH2HPoints = 0;
    let bH2HPoints = 0;
    for (const f of h2h) {
      const hs = f.home_score ?? 0;
      const as_ = f.away_score ?? 0;
      if (f.home_team_id === a.teamId) {
        if (hs > as_) aH2HPoints += 3;
        else if (hs === as_) { aH2HPoints += 1; bH2HPoints += 1; }
        else bH2HPoints += 3;
      } else {
        if (as_ > hs) aH2HPoints += 3;
        else if (hs === as_) { aH2HPoints += 1; bH2HPoints += 1; }
        else bH2HPoints += 3;
      }
    }
    return bH2HPoints - aH2HPoints;
  };

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    const h2h = headToHead(a, b);
    if (h2h !== 0) return h2h;
    return a.teamName.localeCompare(b.teamName);
  });

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bracket Transformer
// ─────────────────────────────────────────────────────────────────────────────

function buildBracketRounds(fixtures: CompletedFixture[]): BracketRound[] {
  if (!fixtures.length) return [];

  const roundMap = new Map<number, CompletedFixture[]>();
  for (const f of fixtures) {
    const existing = roundMap.get(f.round_number) ?? [];
    existing.push(f);
    roundMap.set(f.round_number, existing);
  }

  const sortedRoundNumbers = Array.from(roundMap.keys()).sort((a, b) => a - b);
  const totalRounds = sortedRoundNumbers.length;

  const getRoundLabel = (rn: number): string => {
    const fromFinal = totalRounds - sortedRoundNumbers.indexOf(rn) - 1;
    if (fromFinal === 0) return 'Final';
    if (fromFinal === 1) return 'Semi-Finals';
    if (fromFinal === 2) return 'Quarter-Finals';
    if (fromFinal === 3) return 'Round of 16';
    return `Round ${rn}`;
  };

  return sortedRoundNumbers.map(rn => {
    const roundFixtures = roundMap.get(rn)!;
    const matches: BracketMatch[] = roundFixtures.map(f => {
      const hs = f.home_score ?? 0;
      const as_ = f.away_score ?? 0;
      let winnerTeamId: string | null = null;
      if (f.status === 'Completed' || f.status === 'FINISHED') {
        winnerTeamId = hs > as_
          ? f.home_team_id
          : as_ > hs
            ? f.away_team_id
            : null; // draw — no winner in knockout
      }
      return {
        id: f.id,
        homeTeamId: f.home_team_id,
        awayTeamId: f.away_team_id,
        homeTeamName: (f.home_team as any)?.team_name ?? 'TBD',
        awayTeamName: (f.away_team as any)?.team_name ?? 'TBD',
        homeScore: hs,
        awayScore: as_,
        status: f.status,
        winnerTeamId,
      };
    });
    return { roundNumber: rn, roundLabel: getRoundLabel(rn), matches };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Component: League Standings Table
// ─────────────────────────────────────────────────────────────────────────────

const LeagueTable = ({ rows, loading }: { rows: LeagueRow[]; loading: boolean }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Computing standings…</span>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
        <BarChart3 className="w-10 h-10 mb-2 opacity-20" />
        <p className="text-sm">No completed matches yet. Standings will appear here.</p>
      </div>
    );
  }

  const colClass = 'px-3 py-2 text-center text-xs font-mono tabular-nums';
  const headerClass = 'px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#ffd700]/10 bg-[#002520]/40">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Team</th>
            <th className={headerClass}>P</th>
            <th className={headerClass}>W</th>
            <th className={headerClass}>D</th>
            <th className={headerClass}>L</th>
            <th className={headerClass}>GF</th>
            <th className={headerClass}>GA</th>
            <th className={headerClass}>GD</th>
            <th className={`${headerClass} text-[#ffd700]`}>Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#ffd700]/5">
          {rows.map((row, idx) => {
            const isTop = idx === 0;
            const isPromotion = idx < 2;
            return (
              <tr
                key={row.teamId}
                className={`transition-colors group ${isTop ? 'bg-[#ffd700]/5 hover:bg-[#ffd700]/10' : 'hover:bg-[#002520]/50'}`}
              >
                <td className="px-4 py-3">
                  <span className={`text-sm font-bold ${isTop ? 'text-[#ffd700]' : isPromotion ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {idx + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isTop ? (
                      <Trophy className="w-3.5 h-3.5 text-[#ffd700] shrink-0" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-gray-700 shrink-0" />
                    )}
                    <span className={`font-semibold ${isTop ? 'text-[#ffd700]' : 'text-white group-hover:text-[#ffd700] transition-colors'}`}>
                      {row.teamName}
                    </span>
                  </div>
                </td>
                <td className={colClass + ' text-gray-400'}>{row.played}</td>
                <td className={colClass + ' text-emerald-400'}>{row.won}</td>
                <td className={colClass + ' text-gray-400'}>{row.drawn}</td>
                <td className={colClass + ' text-red-400'}>{row.lost}</td>
                <td className={colClass + ' text-gray-300'}>{row.goalsFor}</td>
                <td className={colClass + ' text-gray-300'}>{row.goalsAgainst}</td>
                <td className={`${colClass} font-semibold ${row.goalDiff > 0 ? 'text-emerald-400' : row.goalDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {row.goalDiff > 0 ? '+' : ''}{row.goalDiff}
                </td>
                <td className={`${colClass} text-[#ffd700] font-black text-base`}>{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Component: Knockout Bracket Visualizer
// ─────────────────────────────────────────────────────────────────────────────

const BracketVisualizer = ({
  rounds,
  loading,
  selectedFixtureId,
  onSelectFixture,
}: {
  rounds: BracketRound[];
  loading: boolean;
  selectedFixtureId: string | null;
  onSelectFixture: (id: string) => void;
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Building bracket…</span>
      </div>
    );
  }

  if (!rounds.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
        <Swords className="w-10 h-10 mb-2 opacity-20" />
        <p className="text-sm">No bracket data available for this tournament.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max px-2">
        {rounds.map((round) => (
          <div key={round.roundNumber} className="flex flex-col gap-0">
            {/* Round label */}
            <div className="text-center mb-3">
              <span className="inline-block px-3 py-1 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 text-xs font-semibold text-[#ffd700] uppercase tracking-wider">
                {round.roundLabel}
              </span>
            </div>

            {/* Match cards in this round */}
            <div className={`flex flex-col gap-4`} style={{
              justifyContent: 'space-around',
              flex: 1,
            }}>
              {round.matches.map((match) => {
                const isCompleted = match.status === 'Completed' || match.status === 'FINISHED';
                const homeWon = match.winnerTeamId === match.homeTeamId;
                const awayWon = match.winnerTeamId === match.awayTeamId;
                const isTBD = !match.homeTeamId && !match.awayTeamId;

                const isSelected = selectedFixtureId === match.id;

                return (
                  <button
                    key={match.id}
                    onClick={() => !isTBD && onSelectFixture(match.id)}
                    disabled={isTBD}
                    className={`w-52 rounded-xl border text-left overflow-hidden shadow-lg transition-all duration-200 ${
                      isSelected
                        ? 'border-[#ffd700] ring-1 ring-[#ffd700]'
                        : 'border-[#ffd700]/15 bg-[#002520] hover:border-[#ffd700]/30'
                    } ${isTBD ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                  >
                    {/* Home */}
                    <div className={`flex items-center justify-between px-3 py-2.5 border-b border-[#ffd700]/10 ${homeWon ? 'bg-[#ffd700]/10' : ''}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {homeWon && <Trophy className="w-3 h-3 text-[#ffd700] shrink-0" />}
                        <span className={`text-xs font-semibold truncate ${
                          isTBD ? 'text-gray-600 italic' :
                          homeWon ? 'text-[#ffd700]' :
                          isCompleted ? 'text-gray-500' : 'text-white'
                        }`}>
                          {match.homeTeamName}
                        </span>
                      </div>
                      {isCompleted && (
                        <span className={`text-sm font-black ml-2 tabular-nums shrink-0 ${homeWon ? 'text-[#ffd700]' : 'text-gray-500'}`}>
                          {match.homeScore}
                        </span>
                      )}
                    </div>

                    {/* Away */}
                    <div className={`flex items-center justify-between px-3 py-2.5 ${awayWon ? 'bg-[#ffd700]/10' : ''}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        {awayWon && <Trophy className="w-3 h-3 text-[#ffd700] shrink-0" />}
                        <span className={`text-xs font-semibold truncate ${
                          isTBD ? 'text-gray-600 italic' :
                          awayWon ? 'text-[#ffd700]' :
                          isCompleted ? 'text-gray-500' : 'text-white'
                        }`}>
                          {match.awayTeamName}
                        </span>
                      </div>
                      {isCompleted && (
                        <span className={`text-sm font-black ml-2 tabular-nums shrink-0 ${awayWon ? 'text-[#ffd700]' : 'text-gray-500'}`}>
                          {match.awayScore}
                        </span>
                      )}
                    </div>

                    {/* Status pill */}
                    {!isTBD && (
                      <div className={`px-3 py-1 text-center text-[10px] font-medium uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-400/10 text-emerald-400'
                          : match.status === 'Ongoing'
                            ? 'bg-[#ffd700]/10 text-[#ffd700]'
                            : 'bg-[#001a16] text-gray-600'
                      }`}>
                        {isCompleted ? '✓ Final' : match.status === 'Ongoing' ? '● Live' : 'Scheduled'}
                      </div>
                    )}
                    {isTBD && (
                      <div className="px-3 py-1 text-center text-[10px] text-gray-600 bg-[#001a16] italic">
                        Awaiting result
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Connector lines (between rounds) */}
            {/* Handled by flex gap layout — CSS border approach for clean joins */}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Component: Fixture & Results List
// ─────────────────────────────────────────────────────────────────────────────

interface FixtureListProps {
  fixtures: CompletedFixture[];
  selectedFixtureId: string | null;
  onSelectFixture: (id: string) => void;
}

const FixtureList = ({ fixtures, selectedFixtureId, onSelectFixture }: FixtureListProps) => {
  if (!fixtures.length) return null;

  return (
    <div className="mt-6 border-t border-[#ffd700]/10 pt-5">
      <h3 className="text-sm font-semibold text-[#ffd700] mb-3 flex items-center gap-2">
        <Swords className="w-4 h-4" />
        Matches & Fixtures
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
        {fixtures.map(f => {
          const isSelected = selectedFixtureId === f.id;
          const homeName = f.home_team?.team_name ?? 'Home';
          const awayName = f.away_team?.team_name ?? 'Away';
          const matchDate = f.match_date
            ? new Date(f.match_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
            : '';
          const isCompleted = f.status === 'Completed' || f.status === 'FINISHED';

          return (
            <button
              key={f.id}
              onClick={() => onSelectFixture(f.id)}
              className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#ffd700]/10 border-[#ffd700]/50 shadow-md shadow-[#ffd700]/5'
                  : 'bg-[#002520] border-[#ffd700]/10 hover:border-[#ffd700]/30 hover:bg-[#002520]/80'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-[10px] font-mono text-gray-500 uppercase">
                  Round {f.round_number} {matchDate ? `· ${matchDate}` : ''}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  isCompleted 
                    ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' 
                    : f.status === 'Ongoing'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {f.status}
                </span>
              </div>
              <div className="flex justify-between items-center w-full">
                <span className="text-xs font-semibold text-white truncate max-w-[120px]">{homeName}</span>
                <span className="text-xs font-bold text-[#ffd700] tabular-nums mx-2">
                  {isCompleted || f.status === 'Ongoing' ? `${f.home_score} - ${f.away_score}` : 'vs'}
                </span>
                <span className="text-xs font-semibold text-white truncate max-w-[120px] text-right">{awayName}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const TournamentStandingsBoard = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [fixtures, setFixtures] = useState<CompletedFixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(false);

  // Derived
  const [leagueRows, setLeagueRows] = useState<LeagueRow[]>([]);
  const [bracketRounds, setBracketRounds] = useState<BracketRound[]>([]);
  const [displayMode, setDisplayMode] = useState<'standings' | 'bracket'>('standings');

  // ── Gallery State ──────────────────────────────────────────────────────────
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<{ id: string; media_url: string }[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // ── Fetch match media gallery ──────────────────────────────────────────────
  const fetchMatchGallery = useCallback(async (fixtureId: string) => {
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
      console.error('Error fetching match gallery:', err);
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  // Sync gallery when selected fixture changes
  useEffect(() => {
    if (selectedFixtureId) {
      fetchMatchGallery(selectedFixtureId);
    } else {
      setGalleryItems([]);
    }
  }, [selectedFixtureId, fetchMatchGallery]);

  // ── Fetch tournaments ──────────────────────────────────────────────────────
  const fetchTournaments = useCallback(async () => {
    const { data, error } = await supabase
      .from('sports_tournaments')
      .select('id, title, sport_type, status')
      .order('created_at', { ascending: false });
    if (!error && data) setTournaments(data as Tournament[]);
  }, []);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  // ── Filter tournaments by tab ──────────────────────────────────────────────
  const filteredTournaments = tournaments.filter(t =>
    activeTab === 'ongoing'
      ? ['Ongoing', 'Registration_Open'].includes(t.status)
      : t.status === 'Completed',
  );

  // ── Fetch fixtures ──────────────────────────────────────────────────────────
  const fetchFixtures = useCallback(async (tournamentId: string) => {
    if (!tournamentId) return;
    setFixturesLoading(true);
    try {
      const { data, error } = await supabase
        .from('sports_fixtures')
        .select(`
          id, home_team_id, away_team_id,
          home_score, away_score, round_number, status,
          match_date, venue,
          home_team:sports_teams!sports_fixtures_home_team_id_fkey(id, team_name),
          away_team:sports_teams!sports_fixtures_away_team_id_fkey(id, team_name)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true });
      if (error) throw error;
      const rows = (data as unknown as CompletedFixture[]) ?? [];
      setFixtures(rows);
      setLeagueRows(computeLeagueTable(rows));
      setBracketRounds(buildBracketRounds(rows));
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not load fixtures.', {
        style: { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' },
      });
    } finally {
      setFixturesLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedFixtureId(null);
    if (selectedTournamentId) fetchFixtures(selectedTournamentId);
    else { setFixtures([]); setLeagueRows([]); setBracketRounds([]); }
  }, [selectedTournamentId, fetchFixtures]);

  // Auto-select first tournament when tab changes
  useEffect(() => {
    if (filteredTournaments.length > 0) {
      setSelectedTournamentId(filteredTournaments[0].id);
    } else {
      setSelectedTournamentId('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Real-time subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTournamentId) return;

    const channel = supabase
      .channel(`standings-${selectedTournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sports_fixtures',
        },
        () => {
          fetchFixtures(selectedTournamentId);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTournamentId, fetchFixtures]);

  // ── Determine if this tournament has knockout or league format ─────────────
  const hasMultipleRounds = fixtures.some(f => f.round_number > 1) &&
    new Set(fixtures.map(f => f.round_number)).size > 1;
  const isKnockout = hasMultipleRounds && leagueRows.length === 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#ffd700]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Standings Board</h1>
            <p className="text-xs text-gray-400 mt-0.5">Live tournament standings & bracket progressions</p>
          </div>
        </div>
        <button
          onClick={() => selectedTournamentId && fetchFixtures(selectedTournamentId)}
          disabled={fixturesLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#ffd700]/20 text-[#ffd700] text-sm hover:bg-[#ffd700]/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${fixturesLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Status Tabs ── */}
      <div className="flex gap-1 p-1 bg-[#001a16] border border-[#ffd700]/10 rounded-xl w-fit">
        {(['ongoing', 'completed'] as const).map(tab => (
          <button
            key={tab}
            id={`standings-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
              activeTab === tab
                ? 'bg-[#ffd700] text-[#001a16] shadow-md shadow-[#ffd700]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tournament Selector ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {filteredTournaments.length === 0 ? (
          <p className="text-sm text-gray-600">No {activeTab} tournaments found.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {filteredTournaments.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTournamentId(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  selectedTournamentId === t.id
                    ? 'bg-[#ffd700]/10 border-[#ffd700]/40 text-[#ffd700]'
                    : 'border-[#ffd700]/10 text-gray-400 hover:border-[#ffd700]/30 hover:text-white bg-[#001a16]'
                }`}
              >
                {t.title}
                <span className="ml-1.5 text-xs opacity-60">{t.sport_type.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Display Mode Toggle (when both views available) ── */}
      {selectedTournamentId && !fixturesLoading && fixtures.length > 0 && (
        <div className="flex gap-1 p-1 bg-[#001a16] border border-[#ffd700]/10 rounded-xl w-fit">
          <button
            id="toggle-standings-view"
            onClick={() => setDisplayMode('standings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              displayMode === 'standings'
                ? 'bg-[#ffd700] text-[#001a16] shadow-md shadow-[#ffd700]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            Standings
          </button>
          <button
            id="toggle-bracket-view"
            onClick={() => setDisplayMode('bracket')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              displayMode === 'bracket'
                ? 'bg-[#ffd700] text-[#001a16] shadow-md shadow-[#ffd700]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
            Bracket
          </button>
        </div>
      )}

      {/* ── Main Content ── */}
      {selectedTournamentId ? (
        displayMode === 'standings' ? (
          <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-[#ffd700]/10 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#ffd700]" />
                League Standings
              </h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Top 2</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ffd700]" />Leader</span>
              </div>
            </div>
            <LeagueTable rows={leagueRows} loading={fixturesLoading} />
            
            {/* Inject Match Fixtures List for league selection */}
            {!fixturesLoading && fixtures.length > 0 && (
              <div className="px-6 pb-6">
                <FixtureList
                  fixtures={fixtures}
                  selectedFixtureId={selectedFixtureId}
                  onSelectFixture={setSelectedFixtureId}
                />
              </div>
            )}

            {!fixturesLoading && leagueRows.length > 0 && (
              <div className="px-6 py-3 border-t border-[#ffd700]/10 bg-[#002520]/30 text-xs text-gray-600 flex gap-4 flex-wrap">
                <span>P = Played</span>
                <span>W = Won</span>
                <span>D = Drawn</span>
                <span>L = Lost</span>
                <span>GF = Goals For</span>
                <span>GA = Goals Against</span>
                <span>GD = Goal Diff</span>
                <span className="text-[#ffd700]">Pts = Points</span>
              </div>
            )}
          </Card>
        ) : (
          <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Swords className="w-4 h-4 text-[#ffd700]" />
                Knockout Bracket
              </h2>
              {bracketRounds.length > 0 && (
                <span className="text-xs text-gray-500 bg-[#002520] px-2.5 py-1 rounded-full border border-[#ffd700]/10">
                  {bracketRounds.length} round{bracketRounds.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <BracketVisualizer
              rounds={bracketRounds}
              loading={fixturesLoading}
              selectedFixtureId={selectedFixtureId}
              onSelectFixture={setSelectedFixtureId}
            />
          </Card>
        )
      ) : (
        <Card className="bg-[#001a16] border border-[#ffd700]/10 rounded-2xl p-12 text-center shadow-xl">
          <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-3 opacity-30" />
          <p className="text-gray-500 text-sm">
            Select a tournament above to view standings and bracket progression.
          </p>
        </Card>
      )}

      {/* ── Read-only Match Media Gallery ── */}
      {selectedFixtureId && (
        <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5 shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#ffd700]" />
              Match Media Gallery
              {galleryLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
            </h3>
            <button
              onClick={() => setSelectedFixtureId(null)}
              className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700/20 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {galleryLoading ? (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Loading match photos…</span>
            </div>
          ) : galleryItems.length === 0 ? (
            <div className="py-6 border border-[#ffd700]/10 bg-[#002520]/10 rounded-xl flex flex-col items-center justify-center text-gray-500 text-xs">
              <Image className="w-5 h-5 mb-1 opacity-20 text-[#ffd700]" />
              <span>No media uploaded for this match yet.</span>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto py-2 pr-2 scrollbar-thin items-center">
              {galleryItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => setPreviewImageUrl(item.media_url)}
                  className="w-24 h-24 rounded-lg overflow-hidden bg-slate-950 border border-[#ffd700]/10 hover:border-[#ffd700]/40 relative group shrink-0 shadow-md cursor-pointer transition-all duration-200 hover:scale-105 flex items-center justify-center p-0.5"
                >
                  <img
                    src={item.media_url}
                    alt="Match Media"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-[#001a16]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="p-1 bg-[#001a16]/80 rounded-md border border-[#ffd700]/20 text-[#ffd700]">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Fullscreen Media Preview Modal ── */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001a16]/95 backdrop-blur-sm p-4">
          <button
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-[#002520] border border-[#ffd700]/20 text-white hover:text-[#ffd700] hover:bg-[#002520]/80 transition-all duration-200 shadow-lg cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] w-full flex items-center justify-center relative rounded-2xl overflow-hidden border border-[#ffd700]/10 bg-[#002520]/40 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <img
              src={previewImageUrl}
              alt="Match Media Preview"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Live indicator */}
      {selectedTournamentId && activeTab === 'ongoing' && !fixturesLoading && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live updates enabled — standings refresh automatically when matches complete
        </div>
      )}
    </div>
  );
};

export default TournamentStandingsBoard;
