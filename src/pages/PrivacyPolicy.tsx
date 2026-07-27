import React from 'react';
import { useApp } from '../contexts/AppContext';
import { ShieldCheck, Lock, FileText, Building, ArrowLeft, Code2, ExternalLink, Sparkles } from 'lucide-react';
import { CMO_CONSTITUTION_2023 } from '../config/cmoConstitution';

export const PrivacyPolicy: React.FC = () => {
  const { setCurrentPage, currentUser } = useApp();

  const handleBackNavigation = () => {
    if (currentUser) {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('home');
    }
  };

  return (
    <div className="min-h-screen bg-[#021B13] text-emerald-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-slate-950">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Top Header Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleBackNavigation}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#04281D] border border-emerald-800/40 text-slate-200 hover:text-white hover:border-yellow-500/50 transition-all text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            {currentUser ? 'Back to Dashboard' : 'Back to Home'}
          </button>
        </div>

        {/* Hero Section */}
        <header className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4 max-w-4xl">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              DATA PRIVACY & PROTECTION
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
              Privacy & Data Protection Policy
            </h1>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
              How we secure, protect, and handle member profile data, financial records, and meeting audio transcriptions under the 2023 CMO Bye-Laws.
            </p>
          </div>
        </header>

        {/* Structured Legal Cards */}
        <div className="space-y-6">
          {/* Card 1: Data We Collect */}
          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
              <FileText className="w-5 h-5 text-emerald-400" /> 1. Data We Collect
            </h2>
            <div className="text-sm text-slate-200 leading-relaxed space-y-2">
              <p>
                The Holy Cross CMO Management Portal collects data strictly necessary for organizational governance, financial accounting, and inter-family sports administration under the <strong className="text-yellow-400">Official 2023 CMO Bye-Laws</strong> of {CMO_CONSTITUTION_2023.parish}, {CMO_CONSTITUTION_2023.diocese}.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-1">
                  <h3 className="font-bold text-yellow-400 text-sm">Member Identity & Bio Data</h3>
                  <p className="text-slate-300">Full names, official member IDs, phone numbers, family unit allocations (Wisdom, Honour, Integrity, Talent), and profile images.</p>
                </div>
                <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-1">
                  <h3 className="font-bold text-emerald-400 text-sm">Financial & Attendance Records</h3>
                  <p className="text-slate-300">Dues payments, Section L fine assessment logs, Section K welfare benefit claims, bank lodgment tellers, and roll calls.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Role-Based Data Isolation */}
          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
              <Lock className="w-5 h-5 text-yellow-400" /> 2. Role-Based Data Isolation
            </h2>
            <div className="text-sm text-slate-200 leading-relaxed space-y-2">
              <p>
                Executive access limits ensure welfare claims, financial ledgers, and audit logs are restricted to authorized executive roles through Row-Level Security (RLS).
              </p>
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-2 text-xs">
                <p>• <strong>Role Partitioning:</strong> Financial Secretary, Treasurer, Welfare Officer, and Provost records are strictly partitioned. Executives only access data relevant to their statutory duties.</p>
                <p>• <strong>Family Data Scoping:</strong> Family Heads and Secretaries can only access roll calls and dues ledgers for their specific assigned family unit.</p>
              </div>
            </div>
          </div>

          {/* Card 3: AI Speech Transcription & Audio Security */}
          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
              <Building className="w-5 h-5 text-emerald-400" /> 3. AI Speech Transcription & Audio Security
            </h2>
            <div className="text-sm text-slate-200 leading-relaxed space-y-2">
              <p>
                The Secretariat Portal includes an automated Web Speech API Transcriber and Google Gemini AI Floor Motion Extractor for drafting official meeting minutes and executive decrees.
              </p>
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-2 text-xs">
                <p>• Audio streams captured during general meetings are processed locally in browser memory using standard Web Speech APIs.</p>
                <p>• No raw audio recordings are stored permanently on server disks; only processed text transcripts and motion summaries are saved to the meeting log.</p>
                <p>• Floor motion text is processed via Google Gemini API under strict enterprise privacy parameters.</p>
              </div>
            </div>
          </div>

          {/* Card 4: Security Infrastructure */}
          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
              <ShieldCheck className="w-5 h-5 text-yellow-400" /> 4. Security Infrastructure
            </h2>
            <div className="text-sm text-slate-200 leading-relaxed space-y-2">
              <p>
                The platform is hosted on fault-tolerant, enterprise-grade cloud infrastructure featuring strict database-level security protocols and isolated operational environments.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-1">
                  <span className="block font-bold text-yellow-400">Data Encryption Standard</span>
                  <span className="text-slate-300">256-bit TLS encryption in transit and AES encryption at rest across all system endpoints.</span>
                </div>
                <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-1">
                  <span className="block font-bold text-emerald-400">Granular Access Control</span>
                  <span className="text-slate-300">Role-Based Access Control (RBAC) and row-level policy enforcement for strict data isolation.</span>
                </div>
                <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-1">
                  <span className="block font-bold text-yellow-400">Edge Infrastructure Safeguards</span>
                  <span className="text-slate-300">Isolated application routing and automated network-level threat mitigation.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Credit Signature */}
        <footer className="pt-8 border-t border-emerald-800/40 text-center space-y-4">
          <p className="text-xs text-slate-400">
            © 2026 Holy Cross Catholic Church Badawa. Catholic Men Organisation — Kano Diocese. Data Protection & Executive Isolation Policy.
          </p>
          <div>
            <a
              href="https://loho-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 hover:border-yellow-500/60 hover:bg-emerald-900/40 transition-all duration-200 text-xs font-medium cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>Designed & Engineered by Loho Christopher</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <ExternalLink className="w-3.5 h-3.5 text-yellow-400/70" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
