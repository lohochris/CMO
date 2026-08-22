import { useEffect } from 'react';
import { AppProvider, useApp } from '../contexts/AppContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Notification } from './components/layout/Notification';
import { Toaster } from './components/ui/sonner';
import { Home } from '../pages/public/Home';
import { About } from '../pages/public/About';
import { Services } from '../pages/public/Services';
import { Login } from '../pages/public/Login';
import { Register } from '../pages/public/Register';
import { PublicGallery } from '../pages/public/PublicGallery';
import { MemberDashboard } from '../pages/dashboard/MemberDashboard';
import { TermsAndConditions } from '../pages/TermsAndConditions';
import { PrivacyPolicy } from '../pages/PrivacyPolicy';
import { VerifyMember } from '../pages/VerifyMember';
import { FinSecDashboard as FinanceDashboard } from '../pages/dashboard/FinSecDashboard';
import { WelfareDashboard } from '../pages/dashboard/WelfareDashboard';
import { TreasurerDashboard } from '../pages/dashboard/TreasurerDashboard';
import { SecretaryDashboard } from '../pages/dashboard/SecretaryDashboard';
import { PRODashboard } from '../pages/dashboard/PRODashboard';
import { ChairmanDashboard } from '../pages/dashboard/ChairmanDashboard';
import FamilyHeadDashboard from '../pages/dashboard/FamilyHeadDashboard';
import FamilySecDashboard from '../pages/dashboard/FamilySecDashboard';
import ProvostDashboard from '../pages/dashboard/ProvostDashboard';
import LiturgistDashboard from '../pages/dashboard/LiturgistDashboard';
import { Megaphone, ShieldCheck } from 'lucide-react';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import {
  FamilyHub,
  FamilyChairmanDashboard,
  FamilySecretaryDashboard,
  FamilyWisdomChairmanDashboard,
  FamilyWisdomSecretaryDashboard,
  FamilyHonourChairmanDashboard,
  FamilyHonourSecretaryDashboard,
  FamilyIntegrityChairmanDashboard,
  FamilyIntegritySecretaryDashboard,
  FamilyTalentChairmanDashboard,
  FamilyTalentSecretaryDashboard,
  FamilyPortal,
} from '../pages/dashboard/FamilyDashboard';

import { CmoAngelChat } from './components/ui/CmoAngelChat';
import { SportsAdminPanel } from '../pages/dashboard/sports/SportsAdminPanel';
import { CoachRosterWorkspace } from '../pages/dashboard/sports/CoachRosterWorkspace';
import { AthleteProfileHub } from '../pages/dashboard/sports/AthleteProfileHub';
import { RefereeMatchCenter } from '../pages/dashboard/sports/RefereeMatchCenter';
import { TournamentStandingsBoard } from '../pages/dashboard/sports/TournamentStandingsBoard';
import { SportsMedicalPortal } from '../pages/dashboard/sports/SportsMedicalPortal';
import { EquipmentInventoryLedger } from '../pages/dashboard/sports/EquipmentInventoryLedger';
import { SportsFinancialHub } from '../pages/dashboard/sports/SportsFinancialHub';
import { SportsHub } from '../pages/dashboard/sports/SportsHub';

const matchFamily = (param: string): import('../types').Family | null => {
  const normalized = param.toLowerCase();
  if (normalized === 'wisdom') return 'Wisdom';
  if (normalized === 'honour') return 'Honour';
  if (normalized === 'integrity') return 'Integrity';
  if (normalized === 'talent') return 'Talent';
  return null;
};

function AppContent() {
  const { currentPage, currentUser, announcements, setError, setCurrentPage, loading } = useApp();

  // Synchronize browser history and pathnames
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/') {
        setCurrentPage('home');
      } else {
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        setCurrentPage(cleanPath as any);
      }
    };
    window.addEventListener('popstate', handlePopState);
    
    // Set initial page from URL path on load
    const initialPath = window.location.pathname;
    if (initialPath !== '/') {
      const cleanPath = initialPath.startsWith('/') ? initialPath.substring(1) : initialPath;
      if (['about', 'services', 'register', 'login', 'dashboard', 'familyHub', 'dashboard/sports', 'terms', 'privacy', 'legal', 'verify'].includes(cleanPath) || cleanPath.startsWith('verify') || cleanPath.startsWith('family/')) {
        if (cleanPath.startsWith('verify')) {
          setCurrentPage('verify' as any);
        } else {
          setCurrentPage(cleanPath as any);
        }
      }
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [setCurrentPage]);

  useEffect(() => {
    const currentUrlPath = window.location.pathname;
    const searchString = window.location.search;
    if (currentPage === 'verify' && currentUrlPath.startsWith('/verify')) {
      return;
    }
    const expectedPath = currentPage === 'home' ? '/' : `/${currentPage}`;
    if (currentUrlPath !== expectedPath) {
      window.history.pushState(null, '', expectedPath);
    }
  }, [currentPage]);

  const activeAnnouncements = announcements.filter((ann) => {
    const expiresAt = ann.expiresAt ? new Date(ann.expiresAt).getTime() : new Date(ann.timestamp).getTime() + 2 * 24 * 60 * 60 * 1000;
    return expiresAt >= Date.now();
  });

  const marqueeText = activeAnnouncements.length > 0
    ? activeAnnouncements.map((ann) => `${ann.title}: ${ann.content}`).join(' • ')
    : 'No active announcements at this time. Stay tuned for updates.';

  // Check if user is Financial Secretary
  const isFinSec = currentUser?.role === 'fin_sec';
  const isPRO = currentUser?.role === 'pro';

  const familyLandingPage = () => {
    if (!currentUser?.family) return null;
    switch (currentUser.family) {
      case 'Wisdom':
        return currentUser.role === 'family_chairman' ? <FamilyWisdomChairmanDashboard /> : <FamilyWisdomSecretaryDashboard />;
      case 'Honour':
        return currentUser.role === 'family_chairman' ? <FamilyHonourChairmanDashboard /> : <FamilyHonourSecretaryDashboard />;
      case 'Integrity':
        return currentUser.role === 'family_chairman' ? <FamilyIntegrityChairmanDashboard /> : <FamilyIntegritySecretaryDashboard />;
      case 'Talent':
        return currentUser.role === 'family_chairman' ? <FamilyTalentChairmanDashboard /> : <FamilyTalentSecretaryDashboard />;
      default:
        return null;
    }
  };

  const renderPage = () => {
    // Public pages
    if (currentPage === 'home') return <Home />;
    if (currentPage === 'about') return <About />;
    if (currentPage === 'services') return <Services />;
    if (currentPage === 'login') return <Login />;
    if (currentPage === 'register') return <Register />;
    if (currentPage === 'verify' || (typeof currentPage === 'string' && currentPage.startsWith('verify'))) return <VerifyMember />;
    if (currentPage === 'terms') return <TermsAndConditions />;
    if (currentPage === 'privacy' || currentPage === 'legal') return <PrivacyPolicy />;

    // 1. Strict route guard and handler for /family/:familyName
    if (currentPage.startsWith('family/')) {
      if (loading) {
        return (
          <div className="flex h-64 items-center justify-center">
            <div className="text-[#ffd700] text-lg font-semibold animate-pulse">
              Verifying security clearance...
            </div>
          </div>
        );
      }

      if (!currentUser) {
        setTimeout(() => setCurrentPage('login'), 10);
        return <Login />;
      }

      const familyParam = currentPage.split('/')[1];
      const normalizedParam = familyParam ? familyParam.toLowerCase() : '';
      const matched = matchFamily(normalizedParam);

      if (!matched) {
        return <Home />;
      }

      const roleLower = currentUser?.role?.toLowerCase();
      const officialId = currentUser?.official_member_id;
      const isGlobalAdmin = ['fin_sec', 'chairman', 'cmo_chairman', 'welfare', 'treasurer', 'gen_sec', 'pro', 'provost', 'liturgist'].includes(roleLower);
      const userFamilyLower = (currentUser?.family || '').toLowerCase();

      if (!isGlobalAdmin && userFamilyLower !== normalizedParam) {
        return (
          <div className="p-4 md:p-8 max-w-2xl mx-auto text-center mt-12 font-sans">
            <Card className="bg-[#002520] border-2 border-red-500/50 p-8 shadow-xl rounded-xl">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
              <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                Access Denied. You are not registered to the <span className="text-[#ffd700] font-semibold">{matched} Family</span>. Please visit your Profile Settings if you need to update your family assignment.
              </p>
              <Button 
                onClick={() => setCurrentPage('dashboard')} 
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold"
              >
                Go to My Dashboard
              </Button>
            </Card>
          </div>
        );
      }

      return <FamilyPortal family={matched} />;
    }

    // Family specific dashboards routing guards
    const isFamilyPage = currentPage.startsWith('family') && 
      !currentPage.startsWith('family/') &&
      currentPage !== 'familyHub' && 
      currentPage !== 'familyChairman' && 
      currentPage !== 'familySecretary';

    if (isFamilyPage) {
      if (loading) {
        return (
          <div className="flex h-64 items-center justify-center">
            <div className="text-[#ffd700] text-lg font-semibold animate-pulse">
              Verifying security clearance...
            </div>
          </div>
        );
      }

      if (!currentUser) {
        setTimeout(() => setCurrentPage('login'), 10);
        return <Login />;
      }

      const roleLower = currentUser?.role?.toLowerCase();
      const officialId = currentUser?.official_member_id;
      const isGlobalAdmin = ['fin_sec', 'chairman', 'cmo_chairman', 'provost', 'liturgist', 'treasurer', 'welfare', 'pro', 'gen_sec', 'secretary'].includes(roleLower || '');

      if (!isGlobalAdmin) {
        let targetFamily = '';
        if (currentPage.includes('Wisdom')) targetFamily = 'Wisdom';
        else if (currentPage.includes('Honour')) targetFamily = 'Honour';
        else if (currentPage.includes('Integrity')) targetFamily = 'Integrity';
        else if (currentPage.includes('Talent')) targetFamily = 'Talent';

        const userFamily = currentUser?.family || '';

        if (userFamily !== targetFamily) {
          setError(`Access Denied. You are a registered member of the ${userFamily ? userFamily + ' Family' : 'no assigned family'} and do not have operational clearance to enter this family portal.`);
          setTimeout(() => setError(''), 6000);
          setTimeout(() => {
            setCurrentPage('dashboard');
          }, 10);
          if (currentUser?.role?.toLowerCase() === 'chairman' || currentUser?.role?.toLowerCase() === 'cmo_chairman') {
            return <ChairmanDashboard />;
          }
          return <MemberDashboard />;
        }
      }
    }

    // Dashboard pages & Executive Routing Guards
    if (
      currentPage === 'dashboard' ||
      currentPage === 'pro' ||
      currentPage === 'welfare' ||
      currentPage === 'treasurer' ||
      currentPage === 'secretary' ||
      currentPage === 'chairman' ||
      currentPage === 'fin_sec' ||
      currentPage === 'provost' ||
      currentPage === 'liturgist' ||
      currentPage === 'familyChairman' ||
      currentPage === 'familySecretary'
    ) {
      if (!currentUser) {
        setTimeout(() => setCurrentPage('login'), 10);
        return <Login />;
      }

      const officialId = currentUser.official_member_id || currentUser.id;
      const userRole = (currentUser.role || 'member').toLowerCase().trim();

      // Explicit route access control when a specific executive route is requested
      if (currentPage === 'chairman') {
        if (!['chairman', 'cmo_chairman', 'super_admin', 'executive'].includes(userRole)) {
          setError(`Access Denied: You (${currentUser.full_name || 'Member'}) do not hold executive clearance for Chairman Office.`);
          setTimeout(() => setCurrentPage('dashboard'), 10);
          return <MemberDashboard />;
        }
        return <ChairmanDashboard />;
      }

      if (currentPage === 'fin_sec') {
        if (!['fin_sec', 'financial_secretary', 'super_admin', 'executive'].includes(userRole)) {
          setError(`Access Denied: You (${currentUser.full_name || 'Member'}) do not hold executive clearance for Financial Secretary Office.`);
          setTimeout(() => setCurrentPage('dashboard'), 10);
          return <MemberDashboard />;
        }
        return <FinanceDashboard />;
      }

      if (currentPage === 'secretary') {
        if (!['gen_sec', 'secretary', 'general_secretary', 'super_admin', 'executive'].includes(userRole)) {
          setError(`Access Denied: You (${currentUser.full_name || 'Member'}) do not hold executive clearance for General Secretary Office.`);
          setTimeout(() => setCurrentPage('dashboard'), 10);
          return <MemberDashboard />;
        }
        return <SecretaryDashboard />;
      }

      if (currentPage === 'treasurer') {
        if (!['treasurer', 'super_admin', 'executive'].includes(userRole)) {
          setError(`Access Denied: You (${currentUser.full_name || 'Member'}) do not hold executive clearance for Treasury Office.`);
          setTimeout(() => setCurrentPage('dashboard'), 10);
          return <MemberDashboard />;
        }
        if (officialId === 'HCC-CMO-SPRT-TR') return <SportsFinancialHub />;
        return <TreasurerDashboard />;
      }

      if (currentPage === 'welfare') {
        if (!['welfare', 'welfare_officer', 'super_admin', 'executive'].includes(userRole)) {
          setError(`Access Denied: You (${currentUser.full_name || 'Member'}) do not hold executive clearance for Welfare Office.`);
          setTimeout(() => setCurrentPage('dashboard'), 10);
          return <MemberDashboard />;
        }
        return <WelfareDashboard />;
      }

      if (currentPage === 'pro') {
        if (!['pro', 'public_relations_officer', 'super_admin', 'executive'].includes(userRole)) {
          setError(`Access Denied: You (${currentUser.full_name || 'Member'}) do not hold executive clearance for PRO Office.`);
          setTimeout(() => setCurrentPage('dashboard'), 10);
          return <MemberDashboard />;
        }
        return <PRODashboard />;
      }

      if (currentPage === 'provost') {
        if (!['provost', 'provost_marshall', 'super_admin', 'executive'].includes(userRole)) {
          setError(`Access Denied: You (${currentUser.full_name || 'Member'}) do not hold executive clearance for Provost Office.`);
          setTimeout(() => setCurrentPage('dashboard'), 10);
          return <MemberDashboard />;
        }
        return <ProvostDashboard />;
      }

      if (currentPage === 'liturgist') {
        if (!['liturgist', 'super_admin', 'executive'].includes(userRole)) {
          setError(`Access Denied: You (${currentUser.full_name || 'Member'}) do not hold executive clearance for Liturgical Team.`);
          setTimeout(() => setCurrentPage('dashboard'), 10);
          return <MemberDashboard />;
        }
        return <LiturgistDashboard />;
      }

      if (currentPage === 'familyChairman') {
        if (!['family_chairman', 'family_head', 'chairman', 'cmo_chairman', 'super_admin', 'executive'].includes(userRole)) {
          setError(`Access Denied: You (${currentUser.full_name || 'Member'}) do not hold clearance for Family Head Portal.`);
          setTimeout(() => setCurrentPage('dashboard'), 10);
          return <MemberDashboard />;
        }
        return <FamilyHeadDashboard />;
      }

      if (currentPage === 'familySecretary') {
        if (!['family_secretary', 'family_sec', 'gen_sec', 'secretary', 'super_admin', 'executive'].includes(userRole)) {
          setError(`Access Denied: You (${currentUser.full_name || 'Member'}) do not hold clearance for Family Secretary Portal.`);
          setTimeout(() => setCurrentPage('dashboard'), 10);
          return <MemberDashboard />;
        }
        return <FamilySecDashboard />;
      }

      // Default 'dashboard' route: Render workspace matching user's logged-in role
      if (userRole === 'family_chairman' || userRole === 'family_head') return <FamilyHeadDashboard />;
      if (userRole === 'family_secretary' || userRole === 'family_sec') return <FamilySecDashboard />;
      if (userRole === 'liturgist') return <LiturgistDashboard />;
      if (userRole === 'provost') return <ProvostDashboard />;
      if (userRole === 'pro') return <PRODashboard />;
      if (userRole === 'welfare') return <WelfareDashboard />;
      if (userRole === 'treasurer' && officialId !== 'HCC-CMO-SPRT-TR') return <TreasurerDashboard />;
      if (userRole === 'treasurer' && officialId === 'HCC-CMO-SPRT-TR') return <SportsFinancialHub />;
      if (userRole === 'gen_sec' || userRole === 'secretary') return <SecretaryDashboard />;
      if (userRole === 'fin_sec' || userRole === 'financial_secretary') return <FinanceDashboard />;
      if (userRole === 'chairman' || userRole === 'cmo_chairman') return <ChairmanDashboard />;
      if (userRole === 'sports_director') return <SportsAdminPanel />;
      if (userRole === 'coach') return <CoachRosterWorkspace />;
      if (userRole === 'referee') return <RefereeMatchCenter />;
      if (userRole === 'athlete') return <AthleteProfileHub />;
      if (userRole === 'medical_officer') return <SportsMedicalPortal />;

      // Fallback for standard organization members
      return <MemberDashboard />;
    }

    // Sports department routing with route guards
    if (
      currentPage === 'dashboard/sports' ||
      currentPage === 'sports_admin' ||
      currentPage === 'coach_workspace' ||
      currentPage === 'athlete_hub' ||
      currentPage === 'referee_center' ||
      currentPage === 'standings_board' ||
      currentPage === 'medical_portal' ||
      currentPage === 'equipment_ledger' ||
      currentPage === 'sports_finance'
    ) {
      if (!currentUser) { setTimeout(() => setCurrentPage('login'), 10); return <Login />; }

      const userRole = (currentUser.role || 'member').toLowerCase().trim();
      if (userRole === 'member' || userRole === 'member_active') {
        setError(`Access Denied: General Member account (${currentUser.full_name || 'Member'}) does not hold clearance for Sports Department Workspaces.`);
        setTimeout(() => setCurrentPage('dashboard'), 10);
        return <MemberDashboard />;
      }

      if (currentPage === 'sports_admin' && typeof window !== 'undefined') {
        sessionStorage.setItem('sports_hub_active_tab', 'admin');
      } else if ((currentPage === 'coach_workspace' || currentPage === 'referee_center') && typeof window !== 'undefined') {
        sessionStorage.setItem('sports_hub_active_tab', 'rosters');
      } else if ((currentPage === 'athlete_hub' || currentPage === 'standings_board') && typeof window !== 'undefined') {
        sessionStorage.setItem('sports_hub_active_tab', 'overview');
      } else if (currentPage === 'medical_portal' && typeof window !== 'undefined') {
        sessionStorage.setItem('sports_hub_active_tab', 'medical');
      } else if (currentPage === 'equipment_ledger' && typeof window !== 'undefined') {
        sessionStorage.setItem('sports_hub_active_tab', 'equipment');
      } else if (currentPage === 'sports_finance' && typeof window !== 'undefined') {
        sessionStorage.setItem('sports_hub_active_tab', 'financial');
      }

      return <SportsHub />;
    }
    if (currentPage === 'familyHub') return <FamilyHub />;
    if ((currentPage as string) === 'familyChairman' || currentPage === 'familyWisdomChairman' || currentPage === 'familyHonourChairman' || currentPage === 'familyIntegrityChairman' || currentPage === 'familyTalentChairman') return <FamilyHeadDashboard />;
    if ((currentPage as string) === 'familySecretary' || currentPage === 'familyWisdomSecretary' || currentPage === 'familyHonourSecretary' || currentPage === 'familyIntegritySecretary' || currentPage === 'familyTalentSecretary') return <FamilySecDashboard />;

    if (currentPage === 'publicGallery') return <PublicGallery />;

    return <Home />;
  };

  return (
    <div className="min-h-screen bg-[#001a16]">
      <Header />
      <div className="sticky top-0 z-40 border-b border-[#ffd700]/10 bg-[#002520]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm text-[#ffd700] md:px-8">
          <Megaphone className="h-4 w-4 shrink-0" />
          <div className="relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-6 before:bg-gradient-to-r before:from-[#002520]/100 before:to-transparent after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-l after:from-[#002520]/100 after:to-transparent">
            <div className="whitespace-nowrap text-sm text-[#ffd700] animate-marquee">
              {marqueeText}
            </div>
          </div>
        </div>
      </div>
      <Notification />
      <main className="min-h-[calc(100vh-200px)]">
        {renderPage()}
      </main>
      <CmoAngelChat />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster />
    </AppProvider>
  );
}