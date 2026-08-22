import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export const VerifyMember: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchedId, setSearchedId] = useState<string>('');

  useEffect(() => {
    const runVerification = async () => {
      // 1. Direct browser search query parse
      const urlParams = new URLSearchParams(window.location.search);
      let rawId = urlParams.get('id') || urlParams.get('memberId') || '';

      // 2. Path fallback (/verify/HCC-CMO-26-003)
      if (!rawId) {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment && lastSegment !== 'verify') {
          rawId = lastSegment;
        }
      }

      // 3. Hash fallback (/#/verify?id=HCC-CMO-26-003)
      if (!rawId && window.location.hash && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        rawId = hashParams.get('id') || hashParams.get('memberId') || '';
      }

      const cleanId = decodeURIComponent(rawId).trim().toUpperCase();
      setSearchedId(cleanId);

      if (!cleanId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: dbError } = await supabase
          .from('members')
          .select('id, full_name, official_member_id, role, cmo_family, avatar_url, phone_number')
          .eq('official_member_id', cleanId)
          .maybeSingle();

        if (dbError) {
          console.error('Supabase query error:', dbError);
          setError('Database error during identity verification.');
        } else if (!data) {
          setError(`No verified membership record found for ID: "${cleanId}".`);
        } else {
          setMember(data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Network error verifying member identity.');
      } finally {
        setLoading(false);
      }
    };

    runVerification();
  }, []);

  if (!searchedId && !loading) {
    return (
      <div className="min-h-screen bg-[#06120e] flex items-center justify-center p-4">
        <div className="bg-[#0b1c16] border border-amber-500/40 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full border border-amber-400 bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold mx-auto mb-4">
            HC
          </div>
          <h2 className="text-sm font-black text-amber-400 uppercase">Holy Cross Catholic Church Badawa</h2>
          <p className="text-[11px] text-emerald-300/80 mb-6">Catholic Men Organisation (CMO)</p>
          <div className="text-amber-400 text-3xl font-bold my-3">!</div>
          <h3 className="text-base font-bold text-white mb-2">No Member ID Specified</h3>
          <p className="text-xs text-slate-400 mb-6">Please scan an official ID card QR code.</p>
          <a href="/" className="text-xs text-amber-400 hover:underline font-semibold">← Return to Portal Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06120e] flex items-center justify-center p-4 text-white">
      {loading ? (
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-amber-400 font-bold text-sm">Verifying CMO Record...</p>
        </div>
      ) : error ? (
        <div className="bg-[#0b1c16] border border-rose-900/60 rounded-2xl p-6 max-w-sm w-full text-center">
          <div className="text-rose-500 text-3xl font-bold mb-3">✕</div>
          <h3 className="text-base font-bold text-rose-400 mb-2">Verification Failed</h3>
          <p className="text-xs text-slate-300">{error}</p>
          <a href="/" className="inline-block mt-5 text-xs text-amber-400 hover:underline">← Return to Portal Home</a>
        </div>
      ) : (
        <div className="bg-[#0b1c16] border-2 border-emerald-500/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/40 rounded-full text-emerald-400 text-xs font-bold mb-4">
            ✓ Verified Active Member
          </div>
          
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-400 mx-auto mb-3 bg-slate-800 flex items-center justify-center">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-amber-400">{member.full_name?.charAt(0)}</span>
            )}
          </div>

          <h2 className="text-lg font-black text-white uppercase">{member.full_name}</h2>
          <div className="inline-block bg-amber-400 text-slate-950 text-xs font-black px-3 py-0.5 rounded-full mt-1">
            {member.official_member_id}
          </div>
          
          <div className="mt-5 pt-4 border-t border-emerald-900/40 text-left text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Parish Family:</span>
              <strong className="text-white">{member.cmo_family || 'Holy Cross'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Membership Status:</span>
              <strong className="text-emerald-400">Active / Valid</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Official Portfolio:</span>
              <strong className="text-amber-400 capitalize">{member.role?.replace('_', ' ') || 'General Member'}</strong>
            </div>
          </div>

          <a href="/" className="inline-block mt-6 text-xs text-slate-400 hover:text-amber-400 transition-colors">
            Holy Cross Parish Portal
          </a>
        </div>
      )}
    </div>
  );
};
