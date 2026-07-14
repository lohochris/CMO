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
import { MemberDashboard } from '../pages/dashboard/MemberDashboard';
import { FinSecDashboard as FinanceDashboard } from '../pages/dashboard/FinSecDashboard';
import { WelfareDashboard } from '../pages/dashboard/WelfareDashboard';
import { TreasurerDashboard } from '../pages/dashboard/TreasurerDashboard';
import { SecretaryDashboard } from '../pages/dashboard/SecretaryDashboard';
import { PRODashboard } from '../pages/dashboard/PRODashboard';
import { ChairmanDashboard } from '../pages/dashboard/ChairmanDashboard';
import { Megaphone } from 'lucide-react';
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
} from '../pages/dashboard/FamilyDashboard';

import { CmoAngelChat } from './components/ui/CmoAngelChat';

function AppContent() {
  const { currentPage, currentUser, announcements, setError, setCurrentPage, loading } = useApp();

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
    // Family specific dashboards routing guards
    const isFamilyPage = currentPage.startsWith('family') && 
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
      const isGlobalAdmin = roleLower === 'fin_sec' || 
                            roleLower === 'chairman' || 
                            roleLower === 'cmo_chairman';

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
          return <MemberDashboard />;
        }
      }
    }
    // Public pages
    if (currentPage === 'home') return <Home />;
    if (currentPage === 'about') return <About />;
    if (currentPage === 'services') return <Services />;
    if (currentPage === 'login') return <Login />;
    if (currentPage === 'register') return <Register />;

    // Dashboard pages & Admin Routing Overhaul
    if (
      currentPage === 'dashboard' ||
      currentPage === 'pro' ||
      currentPage === 'welfare' ||
      currentPage === 'treasurer' ||
      currentPage === 'secretary' ||
      currentPage === 'chairman' ||
      currentPage === 'fin_sec'
    ) {
      // Dashboard routing — driven exclusively by role (single source of truth).
      // The login handler resolves all canonical IDs to a full Member object with
      // the correct role set, so ID-string checks here are redundant and fragile.
      const userRole = currentUser?.role?.toLowerCase();

      if (userRole === 'fin_sec' || userRole === 'financial_secretary') return <FinanceDashboard />;
      if (userRole === 'welfare')          return <WelfareDashboard />;
      if (userRole === 'treasurer')        return <TreasurerDashboard />;
      if (userRole === 'cmo_chairman' || userRole === 'chairman') {
        return <ChairmanDashboard />;
      }
      if (userRole === 'pro')              return <PRODashboard />;
      if (userRole === 'gen_sec' || userRole === 'secretary') return <SecretaryDashboard />;
      if (userRole === 'family_chairman' || userRole === 'family_secretary') {
        return familyLandingPage() || <FamilyHub />;
      }

      // Fallback for standard organization members
      return <MemberDashboard />;
    }
    if (currentPage === 'familyHub') return <FamilyHub />;
    if (currentPage === 'familyChairman') return <FamilyChairmanDashboard />;
    if (currentPage === 'familySecretary') return <FamilySecretaryDashboard />;
    if (currentPage === 'familyWisdomChairman') return <FamilyWisdomChairmanDashboard />;
    if (currentPage === 'familyWisdomSecretary') return <FamilyWisdomSecretaryDashboard />;
    if (currentPage === 'familyHonourChairman') return <FamilyHonourChairmanDashboard />;
    if (currentPage === 'familyHonourSecretary') return <FamilyHonourSecretaryDashboard />;
    if (currentPage === 'familyIntegrityChairman') return <FamilyIntegrityChairmanDashboard />;
    if (currentPage === 'familyIntegritySecretary') return <FamilyIntegritySecretaryDashboard />;
    if (currentPage === 'familyTalentChairman') return <FamilyTalentChairmanDashboard />;
    if (currentPage === 'familyTalentSecretary') return <FamilyTalentSecretaryDashboard />;

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