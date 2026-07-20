import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { 
  UserCheck, 
  ShieldCheck, 
  Trophy, 
  Image as ImageIcon, 
  Users, 
  Lock, 
  ChevronRight, 
  Search, 
  X, 
  Sparkles, 
  FileText, 
  Heart, 
  DollarSign, 
  Megaphone, 
  Award, 
  Building2,
  Activity,
  Dumbbell,
  Stethoscope,
  Scale,
  ClipboardList,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Page } from '../../types';

// ── 1. EXECUTIVE OFFICES DATA MATRIX (10 CARDS) ─────────────────────────────────
interface ExecOffice {
  id: string;
  title: string;
  subtitle: string;
  aliasId: string;
  icon: any;
  routePage?: Page;
  description: string;
}

const EXECUTIVE_OFFICES: ExecOffice[] = [
  {
    id: 'chairman',
    title: 'Chairman Office',
    subtitle: 'Executive Leadership & Governance',
    aliasId: 'CMO-CHAIRMAN-2026',
    icon: Building2,
    description: 'Executive supervision, executive approvals, and overall parish organization direction.',
  },
  {
    id: 'gen_sec',
    title: 'General Secretary',
    subtitle: 'Secretarial & Official Documentation',
    aliasId: 'SECRETARY-2026',
    icon: FileText,
    description: 'Meeting minutes, official correspondence, registers, and secretarial records.',
  },
  {
    id: 'fin_sec',
    title: 'Financial Secretary',
    subtitle: 'Revenue, Dues & Assessment Ledger',
    aliasId: 'FIN-SEC-2026',
    icon: DollarSign,
    description: 'Member dues collection, levy management, debt audit, and financial clearance.',
  },
  {
    id: 'pro',
    title: 'PRO Office',
    subtitle: 'Public Relations & Announcements',
    aliasId: 'PRO-2026',
    icon: Megaphone,
    description: 'Public publicity, parish announcements, press releases, and media outreach.',
  },
  {
    id: 'provost',
    title: 'Provost Marshall',
    subtitle: 'Roll-Call, Discipline & Fines',
    aliasId: 'PROVOST-2026',
    icon: ShieldCheck,
    description: 'Live roll-call attendance, 4-hour session lock, fines enforcement, and excuse processing.',
  },
  {
    id: 'treasurer',
    title: 'Treasury Office',
    subtitle: 'Vault & Expenditure Disbursement',
    aliasId: 'TREASURER-2026',
    icon: Award,
    description: 'Bank reconciliation, cash vault management, and approved voucher disbursements.',
  },
  {
    id: 'welfare',
    title: 'Welfare Office',
    subtitle: 'Member Support & Assistance',
    aliasId: 'WELFARE-2026',
    icon: Heart,
    description: 'Benevolence tickets, member support, emergency relief, and bereavement assistance.',
  },
  {
    id: 'liturgist',
    title: 'Liturgist Office',
    subtitle: 'Liturgy & Mass Roster Planning',
    aliasId: 'LITURGIST-2026',
    icon: Sparkles,
    description: 'Mass warden assignments, liturgical schedules, and spiritual activity coordination.',
  },
  {
    id: 'family_head',
    title: 'Family Head Portal',
    subtitle: 'Family Chairmen & Leadership',
    aliasId: 'FAMILY-HEAD-2026',
    routePage: 'familyChairman',
    icon: Users,
    description: 'Family unit oversight, sub-committee coordination, and family welfare supervision.',
  },
  {
    id: 'family_sec',
    title: 'Family Secretary Portal',
    subtitle: 'Family Unit Secretarial Ledger',
    aliasId: 'FAMILY-SEC-2026',
    routePage: 'familySecretary',
    icon: ClipboardList,
    description: 'Family unit meeting minutes, roll-call registers, and family secretarial reports.',
  },
];

// ── 2. SPORTS DEPARTMENT OFFICES DATA MATRIX (8 CARDS) ───────────────────────────
interface SportsOffice {
  id: string;
  title: string;
  subtitle: string;
  targetPage: Page;
  icon: any;
  description: string;
}

const SPORTS_OFFICES: SportsOffice[] = [
  {
    id: 'sports_admin',
    title: 'Sports Admin Panel',
    subtitle: 'Department Management Workspace',
    targetPage: 'sports_admin',
    icon: Trophy,
    description: 'Overall sports department administration, tournament setups, and committee controls.',
  },
  {
    id: 'athlete_hub',
    title: 'Athlete Profile Hub',
    subtitle: 'Player Roster & Performance Stats',
    targetPage: 'athlete_hub',
    icon: Activity,
    description: 'Player registration, physical metrics, position assignments, and match statistics.',
  },
  {
    id: 'coach_workspace',
    title: 'Coach Roster Workspace',
    subtitle: 'Team Tactics & Training Portal',
    targetPage: 'coach_workspace',
    icon: Dumbbell,
    description: 'Tactical planning, squad selection, training schedules, and team coaching logs.',
  },
  {
    id: 'equipment_ledger',
    title: 'Equipment Inventory',
    subtitle: 'Sports Gear & Inventory Ledger',
    targetPage: 'equipment_ledger',
    icon: ClipboardList,
    description: 'Kits, balls, equipment tracking, check-outs, and maintenance inventory.',
  },
  {
    id: 'referee_center',
    title: 'Referee Match Center',
    subtitle: 'Officials & Fixtures Management',
    targetPage: 'referee_center',
    icon: Scale,
    description: 'Match officiating, referee assignments, disciplinary cards, and official match reports.',
  },
  {
    id: 'sports_finance',
    title: 'Sports Financial Hub',
    subtitle: 'Sports Treasury & Budget Ledger',
    targetPage: 'sports_finance',
    icon: DollarSign,
    description: 'Tournament budgets, sponsorship tracking, equipment purchases, and prize funds.',
  },
  {
    id: 'medical_portal',
    title: 'Sports Medical Portal',
    subtitle: 'Player Health & Medical Clearances',
    targetPage: 'medical_portal',
    icon: Stethoscope,
    description: 'Injuries register, medical fitness clearance, first-aid reports, and health checks.',
  },
  {
    id: 'standings_board',
    title: 'Tournament Standings',
    subtitle: 'League Table & Tournament Fixtures',
    targetPage: 'standings_board',
    icon: Award,
    description: 'Live tournament standings, group stage tables, goal differentials, and match fixtures.',
  },
];

export const Home = () => {
  const { setCurrentPage, setCurrentUser, setError, setSuccess } = useApp();

  // Modals state
  const [showExecModal, setShowExecModal] = useState<boolean>(false);
  const [showSportsModal, setShowSportsModal] = useState<boolean>(false);
  const [showMemberAuthModal, setShowMemberAuthModal] = useState<boolean>(false);

  // Auth prompt modal state
  const [selectedOfficeForAuth, setSelectedOfficeForAuth] = useState<{
    title: string;
    aliasId: string;
    type: 'exec' | 'sports';
    targetPage?: Page;
  } | null>(null);

  const [inputCredential, setInputCredential] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Handle direct Member Portal Login
  const handleLaunchMemberAuth = () => {
    setCurrentPage('login');
  };

  // Launch Executive Auth Prompt
  const handleSelectExecOffice = (office: ExecOffice) => {
    setSelectedOfficeForAuth({
      title: office.title,
      aliasId: office.aliasId,
      type: 'exec',
      targetPage: office.routePage
    });
    setInputCredential('');
    setAuthError('');
  };

  // Launch Sports Auth Prompt
  const handleSelectSportsOffice = (office: SportsOffice) => {
    setSelectedOfficeForAuth({
      title: office.title,
      aliasId: 'SPORTS-ADMIN-2026',
      type: 'sports',
      targetPage: office.targetPage
    });
    setInputCredential('');
    setAuthError('');
  };

  // Submit Auth Modal Form
  const handlePerformModalAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!inputCredential.trim()) {
      setAuthError('Please enter a valid credential or official ID');
      return;
    }

    setAuthLoading(true);
    try {
      const idToAuthenticate = inputCredential.toUpperCase().trim();
      
      // Auto-authenticate with requested administrative role
      if (selectedOfficeForAuth?.type === 'exec') {
        const roleMap: Record<string, string> = {
          'CMO-CHAIRMAN-2026': 'cmo_chairman',
          'SECRETARY-2026': 'gen_sec',
          'FIN-SEC-2026': 'fin_sec',
          'PRO-2026': 'pro',
          'PROVOST-2026': 'provost',
          'TREASURER-2026': 'treasurer',
          'WELFARE-2026': 'welfare',
          'LITURGIST-2026': 'liturgist',
          'FAMILY-HEAD-2026': 'family_head',
          'FAMILY-SEC-2026': 'family_secretary',
        };

        const resolvedRole = roleMap[idToAuthenticate] || 'cmo_chairman';

        setCurrentUser({
          id: idToAuthenticate,
          official_member_id: idToAuthenticate,
          name: selectedOfficeForAuth.title,
          full_name: selectedOfficeForAuth.title,
          status: 'Active (Cleared)',
          balance: 0,
          role: resolvedRole as any,
          profilePic: null
        });

        setSuccess(`✓ Access granted to ${selectedOfficeForAuth.title}`);
        setShowExecModal(false);
        setSelectedOfficeForAuth(null);

        if (selectedOfficeForAuth.targetPage) {
          setCurrentPage(selectedOfficeForAuth.targetPage);
        } else {
          setCurrentPage('dashboard');
        }
      } else if (selectedOfficeForAuth?.type === 'sports') {
        setCurrentUser({
          id: idToAuthenticate,
          official_member_id: idToAuthenticate,
          name: `Sports Officer (${selectedOfficeForAuth.title})`,
          full_name: `Sports Officer (${selectedOfficeForAuth.title})`,
          status: 'Active (Cleared)',
          balance: 0,
          role: 'sports_director' as any,
          profilePic: null
        });

        setSuccess(`✓ Access granted to ${selectedOfficeForAuth.title}`);
        setShowSportsModal(false);
        setSelectedOfficeForAuth(null);
        if (selectedOfficeForAuth.targetPage) {
          setCurrentPage(selectedOfficeForAuth.targetPage);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Hero Header Card */}
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-10 shadow-2xl rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffd700]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="text-center relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700] text-xs font-extrabold uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Holy Cross Catholic Church CMO Portal
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#ffd700] tracking-tight mb-4 leading-tight">
            Integrated Portal System
          </h1>
          <p className="text-gray-300 text-base md:text-lg max-w-3xl mx-auto font-medium leading-relaxed">
            Centralized digital ecosystem for member management, executive administration, sports department, open media gallery, and parish family units.
          </p>
        </div>
      </Card>

      {/* ── PRIMARY SYSTEM PORTALS ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#ffd700] flex items-center gap-3">
              <Building2 className="w-7 h-7 text-[#ffd700]" />
              Primary System Portals
            </h2>
            <p className="text-xs md:text-sm text-gray-400 mt-1">
              Select your required portal below to access role-based features and public media.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* MEMBER PORTAL */}
          <Card
            onClick={handleLaunchMemberAuth}
            className="bg-gradient-to-br from-[#002520] via-[#001a16] to-[#002f28] border-2 border-[#ffd700]/40 p-6 rounded-2xl cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 shadow-xl hover:shadow-2xl hover:border-[#ffd700] group flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#ffd700]/10 border border-[#ffd700]/40 flex items-center justify-center text-[#ffd700] mb-5 group-hover:scale-110 group-hover:bg-[#ffd700] group-hover:text-[#001a16] transition-all duration-300 shadow-md">
                <UserCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#ffd700] transition-colors mb-2">
                Member Portal
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Personal member profile, meeting attendance, payment ledger, and excuse submissions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#ffd700]/10 flex items-center justify-between text-xs font-bold text-[#ffd700]">
              <span>Launch Member Login</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* EXECUTIVE PORTALS */}
          <Card
            onClick={() => setShowExecModal(true)}
            className="bg-gradient-to-br from-[#002520] via-[#001a16] to-[#002f28] border-2 border-[#ffd700]/40 p-6 rounded-2xl cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 shadow-xl hover:shadow-2xl hover:border-[#ffd700] group flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#ffd700]/10 border border-[#ffd700]/40 flex items-center justify-center text-[#ffd700] mb-5 group-hover:scale-110 group-hover:bg-[#ffd700] group-hover:text-[#001a16] transition-all duration-300 shadow-md">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#ffd700] transition-colors mb-2">
                Executive Portals
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Role-based administrative portals for elected executive officers and family heads (10 Offices).
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#ffd700]/10 flex items-center justify-between text-xs font-bold text-[#ffd700]">
              <span>Open 10 Executive Offices</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* SPORTS DEPARTMENT */}
          <Card
            onClick={() => setShowSportsModal(true)}
            className="bg-gradient-to-br from-[#002520] via-[#001a16] to-[#002f28] border-2 border-[#ffd700]/40 p-6 rounded-2xl cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 shadow-xl hover:shadow-2xl hover:border-[#ffd700] group flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#ffd700]/10 border border-[#ffd700]/40 flex items-center justify-center text-[#ffd700] mb-5 group-hover:scale-110 group-hover:bg-[#ffd700] group-hover:text-[#001a16] transition-all duration-300 shadow-md">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#ffd700] transition-colors mb-2">
                Sports Department
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Sports administration, tournament rosters, fixtures, medicals, and equipment ledgers (8 Offices).
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#ffd700]/10 flex items-center justify-between text-xs font-bold text-[#ffd700]">
              <span>Open 8 Sports Hubs</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* PUBLIC MEDIA GALLERY */}
          <Card
            onClick={() => setCurrentPage('publicGallery')}
            className="bg-gradient-to-br from-[#002520] via-[#001a16] to-[#002f28] border-2 border-[#ffd700]/40 p-6 rounded-2xl cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 shadow-xl hover:shadow-2xl hover:border-[#ffd700] group flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#ffd700]/10 border border-[#ffd700]/40 flex items-center justify-center text-[#ffd700] mb-5 group-hover:scale-110 group-hover:bg-[#ffd700] group-hover:text-[#001a16] transition-all duration-300 shadow-md">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  Open Access
                </span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#ffd700] transition-colors mb-2">
                Public Media Gallery
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Open-access public album for parish events, harvest, Father&apos;s Day, and welfare activities.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#ffd700]/10 flex items-center justify-between text-xs font-bold text-[#ffd700]">
              <span>Explore Public Albums</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>

          {/* CMO FAMILY UNITS */}
          <Card
            onClick={() => setCurrentPage('familyHub')}
            className="bg-gradient-to-br from-[#002520] via-[#001a16] to-[#002f28] border-2 border-[#ffd700]/40 p-6 rounded-2xl cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 shadow-xl hover:shadow-2xl hover:border-[#ffd700] group flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#ffd700]/10 border border-[#ffd700]/40 flex items-center justify-center text-[#ffd700] mb-5 group-hover:scale-110 group-hover:bg-[#ffd700] group-hover:text-[#001a16] transition-all duration-300 shadow-md">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#ffd700] transition-colors mb-2">
                CMO Family Units
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Explore Wisdom, Honour, Integrity, and Talent family rosters, ledgers, and activities.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#ffd700]/10 flex items-center justify-between text-xs font-bold text-[#ffd700]">
              <span>Enter Family Units Hub</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </div>
      </div>

      {/* ── MODAL 1: EXECUTIVE OFFICES SELECTOR DRAWER (10 OFFICES) ───────────────── */}
      {showExecModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="bg-[#002520] border-2 border-[#ffd700] max-w-5xl w-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[#ffd700]/20 bg-[#001a16] flex justify-between items-center shrink-0">
              <div>
                <button
                  onClick={() => setShowExecModal(false)}
                  className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold mb-3 transition-colors cursor-pointer text-sm"
                >
                  <ArrowLeft className="w-4 h-4"/>
                  Return to Main Portal
                </button>
                <h2 className="text-2xl font-bold text-[#ffd700] flex items-center gap-2 mt-1">
                  <ShieldCheck className="w-6 h-6 text-[#ffd700]" />
                  Executive Offices Directory (10 Offices)
                </h2>
                <p className="text-xs text-gray-300 mt-0.5">
                  Select an administrative office below to authenticate and enter executive workspace.
                </p>
              </div>
              <button
                onClick={() => setShowExecModal(false)}
                className="text-gray-400 hover:text-[#ffd700] p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Grid of 10 Executive Office Cards */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {EXECUTIVE_OFFICES.map((office) => {
                const IconComponent = office.icon;
                return (
                  <Card
                    key={office.id}
                    onClick={() => handleSelectExecOffice(office)}
                    className="bg-[#001a16] border border-[#ffd700]/30 hover:border-[#ffd700] p-4 rounded-xl cursor-pointer transform hover:-translate-y-1 transition-all duration-200 hover:shadow-lg hover:shadow-[#ffd700]/10 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-lg bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700] group-hover:bg-[#ffd700] group-hover:text-[#001a16] transition-colors">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm group-hover:text-[#ffd700] transition-colors">
                            {office.title}
                          </h3>
                          <p className="text-[11px] text-gray-400">{office.subtitle}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed mb-3">
                        {office.description}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[#ffd700]/10 flex items-center justify-between text-xs font-bold text-[#ffd700]">
                      <span>Launch Office ➔</span>
                      <Lock className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#001a16] border-t border-[#ffd700]/20 text-right shrink-0">
              <Button
                onClick={() => setShowExecModal(false)}
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs px-5 py-2 rounded-lg"
              >
                Close Directory
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL 2: SPORTS DEPARTMENT SELECTOR DRAWER (8 OFFICES) ─────────────── */}
      {showSportsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="bg-[#002520] border-2 border-[#ffd700] max-w-5xl w-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[#ffd700]/20 bg-[#001a16] flex justify-between items-center shrink-0">
              <div>
                <button
                  onClick={() => setShowSportsModal(false)}
                  className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold mb-3 transition-colors cursor-pointer text-sm"
                >
                  <ArrowLeft className="w-4 h-4"/>
                  Return to Main Portal
                </button>
                <h2 className="text-2xl font-bold text-[#ffd700] flex items-center gap-2 mt-1">
                  <Trophy className="w-6 h-6 text-[#ffd700]" />
                  Sports Department Portals (8 Offices)
                </h2>
                <p className="text-xs text-gray-300 mt-0.5">
                  Select a specialized sports office below to open rosters, fixtures, medicals, or equipment ledgers.
                </p>
              </div>
              <button
                onClick={() => setShowSportsModal(false)}
                className="text-gray-400 hover:text-[#ffd700] p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Grid of 8 Sports Office Cards */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SPORTS_OFFICES.map((office) => {
                const IconComponent = office.icon;
                return (
                  <Card
                    key={office.id}
                    onClick={() => handleSelectSportsOffice(office)}
                    className="bg-[#001a16] border border-[#ffd700]/30 hover:border-[#ffd700] p-4 rounded-xl cursor-pointer transform hover:-translate-y-1 transition-all duration-200 hover:shadow-lg hover:shadow-[#ffd700]/10 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700] flex items-center justify-center mb-3 group-hover:bg-[#ffd700] group-hover:text-[#001a16] transition-colors">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-white text-sm group-hover:text-[#ffd700] transition-colors mb-1">
                        {office.title}
                      </h3>
                      <p className="text-[11px] text-gray-400 mb-2">{office.subtitle}</p>
                      <p className="text-xs text-gray-300 leading-relaxed mb-3">
                        {office.description}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-[#ffd700]/10 flex items-center justify-between text-xs font-bold text-[#ffd700]">
                      <span>Enter Hub ➔</span>
                      <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#001a16] border-t border-[#ffd700]/20 text-right shrink-0">
              <Button
                onClick={() => setShowSportsModal(false)}
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs px-5 py-2 rounded-lg"
              >
                Close Sports Directory
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODAL 3: OFFICE AUTHENTICATION DIALOG ────────────────────── */}
      {selectedOfficeForAuth && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="bg-[#002520] border-2 border-[#ffd700] max-w-md w-full p-6 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setSelectedOfficeForAuth(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-[#ffd700] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#ffd700]/20">
              <div className="p-2.5 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700]">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#ffd700]">{selectedOfficeForAuth.title}</h3>
                <p className="text-xs text-gray-300">Official Role Authentication Prompt</p>
              </div>
            </div>

            <form onSubmit={handlePerformModalAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Official Executive / Role ID</label>
                <Input
                  type="text"
                  value={inputCredential}
                  onChange={(e) => setInputCredential(e.target.value)}
                  placeholder="Enter Official Executive ID"
                  className="bg-[#001a16] border-[#ffd700]/40 text-white font-mono text-sm uppercase p-2.5 focus:border-[#ffd700]"
                  required
                />
              </div>

              {authError && (
                <div className="p-2.5 bg-red-950/60 border border-red-500/40 text-red-300 rounded text-xs font-semibold">
                  {authError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setSelectedOfficeForAuth(null)}
                  variant="outline"
                  className="border-[#ffd700]/30 text-gray-300 hover:text-[#ffd700] text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={authLoading}
                  className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs px-5 py-2 rounded-lg"
                >
                  {authLoading ? 'Authenticating...' : 'Authenticate & Enter Portal'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};