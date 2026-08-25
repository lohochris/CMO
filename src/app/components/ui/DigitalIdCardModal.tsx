import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { supabase } from '../../../lib/supabase';
import { FileImage, FileText } from 'lucide-react';

export interface DigitalIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    full_name: string;
    official_member_id: string;
    phone_number?: string;
    family_unit?: string;
    cmo_family?: string;
    role?: string;
    photo_url?: string;
    avatar_url?: string;
    passport_url?: string;
  } | null;
}

export type MemberIdCardProps = DigitalIdCardModalProps;

export const DigitalIdCardModal: React.FC<DigitalIdCardModalProps> = ({
  isOpen,
  onClose,
  member,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const resolveImageUrl = async () => {
      if (!member) return;
      const rawPath = member?.photo_url || member?.avatar_url || member?.passport_url;
      let urlToLoad: string | null = null;

      if (rawPath && (rawPath.startsWith('http://') || rawPath.startsWith('https://') || rawPath.startsWith('data:'))) {
        urlToLoad = rawPath;
      } else if (rawPath) {
        const { data } = supabase.storage.from('profile-pictures').getPublicUrl(rawPath);
        urlToLoad = data?.publicUrl || null;
      } else if (member?.official_member_id) {
        const { data } = supabase.storage.from('profile-pictures').getPublicUrl(`${member.official_member_id}.jpg`);
        urlToLoad = data?.publicUrl || null;
      }

      if (!urlToLoad) {
        if (isMounted) setImageSrc(null);
        return;
      }

      // Preload image onto an off-screen canvas to convert to Base64 (prevents CORS export issues)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg', 0.95);
            if (isMounted) setImageSrc(base64);
            return;
          }
        } catch (e) {
          console.warn('Canvas conversion fallback to direct URL:', e);
        }
        if (isMounted) setImageSrc(urlToLoad);
      };
      img.onerror = () => {
        if (isMounted) setImageSrc(urlToLoad);
      };
      img.src = urlToLoad;
    };

    if (isOpen && member) {
      resolveImageUrl();
    }

    return () => {
      isMounted = false;
    };
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const memberCode = member.official_member_id?.trim() || (member as any)?.member_id || 'HCC-CMO-26-003';
  const cleanId = (memberCode || 'MEMBER').replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://www.holycrosscmobadawa.org');
  const canonicalVerifyUrl = `${baseUrl}/verify?id=${encodeURIComponent(memberCode.trim())}`;

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3, // Crisp 300+ DPI
      });

      const link = document.createElement('a');
      link.download = `${cleanId}_ID_CARD.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
      });

      // Standard Portrait Card: 85.6mm width, 130mm height
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [85.6, 130],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, 85.6, 130);
      pdf.save(`${cleanId}_ID_CARD.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const photoSrc = imageSrc || member.avatar_url || member.photo_url || member.passport_url;
  const familyName = member.cmo_family || member.family_unit || 'Parish';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0b1311] border border-emerald-900/60 rounded-3xl p-4 sm:p-6 w-full max-w-sm shadow-2xl relative my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-800/40">
          <div>
            <h3 className="text-sm font-bold text-amber-400">Digital Membership ID Card</h3>
            <p className="text-[11px] text-slate-400">Catholic Men Organisation • Kano Diocese</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Captured ID Card (Rendered at fluid 100% width on screen, fixed aspect ratio) */}
        <div className="flex justify-center w-full my-2">
          <div
            ref={cardRef}
            id="digital-id-card"
            style={{ backgroundColor: '#04160f', borderColor: '#d97706' }}
            className="w-full max-w-[340px] rounded-2xl border-2 border-amber-500 p-4 text-white shadow-xl flex flex-col justify-between select-none"
          >
            {/* Parish Banner */}
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-2.5">
              <div className="flex-1 pr-2">
                <h2 className="text-[11px] sm:text-xs font-black text-amber-400 uppercase tracking-tight leading-tight">
                  Holy Cross Catholic Church Badawa
                </h2>
                <p className="text-[9px] text-emerald-300 font-medium">
                  Catholic Men Organisation (CMO) • Kano Diocese
                </p>
              </div>
              <div className="w-8 h-8 rounded-full border border-amber-400 bg-amber-500/20 flex items-center justify-center text-amber-400 font-extrabold text-[10px] shrink-0">
                HC
              </div>
            </div>

            {/* Member Name & Official Badge */}
            <div className="text-center my-3">
              <p className="text-[8px] font-bold tracking-widest text-emerald-400 uppercase mb-0.5">
                OFFICIAL MEMBER
              </p>
              <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-wide leading-snug px-1 line-clamp-2">
                {member.full_name}
              </h1>
              <div className="inline-block bg-amber-400 text-slate-950 text-[11px] font-black px-3 py-0.5 rounded-full mt-1 tracking-wider shadow">
                {memberCode}
              </div>
            </div>

            {/* Photo & QR Code */}
            <div className="flex items-center justify-between gap-3 px-1 my-2">
              {/* Photo */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-amber-400/80 bg-slate-900 shrink-0 flex items-center justify-center shadow-md">
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={member.full_name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span className="text-3xl font-black text-amber-400">
                    {member.full_name?.charAt(0) || 'M'}
                  </span>
                )}
              </div>

              {/* QR Code */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white p-1.5 rounded-xl border border-slate-700 shrink-0 flex items-center justify-center shadow-md">
                <QRCodeSVG
                  value={canonicalVerifyUrl}
                  size={96}
                  level="M"
                  includeMargin={false}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Footer metadata */}
            <div className="mt-2 pt-2 border-t border-amber-400/20 flex justify-between items-center text-[10px] text-slate-300">
              <span>Family: <strong className="text-amber-400">{familyName}</strong></span>
              <span>Role: <strong className="text-amber-400 capitalize">{member.role?.replace('_', ' ') || 'Member'}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-2 border-t border-emerald-900/40">
          <button
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            <FileImage className="w-4 h-4" /> {downloading ? 'Processing...' : 'Download PNG'}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            <FileText className="w-4 h-4" /> {downloading ? 'Processing...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};