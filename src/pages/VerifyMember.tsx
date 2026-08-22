import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';

export const VerifyMember: React.FC = () => {
  const { setCurrentPage } = useApp();
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchedId, setSearchedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemberVerification = async () => {
      try {
        setLoading(true);

        // Robust ID extraction supporting query params (?id=, ?memberId=, ?member_id=) and path params (/verify/ID)
        let targetId: string | null = null;
        if (typeof window !== 'undefined') {
          const urlObj = new URL(window.location.href);

          // 1. Query parameters
          targetId =
            urlObj.searchParams.get('id') ||
            urlObj.searchParams.get('memberId') ||
            urlObj.searchParams.get('member_id');

          // 2. Hash search params fallback (e.g., /#/verify?id=)
          if (!targetId && window.location.hash) {
            const hashIndex = window.location.hash.indexOf('?');
            if (hashIndex !== -1) {
              const hashSearchParams = new URLSearchParams(window.location.hash.substring(hashIndex));
              targetId =
                hashSearchParams.get('id') ||
                hashSearchParams.get('memberId') ||
                hashSearchParams.get('member_id');
            }
          }

          // 3. Path parameter fallback (e.g. /verify/HCC-CMO-26-003)
          if (!targetId) {
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
            const verifyIdx = pathSegments.indexOf('verify');
            if (verifyIdx !== -1 && verifyIdx < pathSegments.length - 1) {
              targetId = pathSegments[verifyIdx + 1];
            } else {
              const lastPart = pathSegments[pathSegments.length - 1];
              if (lastPart && lastPart !== 'verify') {
                targetId = lastPart;
              }
            }
          }
        }

        const cleanId = targetId ? decodeURIComponent(targetId).trim() : '';

        if (!cleanId) {
          setLoading(false);
          setSearchedId(null);
          return;
        }

        setSearchedId(cleanId);
        setErrorMsg(null);

        // Query Supabase public.members for exact official_member_id match
        const { data, error } = await supabase
          .from('members')
          .select('id, full_name, official_member_id, avatar_url, phone_number, cmo_family, role')
          .eq('official_member_id', cleanId)
          .maybeSingle();

        if (error || !data) {
          setErrorMsg(`No verified member record found for ID: "${cleanId}"`);
          setMember(null);
        } else {
          setMember(data);
          setErrorMsg(null);
        }
      } catch (err) {
        console.error('Verification error:', err);
        setErrorMsg('Network error verifying member identity.');
      } finally {
        setLoading(false);
      }
    };

    fetchMemberVerification();
  }, []);

  const avatarSrc = React.useMemo(() => {
    if (!member?.avatar_url) return null;
    if (member.avatar_url.startsWith('http') || member.avatar_url.startsWith('data:')) {
      return member.avatar_url;
    }
    const { data } = supabase.storage.from('profile-pictures').getPublicUrl(member.avatar_url);
    return data?.publicUrl || null;
  }, [member?.avatar_url]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-emerald-900/50 rounded-2xl p-6 shadow-2xl text-center">
        {/* Church Header */}
        <div className="mb-6 pb-4 border-b border-slate-800">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-2 text-amber-400 font-bold text-lg">
            HC
          </div>
          <h2 className="text-sm font-black text-amber-400 tracking-wider uppercase">
            Holy Cross Catholic Church Badawa
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Catholic Men Organisation (CMO) • Kano Diocese
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-r-transparent"></div>
            <p className="text-xs text-slate-400 mt-4 font-medium">Verifying member credential...</p>
          </div>
        ) : !searchedId ? (
          <div className="py-8">
            <div className="h-14 w-14 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              !
            </div>
            <h3 className="text-base font-bold text-amber-400">No Member ID Specified</h3>
            <p className="text-xs text-slate-400 mt-2">
              Please scan an official ID card QR code.
            </p>
          </div>
        ) : errorMsg || !member ? (
          <div className="py-8">
            <div className="h-14 w-14 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              ✕
            </div>
            <h3 className="text-base font-bold text-rose-400">Invalid Credential</h3>
            <p className="text-xs text-slate-400 mt-2">{errorMsg}</p>
          </div>
        ) : (
          <div className="py-2 flex flex-col items-center">
            <span className="inline-block px-3.5 py-1 bg-emerald-950/80 text-emerald-400 border border-emerald-500/60 text-[11px] font-bold tracking-wider rounded-full mb-5">
              ● VERIFIED OFFICIAL MEMBER
            </span>

            <div className="h-28 w-24 rounded-xl border-2 border-amber-500/80 overflow-hidden bg-slate-800 shadow-md mb-4 flex items-center justify-center">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={member.full_name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-3xl font-black text-amber-400">
                  {member.full_name?.charAt(0) || 'M'}
                </span>
              )}
            </div>

            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              {member.full_name}
            </h3>
            <div className="mt-1 px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-md">
              {member.official_member_id}
            </div>

            <div className="w-full mt-6 pt-4 border-t border-slate-800 text-left text-xs space-y-2.5 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">CMO Family:</span>
                <span className="font-bold text-amber-400">{member.cmo_family || 'General'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Parish Role:</span>
                <span className="font-semibold text-white capitalize">{member.role || 'Member'}</span>
              </div>
              {member.phone_number && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Contact:</span>
                  <span className="font-mono text-slate-300">{member.phone_number}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.pushState(null, '', '/');
              }
              setCurrentPage('home');
            }}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer bg-transparent border-none p-0"
          >
            ← Return to Portal Home
          </button>
        </div>
      </div>
    </div>
  );
};
