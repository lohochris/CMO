import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '../../../lib/supabase';

interface MemberIdCardProps {
  member: {
    full_name: string;
    official_member_id: string;
    phone_number?: string;
    family_unit?: string;
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

  // Resolve the official ID cleanly
  const memberCode = member?.official_member_id?.trim() || (member as any)?.member_id || 'HCC-CMO-26-003';
  const cleanId = (memberCode || 'MEMBER').replace(/[^a-zA-Z0-9_-]/g, '_');
  const canonicalVerifyUrl = `https://cmo-eta.vercel.app/verify?id=${encodeURIComponent(memberCode)}`;

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

      // Preload image onto an off-screen canvas to convert to Base64 (prevents export issues)
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

  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!cardRef.current) return null;
    try {
      return await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#02231c',
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });
    } catch (err) {
      console.error('html2canvas error:', err);
      return null;
    }
  };

  const handleDownloadPng = async () => {
    try {
      setIsDownloading('png');
      const canvas = await generateCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${cleanId}_ID_CARD.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading('pdf');
      const canvas = await generateCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98],
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 85.6, 53.98);
      pdf.save(`${cleanId}_ID_CARD.pdf`);
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
          <div>
            <h3 className="text-base font-bold text-amber-400">Digital Membership ID Card</h3>
            <p className="text-xs text-slate-400">Catholic Men Organisation • Kano Diocese</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
        </div>

        <div className="my-5 flex justify-center overflow-x-auto p-2">
          <div
            ref={cardRef}
            style={{
              width: '600px',
              height: '360px',
              backgroundColor: '#02231c',
              borderRadius: '16px',
              padding: '24px 26px',
              color: '#ffffff',
              border: '2px solid #d97706',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
              fontFamily: 'Arial, Helvetica, sans-serif',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #d97706', paddingBottom: '10px' }}>
              <div>
                <h2 style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '1px', color: '#fbbf24', textTransform: 'uppercase', margin: 0, lineHeight: '1.2' }}>
                  HOLY CROSS CATHOLIC CHURCH BADAWA
                </h2>
                <p style={{ fontSize: '10px', letterSpacing: '0.3px', color: '#cbd5e1', margin: '3px 0 0 0', fontWeight: 600 }}>
                  Catholic Men Organisation (CMO) • Kano Diocese
                </p>
              </div>
              <div style={{ height: '36px', width: '36px', borderRadius: '50%', backgroundColor: '#d97706', border: '1.5px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#ffffff' }}>HC</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', margin: 'auto 0' }}>
              <div style={{ height: '130px', width: '105px', borderRadius: '10px', border: '2px solid #d97706', backgroundColor: '#0f172a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt=""
                    style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                    onError={() => setImageSrc(null)}
                  />
                ) : (
                  <span style={{ fontSize: '40px', fontWeight: 800, color: '#fbbf24' }}>
                    {member?.full_name?.charAt(0) || 'M'}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0, padding: '0 4px' }}>
                <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: 700, margin: 0 }}>
                  MEMBER NAME
                </p>
                <h3 style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', margin: '2px 0 6px 0', lineHeight: '1.2', letterSpacing: '0.2px', wordBreak: 'break-word' }}>
                  {member?.full_name}
                </h3>

                <div
                  style={{
                    backgroundColor: '#d97706',
                    border: '1.5px solid #fef08a',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    marginBottom: '8px',
                    width: 'fit-content',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 900,
                    letterSpacing: '1px',
                    lineHeight: '1.2',
                  }}
                >
                  {memberCode}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                  <div>
                    <p style={{ fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', margin: 0, fontWeight: 700 }}>ROLE</p>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', margin: '2px 0 0 0', textTransform: 'capitalize' }}>
                      {member?.role || 'Member'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', margin: 0, fontWeight: 700 }}>FAMILY UNIT</p>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', margin: '2px 0 0 0' }}>
                      {member?.family_unit || 'Wisdom'}
                    </p>
                  </div>
                  {member?.phone_number && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <p style={{ fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', margin: 0, fontWeight: 700 }}>CONTACT</p>
                      <p style={{ fontSize: '9.5px', fontWeight: 600, color: '#e2e8f0', margin: '2px 0 0 0' }}>
                        {member.phone_number}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <div style={{ padding: '6px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1.5px solid #d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QRCodeSVG value={canonicalVerifyUrl} size={76} level="M" />
                </div>
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#34d399', letterSpacing: '0.5px' }}>
                  ● VERIFIED
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(217, 119, 6, 0.4)', paddingTop: '6px', fontSize: '8px', color: '#94a3b8' }}>
              <span>Constitution &amp; Bye-Laws 2023</span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>Scan QR to Verify Credential</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={handleDownloadPng}
            disabled={isDownloading !== null}
            className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2"
          >
            {isDownloading === 'png' ? 'Generating PNG...' : '🖼️ Download PNG'}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading !== null}
            className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-xs font-bold shadow-lg transition-all flex items-center gap-2"
          >
            {isDownloading === 'pdf' ? 'Generating PDF...' : '📄 Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};