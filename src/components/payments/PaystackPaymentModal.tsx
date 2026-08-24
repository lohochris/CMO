import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { CreditCard, Lightbulb, X } from 'lucide-react';
import { recordInstantPaymentToLedger } from '../../lib/paystackService';

interface PaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    official_member_id: string;
    full_name: string;
    email?: string;
  };
  onPaymentSuccess?: () => void;
}

export const PaystackPaymentModal: React.FC<PaystackModalProps> = ({
  isOpen,
  onClose,
  member,
  onPaymentSuccess,
}) => {
  const [purpose, setPurpose] = useState('Monthly Dues');
  const [customPurpose, setCustomPurpose] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fallback to direct string if .env is not yet populated
  const publicKey = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim();
  const userEmail = member.email || `${(member.official_member_id || 'MEMBER').toLowerCase().replace(/[^a-z0-9]/g, '')}@cmo-holycross.org`;
  const selectedPurpose = purpose === 'Other' ? customPurpose : purpose;
  const numericAmount = parseFloat(amount) || 0;

  const config = {
    reference: `CMO_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    email: userEmail,
    amount: Math.round(numericAmount * 100), // Converted to Kobo
    publicKey: publicKey,
    metadata: {
      custom_fields: [
        { display_name: 'Member Name', variable_name: 'member_name', value: member.full_name },
        { display_name: 'Member ID', variable_name: 'member_id', value: member.official_member_id },
        { display_name: 'Purpose', variable_name: 'purpose', value: selectedPurpose },
      ],
    },
  };

  const initializePayment = usePaystackPayment(config);

  const handlePayClick = () => {
    if (!publicKey || publicKey === '') {
      alert('Paystack Public Key is missing. Check your .env file for VITE_PAYSTACK_PUBLIC_KEY.');
      return;
    }

    if (numericAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setIsProcessing(true);

    initializePayment({
      onSuccess: async (reference: any) => {
        try {
          await recordInstantPaymentToLedger({
            memberId: member.id,
            officialMemberId: member.official_member_id,
            memberName: member.full_name,
            email: userEmail,
            purpose: selectedPurpose,
            amount: numericAmount,
            reference: reference.reference || reference.trxref,
          });
          alert(`Payment of ₦${numericAmount.toLocaleString()} confirmed and credited to the CMO General Ledger!`);
          onPaymentSuccess?.();
          onClose();
        } catch (err) {
          console.error('Error recording transaction:', err);
        } finally {
          setIsProcessing(false);
        }
      },
      onClose: () => {
        setIsProcessing(false);
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-yellow-500/30 bg-[#071d12] p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-yellow-500/20">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-yellow-400" />
            <h3 className="text-xl font-bold text-yellow-400">Instant Dues & Levy Payment</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase">Payment Category</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
            >
              <option value="Monthly Dues">Monthly Dues</option>
              <option value="Harvest Levy">Harvest Levy</option>
              <option value="Fathering Sunday">Fathering Sunday</option>
              <option value="Parish Project Levy">Parish Project Levy</option>
              <option value="Welfare Levy">Welfare Levy</option>
              <option value="Provost Fine">Provost Fine</option>
              <option value="Other">Other Contribution</option>
            </select>
          </div>

          {purpose === 'Other' && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase">Specify Purpose</label>
              <input
                type="text"
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                placeholder="e.g. CMO Hall Project Donation"
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase">Amount (₦)</label>
            <input
              type="number"
              placeholder="Enter amount (e.g. 2000)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
            />
          </div>

          <div className="rounded-lg bg-emerald-950/40 p-3 border border-emerald-500/20 text-xs text-gray-300 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <span>
              Pay via <strong>Transfer (Virtual Account), Card, USSD, or OPay</strong>. Once completed, your transaction is instantly credited to the vault.
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePayClick}
              disabled={isProcessing || numericAmount <= 0}
              className="w-2/3 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2 font-bold text-gray-950 hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? 'Processing...' : numericAmount > 0 ? `Pay ₦${numericAmount.toLocaleString()}` : 'Enter Amount'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
