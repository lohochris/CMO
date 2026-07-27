import React from 'react';
import { useApp } from '../contexts/AppContext';
import { ShieldCheck, Scale, FileText, Lock, Building, ArrowLeft, Code2, ExternalLink, Sparkles } from 'lucide-react';
import { CMO_CONSTITUTION_2023 } from '../config/cmoConstitution';

export const TermsAndConditions: React.FC = () => {
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
              <Scale className="w-4 h-4 text-emerald-400" />
              LEGAL GOVERNANCE & TERMS
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
              Terms & Conditions of Portal Usage
            </h1>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
              Official operating rules and digital governance mandates grounded in the 2023 CMO Bye-Laws of {CMO_CONSTITUTION_2023.parish}, {CMO_CONSTITUTION_2023.diocese}.
            </p>
          </div>
        </header>

        {/* Structured Legal Cards */}
        <div className="space-y-6">
          {/* Card 1: Constitutional Authority & Scope */}
          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
              <Building className="w-5 h-5 text-emerald-400" /> 1. Constitutional Authority & Scope
            </h2>
            <div className="text-sm text-slate-200 leading-relaxed space-y-2">
              <p>
                This digital platform operates under the supreme constitutional authority of the <strong className="text-yellow-400">Official 2023 CMO Bye-Laws</strong> of the Catholic Men Organisation (CMO), {CMO_CONSTITUTION_2023.parish}, {CMO_CONSTITUTION_2023.diocese}.
              </p>
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-2">
                <p>• All digitized ledger entries, roll calls, decrees, and welfare claims carry binding constitutional weight across all parish family units (Wisdom, Honour, Integrity, Talent).</p>
                <p>• Executive orders issued by the Executive Chairman, Financial Secretary, and Treasurer must comply strictly with the statutory provisions of the 2023 Bye-Laws.</p>
              </div>
            </div>
          </div>

          {/* Card 2: Member Digital ID & Portal Access */}
          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
              <Lock className="w-5 h-5 text-yellow-400" /> 2. Member Digital ID & Portal Access
            </h2>
            <div className="text-sm text-slate-200 leading-relaxed space-y-2">
              <p>
                Access to administrative executive workspaces is strictly protected by multi-tier authorization credentials and Row-Level Security (RLS). Members are assigned unique, encrypted system identifiers upon official validation.
              </p>
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-2">
                <p>• Members are solely responsible for maintaining the confidentiality of their portal credentials and security access PINs.</p>
                <p>• Digital ID Cards generated within the portal serve as valid proof of membership for parish, deanery, and diocesan CMO conventions.</p>
                <p>• Unauthorized access attempts or misrepresentation of executive titles will lead to immediate account suspension under Section L Provost oversight.</p>
              </div>
            </div>
          </div>

          {/* Card 3: Financial Accountability & Auditing */}
          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
              <FileText className="w-5 h-5 text-emerald-400" /> 3. Financial Accountability & Auditing
            </h2>
            <div className="text-sm text-slate-200 leading-relaxed space-y-2">
              <p>
                Mandatory recording of member dues, Section D(6) lodgment proof, and double-entry general ledger reconciliation across all accounts.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-1">
                  <h3 className="font-bold text-emerald-400 text-sm">Section D(6) Direct Deposit Policy</h3>
                  <p className="text-xs text-slate-300">
                    All un-lodged cash collected by the Financial Secretary must be handed over to the Treasurer for immediate bank lodgment, accompanied by a verified Bank Teller Reference.
                  </p>
                </div>
                <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-1">
                  <h3 className="font-bold text-yellow-400 text-sm">Section I 2-of-3 Signatory Rule</h3>
                  <p className="text-xs text-slate-300">
                    Major bank disbursements require a mandatory 2-of-3 digital authorization threshold from the Executive Chairman, Treasurer, and Parish Priest before funds are released.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Section L Penalties & Section K Welfare Rules */}
          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
              <ShieldCheck className="w-5 h-5 text-yellow-400" /> 4. Section L Penalties & Section K Welfare Rules
            </h2>
            <div className="text-sm text-slate-200 leading-relaxed space-y-4">
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-2">
                <h3 className="font-bold text-yellow-400 text-sm">Section L Statutory Attendance Fines</h3>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
                  <div className="bg-[#04281D] p-2.5 rounded-lg border border-emerald-800/40">
                    <span className="text-slate-300 block text-xs">Late Arrival</span>
                    <span className="text-sm font-bold text-yellow-400">₦50</span>
                  </div>
                  <div className="bg-[#04281D] p-2.5 rounded-lg border border-emerald-800/40">
                    <span className="text-slate-300 block text-xs">Member Absence</span>
                    <span className="text-sm font-bold text-yellow-400">₦200</span>
                  </div>
                  <div className="bg-[#04281D] p-2.5 rounded-lg border border-emerald-800/40">
                    <span className="text-slate-300 block text-xs">Exec Absence</span>
                    <span className="text-sm font-bold text-red-400">₦300</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40 space-y-2 text-xs">
                <h3 className="font-bold text-emerald-400 text-sm">Section K Welfare Benefit Statutory Caps</h3>
                <p>• <strong>Bereavement Benefit:</strong> Maximum ₦50,000 for member passing (Section K(iv)).</p>
                <p>• <strong>Hospitalization / Surgery:</strong> Maximum ₦20,000 upon medical board review (Section K(i)).</p>
                <p>• <strong>Member Wedding:</strong> Maximum ₦20,000 benefit (Section K(iii)(b)).</p>
                <p>• <strong>Child Naming Ceremony:</strong> Maximum ₦10,000 benefit (Section K(iii)(a)).</p>
                <p>• <strong>2-Month Prior Notice Rule:</strong> Social welfare claims (weddings/namings) must be submitted at least 60 days prior to the event date to qualify for benefit disbursement.</p>
              </div>
            </div>
          </div>

          {/* Card 5: Section I Signatory Compliance */}
          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-3">
            <h2 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
              <Scale className="w-5 h-5 text-emerald-400" /> 5. Section I Signatory Compliance
            </h2>
            <div className="text-sm text-slate-200 leading-relaxed space-y-2">
              <p>
                All cash disbursements, banking transfers, and treasury expenditures are bound by the Section I multi-signature framework requiring explicit approvals from 2 out of 3 authorized officers before transaction settlement.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Credit Signature */}
        <footer className="pt-8 border-t border-emerald-800/40 text-center space-y-4">
          <p className="text-xs text-slate-400">
            © 2026 Holy Cross Catholic Church Badawa. Catholic Men Organisation — Kano Diocese. Grounded in the 2023 Official Constitution & Bye-Laws.
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
