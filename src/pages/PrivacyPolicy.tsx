import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Card } from '../app/components/ui/card';
import { Button } from '../app/components/ui/button';
import { ShieldCheck, Lock, FileText, Building, Scale, ChevronRight, ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-[#001a16] text-white py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#002520] border border-[#ffd700]/30 p-6 rounded-xl shadow-xl">
          <div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#ffd700]">Privacy & Data Protection Policy</h1>
            </div>
            <p className="text-gray-300 text-xs md:text-sm mt-1">
              Data Privacy, Executive Security Isolation & Compliance Framework
            </p>
          </div>
          <Button
            onClick={handleBackNavigation}
            className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-sm px-4 py-2 flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentUser ? 'Back to Dashboard' : 'Back to Home'}
          </Button>
        </div>

        {/* Section 1: Data We Collect */}
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 md:p-8 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-[#ffd700]/20 pb-3">
            <FileText className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-emerald-400">1. Data We Collect</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            The Holy Cross CMO Management Portal collects data strictly necessary for organization governance, financial accounting, and inter-family sports administration under the <strong className="text-[#ffd700]">Official 2023 CMO Bye-Laws</strong> of {CMO_CONSTITUTION_2023.parish}, {CMO_CONSTITUTION_2023.diocese}.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
            <div className="bg-[#001411] p-4 rounded-lg border border-[#ffd700]/20 space-y-1">
              <h3 className="font-bold text-[#ffd700] text-sm">Member Identity & Bio Data</h3>
              <p>Full names, official member IDs, phone numbers, family unit allocations (Wisdom, Honour, Integrity, Talent), and profile images.</p>
            </div>
            <div className="bg-[#001411] p-4 rounded-lg border border-[#ffd700]/20 space-y-1">
              <h3 className="font-bold text-[#ffd700] text-sm">Financial & Attendance Records</h3>
              <p>Dues payments, Section L fine assessment logs, Section K welfare benefit claims, bank lodgment tellers, and Thursday fellowship roll calls.</p>
            </div>
          </div>
        </Card>

        {/* Section 2: Executive Data Isolation & RLS */}
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 md:p-8 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-[#ffd700]/20 pb-3">
            <Lock className="w-6 h-6 text-[#ffd700]" />
            <h2 className="text-xl font-bold text-[#ffd700]">2. Executive Data Isolation & Row-Level Security</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            Our PostgreSQL database utilizes strict Row-Level Security (RLS) policies to enforce executive role isolation across all tables.
          </p>
          <div className="bg-[#001411] p-4 rounded-lg border border-emerald-500/30 text-xs text-gray-300 space-y-2">
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Role Partitioning:</strong> Financial Secretary, Treasurer, Welfare Officer, and Provost records are strictly partitioned. Executives only access data relevant to their statutory duties.</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span><strong>Family Data Scoping:</strong> Family Heads and Secretaries can only access roll calls and dues ledgers for their specific assigned family unit.</span>
            </div>
          </div>
        </Card>

        {/* Section 3: AI Dictation & Audio Processing */}
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 md:p-8 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-[#ffd700]/20 pb-3">
            <Building className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-emerald-400">3. AI Dictation & Audio Processing Transparency</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            The Secretary Portal includes an automated Web Speech API Transcriber and Google Gemini AI Floor Motion Extractor for drafting official meeting minutes and executive decrees.
          </p>
          <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside bg-[#001411] p-4 rounded-lg border border-[#ffd700]/20">
            <li>Audio streams captured during general meetings are processed locally in browser memory using standard Web Speech APIs.</li>
            <li>No raw audio recordings are stored permanently on server disks; only processed text transcripts and motion summaries are saved to the meeting log.</li>
            <li>Floor motion text is processed via Google Gemini API under strict enterprise privacy parameters.</li>
          </ul>
        </Card>

        {/* Section 4: Security & Storage Standards */}
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 md:p-8 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-[#ffd700]/20 pb-3">
            <Scale className="w-6 h-6 text-[#ffd700]" />
            <h2 className="text-xl font-bold text-[#ffd700]">4. Infrastructure Security & Data Encryption</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            The platform is hosted on enterprise cloud infrastructure using Vercel Edge Network and Supabase Managed Database clusters.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-center">
            <div className="bg-[#001411] border border-[#ffd700]/20 p-4 rounded-lg">
              <span className="block font-bold text-[#ffd700]">TLS / SSL Encryption</span>
              <span className="text-gray-400 mt-1 block">256-bit encryption in transit across all endpoints.</span>
            </div>
            <div className="bg-[#001411] border border-[#ffd700]/20 p-4 rounded-lg">
              <span className="block font-bold text-emerald-400">PostgreSQL RLS</span>
              <span className="text-gray-400 mt-1 block">Database-level row security for all member data.</span>
            </div>
            <div className="bg-[#001411] border border-[#ffd700]/20 p-4 rounded-lg">
              <span className="block font-bold text-[#ffd700]">SPA Edge Rewrites</span>
              <span className="text-gray-400 mt-1 block">Isolated SPA routing powered by vercel.json.</span>
            </div>
          </div>
        </Card>

        {/* Footer Info */}
        <div className="text-center text-xs text-gray-400 py-4 border-t border-[#ffd700]/20">
          <p>© 2026 Holy Cross Catholic Church Badawa. Catholic Men Organisation — Kano Diocese.</p>
          <p className="text-[#ffd700] mt-1">Data Protection & Executive Isolation Policy.</p>
        </div>

      </div>
    </div>
  );
};
