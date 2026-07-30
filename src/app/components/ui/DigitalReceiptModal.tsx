import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro'; // Use html2canvas-pro for Tailwind v4 oklab/oklch support
import jsPDF from 'jspdf';
import { Transaction, Member } from '../../../types';
import { formatCurrency, formatDateTime } from '../../../utils/helpers';
import { Download, X, ShieldCheck } from 'lucide-react';

interface DigitalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  member?: Member | null;
}

const formatReceiptRef = (ref?: string, purpose?: string) => {
  if (!ref) return 'RCP-2026';
  
  // If reference is a long UUID string (36 chars)
  if (ref.length > 20 && ref.includes('-')) {
    const shortHash = ref.split('-').pop()?.substring(0, 4).toUpperCase() || '2026';
    const isWelfare = purpose?.toLowerCase().includes('welfare') || purpose?.toLowerCase().includes('assistance');
    return isWelfare ? `Ref: WLF-2026-${shortHash}` : `Ref: RCP-2026-${shortHash}`;
  }
  
  return ref.startsWith('Ref:') ? ref : `Ref: ${ref}`;
};

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  member
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !transaction) return null;

  const receiptNo = formatReceiptRef(
    transaction.receipt_number || (transaction.id ? String(transaction.id) : undefined),
    transaction.purpose
  );

  const memberName =
    member?.full_name || member?.name || transaction.memberName || 'Bro. Member';
  const officialMemberId =
    member?.official_member_id || member?.id || transaction.memberId || 'HCC-CMO-26-MEM';
  const familyUnit =
    member?.cmo_family || member?.familyUnit || member?.family || 'General Assembly';

  const handleDownloadPdf = async () => {
    const element = receiptRef.current;
    if (!element) return;

    setIsGenerating(true);
    try {
      // Brief pause to ensure full DOM render
      await new Promise((res) => setTimeout(res, 100));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#001f13',
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      const refNum = transaction?.receipt_number || 'Official';
      const fileName = `CMO_Receipt_${refNum.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('Failed to generate receipt PDF:', error);
      alert('Could not download receipt. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#001f13] border-2 border-amber-400 rounded-2xl p-6 text-emerald-100 shadow-2xl space-y-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Official Digital Receipt
          </span>
          <button
            onClick={onClose}
            className="p-1 text-emerald-300 hover:text-amber-400 hover:bg-emerald-900/50 rounded-lg transition-colors cursor-pointer"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capturable Official Receipt Container */}
        <div
          ref={receiptRef}
          id="receipt-print-area"
          style={{
            backgroundColor: '#001f13',
            color: '#ecfdf5',
            fontFamily: 'sans-serif',
            padding: '32px',
            borderRadius: '16px',
            border: '2px solid #f59e0b',
            maxWidth: '650px',
            margin: '0 auto'
          }}
        >
          {/* 1. Header & Church Seal Bar */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid rgba(245, 158, 11, 0.4)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
              <img
                src="/logo.png"
                alt="CMO Logo"
                style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #f59e0b' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div style={{ textAlign: 'left' }}>
                <h1 style={{ color: '#f59e0b', fontSize: '20px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  HOLY CROSS CATHOLIC CHURCH
                </h1>
                <p style={{ color: '#a7f3d0', fontSize: '12px', margin: '2px 0 0 0' }}>Badawa, Kano Diocese</p>
                <p style={{ color: '#f59e0b', fontSize: '13px', fontWeight: '600', margin: '2px 0 0 0', textTransform: 'uppercase' }}>
                  Catholic Men Organisation (CMO)
                </p>
              </div>
            </div>
          </div>

          {/* 2. Receipt Badge Header */}
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-5" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
              {transaction?.purpose?.toLowerCase().includes('welfare') ? 'Welfare Voucher' : 'Official Payment Receipt'}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30" style={{ color: '#10b981', backgroundColor: 'rgba(6, 78, 59, 0.6)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {formatReceiptRef(transaction?.receipt_number || (transaction?.id ? String(transaction.id) : undefined), transaction?.purpose)}
            </span>
          </div>

          {/* 3. Payer Info Box */}
          <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.4)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
            <p style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
              Payer Information
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ color: '#6ee7b7', fontSize: '10px', textTransform: 'uppercase' }}>Member Name</div>
                <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>
                  {memberName}
                </div>
              </div>
              <div>
                <div style={{ color: '#6ee7b7', fontSize: '10px', textTransform: 'uppercase' }}>Official ID</div>
                <div style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold', marginTop: '2px', fontFamily: 'monospace' }}>
                  {officialMemberId}
                </div>
              </div>
              <div>
                <div style={{ color: '#6ee7b7', fontSize: '10px', textTransform: 'uppercase' }}>Family Unit</div>
                <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>
                  {familyUnit}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Financial Breakdown Table */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
              Payment & Contribution Breakdown
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'rgba(6, 78, 59, 0.2)', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(6, 78, 59, 0.8)', borderBottom: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#6ee7b7', fontSize: '11px', textTransform: 'uppercase' }}>Payment Purpose</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', color: '#6ee7b7', fontSize: '11px', textTransform: 'uppercase' }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  <td style={{ padding: '12px 14px', color: '#ffffff', fontSize: '13px', fontWeight: '600' }}>
                    {transaction.purpose}
                    {transaction.notes && (
                      <div style={{ color: '#a7f3d0', fontSize: '11px', fontStyle: 'italic', marginTop: '2px' }}>
                        Note: {transaction.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#f59e0b', fontSize: '15px', fontWeight: 'bold', textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatCurrency(transaction.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Category & Timestamp Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: 'rgba(6, 78, 59, 0.4)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px' }}>
            <div>
              <div style={{ color: '#6ee7b7', fontSize: '10px', textTransform: 'uppercase' }}>Payment Category</div>
              <div style={{ color: '#ffffff', fontSize: '12px', fontWeight: '600', marginTop: '2px' }}>
                {transaction.transactionType || 'Dues & Contributions'}
              </div>
            </div>
            <div>
              <div style={{ color: '#6ee7b7', fontSize: '10px', textTransform: 'uppercase' }}>Approval Date & Time</div>
              <div style={{ color: '#ffffff', fontSize: '12px', fontWeight: '600', marginTop: '2px' }}>
                {formatDateTime(transaction.timestamp)}
              </div>
            </div>
          </div>

          {/* 6. Official Seal & Signatory Block */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px dashed rgba(245, 158, 11, 0.3)' }}>
            {/* Official Verified Badge */}
            <div style={{ border: '1.5px solid #10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: '#10b981', fontSize: '16px' }}>✓</div>
              <div>
                <div style={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}>Verified & Approved</div>
                <div style={{ color: '#a7f3d0', fontSize: '9px' }}>Financial Secretary Office</div>
              </div>
            </div>
            {/* Signatory Line */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #f59e0b', width: '160px', marginBottom: '4px' }}></div>
              <div style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Authorized Signatory</div>
              <div style={{ color: '#a7f3d0', fontSize: '9px' }}>Holy Cross CMO Secretariat</div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-500/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/50 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? 'Generating PDF...' : 'Download Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
};
