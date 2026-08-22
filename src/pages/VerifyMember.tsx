import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const VerifyMember: React.FC = () => {
  // Universal Parameter Extraction (handles standard router, searchParams, hash router, and raw window.location)
  const extractId = (): string => {
    if (typeof window === 'undefined') return '';

    try {
      const url = new URL(window.location.href);

      // Check standard searchParams (?id=, ?memberId=, ?member_id=)
      const queryId = url.searchParams.get('id') || url.searchParams.get('memberId') || url.searchParams.get('member_id');
      if (queryId) return queryId;

      // Hash search params fallback (e.g. /#/verify?id=HCC-CMO-26-003)
      if (window.location.hash && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const match = hashQuery.match(/[?&](id|memberId|member_id)=([^&]+)/i);
        if (match) return decodeURIComponent(match[2]);
      }

      // Route path params fallback (e.g. /verify/HCC-CMO-26-003)
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const verifyIdx = pathSegments.indexOf('verify');
      if (verifyIdx !== -1 && verifyIdx < pathSegments.length - 1) {
        return pathSegments[verifyIdx + 1];
      } else {
        const lastPart = pathSegments[pathSegments.length - 1];
        if (lastPart && lastPart !== 'verify' && lastPart !== 'home') {
          return lastPart;
        }
      }
    } catch (e) {
      console.warn('URL parsing fallback:', e);
    }

    return '';
  };

  const targetId = extractId().trim().toUpperCase();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMember = async () => {
      if (!targetId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: dbError } = await supabase
          .from('members')
          .select('id, full_name, official_member_id, role, cmo_family, avatar_url, phone_number, created_at')
          .eq('official_member_id', targetId)
          .maybeSingle();

        if (dbError || !data) {
          setError(`No verified membership record found for ID: "${targetId}".`);
        } else {
          setMember(data);
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('An error occurred while communicating with the database.');
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [targetId]);

  const avatarSrc = React.useMemo(() => {
    if (!member?.avatar_url) return null;
    if (member.avatar_url.startsWith('http') || member.avatar_url.startsWith('data:')) {
      return member.avatar_url;
    }
    const { data } = supabase.storage.from('profile-pictures').getPublicUrl(member.avatar_url);
    return data?.publicUrl || null;
  }, [member?.avatar_url]);

  // If targetId is completely empty, render the prompt screen:
  if (!targetId && !loading) {
    return (
      <div className="min-h-screen bg-[#06120e] flex items-center justify-center p-4">
        <div className="bg-[#0b1c16] border border-emerald-900/60 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full border border-amber-400 bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold mx-auto mb-4">
            HC
          </div>
          <h2 className="text-sm font-black text-amber-400 uppercase">Holy Cross Catholic Church Badawa</h2>
          <p className="text-[11px] text-emerald-300/80 mb-6">Catholic Men Organisation (CMO)</p>
          <div className="text-amber-400 text-3xl font-bold my-4">!</div>
          <h3 className="text-base font-bold text-white mb-2">No Member ID Specified</h3>
          <p className="text-xs text-slate-400 mb-6">Please scan an official ID card QR code.</p>
          <a href="/" className="text-xs text-amber-400 hover:underline font-semibold">← Return to Portal Home</a>
        </div>
      </div>
    );
  }

  // Render loading or verified member profile
  return (
    <div className="min-h-screen bg-[#06120e] flex items-center justify-center p-4 text-white">
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-r-transparent"></div>
          <p className="text-xs text-amber-400 font-bold mt-4 animate-pulse">Verifying CMO Record...</p>
        </div>
      ) : error ? (
        <div className="bg-[#0b1c16] border border-rose-900/60 rounded-2xl p-6 max-w-sm w-full text-center">
          <div className="text-rose-500 text-3xl font-bold mb-3">✕</div>
          <h3 className="text-base font-bold text-rose-400 mb-2">Verification Failed</h3>
          <p className="text-xs text-slate-300 mb-4">{error}</p>
          <a href="/" className="text-xs text-amber-400 hover:underline font-semibold">← Return to Portal Home</a>
        </div>
      ) : (
        <div className="bg-[#0b1c16] border border-emerald-500/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/40 rounded-full text-emerald-400 text-xs font-bold mb-4">
            ✓ Verified Active Member
          </div>
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-400 mx-auto mb-3 bg-slate-800 flex items-center justify-center">
            {avatarSrc ? (
              <img src={avatarSrc} alt={member.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-black text-amber-400">
                {member.full_name?.charAt(0)}
              </div>
            )}
          </div>
          <h2 className="text-lg font-black text-white uppercase">{member.full_name}</h2>
          <p className="text-amber-400 font-mono font-bold text-xs mt-0.5">{member.official_member_id}</p>

          <div className="mt-4 pt-4 border-t border-emerald-900/40 text-left text-xs space-y-2">
            <div className="flex justify-between"><span className="text-slate-400">Family:</span><strong className="text-white">{member.cmo_family || 'General'}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">Role:</span><strong className="text-amber-400 capitalize">{member.role?.replace('_', ' ') || 'Member'}</strong></div>
            {member.phone_number && (
              <div className="flex justify-between"><span className="text-slate-400">Contact:</span><strong className="text-slate-200 font-mono">{member.phone_number}</strong></div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-emerald-900/40">
            <a href="/" className="text-xs text-amber-400 hover:underline font-semibold">← Return to Portal Home</a>
          </div>
        </div>
      )}
    </div>
  );
};
