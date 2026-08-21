import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams, Link } from 'react-router';
import { supabase } from '../lib/supabaseClient';

export const VerifyMember: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { id: pathId } = useParams<{ id?: string }>();
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parse ID from searchParams, path params, or direct window.location
  const getMemberId = (): string | null => {
    const queryId = searchParams.get('id');
    if (queryId) return decodeURIComponent(queryId).trim();
    if (pathId) return decodeURIComponent(pathId).trim();
    
    // Fallback to raw window search
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const rawId = urlParams.get('id');
      if (rawId) return decodeURIComponent(rawId).trim();
    }
    return null;
  };

  const memberId = getMemberId();

  useEffect(() => {
    const verifyCredential = async () => {
      if (!memberId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .or(`official_member_id.eq.${memberId},id.eq.${memberId}`)
          .maybeSingle();

        if (error || !data) {
          setErrorMsg(`No active record found matching ID "${memberId}".`);
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

    verifyCredential();
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
            <p className="text-xs text-slate-400 mt-2">Please scan a valid ID card QR code or provide <code>?id=HCC-CMO-26-XXX</code> in the link.</p>
          </div>
        ) : errorMsg || !member ? (
          <div className="py-8">
            <div className="h-14 w-14 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">✕</div>
            <h3 className="text-base font-bold text-rose-400">Invalid or Expired Credential</h3>
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
                <span className="font-semibold text-white">{member.family_unit || 'General Registry'}</span>
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
