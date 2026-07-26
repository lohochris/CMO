import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Card } from '../app/components/ui/card';
import { Button } from '../app/components/ui/button';
import { ShieldCheck, FileText, Scale, Lock, Building, ChevronRight, ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-[#001a16] text-white py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#002520] border border-[#ffd700]/30 p-6 rounded-xl shadow-xl">
          <div>
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-[#ffd700]" />
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#ffd700]">Terms & Conditions</h1>
            </div>
            <p className="text-gray-300 text-xs md:text-sm mt-1">
              Official Digital Bye-Laws & Governance Operating Agreement
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

        {/* Section 1: Governance & Authority */}
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 md:p-8 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-[#ffd700]/20 pb-3">
            <Building className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-emerald-400">1. Governance & Authority</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            This digital platform operates under the supreme constitutional authority of the <strong className="text-[#ffd700]">Official 2023 CMO Bye-Laws</strong> of the Catholic Men Organisation (CMO), {CMO_CONSTITUTION_2023.parish}, {CMO_CONSTITUTION_2023.diocese}.
          </p>
          <div className="bg-[#001411] border border-[#ffd700]/20 p-4 rounded-lg text-xs text-gray-300 space-y-2">
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-[#ffd700] flex-shrink-0 mt-0.5" />
              <span>All digitized ledger entries, roll calls, decrees, and welfare claims carry binding constitutional weight across all parish family units (Wisdom, Honour, Integrity, Talent).</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-[#ffd700] flex-shrink-0 mt-0.5" />
              <span>Executive orders issued by the Executive Chairman, Financial Secretary, and Treasurer must comply strictly with the statutory provisions of the 2023 Bye-Laws.</span>
            </div>
          </div>
        </Card>

        {/* Section 2: Portal Access & Digital ID */}
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 md:p-8 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-[#ffd700]/20 pb-3">
            <Lock className="w-6 h-6 text-[#ffd700]" />
            <h2 className="text-xl font-bold text-[#ffd700]">2. Portal Access & Digital ID Credential Rules</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            Access to administrative executive workspaces is strictly protected by multi-tier authorization PINs and Row-Level Security (RLS). Members are assigned unique official identifiers (e.g., <code className="text-[#ffd700] bg-[#001411] px-1.5 py-0.5 rounded">HCC-CMO-26-0001</code>).
          </p>
          <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside bg-[#001411] p-4 rounded-lg border border-[#ffd700]/20">
            <li>Members are solely responsible for maintaining the confidentiality of their portal credentials and security PINs.</li>
            <li>Digital ID Cards generated within the portal serve as valid proof of membership for parish, deanery, and diocesan CMO conventions.</li>
            <li>Unauthorized access attempts or misrepresentation of executive titles will lead to immediate account suspension under Section L Provost oversight.</li>
          </ul>
        </Card>

        {/* Section 3: Financial Ledgers & Audits */}
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 md:p-8 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-[#ffd700]/20 pb-3">
            <FileText className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-emerald-400">3. Financial Ledgers, Section D(6) & Section I Rules</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            All financial transactions recorded in the FinSec Ledger, Treasurer Cash Vault, and Section I Bank Withdrawal Deck are synchronized in real time over public tables.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#001411] border border-emerald-500/30 p-4 rounded-lg space-y-1.5">
              <h3 className="font-bold text-emerald-400 text-sm">Section D(6) Direct Deposit Policy</h3>
              <p className="text-gray-300">
                All un-lodged cash collected by the Financial Secretary must be handed over to the Treasurer for immediate bank lodgment, accompanied by a verified Bank Teller Reference.
              </p>
            </div>
            <div className="bg-[#001411] border border-[#ffd700]/30 p-4 rounded-lg space-y-1.5">
              <h3 className="font-bold text-[#ffd700] text-sm">Section I 2-of-3 Signatory Rule</h3>
              <p className="text-gray-300">
                Major bank disbursements require a mandatory 2-of-3 digital authorization threshold from the Executive Chairman, Treasurer, and Parish Priest before funds are released.
              </p>
            </div>
          </div>
        </Card>

        {/* Section 4: Section L Fines & Section K Welfare Rules */}
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 md:p-8 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-[#ffd700]/20 pb-3">
            <ShieldCheck className="w-6 h-6 text-[#ffd700]" />
            <h2 className="text-xl font-bold text-[#ffd700]">4. Section L Attendance Penalties & Section K Welfare Eligibility</h2>
          </div>
          <div className="space-y-4 text-xs text-gray-300">
            <div className="bg-[#001411] p-4 rounded-lg border border-[#ffd700]/20 space-y-2">
              <h3 className="font-bold text-[#ffd700] text-sm">Section L Statutory Attendance Fines</h3>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-[#002520] p-2 rounded border border-[#ffd700]/20">
                  <span className="block text-gray-400">Late Arrival</span>
                  <span className="text-sm font-bold text-yellow-400">₦50</span>
                </div>
                <div className="bg-[#002520] p-2 rounded border border-[#ffd700]/20">
                  <span className="block text-gray-400">Member Absence</span>
                  <span className="text-sm font-bold text-orange-400">₦200</span>
                </div>
                <div className="bg-[#002520] p-2 rounded border border-[#ffd700]/20">
                  <span className="block text-gray-400">Exec Absence</span>
                  <span className="text-sm font-bold text-red-400">₦300</span>
                </div>
              </div>
            </div>

            <div className="bg-[#001411] p-4 rounded-lg border border-emerald-500/30 space-y-2">
              <h3 className="font-bold text-emerald-400 text-sm">Section K Welfare Benefit Statutory Caps</h3>
              <ul className="space-y-1 text-gray-300 list-disc list-inside">
                <li><strong>Bereavement Benefit:</strong> Maximum ₦50,000 for member passing (Section K(iv)).</li>
                <li><strong>Hospitalization / Surgery:</strong> Maximum ₦20,000 upon medical board review (Section K(i)).</li>
                <li><strong>Member Wedding:</strong> Maximum ₦20,000 benefit (Section K(iii)(b)).</li>
                <li><strong>Child Naming Ceremony:</strong> Maximum ₦10,000 benefit (Section K(iii)(a)).</li>
                <li><strong>2-Month Prior Notice Rule:</strong> Social welfare claims (weddings/namings) must be submitted at least 60 days prior to the event date to qualify for benefit disbursement.</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Footer Info */}
        <div className="text-center text-xs text-gray-400 py-4 border-t border-[#ffd700]/20">
          <p>© 2026 Holy Cross Catholic Church Badawa. Catholic Men Organisation — Kano Diocese.</p>
          <p className="text-[#ffd700] mt-1">Grounded in the 2023 Official Constitution & Bye-Laws.</p>
        </div>

      </div>
    </div>
  );
};
