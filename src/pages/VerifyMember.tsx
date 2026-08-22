import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const VerifyMember: React.FC = () => {
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Safe ID extraction without requiring Router context hooks that throw uncaught exceptions
  const getMemberId = (): string | null => {
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const match = path.match(/\/verify\/(.+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]).trim();
        }
        const urlParams = new URLSearchParams(window.location.search);
        const winId = urlParams.get('id');
        if (winId) return decodeURIComponent(winId).trim();
      }
    } catch (e) {
      console.error('Error parsing ID:', e);
    }
    return null;
  };

  const memberId = getMemberId();

  useEffect(() => {
    let isMounted = true;

    const verifyMember = async () => {
      if (!memberId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        if (isMounted) setLoading(true);
        const cleanId = memberId.trim();

        const { data, error } = await supabase
          .from('members')
          .select('id, full_name, official_member_id, avatar_url, phone_number, cmo_family, role')
          .or(`official_member_id.eq.${cleanId},id.eq.${cleanId}`)
          .maybeSingle();

        if (!isMounted) return;

        if (error || !data) {
          setErrorMsg(`No verified member record found for ID: "${cleanId}"`);
          setMember(null);
        } else {
          setMember(data);
          setErrorMsg(null);
        }
      } catch (err) {
        console.error('Verification error:', err);
        if (isMounted) setErrorMsg('Unable to verify credential at this time.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifyMember();

    return () => {
      isMounted = false;
    };
  }, [memberId]);

  // Resolve image URL
  const avatarSrc = React.useMemo(() => {
    if (!member?.avatar_url) return null;
    if (member.avatar_url.startsWith('http') || member.avatar_url.startsWith('data:')) {
      return member.avatar_url;
    }
    const { data } = supabase.storage.from('profile-pictures').getPublicUrl(member.avatar_url);
    return data?.publicUrl || null;
  }, [member?.avatar_url]);

  const handleReturnHome = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-emerald-900/50 rounded-2xl p-6 shadow-2xl text-center">
        {/* Church Header */}
        <div className="mb-6 flex flex-col items-center border-b border-slate-800 pb-5">
          <div className="h-12 w-12 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mb-2 font-black text-amber-400 text-lg">
            HC
          </div>
          <h2 className="text-sm font-black text-amber-400 tracking-wider uppercase">
            Holy Cross Catholic Church Badawa
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Catholic Men Organisation (CMO) • Kano Diocese
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-r-transparent"></div>
            <p className="text-xs text-slate-400 mt-4 font-medium">Verifying member credential...</p>
          </div>
        ) : !memberId ? (
          <div className="py-8">
            <div className="h-14 w-14 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              !
            </div>
            <h3 className="text-base font-bold text-amber-400">No Member ID Specified</h3>
            <p className="text-xs text-slate-400 mt-2">
              Please scan an official ID card QR code or specify <code>?id=HCC-CMO-26-003</code> in the link.
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
            {/* Status Badge */}
            <span className="inline-block px-3.5 py-1 bg-emerald-950/80 text-emerald-400 border border-emerald-500/60 text-[11px] font-bold tracking-wider rounded-full mb-5">
              ● VERIFIED OFFICIAL MEMBER
            </span>

            {/* Member Avatar */}
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

            {/* Member Names & Code */}
            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              {member.full_name}
            </h3>
            <div className="mt-1 px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-md">
              {member.official_member_id}
            </div>

            {/* Details Grid */}
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
          <a
            href="/"
            onClick={handleReturnHome}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
          >
            ← Return to Portal Home
          </a>
        </div>
      </div>
    </div>
  );
};
