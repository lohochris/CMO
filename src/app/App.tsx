import { AppProvider, useApp } from '../contexts/AppContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Notification } from './components/layout/Notification';
import { Home } from '../pages/public/Home';
import { About } from '../pages/public/About';
import { Services } from '../pages/public/Services';
import { Login } from '../pages/public/Login';
import { Register } from '../pages/public/Register';
import { MemberDashboard } from '../pages/dashboard/MemberDashboard';
import { FinSecDashboard } from '../pages/dashboard/FinSecDashboard';
import { WelfareDashboard } from '../pages/dashboard/WelfareDashboard';
import { TreasurerDashboard } from '../pages/dashboard/TreasurerDashboard';
import { SecretaryDashboard } from '../pages/dashboard/SecretaryDashboard';
import { PRODashboard } from '../pages/dashboard/PRODashboard';
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

function AppContent() {
  const { currentPage, currentUser, announcements } = useApp();

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

    // Dashboard pages
    if (currentPage === 'dashboard') {
      if (isFinSec) return <FinSecDashboard />;
      if (isPRO) return <PRODashboard />;
      if (currentUser?.role === 'family_chairman' || currentUser?.role === 'family_secretary') {
        return familyLandingPage() || <FamilyHub />;
      }
      return <MemberDashboard />;
    }
    if (currentPage === 'pro') return <PRODashboard />;
    if (currentPage === 'welfare') return <WelfareDashboard />;
    if (currentPage === 'treasurer') return <TreasurerDashboard />;
    if (currentPage === 'secretary') return <SecretaryDashboard />;
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
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}