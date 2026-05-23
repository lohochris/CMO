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

export const TreasurerDashboard = () => {
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePurpose, setExpensePurpose] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomePurpose, setIncomePurpose] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);

  const { welfareTickets, setWelfareTickets, expenses, setExpenses, transactions, setTransactions, members, setMembers, currentUser, setCurrentUser, setSuccess, setError } = useApp();

  const awaitingDisbursement = welfareTickets.filter(t => t.status === 'Awaiting Disbursement');
  const totalSessionCash = calculateTotal(transactions);

  const handleProfilePictureSave = async (imageDataUrl: string, imageFile: Blob) => {
    if (!currentUser) return;

    const storageUrl = await uploadProfilePicture(currentUser.id, imageFile);
    const finalImageUrl = storageUrl || imageDataUrl;

    const updatedMembers = members.map(m =>
      m.id === currentUser.id ? { ...m, profilePic: finalImageUrl } : m
    );
    setMembers(updatedMembers);
    setCurrentUser({ ...currentUser, profilePic: finalImageUrl });
    setSuccess('Profile picture updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };
  const totalExpenses = calculateTotal(expenses);
  const combinedTransactions = getCombinedTransactions(transactions, expenses);

  const handleIncomeRecord = () => {
    setError('');
    if (!incomeAmount || !incomePurpose || !incomeDate) {
      setError('Please fill all income fields');
      return;
    }

    const amount = parseFloat(incomeAmount);
    if (isNaN(amount)) {
      setError('Invalid income amount');
      return;
    }

    const transaction = {
      memberId: 'GENERAL',
      amount,
      purpose: incomePurpose,
      timestamp: new Date(incomeDate).toISOString()
    };

    setTransactions([...transactions, transaction]);
    setSuccess(`Income recorded: ${formatCurrency(amount)}`);
    setIncomeAmount('');
    setIncomePurpose('');
    setIncomeDate(new Date().toISOString().split('T')[0]);
    setTimeout(() => setSuccess(''), 3000);
  };

  const settleTicket = (ticketId: string) => {
    const ticket = welfareTickets.find(t => t.ticketId === ticketId);
    if (!ticket) return;

    const updatedTickets = welfareTickets.map(t =>
      t.ticketId === ticketId
        ? { ...t, status: 'Settled & Cleared' as const, settledAt: new Date().toISOString() }
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

    setSuccess(`Ticket ${ticketId} settled, expense added to ledger`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleExpenseRecord = () => {
    setError('');
    if (!expenseAmount || !expensePurpose || !expenseDate) {
      setError('Please fill all fields');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount)) {
      setError('Invalid amount');
      return;
    }

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
  };

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-6">Treasurer Department</h2>

      {currentUser && (
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 mb-6">
          <h3 className="text-xl font-bold text-[#ffd700] mb-4">Profile Picture</h3>
          <ProfilePictureUploader
            currentImage={currentUser.profilePic}
            onSave={handleProfilePictureSave}
            memberName={currentUser.name}
          />
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
          <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(totalSessionCash)}</p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all">
          <Receipt className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-gray-400 text-sm">Total Expenses</p>
          <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(totalExpenses)}</p>
        </Card>
      </div>

      <Tabs defaultValue="disbursement" className="w-full">
        <TabsList className="bg-[#002520] border border-[#ffd700]">
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
                          Disburse & Settle
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
                <p className="text-white text-xl font-bold">{formatCurrency(totalSessionCash)}</p>
              </div>
              <div className="bg-[#001a16] border border-red-500 p-4 rounded">
                <p className="text-red-500 text-sm mb-1">Total Expenses</p>
                <p className="text-white text-xl font-bold">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-[#ffd700] text-sm mb-1">Net Position</p>
                <p className="text-white text-xl font-bold">{formatCurrency(totalSessionCash - totalExpenses)}</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};