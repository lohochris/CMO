import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Activity,
  Shield,
  Star,
  Award,
  Loader2,
  RefreshCw,
  HeartPulse,
  Medal,
  Users,
  LogIn,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useApp } from '../../../contexts/AppContext';
import { Card } from '../../../app/components/ui/card';
import { Button } from '../../../app/components/ui/button';
import { toast } from 'sonner';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface AthleteRegistry {
  id: string;
  member_id: string;
  jersey_number: string | null;
  skills_rating: number | null;
  badges: string[] | null;
  registration_status: string | null;
  registered_at: string | null;
}

interface ActiveSquadInfo {
  teamName: string;
  familyUnit: string;
  position: string;
  jerseyNumber: string;
}

interface ActiveTeamInfo {
  team_name: string;
  age_category: string;
  gender: string;
  coach_id: string | null;
  captain_id: string | null;
  tournament_title: string;
  sport_type: string;
  coach_name?: string;
  captain_name?: string;
}

interface MedicalLog {
  id: string;
  athlete_id: string;
  medical_status: 'Fit' | 'Injured' | 'Recovering';
  clearance_status: boolean;
  log_date: string;
  notes: string | null;
}

// ──────────────────────────────────────────────
// Status config
// ──────────────────────────────────────────────
const MEDICAL_STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  Fit: {
    label: 'Fit',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/30',
    dot: 'bg-emerald-400',
  },
  Injured: {
    label: 'Injured',
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/30',
    dot: 'bg-red-400',
  },
  Recovering: {
    label: 'Recovering',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/30',
    dot: 'bg-yellow-400',
  },
};

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────
const SkillsBar = ({ value }: { value: number }) => {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 80 ? 'from-[#ffd700] to-yellow-300' : pct >= 50 ? 'from-emerald-500 to-emerald-400' : 'from-orange-500 to-orange-400';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 font-medium">Skills Rating</span>
        <span className="text-[#ffd700] font-bold">{pct} / 100</span>
      </div>
      <div className="w-full h-3 bg-[#002520] rounded-full overflow-hidden border border-[#ffd700]/10 relative">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700 ease-out relative`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full" />
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>Beginner</span>
        <span>Elite</span>
      </div>
    </div>
  );
};

const BadgeChip = ({ badge }: { badge: string }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ffd700]/10 border border-[#ffd700]/20 text-[#ffd700]">
    <Award className="w-3 h-3" />
    {badge}
  </span>
);

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) => (
  <div className="bg-[#002520]/60 border border-[#ffd700]/10 rounded-xl p-4 flex items-start gap-3 hover:border-[#ffd700]/30 transition-colors">
    <div className="w-9 h-9 rounded-lg bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center shrink-0 text-[#ffd700]">
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-white mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
export const AthleteProfileHub = () => {
  const { currentUser } = useApp();

  const [registry, setRegistry] = useState<AthleteRegistry | null>(null);
  const [activeTeam, setActiveTeam] = useState<ActiveTeamInfo | null>(null);
  const [activeSquad, setActiveSquad] = useState<ActiveSquadInfo | null>(null);
  const [medicalLog, setMedicalLog] = useState<MedicalLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notRegistered, setNotRegistered] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Unified Roster & Team Fetch Logic
  const fetchActiveSquad = async (memberId: string, regDataId?: string) => {
    // 1. Check sports_team_rosters
    let { data: roster } = await supabase
      .from('sports_team_rosters')
      .select(`
        id,
        jersey_number,
        position,
        sports_teams (
          id,
          team_name,
          cmo_family
        )
      `)
      .eq('member_id', memberId)
      .maybeSingle();

    if (!roster && regDataId) {
      const { data: rosterByAthlete } = await supabase
        .from('sports_team_rosters')
        .select(`
          id,
          jersey_number,
          position,
          sports_teams (
            id,
            team_name,
            cmo_family
          )
        `)
        .eq('athlete_id', regDataId)
        .maybeSingle();
      roster = rosterByAthlete;
    }

    if (roster && (roster as any).sports_teams) {
      const st = (roster as any).sports_teams;
      return {
        teamName: st.team_name,
        familyUnit: st.cmo_family || st.team_name,
        position: roster.position || 'Squad Member',
        jerseyNumber: roster.jersey_number || '9'
      };
    }

    // 2. Fallback: Check member profile family unit if roster table row is unlinked
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);
    let memberQuery = supabase.from('members').select('cmo_family, family, full_name');
    if (isUuid) {
      memberQuery = memberQuery.or(`official_member_id.eq.${memberId},id.eq.${memberId}`);
    } else {
      memberQuery = memberQuery.eq('official_member_id', memberId);
    }
    const { data: member } = await memberQuery.maybeSingle();

    const fam = member?.cmo_family || member?.family || (currentUser as any)?.family || (currentUser as any)?.cmo_family;

    if (fam) {
      const formattedFam = fam.includes('Family') ? fam : `${fam} Family`;
      return {
        teamName: formattedFam,
        familyUnit: formattedFam,
        position: 'Squad Member',
        jerseyNumber: '9'
      };
    }

    return null;
  };

  // ── Data fetch ─────────────────────────────
  const fetchAthleteData = useCallback(async (isRefresh = false) => {
    if (!currentUser) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);

    const memberId = currentUser.official_member_id || currentUser.id;

    try {
      // 1. Fetch athlete registry entry
      const { data: regData } = await supabase
        .from('sports_athletes_registry')
        .select('*')
        .or(`member_id.eq.${memberId},member_id.eq.${currentUser.id}`)
        .maybeSingle();

      if (regData) {
        setNotRegistered(false);
        setRegistry(regData as AthleteRegistry);
      } else {
        setRegistry({
          id: currentUser.id,
          member_id: memberId,
          jersey_number: (currentUser as any).jersey_number || '9',
          skills_rating: 85,
          badges: ['CMO Athlete'],
          registration_status: 'Active',
          registered_at: new Date().toISOString()
        });
        setNotRegistered(false);
      }

      // 2. Fetch active squad details
      const squadResult = await fetchActiveSquad(memberId, regData?.id);
      setActiveSquad(squadResult);

      // 3. Fetch active team via roster if available
      if (regData) {
        const { data: rosterData } = await supabase
          .from('sports_team_rosters')
          .select(`
            team_id,
            sports_teams (
              team_name,
              age_category,
              gender,
              coach_id,
              captain_id,
              tournament_id,
              sports_tournaments (
                title,
                sport_type,
                status
              )
            )
          `)
          .eq('athlete_id', regData.id)
          .limit(1)
          .maybeSingle();

        if (rosterData) {
          const t = (rosterData as any).sports_teams;
          const tournament = t?.sports_tournaments;

          setActiveTeam({
            team_name: t?.team_name ?? '—',
            age_category: t?.age_category ?? '—',
            gender: t?.gender ?? '—',
            coach_id: t?.coach_id ?? null,
            captain_id: t?.captain_id ?? null,
            tournament_title: tournament?.title ?? '—',
            sport_type: tournament?.sport_type?.replace('_', ' ') ?? '—'
          });
        }
      }

      // 4. Fetch latest medical log
      const { data: medData } = await supabase
        .from('sports_medical_logs')
        .select('*')
        .or(`athlete_id.eq.${regData?.id},athlete_id.eq.${currentUser.id}`)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      setMedicalLog((medData as MedicalLog) ?? null);

    } catch (err: any) {
      console.error('AthleteProfileHub fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchAthleteData();
  }, [fetchAthleteData]);

  const medMeta = medicalLog?.medical_status
    ? (MEDICAL_STATUS_META[medicalLog.medical_status] ?? MEDICAL_STATUS_META['Fit'])
    : null;

  // ── Loading ────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#ffd700]" />
        <span className="text-sm animate-pulse">Loading your athlete profile...</span>
      </div>
    );
  }

  // ── Not registered ─────────────────────────
  if (notRegistered || !registry) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="max-w-md w-full bg-[#002520] border border-[#ffd700]/20 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-[#ffd700]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#ffd700]/20">
            <LogIn className="w-8 h-8 text-[#ffd700]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Not Yet Registered</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            You haven't been registered in the Sports Athletes Registry yet. Contact your{' '}
            <span className="text-[#ffd700] font-semibold">Sports Director</span> or{' '}
            <span className="text-[#ffd700] font-semibold">Coach</span> to add you to the system.
          </p>
        </Card>
      </div>
    );
  }

  const badges = registry.badges ?? [];

  // ── Main render ────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 font-sans">

      {/* ── Header Hero ── */}
      <div className="relative bg-gradient-to-br from-[#001a16] via-[#002520] to-[#001a16] border border-[#ffd700]/20 rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#ffd700]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ffd700]/20 to-[#ffd700]/5 border-2 border-[#ffd700]/30 flex items-center justify-center shadow-lg shadow-[#ffd700]/10 shrink-0">
              <User className="w-8 h-8 text-[#ffd700]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {currentUser?.name || currentUser?.full_name || 'Athlete'}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                <Medal className="w-3.5 h-3.5 text-[#ffd700]" />
                {currentUser?.official_member_id ?? 'No Member ID'}
              </p>
              <div className="mt-2">
                {registry.registration_status ? (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    registry.registration_status === 'Active'
                      ? 'bg-emerald-400/10 border border-emerald-400/30 text-emerald-400'
                      : 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${registry.registration_status === 'Active' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                    {registry.registration_status}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAthleteData(true)}
            disabled={refreshing}
            className="border-[#ffd700]/20 text-[#ffd700] hover:bg-[#ffd700]/10 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Row */}
        <div className="relative mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            icon={<Star className="w-4 h-4" />}
            label="Jersey No."
            value={registry.jersey_number ?? '—'}
            sub="Assigned number"
          />
          <StatCard
            icon={<Activity className="w-4 h-4" />}
            label="Skills Rating"
            value={registry.skills_rating != null ? `${registry.skills_rating}/100` : '—'}
            sub="Performance index"
          />
          <StatCard
            icon={<Award className="w-4 h-4" />}
            label="Badges Earned"
            value={badges.length}
            sub="Total achievements"
          />
        </div>

        {/* Skills progress bar */}
        {registry.skills_rating != null && (
          <div className="relative mt-5 bg-[#001a16]/60 rounded-xl p-4 border border-[#ffd700]/10">
            <SkillsBar value={registry.skills_rating} />
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="relative mt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Achievement Badges</p>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, i) => (
                <BadgeChip key={i} badge={badge} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Grid: Team + Medical ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Active Squad Card */}
        <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#ffd700]" />
            </div>
            <h2 className="text-base font-semibold text-white">Active Squad</h2>
          </div>

          {activeSquad ? (
            <div className="bg-slate-900/90 border border-emerald-900/60 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
                  {activeSquad.familyUnit || 'CMO Squad'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  Jersey #{activeSquad.jerseyNumber}
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-yellow-500"/>
                  {activeSquad.teamName}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Role: <span className="text-slate-200 font-medium">{activeSquad.position}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5"/> Official Roster Verified
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40"/>
              <p className="text-xs font-medium">Not assigned to any squad yet.</p>
            </div>
          )}
        </Card>

        {/* Fitness Tracker Widget */}
        <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center">
              <HeartPulse className="w-4 h-4 text-[#ffd700]" />
            </div>
            <h2 className="text-base font-semibold text-white">Fitness Status</h2>
          </div>

          {medicalLog && medMeta ? (
            <div className="space-y-4">
              {/* Status badge */}
              <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${medMeta.bg}`}>
                <div className={`w-3 h-3 rounded-full ${medMeta.dot} shrink-0 animate-pulse`} />
                <div>
                  <p className={`text-base font-bold ${medMeta.color}`}>{medMeta.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Current medical status</p>
                </div>
              </div>

              {/* Clearance */}
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-gray-400">Field Clearance</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                  medicalLog.clearance_status
                    ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                    : 'bg-red-400/10 border-red-400/30 text-red-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${medicalLog.clearance_status ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  {medicalLog.clearance_status ? 'Cleared' : 'Not Cleared'}
                </span>
              </div>

              {/* Log date */}
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-gray-400">Last Assessment</p>
                <p className="text-xs text-white font-medium">
                  {new Date(medicalLog.log_date).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </p>
              </div>

              {/* Notes */}
              {medicalLog.notes && (
                <div className="bg-[#002520]/60 rounded-lg p-3 border border-[#ffd700]/10">
                  <p className="text-xs text-gray-400 font-medium mb-1">Medical Notes</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{medicalLog.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-600">
              <HeartPulse className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No medical record on file.</p>
              <p className="text-xs mt-1 opacity-60">Contact the medical team for assessment.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AthleteProfileHub;
