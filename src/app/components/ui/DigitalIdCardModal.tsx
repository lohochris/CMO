import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { supabase } from '../../../lib/supabase';

interface MemberIdCardProps {
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
  };
  isOpen: boolean;
  onClose: () => void;
}

export const DigitalIdCardModal: React.FC<MemberIdCardProps> = ({ member, isOpen, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<'png' | 'pdf' | null>(null);

  // Resolve official ID & verification URL
  const memberCode = member?.official_member_id?.trim() || (member as any)?.member_id || 'HCC-CMO-26-003';
  const cleanId = (memberCode || 'MEMBER').replace(/[^a-zA-Z0-9_-]/g, '_');
  const canonicalVerifyUrl = `${window.location.origin}/verify?id=${encodeURIComponent(memberCode)}`;

  useEffect(() => {
    let isMounted = true;

    const resolveImageUrl = async () => {
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

    if (isOpen) {
      resolveImageUrl();
    }

    return () => {
      isMounted = false;
    };
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleDownloadPng = async () => {
    const cardElement = cardRef.current || document.getElementById('digital-id-card');
    if (!cardElement) return;

    try {
      setIsDownloading('png');

      const dataUrl = await toPng(cardElement, {
        width: 380,
        pixelRatio: 3, // Ultra-sharp print resolution
        cacheBust: true,
        style: {
          margin: '0',
          transform: 'none',
        },
      });

      const link = document.createElement('a');
      link.download = `${cleanId}_ID_CARD.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating card image:', err);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    const cardElement = cardRef.current || document.getElementById('digital-id-card');
    if (!cardElement) return;

    try {
      setIsDownloading('pdf');

      const dataUrl = await toPng(cardElement, {
        width: 380,
        pixelRatio: 3,
        cacheBust: true,
        style: {
          margin: '0',
          transform: 'none',
        },
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [85.6, 125],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, 85.6, 125);
      pdf.save(`${cleanId}_ID_CARD.pdf`);
    } catch (err) {
      console.error('Error generating PDF card:', err);
    } finally {
      setIsDownloading(null);
    }
  };

  const photoSrc = imageSrc || member?.avatar_url || member?.photo_url || member?.passport_url;
  const familyName = member?.cmo_family || member?.family_unit || 'Parish';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-slate-950 p-5 sm:p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
          <div>
            <h3 className="text-base font-bold text-amber-400">Digital Membership ID Card</h3>
            <p className="text-xs text-slate-400">Catholic Men Organisation • Kano Diocese</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl px-2 cursor-pointer">✕</button>
        </div>

        <div className="flex justify-center items-center w-full py-4 overflow-x-auto">
          {/* The element captured by html-to-image */}
          <div
            id="digital-id-card"
            ref={cardRef}
            style={{
              width: '380px',
              minWidth: '380px',
              maxWidth: '380px',
              backgroundColor: '#04160f',
              borderColor: '#f59e0b',
              boxSizing: 'border-box',
            }}
            className="rounded-2xl border-2 border-amber-400 p-5 text-white overflow-hidden relative shadow-2xl select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-3">
              <div className="flex-1 pr-2">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-tight leading-tight">
                  Holy Cross Catholic Church Badawa
                </h3>
                <p className="text-[10px] text-emerald-300 font-medium mt-0.5">
                  Catholic Men Organisation (CMO) • Kano Diocese
                </p>
              </div>
              <div className="w-10 h-10 rounded-full border border-amber-400 bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                HC
              </div>
            </div>

            {/* Title & Member Name */}
            <div className="text-center my-4">
              <p className="text-[9px] font-bold tracking-widest text-emerald-400 uppercase mb-1">
                OFFICIAL MEMBER
              </p>
              <h2 className="text-base font-black text-white uppercase tracking-wide px-2 leading-snug truncate">
                {member?.full_name || 'Member Name'}
              </h2>
              <div className="inline-block bg-amber-400 text-slate-950 text-xs font-black px-3 py-0.5 rounded-full mt-1.5 tracking-wider">
                {memberCode}
              </div>
            </div>

            {/* Photo + QR Row */}
            <div className="flex items-center justify-between gap-4 my-4 px-2">
              {/* Portrait Photo */}
              <div className="w-28 h-28 rounded-xl overflow-hidden border-2 border-amber-400 bg-slate-800 shrink-0 flex items-center justify-center">
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={member?.full_name || 'Member'}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span className="text-3xl font-black text-amber-400">
                    {member?.full_name?.charAt(0) || 'M'}
                  </span>
                )}
              </div>

              {/* Dynamic QR Code */}
              <div className="w-28 h-28 bg-white p-2 rounded-xl border border-slate-700 shrink-0 flex items-center justify-center">
                <QRCodeSVG
                  value={canonicalVerifyUrl}
                  size={96}
                  level="M"
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-4 pt-3 border-t border-amber-400/20 flex justify-between items-center text-[11px] text-slate-300">
              <span>Family: <strong className="text-amber-400">{familyName}</strong></span>
              <span>Role: <strong className="text-amber-400 capitalize">{member?.role || 'Member'}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={handleDownloadPng}
            disabled={isDownloading !== null}
            className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isDownloading === 'png' ? 'Generating PNG...' : '🖼️ Download PNG'}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading !== null}
            className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            {isDownloading === 'pdf' ? 'Generating PDF...' : '📄 Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};