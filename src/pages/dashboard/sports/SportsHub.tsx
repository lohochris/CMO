import { useState } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Card } from '../../../app/components/ui/card';
import { Heading } from '../../../app/components/common/Heading';
import {
  Trophy,
  Users,
  Package,
  Heart,
  DollarSign,
  ShieldCheck,
  Lock,
  ArrowLeft
} from 'lucide-react';

import { TournamentStandingsBoard } from './TournamentStandingsBoard';
import { AthleteProfileHub } from './AthleteProfileHub';
import { CoachRosterWorkspace } from './CoachRosterWorkspace';
import { RefereeMatchCenter } from './RefereeMatchCenter';
import { EquipmentInventoryLedger } from './EquipmentInventoryLedger';
import { SportsMedicalPortal } from './SportsMedicalPortal';
import { SportsFinancialHub } from './SportsFinancialHub';
import { SportsAdminPanel } from './SportsAdminPanel';

export const SportsHub = () => {
  const { currentUser, setCurrentPage } = useApp();

  // Helper function to resolve default tab based on user credentials
  const getDefaultTab = () => {
    if (!currentUser) return 'overview';
    const role = currentUser.role?.toLowerCase();
    const officialId = (currentUser.official_member_id || currentUser.id || '').toUpperCase();

    if (officialId === 'HCC-CMO-SPRT-TR' || role === 'sports_treasurer' || role === 'treasurer') {
      return 'financial';
    }
    if (role === 'sports_director' || officialId === 'HCC-CMO-SPRT-DIR') {
      return 'admin';
    }
    if (role === 'coach' || officialId === 'HCC-CMO-SPRT-COACH') {
      return 'rosters';
    }
    if (role === 'referee' || officialId === 'HCC-CMO-SPRT-REF') {
      return 'rosters';
    }
    if (role === 'medical_officer' || officialId === 'HCC-CMO-SPRT-MED') {
      return 'medical';
    }
    return 'overview';
  };

  // State initialization with session fallback
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('sports_hub_active_tab');
      if (savedTab) {
        sessionStorage.removeItem('sports_hub_active_tab');
        return savedTab;
      }
    }
    return getDefaultTab();
  });

  // Access check helpers
  const hasFinanceAccess = (() => {
    if (!currentUser) return false;
    const role = currentUser.role?.toUpperCase();
    const officialId = (currentUser.official_member_id || currentUser.id || '').toUpperCase();
    const allowed = [
      'HCC-CMO-EXEC-TR',
      'HCC-CMO-EXEC-FS',
      'HCC-CMO-SPRT-TR',
      'HCC-CMO-SPRT-FS',
      'HCC-CMO-SPRT-DIR',
      'TREASURER',
      'SPORTS_TREASURER',
      'FINANCIAL_SECRETARY'
    ];
    return (
      allowed.includes(officialId) ||
      allowed.includes(role || '') ||
      role === 'SPORTS_DIRECTOR' ||
      role === 'FIN_SEC' ||
      role === 'CHAIRMAN' ||
      role === 'CMO_CHAIRMAN'
    );
  })();

  const hasAdminAccess = (() => {
    if (!currentUser) return false;
    const role = currentUser.role?.toUpperCase();
    const officialId = (currentUser.official_member_id || currentUser.id || '').toUpperCase();
    const allowed = [
      'HCC-CMO-SPRT-DIR',
      'CMO-CHAIRMAN-2026',
      'HCC-CMO-EXEC-CH'
    ];
    return (
      allowed.includes(officialId) ||
      allowed.includes(role || '') ||
      role === 'SPORTS_DIRECTOR' ||
      role === 'CHAIRMAN' ||
      role === 'CMO_CHAIRMAN'
    );
  })();

  // Render Access Guard screen
  const renderAccessRestricted = (message: string) => (
    <div className="flex min-h-[40vh] items-center justify-center p-8 animate-in fade-in duration-200">
      <Card className="max-w-md w-full bg-[#002520] border border-red-500/30 p-8 text-center rounded-2xl shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-red-400 mb-2">Access Restricted</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
      </Card>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview & Standings', icon: Trophy, isRestricted: false },
    { id: 'rosters', label: 'Rosters & Matches', icon: Users, isRestricted: false },
    { id: 'equipment', label: 'Equipment & Inventory', icon: Package, isRestricted: false },
    { id: 'medical', label: 'Medical Portal', icon: Heart, isRestricted: false },
    { id: 'financial', label: 'Sports Financial Hub', icon: DollarSign, isRestricted: true, hasAccess: hasFinanceAccess },
    { id: 'admin', label: 'Admin Panel', icon: ShieldCheck, isRestricted: true, hasAccess: hasAdminAccess },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 font-sans min-h-[85vh]">
      {/* Back Button */}
      <button
        onClick={() => setCurrentPage('home')}
        className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-semibold transition-colors cursor-pointer text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Main Portal
      </button>

      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-[#002520] via-[#001a16] to-[#002520] border-2 border-[#ffd700]/20 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#ffd700]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700] px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              Sports Department Hub
            </div>
            <Heading level={1} className="tracking-tight text-white font-extrabold text-2xl md:text-3xl">
              Centralized Sports Workspace
            </Heading>
            <p className="text-sm text-gray-400 max-w-xl">
              Manage tournaments, schedule matches, organize coach rosters, verify player medical logs, and audit ledgers.
            </p>
          </div>
          {currentUser && (
            <Card className="bg-[#001411] border border-[#ffd700]/10 px-5 py-4 rounded-2xl shadow-lg shrink-0 max-w-xs">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Active Session</p>
              <h4 className="text-white font-bold text-sm mt-0.5 truncate">{currentUser.name || currentUser.full_name}</h4>
              <p className="text-xs text-[#ffd700]/90 font-mono mt-1 font-semibold truncate">
                ID: {currentUser.official_member_id || currentUser.id || 'Member'}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Horizontal Premium Tabs Container */}
      <div className="flex border-b border-white/10 overflow-x-auto scrollbar-none gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isLocked = tab.isRestricted && !tab.hasAccess;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/5 shadow-sm'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#ffd700]' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
              {isLocked && <Lock className="w-3.5 h-3.5 text-red-400/70" />}
            </button>
          );
        })}
      </div>

      {/* Workspace Display Area */}
      <div className="mt-4 transition-all duration-200">
        {activeTab === 'overview' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TournamentStandingsBoard />
            <AthleteProfileHub />
          </div>
        )}

        {activeTab === 'rosters' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CoachRosterWorkspace />
            <RefereeMatchCenter />
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <EquipmentInventoryLedger />
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SportsMedicalPortal />
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {hasFinanceAccess ? (
              <SportsFinancialHub />
            ) : (
              renderAccessRestricted('The Sports Financial Hub is restricted to Sports Treasurers, Financial Secretaries, and executive administration.')
            )}
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {hasAdminAccess ? (
              <SportsAdminPanel />
            ) : (
              renderAccessRestricted('This panel is reserved for the Sports Director and authorized executive administration.')
            )}
          </div>
        )}
      </div>
    </div>
  );
};
