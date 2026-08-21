import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Building2, Calendar, Phone, UserCheck, ArrowLeft } from 'lucide-react';
import logoImage from '../imports/CMO.png';

interface MemberVerificationData {
  full_name?: string;
  name?: string;
  official_member_id?: string;
  id?: string;
  family_unit?: string;
  family?: string;
  role?: string;
  status?: string;
  phone_number?: string;
  phone?: string;
  photo_url?: string;
  profilePic?: string;
  created_at?: string;
}

export const VerifyMember: React.FC = () => {
  const [memberIdParam, setMemberIdParam] = useState<string | null>(null);
  const [memberData, setMemberData] = useState<MemberVerificationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searched, setSearched] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setMemberIdParam(id);

    if (!id) {
      setLoading(false);
      setSearched(true);
      return;
    }

    const fetchVerificationData = async () => {
      setLoading(true);
      try {
        // Query members table by official_member_id or id
        const { data: memberData, error: memberErr } = await supabase
          .from('members')
          .select('*')
          .or(`official_member_id.eq.${id},id.eq.${id}`)
          .maybeSingle();

        if (memberData) {
          setMemberData(memberData);
        } else {
          // Fallback query to master_roster
          const { data: rosterData } = await supabase
            .from('master_roster')
            .select('*')
            .or(`official_member_id.eq.${id},id.eq.${id}`)
            .maybeSingle();

          if (rosterData) {
            setMemberData(rosterData);
          } else {
            setMemberData(null);
          }
        }
      } catch (err) {
        console.error('Error verifying member ID:', err);
        setMemberData(null);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    };

    fetchVerificationData();
  }, []);

  const isValidStatus = memberData?.status === 'Active' || memberData?.status === 'Validated' || memberData?.status === 'Approved';

  const memberName = memberData?.full_name || memberData?.name || 'Unknown Member';
  const officialId = memberData?.official_member_id || memberData?.id || memberIdParam || 'N/A';
  const familyUnit = memberData?.family_unit || memberData?.family || 'General Assembly';
  const role = memberData?.role || 'CMO Member';
  const photo = memberData?.photo_url || memberData?.profilePic;

  return (
    <div className="min-h-screen bg-[#001a16] text-white flex flex-col justify-between p-4 md:p-8 font-sans">
      {/* Header Bar */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between py-4 border-b border-amber-500/20 mb-8">
        <div className="flex items-center gap-3">
          <img
            src={logoImage}
            alt="Holy Cross CMO Seal"
            className="w-12 h-12 rounded-full border border-amber-400 object-cover shadow-lg"
          />
          <div>
            <h1 className="text-base font-bold text-amber-400 uppercase tracking-wide">
              Holy Cross Catholic Church
            </h1>
            <p className="text-xs text-slate-300">
              Catholic Men Organisation (CMO) — Badawa, Kano Diocese
            </p>
          </div>
        </div>

        <a
          href="/"
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-semibold bg-slate-900/80 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </a>
      </header>

      {/* Main Verification Card */}
      <main className="max-w-xl mx-auto w-full my-auto">
        {loading ? (
          <div className="bg-[#002520] border border-amber-500/30 rounded-2xl p-8 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-amber-400">Verifying Member Credentials...</h2>
            <p className="text-xs text-slate-400">Querying official church registry databases</p>
          </div>
        ) : !memberIdParam ? (
          <div className="bg-[#002520] border border-amber-500/30 rounded-2xl p-8 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-amber-400">No Member ID Specified</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Please provide a valid Member ID in the verification link (e.g. <code className="text-amber-300 font-mono">/verify?id=HCC-CMO-26-001</code>) or scan an official ID card QR code.
            </p>
          </div>
        ) : memberData && isValidStatus ? (
          /* VERIFIED STATUS BADGE */
          <div className="bg-gradient-to-b from-[#002b20] to-[#001a16] border-2 border-emerald-500/60 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            {/* Top Verified Ribbon */}
            <div className="bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-widest py-1.5 px-4 text-center rounded-full flex items-center justify-center gap-2 mb-6 shadow-md">
              <ShieldCheck className="w-4 h-4" /> Official Verified CMO Member
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 pb-6 border-b border-emerald-500/20">
              {/* Photo Avatar */}
              <div className="w-24 h-24 rounded-2xl border-2 border-amber-400/80 bg-slate-900 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg">
                {photo ? (
                  <img src={photo} alt={memberName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-amber-400">
                    {memberName.charAt(0)}
                  </span>
                )}
              </div>

              {/* Member Details */}
              <div className="text-center sm:text-left space-y-1">
                <h2 className="text-xl font-black text-white uppercase tracking-wide">
                  {memberName}
                </h2>
                <p className="text-sm font-mono font-bold text-amber-400">
                  {officialId}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Status: {memberData.status || 'Active'}
                </div>
              </div>
            </div>

            {/* Grid Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-6">
              <div className="bg-slate-900/60 border border-emerald-500/20 p-3 rounded-xl">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Family Unit</p>
                <p className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" /> {familyUnit}
                </p>
              </div>

              <div className="bg-slate-900/60 border border-emerald-500/20 p-3 rounded-xl">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Assigned Role</p>
                <p className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" /> {role}
                </p>
              </div>

              <div className="bg-slate-900/60 border border-emerald-500/20 p-3 rounded-xl">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Church Chapter</p>
                <p className="text-white font-semibold truncate mt-0.5">Holy Cross Parish Badawa</p>
              </div>

              <div className="bg-slate-900/60 border border-emerald-500/20 p-3 rounded-xl">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Verified On</p>
                <p className="text-amber-300 font-mono mt-0.5">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Footer Verification Seal */}
            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-emerald-500/20 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Authentic Digital Credential issued by Executive Secretariat</span>
            </div>
          </div>
        ) : (
          /* UNVERIFIED / INVALID BADGE */
          <div className="bg-gradient-to-b from-[#2b0000] to-[#1a0000] border-2 border-red-500/60 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="bg-red-600 text-white text-xs font-black uppercase tracking-widest py-1.5 px-4 text-center rounded-full flex items-center justify-center gap-2 shadow-md">
              <XCircle className="w-4 h-4" /> Invalid or Unverified Credential
            </div>

            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-red-400">Verification Failed</h2>
              <p className="text-sm font-mono text-slate-300">
                Requested ID: <span className="text-red-300 font-bold">{officialId}</span>
              </p>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto pt-2">
                This Member ID could not be validated against the active Holy Cross CMO Membership Registry. It may be inactive, frozen, or non-existent.
              </p>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-red-500/30 text-left text-xs space-y-1 text-slate-400">
              <p className="font-bold text-red-400">Possible Reasons:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>Member profile registration is pending financial secretary approval.</li>
                <li>Member account has been suspended or frozen by executive decision.</li>
                <li>The scanned QR code or URL query parameter is invalid.</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Page Footer */}
      <footer className="max-w-3xl mx-auto w-full text-center text-[10px] text-slate-500 pt-8 border-t border-amber-500/10 mt-8">
        Holy Cross Catholic Church CMO Management Portal &copy; {new Date().getFullYear()} — Executive Council
      </footer>
    </div>
  );
};

export default VerifyMember;
