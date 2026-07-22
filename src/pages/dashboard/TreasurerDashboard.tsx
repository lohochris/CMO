import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { BadgeDollarSign, TrendingUp, Receipt } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { generateExpenseId } from '../../utils/idGenerators';
import { calculateTotal, formatCurrency, formatDate, getCombinedTransactions } from '../../utils/helpers';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { supabase } from '../../lib/supabaseClient';

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
    refreshDatabase
  } = useApp();

  const awaitingDisbursement = welfareTickets.filter(t => t.status === 'Approved');

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
  const combinedTransactions = getCombinedTransactions(transactions, expenses);

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
                      formatCurrency(totalIncome - totalExpenses)
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
                {transactions.slice().reverse().map((txn, idx) => (
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
                {transactions.length === 0 && (
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
                  {combinedTransactions.slice(0, 20).map((item, idx) => (
                    <TableRow key={idx} className="border-[#ffd700]/30 hover:bg-[#001a16]">
                      <TableCell className="text-gray-400 text-sm">{formatDate(item.timestamp)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${item.type === 'income' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {item.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </TableCell>
                      <TableCell className="text-white">{item.type === 'income' ? (item.memberId === 'GENERAL' ? item.purpose : `Payment from ${item.memberId}`) : item.purpose}</TableCell>
                      <TableCell className="text-green-500 font-semibold">{item.type === 'income' ? formatCurrency(item.amount) : '-'}</TableCell>
                      <TableCell className="text-red-500 font-semibold">{item.type === 'expense' ? formatCurrency(item.amount) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#001a16] border border-green-500 p-4 rounded">
                <p className="text-green-500 text-sm mb-1">Total Income</p>
                <p className="text-white text-xl font-bold">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="bg-[#001a16] border border-red-500 p-4 rounded">
                <p className="text-red-500 text-sm mb-1">Total Expenses</p>
                <p className="text-white text-xl font-bold">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-[#ffd700] text-sm mb-1">Net Position</p>
                <p className="text-white text-xl font-bold">{formatCurrency(totalIncome - totalExpenses)}</p>
              </div>
            </div>
          </Card>
        </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};