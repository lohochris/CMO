import React, { useState } from 'react';
import {
  ShieldCheck,
  Landmark,
  Users,
  Mic,
  Trophy,
  Activity,
  FileCheck,
  CreditCard,
  Cpu,
  Database,
  Lock,
  Scale,
  Sparkles,
  BookOpen,
  Bot,
  Layers,
  Award,
  Stethoscope,
  FileText,
  BadgeAlert,
  UserCheck,
  DollarSign
} from 'lucide-react';

export const Services: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'portals' | 'finance' | 'ai' | 'sports'>('all');

  const executiveRoles = [
    {
      title: 'Executive Chairman',
      tag: 'Executive Leadership',
      icon: ShieldCheck,
      desc: 'Strategic executive oversight, Section I 2-of-3 disbursement authorization, constitutional policy governance, and general assembly leadership.'
    },
    {
      title: 'Financial Secretary',
      tag: 'Financial Operations',
      icon: CreditCard,
      desc: 'Master dues & levy ledger management, CSV transaction batch ingestion, member statement generation, and lodgment auditing.'
    },
    {
      title: 'Treasurer',
      tag: 'Vault & Signatory',
      icon: Landmark,
      desc: 'Section I signatory verification, bank vault reconciliation, cash flow disbursements, and financial statement audits.'
    },
    {
      title: 'Provost Marshall',
      tag: 'Disciplinary Officer',
      icon: Scale,
      desc: 'Section L penalty enforcement, automated roll call lateness (₦50) and absence (₦200/₦300) fine calculations, and meeting decorum.'
    },
    {
      title: 'General Secretary',
      tag: 'Administrative Secretariat',
      icon: FileText,
      desc: 'Official minute logging, floor motion extraction, attendance registers, and organizational correspondence.'
    },
    {
      title: 'Welfare Officer',
      tag: 'Welfare & Care',
      icon: Users,
      desc: 'Section K welfare claim auditing, capped benefit disbursements (₦50k bereavement, ₦20k surgery/wedding, ₦10k naming), and member visitation logs.'
    },
    {
      title: 'Public Relations Officer (PRO)',
      tag: 'Communications',
      icon: Activity,
      desc: 'Broadcast announcement dispatch, public portal press releases, event publicity, and digital community engagement.'
    },
    {
      title: 'Liturgist',
      tag: 'Spiritual Life',
      icon: BookOpen,
      desc: 'Spiritual schedule assignment, liturgical mass roster coordination, monthly novena planning, and Catholic doctrine alignment.'
    },
    {
      title: 'Family Heads (4 Families)',
      tag: 'Unit Governance',
      icon: UserCheck,
      desc: 'Wisdom, Honour, Integrity & Talent family unit leadership, monthly unit meeting management, and membership audits.'
    },
    {
      title: 'Family Secretaries',
      tag: 'Unit Operations',
      icon: FileCheck,
      desc: 'Family unit meeting logs, dues collection records, unit attendance reporting, and executive liaison.'
    },
    {
      title: 'Spiritual Adviser / Patron',
      tag: 'Pastoral Guidance',
      icon: Award,
      desc: 'Pastoral counsel, constitutional compliance oversight, spiritual direction, and read-only audit log access.'
    },
    {
      title: 'Sports Administrator',
      tag: 'Athletics & Games',
      icon: Trophy,
      desc: 'Inter-family tournament scheduling, referee match assignments, athlete roster registry, and sports equipment ledger.'
    },
    {
      title: 'General Member',
      tag: 'Member Portal',
      icon: Layers,
      desc: 'Personal financial ledger history, excuse request submissions, sports portal access, and embedded 2023 Bye-Laws & Constitution viewer.'
    }
  ];

  const sportsModules = [
    { title: 'Tournament Standings & Points Table', icon: Trophy, desc: 'Real-time standings, goal difference tracking, points system, and match history logs.' },
    { title: 'Referee Match Center', icon: UserCheck, desc: 'Official match controller, live score logging, yellow/red card records, and referee match reports.' },
    { title: 'Athlete Profile Hub', icon: Users, desc: 'Verified family athlete profiles, eligibility badges, jersey number allocations, and position records.' },
    { title: 'Coach Roster Workspace', icon: FileCheck, desc: 'Tactical squad lineups, substitution management, match strategy notes, and family team rosters.' },
    { title: 'Sports Financial Hub & Treasury', icon: DollarSign, desc: 'Dedicated sports fund accounting, tournament entry fee logs, and sponsor contribution tracking.' },
    { title: 'Equipment Inventory Ledger', icon: Database, desc: 'Inventory tracking for jerseys, balls, trophies, medical kits, and pitch maintenance gear.' },
    { title: 'Sports Medical Portal', icon: Stethoscope, desc: 'Match injury records, clearance tracking, player health status, and emergency contacts.' },
    { title: 'Tournament Fixture Generator', icon: Activity, desc: 'Automated round-robin & knockout fixture scheduling, pitch allocation, and kickoff timers.' },
    { title: 'Disciplinary & Card Tracker', icon: BadgeAlert, desc: 'Suspension rules, yellow card accumulators, red card fines, and fair-play leaderboards.' },
    { title: 'Audit & Read-Only Governance View', icon: ShieldCheck, desc: 'Comprehensive sports audit logs, match official verification, and transparent score archives.' }
  ];

  return (
    <div className="min-h-screen bg-[#021B13] text-emerald-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* Hero Header Section                                           */}
        {/* ───────────────────────────────────────────────────────────── */}
        <header className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-6 max-w-4xl">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <Cpu className="w-4 h-4 text-emerald-400" />
              ENTERPRISE DIGITAL INFRASTRUCTURE
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
              Comprehensive Platform Architecture & Services
            </h1>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
              An enterprise-grade digital governance ecosystem engineered for Holy Cross CMO, featuring multi-executive role isolation, automated banking ledgers, AI meeting minutes, and sports administration.
            </p>

            {/* Platform Capability Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-emerald-800/40">
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40">
                <span className="text-yellow-400 font-bold text-2xl block">13</span>
                <span className="text-slate-300 text-xs font-medium">Executive Dashboards</span>
              </div>
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40">
                <span className="text-emerald-400 font-bold text-2xl block">2-of-3</span>
                <span className="text-slate-300 text-xs font-medium">Section I Signatories</span>
              </div>
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40">
                <span className="text-yellow-400 font-bold text-2xl block">AI Speech</span>
                <span className="text-slate-300 text-xs font-medium">Dictation & RAG</span>
              </div>
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40">
                <span className="text-emerald-400 font-bold text-2xl block">10</span>
                <span className="text-slate-300 text-xs font-medium">Sports Suite Modules</span>
              </div>
            </div>
          </div>
        </header>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Category Navigation Bar                                       */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'all', label: 'All Architecture Pillars', icon: Layers },
            { id: 'portals', label: '13 Executive Dashboards', icon: Users },
            { id: 'finance', label: 'Banking & Financial Engine', icon: Landmark },
            { id: 'ai', label: 'AI Speech & RAG Engine', icon: Mic },
            { id: 'sports', label: '10-Module Sports Suite', icon: Trophy }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-yellow-400 text-slate-950 shadow-lg scale-[1.02]'
                    : 'bg-[#04281D]/90 text-slate-300 hover:text-white hover:bg-[#04281D] border border-emerald-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Pillar 1: Executive Multi-Portal Ecosystem (13 Role Dashboards) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'portals') && (
          <section className="space-y-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
                <Users className="w-3.5 h-3.5" />
                PILLAR I
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
                Executive Multi-Portal Ecosystem (13 Role Dashboards)
              </h2>
              <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
                Role-isolated dashboards ensuring secure, compartmentalized administrative authority for elected executive officers and member units.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {executiveRoles.map((role, idx) => {
                const RoleIcon = role.icon;
                return (
                  <div
                    key={idx}
                    className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-3 bg-[#02110D] text-yellow-400 rounded-xl border border-emerald-800/40">
                          <RoleIcon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                          {role.tag}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5">
                        {role.title}
                      </h3>
                      <p className="text-sm text-slate-200 leading-relaxed mt-2">{role.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Pillar 2: Constitutional Financial & Banking Engine            */}
        {/* ───────────────────────────────────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'finance') && (
          <section className="space-y-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
                <Landmark className="w-3.5 h-3.5" />
                PILLAR II
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
                Constitutional Financial & Banking Engine
              </h2>
              <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
                Automated treasury controls enforcing multi-signature authorization, lodgment auditing, penalty calculations, and welfare caps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Section I Signatory Deck */}
              <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-yellow-400" /> Section I Signatory Deck
                  </h3>
                  <span className="text-xs font-mono font-bold bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded border border-yellow-500/30">2-of-3 Threshold</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed mt-2">
                  Strict multi-signature authorization protocol requiring mandatory approval from at least two (2) designated executive signatories (Chairman, Treasurer, Parish Priest) prior to cash vault disbursement.
                </p>
                <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 flex justify-around text-center text-xs">
                  <div>
                    <span className="block text-white font-bold">Executive Chairman</span>
                    <span className="text-emerald-400 text-xs font-medium">Primary Signatory</span>
                  </div>
                  <div className="text-slate-500">+</div>
                  <div>
                    <span className="block text-white font-bold">Treasurer</span>
                    <span className="text-emerald-400 text-xs font-medium">Primary Signatory</span>
                  </div>
                  <div className="text-slate-500">+</div>
                  <div>
                    <span className="block text-white font-bold">Parish Priest</span>
                    <span className="text-yellow-400 text-xs font-medium">Patron Overseer</span>
                  </div>
                </div>
              </div>

              {/* Section D(6) Bank Lodgments */}
              <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5">
                    <CreditCard className="w-5 h-5 text-emerald-400" /> Section D(6) Bank Lodgments
                  </h3>
                  <span className="text-xs font-mono font-bold bg-emerald-950/60 text-emerald-400 px-3 py-1 rounded border border-emerald-500/30">Proof Audit</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed mt-2">
                  Real-time bank deposit verification deck allowing the Financial Secretary to log, verify, and attach bank teller receipts directly to member financial ledgers.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-3 bg-[#02110D] rounded-xl border border-emerald-800/40">
                    <span className="text-slate-300">Lodgment Verification</span>
                    <span className="text-emerald-400 font-mono font-bold">Automated Audit</span>
                  </div>
                  <div className="flex justify-between p-3 bg-[#02110D] rounded-xl border border-emerald-800/40">
                    <span className="text-slate-300">Bank Teller Attachments</span>
                    <span className="text-yellow-400 font-mono font-bold">Digital Storage</span>
                  </div>
                </div>
              </div>

              {/* Section L Penalty Engine */}
              <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5">
                    <Scale className="w-5 h-5 text-red-400" /> Section L Penalty Engine
                  </h3>
                  <span className="text-xs font-mono font-bold bg-red-950/60 text-red-400 px-3 py-1 rounded border border-red-500/30">Automated Fines</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed mt-2">
                  Automated roll-call ledger linked to the Provost module. Computes exact fines immediately upon attendance marking.
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-[#02110D] rounded-xl border border-emerald-800/40">
                    <span className="text-slate-300 block text-xs font-medium">Lateness</span>
                    <span className="text-white font-mono font-bold text-sm">₦50</span>
                  </div>
                  <div className="p-3 bg-[#02110D] rounded-xl border border-emerald-800/40">
                    <span className="text-slate-300 block text-xs font-medium">Member Absence</span>
                    <span className="text-white font-mono font-bold text-sm">₦200</span>
                  </div>
                  <div className="p-3 bg-[#02110D] rounded-xl border border-emerald-800/40">
                    <span className="text-slate-300 block text-xs font-medium">Exec Absence</span>
                    <span className="text-white font-mono font-bold text-sm">₦300</span>
                  </div>
                </div>
              </div>

              {/* Section K Welfare Audit */}
              <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5">
                    <FileCheck className="w-5 h-5 text-emerald-400" /> Section K Welfare Audit
                  </h3>
                  <span className="text-xs font-mono font-bold bg-emerald-950/60 text-emerald-400 px-3 py-1 rounded border border-emerald-500/30">Capped Benefits</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed mt-2">
                  Automated welfare benefit cap validation enforcing constitutional payout limits and prior-notice verification.
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-[#02110D] rounded-xl border border-emerald-800/40">
                    <span className="text-slate-300 block text-xs font-medium">Bereavement</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">₦50k</span>
                  </div>
                  <div className="p-3 bg-[#02110D] rounded-xl border border-emerald-800/40">
                    <span className="text-slate-300 block text-xs font-medium">Surgery / Wedding</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">₦20k</span>
                  </div>
                  <div className="p-3 bg-[#02110D] rounded-xl border border-emerald-800/40">
                    <span className="text-slate-300 block text-xs font-medium">Naming</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">₦10k</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Pillar 3: AI Speech Listener & RAG Engine                     */}
        {/* ───────────────────────────────────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'ai') && (
          <section className="space-y-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
                <Mic className="w-3.5 h-3.5" />
                PILLAR III
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
                AI Speech Listener & RAG Engine
              </h2>
              <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
                Integrated Web Speech API dictation streaming and Retrieval-Augmented Generation for general assembly governance.
              </p>
            </div>

            <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5">
                    <Mic className="w-5 h-5 text-emerald-400" /> Live Web Speech Dictation
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed mt-2">
                    Real-time microphone stream capturing floor deliberations during general assembly meetings with high accuracy.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5">
                    <Bot className="w-5 h-5 text-yellow-400" /> Automated Motion Extraction
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed mt-2">
                    Natural language processing automatically isolates floor motions, seconders, key resolutions, and action items.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5">
                    <Database className="w-5 h-5 text-emerald-400" /> Constitutional RAG Search
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed mt-2">
                    Retrieval-Augmented Generation indexing the 2023 Constitution to answer instant governance queries during debates.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Pillar 4: 10-Module Inter-Family Sports Suite                  */}
        {/* ───────────────────────────────────────────────────────────── */}
        {(activeTab === 'all' || activeTab === 'sports') && (
          <section className="space-y-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
                <Trophy className="w-3.5 h-3.5" />
                PILLAR IV
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
                10-Module Inter-Family Sports Suite
              </h2>
              <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
                Comprehensive athletics management suite governing inter-family tournaments, player rosters, and match officiating.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sportsModules.map((module, idx) => {
                const ModuleIcon = module.icon;
                return (
                  <div
                    key={idx}
                    className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-3 bg-[#02110D] text-yellow-400 rounded-xl border border-emerald-800/40">
                          <ModuleIcon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-mono font-semibold text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded border border-yellow-500/30">
                          Module {idx + 1}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5">
                        {module.title}
                      </h3>
                      <p className="text-sm text-slate-200 leading-relaxed mt-2">{module.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};