import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { supabase } from '../lib/supabase';

export const VerifyMember: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const memberId = searchParams.get('id') || 
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null);

  useEffect(() => {
    const verifyMember = async () => {
      if (!memberId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const cleanId = decodeURIComponent(memberId).trim();
        
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .or(`official_member_id.eq.${cleanId},id.eq.${cleanId}`)
          .maybeSingle();

        if (error || !data) {
          setErrorMsg(`No verified member record found for ID "${cleanId}".`);
          setMember(null);
        } else {
          setMember(data);
          setErrorMsg(null);
        }
      } catch (err) {
        console.error('Verification error:', err);
        setErrorMsg('Unable to verify credential at this time.');
      } finally {
        setLoading(false);
      }
    };

    verifyMember();
  }, [memberId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-emerald-900/50 rounded-2xl p-6 shadow-2xl text-center">
        <div className="mb-4">
          <h2 className="text-sm font-black text-amber-400 tracking-wider uppercase">Holy Cross Catholic Church Badawa</h2>
          <p className="text-xs text-slate-400">CMO Kano Diocese • Credential Verification</p>
        </div>

        {loading ? (
          <div className="py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-r-transparent"></div>
            <p className="text-xs text-slate-400 mt-2">Verifying membership credential...</p>
          </div>
        ) : !memberId ? (
          <div className="py-8">
            <div className="h-14 w-14 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">!</div>
            <h3 className="text-base font-bold text-amber-400">No Member ID Specified</h3>
            <p className="text-xs text-slate-400 mt-2">Please scan an official ID card QR code.</p>
          </div>
        ) : errorMsg || !member ? (
          <div className="py-8">
            <div className="h-14 w-14 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">✕</div>
            <h3 className="text-base font-bold text-rose-400">Invalid Credential</h3>
            <p className="text-xs text-slate-400 mt-2">{errorMsg}</p>
          </div>
        ) : (
          <div className="py-4">
            <div className="h-14 w-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">✓</div>
            <span className="inline-block px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500 text-[11px] font-bold rounded-full mb-4">
              ● VERIFIED OFFICIAL MEMBER
            </span>

            <h3 className="text-lg font-black text-white uppercase">{member.full_name}</h3>
            <p className="text-sm font-mono font-bold text-amber-400 mt-1">{member.official_member_id}</p>

            <div className="mt-4 pt-4 border-t border-slate-800 text-left text-xs space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="text-emerald-400 font-bold">{member.status || 'Active'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Family Unit:</span>
                <span className="font-semibold text-white">{member.family_unit || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-semibold text-white capitalize">{member.role || 'Member'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800">
          <Link to="/" className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline">
            ← Return to Portal Home
          </Link>
        </div>
      </div>
    </div>
  );
};
