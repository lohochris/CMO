import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useApp } from '../../../contexts/AppContext';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';
import { Gavel, CheckCircle2, Clock, AlertCircle, ShieldCheck, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../../utils/helpers';

export const FinesEscrowVerificationLedger = () => {
  const { members, setMembers, refreshDatabase } = useApp();
  const [pendingFines, setPendingFines] = useState<any[]>([]);
  const [allEscrowFines, setAllEscrowFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  const fetchPendingFines = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .like('purpose', 'Provost Fine:%')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = data || [];
      setAllEscrowFines(items);
      setPendingFines(items.filter((t: any) => t.status === 'Pending Verification'));
    } catch (err: any) {
      console.error('Error fetching pending fine verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingFines();
  }, []);

  const handleApproveAndCommit = async (fine: any) => {
    setProcessingId(fine.id);
    try {
      // 1. Update fine transaction status to "Cleared" and hardcode transaction_type strictly to "income" (Section A Inflow)
      const { error: txErr } = await supabase
        .from('transactions')
        .update({ 
          status: 'Cleared',
          transaction_type: 'income',
          recorded_by: 'FIN-SEC-2026'
        })
        .eq('id', fine.id);

      if (txErr) throw txErr;

      const fineAmount = Number(fine.amount);
      const memberId = fine.official_member_id;

      // 2. Fetch current member balance to clear the fine deficit if applicable
      const targetMember = members.find(m => m.official_member_id === memberId || m.id === memberId);
      if (targetMember) {
        const currentBalance = targetMember.balance || 0;
        const newBalance = currentBalance + fineAmount; // Restores fine amount back to balance upon clearance

        await supabase
          .from('members')
          .update({ balance: newBalance })
          .eq('official_member_id', memberId);

        await supabase
          .from('master_roster')
          .update({ balance: newBalance })
          .eq('official_member_id', memberId);

        const updatedMembers = members.map(m =>
          (m.official_member_id === memberId || m.id === memberId)
            ? { ...m, balance: newBalance }
            : m
        );
        setMembers(updatedMembers);
      }

      toast.success(`✓ Fine payment of ₦${fineAmount.toLocaleString()} approved & committed to General Treasury balance!`);

      // Refresh local pending state & context
      await fetchPendingFines();
      await refreshDatabase();
    } catch (err: any) {
      console.error('Failed to commit fine payment to treasury:', err);
      toast.error('Failed to commit payment: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const clearedTotal = allEscrowFines
    .filter(t => t.status === 'Cleared' || t.status === 'Approved')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-xl my-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-extrabold text-[#ffd700] flex items-center gap-2">
            <Gavel className="w-6 h-6 text-[#ffd700]" />
            Fines Escrow & Treasury Verification Sub-Ledger
          </h3>
          <p className="text-xs text-gray-300 mt-1">
            Handshake Pipeline: Review fine payments verified by Provost and commit funds directly to General Registry Treasury balance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={fetchPendingFines} 
            variant="outline" 
            className="border-[#ffd700]/40 text-[#ffd700] hover:bg-[#ffd700]/10 text-xs py-1 px-3 h-auto"
          >
            Refresh Verification Ledger
          </Button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#001a16] border border-amber-500/30 p-3.5 rounded-lg">
          <p className="text-gray-400 text-xs uppercase font-semibold">Pending Verification</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-0.5">{pendingFines.length} Payments</p>
          <p className="text-[10px] text-amber-300/60 mt-0.5">Awaiting Treasury audit</p>
        </div>
        <div className="bg-[#001a16] border border-green-500/30 p-3.5 rounded-lg">
          <p className="text-gray-400 text-xs uppercase font-semibold">Committed to Treasury</p>
          <p className="text-2xl font-extrabold text-green-400 mt-0.5">{formatCurrency(clearedTotal)}</p>
          <p className="text-[10px] text-green-300/60 mt-0.5">Total fines cleared</p>
        </div>
        <div className="bg-[#001a16] border border-[#ffd700]/20 p-3.5 rounded-lg">
          <p className="text-gray-400 text-xs uppercase font-semibold">Total Escrow Logs</p>
          <p className="text-2xl font-extrabold text-white mt-0.5">{allEscrowFines.length} Entries</p>
          <p className="text-[10px] text-gray-400 mt-0.5 font-sans">Provost Marshall records</p>
        </div>
      </div>

      {/* Sub-Ledger Table / Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#ffd700]/20 text-gray-400 font-semibold text-xs uppercase tracking-wider">
              <th className="py-3 px-4">Member Info</th>
              <th className="py-3 px-4">Fine Infraction Details</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Submitted Date</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Treasury Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ffd700]/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400 text-xs animate-pulse">
                  Loading fine verification queue...
                </td>
              </tr>
            ) : pendingFines.length > 0 ? (
              pendingFines.map((fine) => (
                <tr key={fine.id} className="hover:bg-[#001a16]/60 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-bold text-white uppercase text-sm">{fine.member_name}</p>
                    <p className="text-gray-400 text-xs font-mono">{fine.official_member_id}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-[#ffd700] font-semibold text-xs">{fine.purpose}</p>
                    {fine.notes && <p className="text-gray-300 text-[11px] italic mt-0.5">{fine.notes}</p>}
                  </td>
                  <td className="py-4 px-4 font-mono font-extrabold text-amber-400 text-base">
                    {formatCurrency(Number(fine.amount))}
                  </td>
                  <td className="py-4 px-4 text-gray-400 text-xs font-mono">
                    {new Date(fine.created_at).toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Clock className="w-3.5 h-3.5" />
                      Pending Verification
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button
                      onClick={() => handleApproveAndCommit(fine)}
                      disabled={processingId === fine.id}
                      className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-extrabold text-xs px-4 py-2 h-auto shadow-lg cursor-pointer transition-transform active:scale-95"
                    >
                      {processingId === fine.id ? (
                        'Committing...'
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          Approve & Commit to Treasury
                        </span>
                      )}
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-green-400/80 mb-1" />
                    <p className="text-gray-300 font-semibold">No Pending Fine Verifications</p>
                    <p className="text-gray-500 text-xs">All fine payments verified by Provost have been audited and committed to Treasury.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
