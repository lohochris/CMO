import React from 'react';
import { CheckCircle2, X, ShieldCheck } from 'lucide-react';

interface DigitalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: {
    id?: string;
    reference_no?: string;
    transaction_ref?: string;
    full_name?: string;
    member_name?: string;
    official_member_id?: string;
    purpose?: string;
    payment_title?: string;
    amount: number;
    created_at?: string;
    verified_at?: string;
    verified_by?: string;
  } | null;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  if (!isOpen || !receipt) return null;

  const refCode = receipt.reference_no || receipt.transaction_ref || 'N/A';
  const title = receipt.payment_title || receipt.purpose || 'Contribution / Levy';
  const memberName = receipt.full_name || receipt.member_name || 'CMO Member';
  const memberId = receipt.official_member_id || 'MEMBER';
  const dateStr = new Date(receipt.verified_at || receipt.created_at || Date.now()).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-yellow-500/30 bg-[#071d12] p-6 text-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <span className="font-bold text-yellow-400">Verified System Record</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Details */}
        <div className="space-y-4 pt-4 text-center">
          <div>
            <h2 className="text-base font-bold uppercase tracking-wider text-yellow-400">
              Catholic Men Organization
            </h2>
            <p className="text-xs text-gray-300">
              Holy Cross Catholic Church, Badawa · Kano Diocese
            </p>
          </div>

          <div className="my-4 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4">
            <p className="text-xs font-semibold uppercase text-emerald-400">
              {title}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-white">
              ₦{Number(receipt.amount).toLocaleString()}
            </h1>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-0.5 text-[11px] font-semibold text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Direct Ledger Verified
            </div>
          </div>

          {/* Line Item Breakdown */}
          <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-950/50 p-4 text-left text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Member Name:</span>
              <span className="font-semibold text-white">{memberName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Member ID:</span>
              <span className="font-semibold text-white">{memberId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Reference:</span>
              <span className="font-mono text-yellow-300">{refCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Timestamp:</span>
              <span className="text-white">{dateStr}</span>
            </div>
            <div className="flex justify-between border-t border-gray-800 pt-2">
              <span className="text-gray-400">Audited By:</span>
              <span className="font-semibold text-emerald-400">{receipt.verified_by || 'PAYSTACK_AUTOPAY'}</span>
            </div>
          </div>
        </div>

        {/* Dismiss Action Only */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
