import { useState, useEffect } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { BadgeDollarSign, TrendingUp, TrendingDown, Receipt, Trophy, Landmark, ShieldCheck, CheckCircle2, Clock, AlertTriangle, Coins, Key, ArrowUpRight, ArrowDownLeft, Scale, FileText, Calculator, Database } from 'lucide-react';
import { SportsAuditReadOnlyView } from './sports/SportsAuditReadOnlyView';
import { useApp } from '../../contexts/AppContext';
import { generateExpenseId } from '../../utils/idGenerators';
import { calculateTotal, formatCurrency, formatDate, getCombinedTransactions } from '../../utils/helpers';
import { uploadProfilePicture, calculateUnifiedFinancialSummary, fetchUnifiedFinancialSummary, fetchPaymentSubmissions, auditPaymentSubmission } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { supabase } from '../../lib/supabaseClient';
import { CMO_CONSTITUTION_2023 } from '../../config/cmoConstitution';
import { sendWelfareDisbursalNotification } from '../../utils/messagingService';
import { PaymentSubmission } from '../../types';
import { toast } from 'sonner';


export const TreasurerDashboard = () => {
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('treasurer_session_unlocked') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Hidden PIN Management State (Inside Profile Picture Modal)
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePurpose, setExpensePurpose] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomePurpose, setIncomePurpose] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);

  const {
    welfareTickets,
    setWelfareTickets,
    expenses,
    setExpenses,
    transactions,
    setTransactions,
    members,
    setMembers,
    currentUser,
    setCurrentUser,
    setSuccess,
    setError,
    totalIncome,
    totalExpenses,
    vaultBalance,
    refreshDatabase,
    lodgments,
    setLodgments,
    bankWithdrawals,
    authorizeBankWithdrawal,
    createBankWithdrawal
  } = useApp();

  // Bank Lodgment Reconciliation States (Section D(6))
  const [tellerRef, setTellerRef] = useState('');
  const [lodgmentAmount, setLodgmentAmount] = useState('');
  const [isSubmittingLodgment, setIsSubmittingLodgment] = useState(false);
  const [lodgmentHistory, setLodgmentHistory] = useState<any[]>([]);

  // Section I Bank Withdrawal Request States
  const [withdrawalPurpose, setWithdrawalPurpose] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalCategory, setWithdrawalCategory] = useState<'Welfare Payout' | 'Major Project' | 'Operational Expense' | 'General'>('Welfare Payout');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [authorizingWthId, setAuthorizingWthId] = useState<string | null>(null);

  // ── Pending Member Payment Audits State ──
  const [pendingSubmissions, setPendingSubmissions] = useState<PaymentSubmission[]>([]);
  const [isAuditingSubId, setIsAuditingSubId] = useState<string | null>(null);
  const [rejectionModalSub, setRejectionModalSub] = useState<PaymentSubmission | null>(null);
  const [rejectionNoteInput, setRejectionNoteInput] = useState('');

  const loadPendingSubmissions = async () => {
    try {
      const { data } = await fetchPaymentSubmissions({ status: 'pending' });
      setPendingSubmissions(data as PaymentSubmission[]);
    } catch (err) {
      console.error('Error fetching pending payment submissions:', err);
    }
  };

  useEffect(() => {
    loadPendingSubmissions();
  }, []);

  const handleApproveSubmission = async (sub: PaymentSubmission) => {
    if (!sub.id) return;
    setIsAuditingSubId(sub.id);
    try {
      const officerName = currentUser?.full_name || currentUser?.name || 'Treasurer';
      const res = await auditPaymentSubmission(sub.id, 'approved', officerName);
      if (res.error) {
        toast.error('Failed to approve payment submission.');
      } else {
        toast.success(`Payment of ₦${sub.amount.toLocaleString()} for ${sub.full_name} approved and ledger updated!`);
        loadPendingSubmissions();
        refreshDatabase();
      }
    } catch (err) {
      console.error('Approval exception:', err);
    } finally {
      setIsAuditingSubId(null);
    }
  };

  const handleRejectSubmission = async () => {
    if (!rejectionModalSub?.id || !rejectionNoteInput.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setIsAuditingSubId(rejectionModalSub.id);
    try {
      const officerName = currentUser?.full_name || currentUser?.name || 'Treasurer';
      const res = await auditPaymentSubmission(rejectionModalSub.id, 'rejected', officerName, rejectionNoteInput.trim());
      if (res.error) {
        toast.error('Failed to reject payment submission.');
      } else {
        toast.success(`Payment submission rejected.`);
        setRejectionModalSub(null);
        setRejectionNoteInput('');
        loadPendingSubmissions();
      }
    } catch (err) {
      console.error('Rejection exception:', err);
    } finally {
      setIsAuditingSubId(null);
    }
  };

  // Real-Time Supabase Subscription for Treasurer Dashboard
  useEffect(() => {
    const fetchLiveRealtimeData = async () => {
      await refreshDatabase();
    };

    fetchLiveRealtimeData();

    const channel = supabase
      .channel('treasurer-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => refreshDatabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => refreshDatabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => refreshDatabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => refreshDatabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lodgments' }, () => refreshDatabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_withdrawals' }, () => refreshDatabase())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshDatabase]);

  const handleCreateWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(withdrawalAmount);
    if (!withdrawalPurpose.trim() || isNaN(amt) || amt <= 0) {
      setError('Please provide a valid withdrawal purpose and positive amount.');
      return;
    }
    setIsSubmittingWithdrawal(true);
    try {
      await createBankWithdrawal({
        purpose: withdrawalPurpose.trim(),
        amount: amt,
        category: withdrawalCategory,
        signatories: 'Treasurer'
      });
      setWithdrawalPurpose('');
      setWithdrawalAmount('');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const handleAuthorizeWithdrawal = async (wthId: string, role: string) => {
    setAuthorizingWthId(wthId);
    try {
      await authorizeBankWithdrawal(wthId, role);
    } finally {
      setAuthorizingWthId(null);
    }
  };

  const handleBankLodgmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tellerRef.trim()) {
      setError('Please provide a valid Bank Teller Reference Number.');
      return;
    }

    const amountVal = parseFloat(lodgmentAmount || String(totalIncome - totalExpenses));
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Invalid lodgment amount.');
      return;
    }

    setIsSubmittingLodgment(true);
    try {
      const newLodgment = {
        teller_ref: tellerRef.trim(),
        amount: amountVal,
        signatories: 'Treasurer Direct Deposit (Sec D(6))',
        status: 'Reconciled',
        lodged_by: currentUser?.name || 'Treasurer',
        created_at: new Date().toISOString()
      };

      const { data: dbData, error: dbErr } = await supabase
        .from('lodgments')
        .insert([newLodgment])
        .select();

      if (dbErr) {
        console.warn('Supabase lodgments insert warning:', dbErr);
      }

      const createdRecord = (dbData && dbData.length > 0) ? dbData[0] : newLodgment;

      setLodgments(prev => [createdRecord, ...prev.filter(l => l.id !== createdRecord.id)]);
      setLodgmentHistory(prev => [createdRecord, ...prev]);
      setSuccess(`Bank Lodgment of ₦${amountVal.toLocaleString()} (Teller: ${tellerRef.trim()}) recorded as Reconciled Bank Deposit!`);
      setTellerRef('');
      setLodgmentAmount('');
      setTimeout(() => setSuccess(''), 4000);
      await refreshDatabase();
    } catch (err: any) {
      console.error('Error submitting bank lodgment:', err);
      setError('Failed to record bank lodgment: ' + err.message);
    } finally {
      setIsSubmittingLodgment(false);
    }
  };

  // Filter out rejected members strictly from all treasury rosters, metrics, and drop-downs
  const validMembers = members.filter(
    (m) => m.status !== 'Rejected' && m.status?.toLowerCase() !== 'rejected'
  );

  const rejectedMemberIds = new Set(
    members
      .filter(m => m.status === 'Rejected' || m.status?.toLowerCase() === 'rejected')
      .map(m => m.id || m.official_member_id)
      .filter(Boolean)
  );

  const awaitingDisbursement = welfareTickets.filter(t => {
    if (t.status !== 'Approved') return false;
    if (t.memberId && rejectedMemberIds.has(t.memberId)) return false;
    return true;
  });

  const handleProfilePictureSave = async (imageDataUrl: string, imageFile: Blob) => {
    if (!currentUser) return;

    const storageUrl = await uploadProfilePicture(currentUser.id, imageFile, imageDataUrl);
    const finalImageUrl = storageUrl || imageDataUrl;

    const updatedMembers = members.map(m =>
      m.id === currentUser.id ? { ...m, profilePic: finalImageUrl } : m
    );
    setMembers(updatedMembers);
    setCurrentUser({ ...currentUser, profilePic: finalImageUrl });
    setSuccess('Profile picture updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);

    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'TREASURER',
        input_pin: pinInput
      });

      if (error) throw error;

      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('treasurer_session_unlocked', 'true');
        setPinInput("");
      } else {
        setPinError("Invalid Executive Security PIN. Access Denied.");
      }
    } catch (error: any) {
      console.error("Security Verification Error:", error.message);
      setPinError("Verification system encountered an error.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleLockDashboard = () => {
    setIsExecutiveUnlocked(false);
    sessionStorage.removeItem('treasurer_session_unlocked');
  };

  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);
    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'TREASURER',
        old_pin: currentPin,
        new_pin: newPin
      });
      if (error) throw error;
      if (isSuccess) {
        setPinChangeSuccess(true);
        setCurrentPin("");
        setNewPin("");
        setTimeout(() => {
          setIsChangingPin(false);
          setPinChangeSuccess(false);
        }, 2000);
      } else {
        setPinChangeError("Current Security PIN is incorrect.");
      }
    } catch (error: any) {
      console.error("PIN Update Error:", error.message);
      setPinChangeError("Failed to update security PIN.");
    } finally {
      setIsSubmittingPinChange(false);
    }
  };

  const isExpenseTransaction = (item: any): boolean => {
    const typeStr = String(item.transactionType || item.transaction_type || item.type || '').toLowerCase().trim();
    if (typeStr === 'expense' || typeStr === 'outflow' || typeStr === 'section_b') return true;
    if (typeStr === 'income' || typeStr === 'inflow' || typeStr === 'section_a') return false;

    const amt = Number(item.amount);
    if (!isNaN(amt) && amt < 0) return true;

    const purposeStr = String(item.purpose || '').toLowerCase();
    if (
      purposeStr.includes('withdrawal') ||
      purposeStr.includes('expense') ||
      purposeStr.includes('payout') ||
      purposeStr.includes('disbursement') ||
      purposeStr.includes('outflow')
    ) {
      return true;
    }

    return false;
  };

  const visibleTransactions = transactions.filter(t => {
    if (t.status && !['Approved', 'Completed', 'Cleared'].includes(t.status)) return false;
    const memberId = t.official_member_id || t.memberId;
    if (memberId && rejectedMemberIds.has(memberId)) return false;
    return true;
  });

  const combinedTransactions = getCombinedTransactions(visibleTransactions, expenses);

  const handleIncomeRecord = async () => {
    setError('');
    if (!incomeAmount || !incomePurpose || !incomeDate) {
      setError('Please fill all income fields');
      return;
    }

    const amount = parseFloat(incomeAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid income amount');
      return;
    }

    try {
      const { error: txErr } = await supabase
        .from('transactions')
        .insert([{
          id: crypto.randomUUID(),
          official_member_id: 'GENERAL-INCOME',
          member_name: 'CMO General Account',
          amount: amount,
          purpose: incomePurpose,
          transaction_type: 'income',
          timestamp: new Date(incomeDate).toISOString(),
          status: 'Approved'
        }]);

      if (txErr) {
        console.error("Income Insert Error:", txErr);
        setError(`Database Error: ${txErr.message}`);
        return;
      }

      setSuccess(`Income recorded: ${formatCurrency(amount)}`);
      setIncomeAmount('');
      setIncomePurpose('');
      setIncomeDate(new Date().toISOString().split('T')[0]);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh to synchronize totals across all dashboards
      await refreshDatabase();
    } catch (err: any) {
      console.error('Record income failed:', err);
      setError(`Record Income failed: ${err.message}`);
    }
  };

  const settleTicket = async (ticketId: string) => {
    setError('');
    const ticket = welfareTickets.find(t => t.ticketId === ticketId);
    if (!ticket) {
      setError('Ticket not found');
      return;
    }

    try {
      // 1. Explicit update mutation to the database for welfare ticket status
      const { error: ticketErr } = await supabase
        .from('welfare_tickets')
        .update({ 
          status: 'Completed', 
          settled_at: new Date().toISOString() 
        })
        .eq('ticket_id', ticketId);

      if (ticketErr) {
        console.error("Failed to update ticket in Supabase:", ticketErr);
        setError(`Database Error: ${ticketErr.message}`);
        return;
      }

      // 2. Log the expense in the unified ledger transactions table in database
      const { error: txErr } = await supabase
        .from('transactions')
        .insert([{
          official_member_id: 'GENERAL-EXPENSE',
          member_name: 'CMO Operational Expense',
          amount: ticket.requestedAmount,
          purpose: `Disbursement ${ticket.ticketId} for ${ticket.memberName}`,
          transaction_type: 'expense',
          timestamp: new Date().toISOString(),
          status: 'Approved'
        }]);

      if (txErr) {
        console.error("Failed to insert transaction in Supabase:", txErr);
        setError(`Database Error: ${txErr.message}`);
        return;
      }

      // 2b. Log credit benefit entry in transactions table for beneficiary member
      if (ticket.memberId) {
        await supabase
          .from('transactions')
          .insert([{
            official_member_id: ticket.memberId,
            member_name: ticket.memberName,
            amount: ticket.requestedAmount,
            purpose: `Welfare Assistance: ${ticket.category || 'Disbursal'}`,
            transaction_type: 'Welfare Disbursal',
            category: 'Welfare',
            receipt_number: ticket.ticketId,
            timestamp: new Date().toISOString(),
            status: 'Approved'
          }]);
      }

      // 2c. Dispatch automatic beneficiary SMS notification
      try {
        const targetMember = validMembers.find(
          m => m.id === ticket.memberId || m.official_member_id === ticket.memberId
        );
        let memberPhone = targetMember?.phone_number || targetMember?.phone;
        let firstName = (targetMember?.full_name || targetMember?.name || ticket.memberName || '').split(' ')[0] || 'Member';

        if (!memberPhone && ticket.memberId) {
          const { data: dbMem } = await supabase
            .from('members')
            .select('phone_number, full_name, name')
            .or(`official_member_id.eq.${ticket.memberId},id.eq.${ticket.memberId}`)
            .maybeSingle();
          if (dbMem) {
            memberPhone = dbMem.phone_number;
            if (dbMem.full_name || dbMem.name) {
              firstName = (dbMem.full_name || dbMem.name).split(' ')[0];
            }
          }
        }

        if (memberPhone) {
          await sendWelfareDisbursalNotification({
            phone_number: memberPhone,
            first_name: firstName,
            amount: ticket.requestedAmount,
            purpose: ticket.category || 'Welfare Assistance',
            receipt_number: ticket.ticketId
          });
        }
      } catch (smsErr) {
        console.error('SMS notification error on welfare disbursal:', smsErr);
      }

      // 3. Update local state context (which also handles local state sync to expenses table if applicable)
      const updatedTickets = welfareTickets.map(t =>
        t.ticketId === ticketId
          ? { ...t, status: 'Completed' as const, settledAt: new Date().toISOString() }
          : t
      );
      setWelfareTickets(updatedTickets);

      const expense = {
        id: generateExpenseId(),
        amount: ticket.requestedAmount,
        purpose: `Disbursement ${ticket.ticketId} for ${ticket.memberName}`,
        date: new Date().toISOString().split('T')[0],
        recordedBy: currentUser?.name || 'Treasurer'
      };
      setExpenses([...expenses, expense]);

      // Add to local transactions state to synchronize the ledger on the screen instantly
      const newTx = {
        memberId: 'GENERAL-EXPENSE',
        memberName: 'CMO Operational Expense',
        amount: ticket.requestedAmount,
        purpose: `Disbursement ${ticket.ticketId} for ${ticket.memberName}`,
        transactionType: 'expense',
        timestamp: new Date().toISOString()
      };
      setTransactions([...transactions, newTx]);

      setSuccess(`Ticket ${ticketId} settled and expense logged to ledger`);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh to synchronize totals across all dashboards
      await refreshDatabase();
    } catch (err: any) {
      console.error("Settle ticket transaction failed:", err);
      setError(`Settle failed: ${err.message}`);
    }
  };

  const handleExpenseRecord = async () => {
    setError('');
    if (!expenseAmount || !expensePurpose || !expenseDate) {
      setError('Please fill all fields');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid amount');
      return;
    }

    try {
      // 1. Log the expense in the unified ledger transactions table in database
      const { error: txErr } = await supabase
        .from('transactions')
        .insert([{
          official_member_id: 'GENERAL-EXPENSE',
          member_name: 'CMO Operational Expense',
          amount: amount,
          purpose: expensePurpose,
          transaction_type: 'expense',
          timestamp: new Date(expenseDate).toISOString(),
          status: 'Approved'
        }]);

      if (txErr) {
        console.error("Failed to insert transaction in Supabase:", txErr);
        setError(`Database Error: ${txErr.message}`);
        return;
      }

      // 2. Add to local transactions state to synchronize the ledger instantly
      const newTx = {
        memberId: 'GENERAL-EXPENSE',
        memberName: 'CMO Operational Expense',
        amount: amount,
        purpose: expensePurpose,
        transactionType: 'expense',
        timestamp: new Date(expenseDate).toISOString()
      };
      setTransactions([...transactions, newTx]);

      // 3. Log the expense in the expenses table
      const expense = {
        id: generateExpenseId(),
        amount,
        purpose: expensePurpose,
        date: expenseDate,
        recordedBy: currentUser?.name || 'Treasurer'
      };
      setExpenses([...expenses, expense]);

      setSuccess(`Expense recorded: ${formatCurrency(amount)}`);
      setExpenseAmount('');
      setExpensePurpose('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh to synchronize totals across all dashboards
      await refreshDatabase();
    } catch (err: any) {
      console.error("Record expense failed:", err);
      setError(`Record expense failed: ${err.message}`);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-6">Treasurer Department</h2>

      {currentUser && (
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 mb-6 rounded-xl shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <ProfilePictureUploader
                currentImage={currentUser.profilePic}
                onSave={handleProfilePictureSave}
                memberName={currentUser.name}
                size="sm"
                extraContent={
                  <>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsChangingPin(!isChangingPin);
                        setPinChangeError(null);
                        setPinChangeSuccess(false);
                      }} 
                      className="text-[10px] text-gray-600 hover:text-[#ffd700] transition-colors block ml-auto focus:outline-none cursor-pointer"
                    >
                      Manage Gateway Access
                    </button>
                    {isChangingPin && (
                      <form onSubmit={handleUpdateExecutivePin} className="mt-4 p-4 bg-[#001f1a] rounded border border-[#ffd700]/20 space-y-3 text-left">
                        <h4 className="text-xs font-semibold text-[#ffd700] uppercase tracking-wider">Modify Gateway Authorization PIN</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-400">Current PIN</label>
                            <input
                              type="password"
                              maxLength={6}
                              placeholder="••••••"
                              value={currentPin}
                              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                              className="w-full bg-[#001411] border border-gray-700 text-white p-2 rounded text-sm text-center font-mono focus:border-[#ffd700] focus:outline-none"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-400">New Secret PIN</label>
                            <input
                              type="password"
                              maxLength={6}
                              placeholder="••••••"
                              value={newPin}
                              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                              className="w-full bg-[#001411] border border-gray-700 text-white p-2 rounded text-sm text-center font-mono focus:border-[#ffd700] focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        {pinChangeError && <p className="text-red-400 text-xs font-semibold text-center">{pinChangeError}</p>}
                        {pinChangeSuccess && <p className="text-green-400 text-xs font-semibold text-center">PIN successfully updated!</p>}

                        <button
                          type="submit"
                          disabled={isSubmittingPinChange || newPin.length < 4 || currentPin.length < 4}
                          className="w-full bg-[#ffd700] text-[#001a16] font-bold text-xs py-2 rounded hover:bg-[#e6c200] transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          {isSubmittingPinChange ? "Processing Update..." : "Confirm Security Change"}
                        </button>
                      </form>
                    )}
                  </>
                }
              />
            </div>
            <div className="flex-grow w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Name</p>
                  <p className="text-white font-bold text-sm truncate">{currentUser.name}</p>
                  {currentUser.office_title && (
                    <span className="text-[10px] text-gray-400 block mt-0.5">{currentUser.office_title}</span>
                  )}
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Role</p>
                  <p className="text-[#ffd700] font-bold text-sm">TREASURER</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Vault Balance</p>
                  <p className="text-white font-bold text-sm">
                    {isExecutiveUnlocked ? (
                      formatCurrency(vaultBalance)
                    ) : (
                      <span className="tracking-widest text-[#ffd700]/40">••••••</span>
                    )}
                  </p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Awaiting Disbursement</p>
                  <p className="text-white font-bold text-sm">{awaitingDisbursement.length} Tickets</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all">
          <BadgeDollarSign className="w-8 h-8 text-[#ffd700] mb-2" />
          <p className="text-gray-400 text-sm">Awaiting Disbursement</p>
          <p className="text-2xl font-bold text-white">{awaitingDisbursement.length}</p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all">
          <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-gray-400 text-sm">Total Income</p>
          <p className="text-xl md:text-2xl font-bold text-white">
            {isExecutiveUnlocked ? (
              formatCurrency(totalIncome)
            ) : (
              <span className="text-xl md:text-2xl font-bold tracking-widest text-[#ffd700]/40">••••••</span>
            )}
          </p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all">
          <Receipt className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-gray-400 text-sm">Total Expenses</p>
          <p className="text-xl md:text-2xl font-bold text-white">
            {isExecutiveUnlocked ? (
              formatCurrency(totalExpenses)
            ) : (
              <span className="text-xl md:text-2xl font-bold tracking-widest text-[#ffd700]/40">••••••</span>
            )}
          </p>
        </Card>
      </div>

      {/* ── Pending Member Payment Receipts Audit Queue ── */}
      <Card className="bg-[#0b1c16] border border-amber-500/30 p-6 rounded-2xl shadow-xl text-white mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-amber-500/20 gap-2">
          <div>
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              💳 Pending Member Payment Audits ({pendingSubmissions.length})
            </h3>
            <p className="text-xs text-slate-300">Review and verify uploaded bank transfer receipts from members.</p>
          </div>
          <button
            onClick={loadPendingSubmissions}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-400/30 rounded-lg text-xs font-bold cursor-pointer"
          >
            🔄 Refresh Queue
          </button>
        </div>

        {pendingSubmissions.length === 0 ? (
          <div className="text-center py-8 bg-[#04160f] rounded-xl border border-emerald-900/40">
            <p className="text-emerald-400 text-xs font-bold">✓ All clear! No pending payment receipts awaiting verification.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#04160f] text-amber-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Member Details</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Ref No.</th>
                  <th className="p-3">Receipt File</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/30">
                {pendingSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#002520]/50 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-white uppercase">{sub.full_name}</p>
                      <p className="text-[10px] text-amber-400 font-mono">{sub.official_member_id} • {sub.cmo_family || 'General'}</p>
                    </td>
                    <td className="p-3 font-semibold text-emerald-300">{(sub as any).payment_title || sub.purpose || 'Payment'}</td>
                    <td className="p-3 font-black text-amber-400 text-sm">₦{sub.amount.toLocaleString()}</td>
                    <td className="p-3 font-mono text-slate-300">{sub.reference_no || 'N/A'}</td>
                    <td className="p-3">
                      <a
                        href={sub.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded-md text-[11px] font-bold hover:underline inline-flex items-center gap-1"
                      >
                        📄 View Receipt ↗
                      </a>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleApproveSubmission(sub)}
                          disabled={isAuditingSubId === sub.id}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectionModalSub(sub);
                            setRejectionNoteInput('');
                          }}
                          disabled={isAuditingSubId === sub.id}
                          className="px-3 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-400 font-bold rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Rejection Note Modal */}
      {rejectionModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0b1311] border border-rose-900/60 rounded-2xl p-6 w-full max-w-md shadow-2xl text-white my-auto">
            <h3 className="text-base font-bold text-rose-400 mb-1">Reject Payment Submission</h3>
            <p className="text-xs text-slate-400 mb-4">
              Member: <strong className="text-white">{rejectionModalSub.full_name}</strong> ({rejectionModalSub.official_member_id}) • ₦{rejectionModalSub.amount.toLocaleString()}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Rejection Reason / Note</label>
              <textarea
                rows={3}
                placeholder="e.g., Unclear image, amount mismatch, or invalid teller reference."
                value={rejectionNoteInput}
                onChange={(e) => setRejectionNoteInput(e.target.value)}
                className="w-full bg-[#001a16] border border-rose-900/60 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-400"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-rose-900/40">
              <button
                onClick={() => {
                  setRejectionModalSub(null);
                  setRejectionNoteInput('');
                }}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmission}
                disabled={Boolean(isAuditingSubId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="disbursement" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList className="bg-[#002520] border border-[#ffd700] mb-0">
            <TabsTrigger value="disbursement" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16]">
              Disbursement Queue
            </TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16]">
              Record Expense
            </TabsTrigger>
            <TabsTrigger value="income" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16]">
              Record Income
            </TabsTrigger>
            <TabsTrigger value="ledger" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16]">
              Financial Timeline
            </TabsTrigger>
            <TabsTrigger value="bank_lodgment" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] flex items-center gap-1.5">
              <Landmark className="w-4 h-4" />
              Bank Lodgment
            </TabsTrigger>
            <TabsTrigger value="bank_withdrawal" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Section I Withdrawals
            </TabsTrigger>
            <TabsTrigger value="sports_treasury" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              Sports Treasury
            </TabsTrigger>
          </TabsList>
          {isExecutiveUnlocked && (
            <button
              onClick={handleLockDashboard}
              className="bg-[#002520] hover:bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/30 px-3 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 cursor-pointer self-stretch sm:self-auto justify-center"
              title="Lock Executive Workspace"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Lock Dashboard
            </button>
          )}
        </div>
        {!isExecutiveUnlocked ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#001411] border border-[#ffd700]/20 rounded-lg max-w-md mx-auto text-center space-y-6 my-8 shadow-xl">
            <div className="p-3 bg-[#002a24] rounded-full border border-[#ffd700]/30 text-[#ffd700]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#ffd700]">Executive Security Gateway</h3>
              <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to unlock administrative features and view treasury metrics.</p>
            </div>
            <form onSubmit={handleVerifyPin} className="w-full space-y-4">
              <input
                type="password"
                maxLength={6}
                placeholder="Enter Secret PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center tracking-widest bg-[#001f1a] border border-[#ffd700] text-white rounded p-3 focus:outline-none text-xl font-mono"
              />
              {pinError && <p className="text-red-400 text-xs font-semibold">{pinError}</p>}
              <button type="submit" disabled={isVerifyingPin || pinInput.length < 4} className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-[#001a16] font-bold py-2.5 rounded transition-colors disabled:opacity-50 cursor-pointer">
                {isVerifyingPin ? "Verifying..." : "Unlock Vault Space"}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Disbursement Queue */}
            <TabsContent value="disbursement">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Tickets Awaiting Disbursement</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ffd700] hover:bg-[#001a16]">
                    <TableHead className="text-[#ffd700]">Ticket ID</TableHead>
                    <TableHead className="text-[#ffd700]">Member</TableHead>
                    <TableHead className="text-[#ffd700]">Category</TableHead>
                    <TableHead className="text-[#ffd700]">Amount</TableHead>
                    <TableHead className="text-[#ffd700]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awaitingDisbursement.map(ticket => (
                    <TableRow key={ticket.ticketId} className="border-[#ffd700]/30 hover:bg-[#001a16]">
                      <TableCell className="text-white">{ticket.ticketId}</TableCell>
                      <TableCell className="text-white">{ticket.memberName}</TableCell>
                      <TableCell className="text-gray-400">{ticket.category}</TableCell>
                      <TableCell className="text-[#ffd700] font-semibold">{formatCurrency(ticket.requestedAmount)}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() => settleTicket(ticket.ticketId)}
                          className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] text-xs"
                        >
                          Disburse Funds
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {awaitingDisbursement.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                        No tickets awaiting disbursement
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Record New Expense</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Amount (₦)</label>
                  <Input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Purpose</label>
                  <Input
                    value={expensePurpose}
                    onChange={(e) => setExpensePurpose(e.target.value)}
                    placeholder="e.g., Parish Donation, Event Expenses"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Date</label>
                  <Input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
                <Button
                  onClick={handleExpenseRecord}
                  className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Record Expense
                </Button>
              </div>
            </Card>

            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Recent Expenses</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {expenses.slice().reverse().map(expense => (
                  <div key={expense.id} className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-semibold">{expense.purpose}</p>
                        <p className="text-gray-400 text-sm">{formatDate(expense.date)}</p>
                        <p className="text-xs text-gray-500 mt-1">By: {expense.recordedBy}</p>
                      </div>
                      <p className="text-red-500 font-bold">{formatCurrency(expense.amount)}</p>
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && (
                  <p className="text-gray-400 text-center py-8">No expenses recorded yet</p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="income">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Record New Income</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Amount (₦)</label>
                  <Input
                    type="number"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Description</label>
                  <Input
                    value={incomePurpose}
                    onChange={(e) => setIncomePurpose(e.target.value)}
                    placeholder="e.g., Donations, Grant, Other Income"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Date</label>
                  <Input
                    type="date"
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
                <Button
                  onClick={handleIncomeRecord}
                  className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
                >
                  <BadgeDollarSign className="w-4 h-4 mr-2" />
                  Record Income
                </Button>
              </div>
            </Card>

            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Recent Income</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {visibleTransactions.slice().reverse().map((txn, idx) => (
                  <div key={`${txn.memberId}-${idx}`} className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-semibold">{txn.purpose}</p>
                        <p className="text-gray-400 text-sm">{formatDate(txn.timestamp)}</p>
                        <p className="text-xs text-gray-500 mt-1">Source: {txn.memberId === 'GENERAL' ? 'General Income' : txn.memberId}</p>
                      </div>
                      <p className="text-green-500 font-bold">{formatCurrency(txn.amount)}</p>
                    </div>
                  </div>
                ))}
                {visibleTransactions.length === 0 && (
                  <p className="text-gray-400 text-center py-8">No income recorded yet</p>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Unified Ledger Timeline</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ffd700] hover:bg-[#001a16]">
                    <TableHead className="text-[#ffd700]">Date</TableHead>
                    <TableHead className="text-[#ffd700]">Type</TableHead>
                    <TableHead className="text-[#ffd700]">Description</TableHead>
                    <TableHead className="text-[#ffd700]">Credit</TableHead>
                    <TableHead className="text-[#ffd700]">Debit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedTransactions.slice(0, 50).map((item: any, idx: number) => {
                    const isExpense = isExpenseTransaction(item);
                    const formattedAmt = formatCurrency(Math.abs(Number(item.amount) || 0));
                    const timestamp = item.timestamp || item.created_at || item.date;

                    let description = item.purpose || 'Transaction';
                    if (!isExpense && item.memberId && item.memberId !== 'GENERAL' && item.memberId !== 'GENERAL-INCOME') {
                      description = item.memberName ? `Payment from ${item.memberName} (${item.memberId})` : `Payment from ${item.memberId}`;
                    }

                    return (
                      <TableRow key={idx} className="border-[#ffd700]/30 hover:bg-[#001a16]">
                        <TableCell className="text-gray-400 text-sm">{formatDate(timestamp)}</TableCell>
                        <TableCell>
                          {isExpense ? (
                            <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1">
                              <ArrowDownLeft className="w-3 h-3 text-rose-400" />
                              Expense
                            </span>
                          ) : (
                            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                              Income
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-white font-medium">{description}</TableCell>
                        <TableCell className="text-emerald-400 font-semibold">{!isExpense ? formattedAmt : '—'}</TableCell>
                        <TableCell className="text-rose-400 font-semibold">{isExpense ? formattedAmt : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {combinedTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                        No ledger transactions recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#001a16] border border-green-500 p-4 rounded">
                <p className="text-green-500 text-sm mb-1 flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Total Income</p>
                <p className="text-white text-xl font-bold">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="bg-[#001a16] border border-red-500 p-4 rounded">
                <p className="text-red-500 text-sm mb-1 flex items-center gap-1.5"><TrendingDown className="w-4 h-4" /> Total Expenses</p>
                <p className="text-white text-xl font-bold">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-[#ffd700] text-sm mb-1 flex items-center gap-1.5"><Scale className="w-4 h-4" /> Net Position</p>
                <p className="text-white text-xl font-bold">{formatCurrency(vaultBalance)}</p>
              </div>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="bank_lodgment" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Un-lodged Vault Balance & Section D(6) Badge Card */}
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-6 h-6 text-[#ffd700]" />
                  <h3 className="text-xl font-bold text-[#ffd700]">FinSec Cash Vault</h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30 font-mono">
                  Section D(6) Enforced
                </span>
              </div>

              <div className="bg-[#001a16] border border-[#ffd700]/30 p-4 rounded-lg mb-6">
                <p className="text-gray-400 text-sm">Un-lodged Cash Collected</p>
                <p className="text-3xl font-bold text-white mt-1">{formatCurrency(vaultBalance)}</p>
                <p className="text-xs text-gray-500 mt-1">Net accumulated cash balance awaiting bank deposit.</p>
              </div>

              {/* Section D(6) Rule Enforcement Badge */}
              <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-lg flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-300">Section D(6) Direct Deposit Policy</h4>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Deposits are handled directly by the Treasurer upon receiving cash from FinSec. They do <strong>NOT</strong> require signatory approval and save directly as Reconciled Proof-of-Deposit records.
                  </p>
                </div>
              </div>
            </Card>

            {/* Bank Teller Reconcile Form */}
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Landmark className="w-6 h-6 text-[#ffd700]" />
                <h3 className="text-xl font-bold text-[#ffd700]">Reconcile Bank Lodgment</h3>
              </div>

              <form onSubmit={handleBankLodgmentSubmit} className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm block mb-1">Bank Teller Reference Number</label>
                  <Input
                    value={tellerRef}
                    onChange={(e) => setTellerRef(e.target.value)}
                    placeholder="e.g. TLR-2023-884920"
                    className="bg-[#001a16] border-[#ffd700] text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-sm block mb-1">Amount to Lodge (₦)</label>
                  <Input
                    type="number"
                    value={lodgmentAmount}
                    onChange={(e) => setLodgmentAmount(e.target.value)}
                    placeholder={String(Math.max(0, totalIncome - totalExpenses))}
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>

                <div className="bg-[#001a16] p-3 rounded border border-gray-700 text-xs text-gray-400">
                  <p className="font-semibold text-[#ffd700]">Proof-of-Deposit Confirmation:</p>
                  Submitting this teller reference records the bank deposit immediately without requiring executive signatures.
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingLodgment}
                  className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold mt-2 disabled:opacity-50"
                >
                  <Landmark className="w-4 h-4 mr-2" />
                  {isSubmittingLodgment ? 'Reconciling...' : 'Confirm & Save Bank Deposit (Sec D(6))'}
                </Button>
              </form>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bank_withdrawal" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form: Create Bank Withdrawal Request */}
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpRight className="w-6 h-6 text-[#ffd700]" />
                <h3 className="text-lg font-bold text-[#ffd700]">New Section I Withdrawal Request</h3>
              </div>

              <form onSubmit={handleCreateWithdrawal} className="space-y-4">
                <div>
                  <label className="text-gray-300 text-xs block mb-1 font-semibold">Category</label>
                  <select
                    value={withdrawalCategory}
                    onChange={(e: any) => setWithdrawalCategory(e.target.value)}
                    className="w-full bg-[#001a16] border border-[#ffd700] text-white p-2 rounded text-xs focus:outline-none"
                  >
                    <option value="Welfare Payout">Welfare Payout</option>
                    <option value="Major Project">Major Project</option>
                    <option value="Operational Expense">Operational Expense</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 text-xs block mb-1 font-semibold">Purpose & Description</label>
                  <Input
                    value={withdrawalPurpose}
                    onChange={(e) => setWithdrawalPurpose(e.target.value)}
                    placeholder="e.g., Welfare Payout, Project Support"
                    className="bg-[#001a16] border-[#ffd700] text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-xs block mb-1 font-semibold">Amount (₦)</label>
                  <Input
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-[#001a16] border-[#ffd700] text-white text-xs"
                  />
                </div>

                <div className="bg-[#001a16] p-2.5 rounded border border-[#ffd700]/20 text-[11px] text-gray-300 space-y-1">
                  <p className="text-[#ffd700] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Section I Policy Rule:
                  </p>
                  Requires at least 2 of 3 signatures (Chairman, Treasurer, Parish Priest) before bank release.
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingWithdrawal}
                  className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs"
                >
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  {isSubmittingWithdrawal ? 'Submitting...' : 'Initiate Withdrawal Request'}
                </Button>
              </form>
            </Card>

            {/* Section I Bank Withdrawal Authorization Table */}
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-6 h-6 text-[#ffd700]" />
                  <h3 className="text-xl font-bold text-[#ffd700]">Section I Bank Withdrawal Authorization Deck</h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/30 font-mono">
                  Mandatory 2-of-3 Signatories
                </span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#ffd700]/30 hover:bg-[#001a16]">
                      <TableHead className="text-[#ffd700]">Ref / Date</TableHead>
                      <TableHead className="text-[#ffd700]">Purpose</TableHead>
                      <TableHead className="text-[#ffd700]">Amount</TableHead>
                      <TableHead className="text-[#ffd700]">Signatory Authorization Progress</TableHead>
                      <TableHead className="text-[#ffd700]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankWithdrawals.map((wth) => {
                      const sigs = wth.signatories ? wth.signatories.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                      const hasChairman = sigs.includes('Chairman');
                      const hasTreasurer = sigs.includes('Treasurer');
                      const hasParishPriest = sigs.includes('Parish Priest');
                      const isSettled = wth.status === 'SETTLED' || sigs.length >= 2;

                      return (
                        <TableRow key={wth.id} className="border-[#ffd700]/20 hover:bg-[#001a16]">
                          <TableCell className="text-white font-mono text-xs">
                            <div>{wth.withdrawal_ref || wth.id}</div>
                            <div className="text-[10px] text-gray-400">{formatDate(wth.created_at)}</div>
                          </TableCell>
                          <TableCell className="text-white text-xs">
                            <p className="font-semibold">{wth.purpose}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 inline-block mt-0.5">
                              {wth.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-[#ffd700] font-bold text-sm">
                            {formatCurrency(wth.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border inline-flex items-center gap-1 ${hasChairman ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                {hasChairman ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-gray-400" />}
                                Chairman [{hasChairman ? 'Signed' : 'Pending'}]
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border inline-flex items-center gap-1 ${hasTreasurer ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                {hasTreasurer ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-gray-400" />}
                                Treasurer [{hasTreasurer ? 'Signed' : 'Pending'}]
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border inline-flex items-center gap-1 ${hasParishPriest ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                {hasParishPriest ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-gray-400" />}
                                Priest [{hasParishPriest ? 'Signed' : 'Pending'}]
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isSettled ? (
                              <span className="inline-flex items-center text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-1 rounded">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> SETTLED
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {!hasTreasurer && (
                                  <Button
                                    onClick={() => handleAuthorizeWithdrawal(wth.id, 'Treasurer')}
                                    disabled={authorizingWthId === wth.id}
                                    className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] text-[11px] font-bold py-1 h-auto"
                                  >
                                    <Key className="w-3 h-3 mr-1" />
                                    Sign (Treasurer)
                                  </Button>
                                )}
                                {!hasParishPriest && (
                                  <Button
                                    onClick={() => handleAuthorizeWithdrawal(wth.id, 'Parish Priest')}
                                    disabled={authorizingWthId === wth.id}
                                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-semibold py-1 h-auto"
                                  >
                                    + Add Priest Signature
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {bankWithdrawals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400 py-6 text-xs">
                          No bank withdrawals recorded
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sports_treasury" className="mt-6">
          <SportsAuditReadOnlyView />
        </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};