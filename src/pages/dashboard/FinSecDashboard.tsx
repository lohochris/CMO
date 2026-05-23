import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { Users, CheckCircle, AlertCircle, TrendingUp, DollarSign, Camera, Megaphone, FileText, Upload } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { MASTER_KEY } from '../../utils/constants';
import { generateMemberId, generateExpenseId } from '../../utils/idGenerators';
import { formatCurrency, formatDate, getCombinedTransactions, calculateTotal } from '../../utils/helpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';

export const FinSecDashboard = () => {
  const {
    members, setMembers,
    transactions, setTransactions,
    welfareTickets, setWelfareTickets,
    expenses, setExpenses,
    announcements, setAnnouncements,
    currentUser, setCurrentUser,
    setError, setSuccess
  } = useApp();

  // Form States
  const [masterKey, setMasterKey] = useState('');
  const [manualMemberId, setManualMemberId] = useState('');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualSearchIndex, setManualSearchIndex] = useState(-1);
  const [manualAmount, setManualAmount] = useState('');
  const [manualPurpose, setManualPurpose] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomePurpose, setIncomePurpose] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePurpose, setExpensePurpose] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  const pendingMembers = members.filter(m => m.status === 'Pending Validation');
  const activeMembers = members.filter(m => m.status === 'Active (Cleared)');
  const pendingTickets = welfareTickets.filter(t => t.status === 'Awaiting Financial Audit');
  const totalSessionCash = calculateTotal(transactions);
  const totalExpenses = calculateTotal(expenses);
  const combinedTransactions = getCombinedTransactions(transactions, expenses);
  const manualSearchResults = manualSearchQuery.trim()
    ? members
        .filter(m =>
          `${m.name} ${m.id}`.toLowerCase().includes(manualSearchQuery.toLowerCase())
        )
        .slice(0, 10)
    : [];
  const selectedManualMember = members.find(m => m.id === manualMemberId);
  const showManualSearchResults = Boolean(
    manualSearchQuery.trim() &&
    manualSearchResults.length > 0 &&
    (!selectedManualMember || manualSearchQuery !== `${selectedManualMember.name} (${selectedManualMember.id})`)
  );

  const selectManualMember = (memberId: string, displayText: string) => {
    setManualMemberId(memberId);
    setManualSearchQuery(displayText);
    setManualSearchIndex(-1);
  };

  const validateMember = (index: number) => {
    const pendingMember = pendingMembers[index];
    if (!pendingMember) return;

    const memberId = generateMemberId(members, pendingMember.family);
    const updatedMembers = members.map(m =>
      m === pendingMember
        ? { ...m, id: memberId, status: 'Active (Cleared)' as const }
        : m
    );

    setMembers(updatedMembers);
    setSuccess(`Member validated! ID assigned: ${memberId}`);
    setTimeout(() => setSuccess(''), 5000);
  };

  const approveTicket = (ticketId: string) => {
    const updatedTickets = welfareTickets.map(t =>
      t.ticketId === ticketId
        ? { ...t, status: 'Awaiting Disbursement' as const, approvedAt: new Date().toISOString() }
        : t
    );
    setWelfareTickets(updatedTickets);
    setSuccess(`Ticket ${ticketId} approved for disbursement`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const declineTicket = (ticketId: string) => {
    const ticket = welfareTickets.find(t => t.ticketId === ticketId);
    if (!ticket) return;

    const updatedTickets = welfareTickets.map(t =>
      t.ticketId === ticketId
        ? { ...t, status: 'Declined' as const }
        : t
    );
    setWelfareTickets(updatedTickets);

    const member = members.find(m => m.id === ticket.memberId);
    const overdueMessage = member && (member.balance < 0 || member.status !== 'Active (Cleared)')
      ? `Member ${member.name} is not up to date. Welfare team has been notified.`
      : `Ticket ${ticketId} declined.`;

    setSuccess(overdueMessage);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleManualTransaction = () => {
    setError('');
    if (masterKey !== MASTER_KEY) {
      setError('Invalid Master Key');
      return;
    }
    if (!manualMemberId || !manualAmount || !manualPurpose) {
      setError('Please fill all transaction fields');
      return;
    }

    const member = members.find(m => m.id === manualMemberId);
    if (!member) {
      setError('Member ID not found');
      return;
    }

    const amount = parseFloat(manualAmount);
    if (isNaN(amount)) {
      setError('Invalid amount');
      return;
    }

    const updatedMembers = members.map(m =>
      m.id === manualMemberId
        ? { ...m, balance: m.balance + amount, status: 'Active (Cleared)' as const }
        : m
    );
    setMembers(updatedMembers);

    const transaction = {
      memberId: manualMemberId,
      amount,
      purpose: manualPurpose,
      timestamp: new Date().toISOString()
    };
    setTransactions([...transactions, transaction]);

    setSuccess(`Transaction recorded: ${formatCurrency(amount)} for ${member.name}`);
    setManualMemberId('');
    setManualAmount('');
    setManualPurpose('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRecordIncome = () => {
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

  const handleRecordExpense = () => {
    setError('');
    if (!expenseAmount || !expensePurpose || !expenseDate) {
      setError('Please fill all expense fields');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount)) {
      setError('Invalid expense amount');
      return;
    }

    const expense = {
      id: generateExpenseId(),
      amount,
      purpose: expensePurpose,
      date: expenseDate,
      recordedBy: currentUser?.name || 'Financial Secretary'
    };

    setExpenses([...expenses, expense]);
    setSuccess(`Expense recorded: ${formatCurrency(amount)}`);
    setExpenseAmount('');
    setExpensePurpose('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCsvUpload = () => {
    if (!csvFile) {
      setError('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const dataLines = lines.slice(1);

        let updatedMembers = [...members];
        let newTransactions: any[] = [];
        let processedCount = 0;

        dataLines.forEach(line => {
          const [memberId, amountStr, purpose] = line.split(',').map(s => s.trim());
          if (!memberId || !amountStr) return;

          const amount = parseFloat(amountStr);
          if (isNaN(amount)) return;

          const memberIndex = updatedMembers.findIndex(m => m.id === memberId);
          if (memberIndex === -1) return;

          updatedMembers[memberIndex] = {
            ...updatedMembers[memberIndex],
            balance: updatedMembers[memberIndex].balance + amount,
            status: 'Active (Cleared)'
          };

          newTransactions.push({
            memberId,
            amount,
            purpose: purpose || 'Bulk Upload',
            timestamp: new Date().toISOString()
          });

          processedCount++;
        });

        setMembers(updatedMembers);
        setTransactions([...transactions, ...newTransactions]);
        setSuccess(`CSV processed: ${processedCount} transactions recorded!`);
        setCsvFile(null);
        setTimeout(() => setSuccess(''), 5000);
      } catch (err) {
        setError('Error processing CSV file');
      }
    };
    reader.readAsText(csvFile);
  };

  const handleProfilePictureSave = (imageDataUrl: string) => {
    if (!currentUser) return;
    const updatedMembers = members.map(m =>
      m.id === currentUser.id ? { ...m, profilePic: imageDataUrl } : m
    );
    setMembers(updatedMembers);
    setCurrentUser({ ...currentUser, profilePic: imageDataUrl });
    setSuccess('Profile picture updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const generateAnnouncementId = (): string => {
    return `ANN-${Date.now()}`;
  };

  const postAnnouncement = () => {
    if (!announcementTitle || !announcementContent) {
      setError('Please fill all fields');
      return;
    }

    const announcement = {
      id: generateAnnouncementId(),
      title: announcementTitle,
      content: announcementContent,
      author: currentUser?.name || 'Executive',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    };

    setAnnouncements([announcement, ...announcements]);
    setSuccess('Announcement published!');
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-2">Executive Dashboard</h2>
        <p className="text-gray-400">Financial Secretary Control Panel</p>
      </div>

      {/* Profile Management */}
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6 mb-6">
        <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Profile Management
        </h3>
        <ProfilePictureUploader
          currentImage={currentUser?.profilePic}
          onSave={handleProfilePictureSave}
          memberName={currentUser?.name || 'Member'}
        />
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all cursor-pointer">
          <Users className="w-8 h-8 text-[#ffd700] mb-2" />
          <p className="text-gray-400 text-sm">Total Members</p>
          <p className="text-2xl font-bold text-white">{members.length}</p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all cursor-pointer">
          <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-gray-400 text-sm">Active Members</p>
          <p className="text-2xl font-bold text-white">{activeMembers.length}</p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all cursor-pointer">
          <AlertCircle className="w-8 h-8 text-yellow-500 mb-2" />
          <p className="text-gray-400 text-sm">Pending Tickets</p>
          <p className="text-2xl font-bold text-white">{pendingTickets.length}</p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all cursor-pointer">
          <TrendingUp className="w-8 h-8 text-[#ffd700] mb-2" />
          <p className="text-gray-400 text-sm">Session Cash</p>
          <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(totalSessionCash)}</p>
        </Card>
      </div>

      <Tabs defaultValue="validation" className="w-full">
        <TabsList className="bg-[#002520] border border-[#ffd700] flex-wrap">
          <TabsTrigger value="validation" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
            Validation Queue
          </TabsTrigger>
          <TabsTrigger value="welfare-audit" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
            Welfare Audit
          </TabsTrigger>
          <TabsTrigger value="manual" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="income" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
            Record Income
          </TabsTrigger>
          <TabsTrigger value="expense" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
            Record Expense
          </TabsTrigger>
          <TabsTrigger value="bulk" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
            CSV Upload
          </TabsTrigger>
          <TabsTrigger value="ledger" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
            Financial Ledger
          </TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
            Announcements
          </TabsTrigger>
        </TabsList>

        {/* Validation Queue */}
        <TabsContent value="validation">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Pending Member Validation</h3>
            {pendingMembers.length === 0 ? (
              <p className="text-gray-400">No pending validations</p>
            ) : (
              <div className="space-y-3">
                {pendingMembers.map((member, index) => (
                  <div key={index} className="bg-[#001a16] border border-[#ffd700] p-4 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <p className="text-white font-semibold">{member.name}</p>
                      <p className="text-gray-400 text-sm">{member.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => validateMember(index)}
                      className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] w-full md:w-auto cursor-pointer rounded px-4 py-2"
                    >
                      <CheckCircle className="w-4 h-4 mr-2 inline" />
                      Validate & Generate ID
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Welfare Audit */}
        <TabsContent value="welfare-audit">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Welfare Tickets Awaiting Audit</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ffd700] hover:bg-[#001a16]">
                    <TableHead className="text-[#ffd700]">Ticket ID</TableHead>
                    <TableHead className="text-[#ffd700]">Member</TableHead>
                    <TableHead className="text-[#ffd700]">Category</TableHead>
                    <TableHead className="text-[#ffd700]">Amount</TableHead>
                    <TableHead className="text-[#ffd700]">Balance</TableHead>
                    <TableHead className="text-[#ffd700]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTickets.map(ticket => {
                    const member = members.find(m => m.id === ticket.memberId);
                    return (
                      <TableRow key={ticket.ticketId} className="border-[#ffd700]/30 hover:bg-[#001a16]">
                        <TableCell className="text-white">{ticket.ticketId}</TableCell>
                        <TableCell className="text-white">{ticket.memberName}</TableCell>
                        <TableCell className="text-gray-400">{ticket.category}</TableCell>
                        <TableCell className="text-[#ffd700]">{formatCurrency(ticket.requestedAmount)}</TableCell>
                        <TableCell className="text-green-500">{formatCurrency(member?.balance || 0)}</TableCell>
                        <TableCell className="space-x-2">
                          <button
                            type="button"
                            onClick={() => approveTicket(ticket.ticketId)}
                            className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] text-xs cursor-pointer rounded px-3 py-2"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => declineTicket(ticket.ticketId)}
                            className="bg-red-600 text-white hover:bg-red-500 text-xs cursor-pointer rounded px-3 py-2"
                          >
                            Decline
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pendingTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                        No tickets awaiting audit
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Manual Entry */}
        <TabsContent value="manual">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Manual Transaction Entry</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm block mb-2">Executive Master Key</label>
                <Input
                  type="password"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  placeholder="Enter master key"
                  className="bg-[#001a16] border-[#ffd700] text-white"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-2">Search Member Name or ID</label>
                <Input
                  value={manualSearchQuery}
                  onChange={(e) => {
                    setManualSearchQuery(e.target.value);
                    setManualSearchIndex(-1);
                    if (!e.target.value) {
                      setManualMemberId('');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (manualSearchResults.length === 0) return;

                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setManualSearchIndex((prev) => Math.min(prev + 1, manualSearchResults.length - 1));
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setManualSearchIndex((prev) => Math.max(prev - 1, 0));
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const selected = manualSearchResults[manualSearchIndex >= 0 ? manualSearchIndex : 0];
                      if (selected) {
                        selectManualMember(selected.id, `${selected.name} (${selected.id})`);
                      }
                    }
                    if (e.key === 'Escape') {
                      setManualSearchIndex(-1);
                    }
                  }}
                  placeholder="Search by name or ID"
                  className="bg-[#001a16] border-[#ffd700] text-white"
                  autoComplete="off"
                />
                {showManualSearchResults && (
                  <div className="mt-2 max-h-52 overflow-y-auto rounded border border-[#ffd700]/50 bg-[#001a16]">
                    {manualSearchResults.map((member, index) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => selectManualMember(member.id, `${member.name} (${member.id})`)}
                        className={`w-full text-left px-3 py-2 text-sm ${manualSearchIndex === index ? 'bg-[#ffd700]/30 text-white' : 'text-white hover:bg-[#ffd700]/20'}`}
                      >
                        {member.name} — {member.id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-2">Member ID</label>
                <Input
                  value={manualMemberId}
                  onChange={(e) => setManualMemberId(e.target.value.toUpperCase())}
                  placeholder="HCC-CMO-26-XXXX"
                  className="bg-[#001a16] border-[#ffd700] text-white"
                  disabled={masterKey !== MASTER_KEY}
                />
                {selectedManualMember && (
                  <p className="mt-2 text-sm text-gray-300">
                    Selected: <span className="text-[#ffd700]">{selectedManualMember.name}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-2">Amount (₦)</label>
                <Input
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-[#001a16] border-[#ffd700] text-white"
                  disabled={masterKey !== MASTER_KEY}
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-2">Purpose</label>
                <Input
                  value={manualPurpose}
                  onChange={(e) => setManualPurpose(e.target.value)}
                  placeholder="e.g., Welfare Dues, Development Fund"
                  className="bg-[#001a16] border-[#ffd700] text-white"
                  disabled={masterKey !== MASTER_KEY}
                />
              </div>
              <button
                type="button"
                onClick={handleManualTransaction}
                className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] cursor-pointer rounded px-4 py-2"
                disabled={masterKey !== MASTER_KEY}
              >
                <DollarSign className="w-4 h-4 mr-2 inline" />
                Record Transaction
              </button>
            </div>
          </Card>
        </TabsContent>

        {/* Record Income */}
        <TabsContent value="income">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Record General Income</h3>
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
                <label className="text-gray-300 text-sm block mb-2">Income Description</label>
                <Input
                  value={incomePurpose}
                  onChange={(e) => setIncomePurpose(e.target.value)}
                  placeholder="e.g., Fundraiser, Donations, Grants"
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
              <button
                type="button"
                onClick={handleRecordIncome}
                className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] cursor-pointer rounded px-4 py-2"
              >
                <DollarSign className="w-4 h-4 mr-2 inline" />
                Save Income Entry
              </button>
            </div>
          </Card>
        </TabsContent>

        {/* Record Expense */}
        <TabsContent value="expense">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Record Expense</h3>
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
                <label className="text-gray-300 text-sm block mb-2">Expense Description</label>
                <Input
                  value={expensePurpose}
                  onChange={(e) => setExpensePurpose(e.target.value)}
                  placeholder="e.g., Event Costs, Supplies, Disbursement"
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
              <button
                type="button"
                onClick={handleRecordExpense}
                className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] cursor-pointer rounded px-4 py-2"
              >
                <DollarSign className="w-4 h-4 mr-2 inline" />
                Save Expense Entry
              </button>
            </div>
          </Card>
        </TabsContent>

        {/* Bulk Upload */}
        <TabsContent value="bulk">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Bulk CSV Upload</h3>
            <div className="space-y-4">
              <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-gray-300 text-sm mb-2">CSV Format:</p>
                <code className="text-xs text-[#ffd700] block bg-[#002520] p-2 rounded">
                  MemberID, Amount, Purpose<br/>
                  HCC-CMO-26-0001, 5000, Welfare Dues<br/>
                  HCC-CMO-26-0002, 3000, Development Fund
                </code>
              </div>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="bg-[#001a16] border-[#ffd700] text-white cursor-pointer"
              />
              <button
                type="button"
                onClick={handleCsvUpload}
                className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] cursor-pointer rounded px-4 py-2"
                disabled={!csvFile}
              >
                <Upload className="w-4 h-4 mr-2 inline" />
                Process CSV File
              </button>
            </div>
          </Card>
        </TabsContent>

        {/* Financial Ledger */}
        <TabsContent value="ledger">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#ffd700]">Unified Financial Timeline</h3>
              <button
                type="button"
                onClick={() => window.print()}
                className="border border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] cursor-pointer rounded px-4 py-2"
              >
                <FileText className="w-4 h-4 mr-2 inline" />
                Print Statement
              </button>
            </div>
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
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.type === 'income' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {item.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </TableCell>
                      <TableCell className="text-white">
                        {item.type === 'income' ? `Payment from ${item.memberId}` : item.purpose}
                      </TableCell>
                      <TableCell className="text-green-500 font-semibold">
                        {item.type === 'income' ? formatCurrency(item.amount) : '-'}
                      </TableCell>
                      <TableCell className="text-red-500 font-semibold">
                        {item.type === 'expense' ? formatCurrency(item.amount) : '-'}
                      </TableCell>
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
                <p className="text-[#ffd700] text-sm mb-1">Net Balance</p>
                <p className="text-white text-xl font-bold">{formatCurrency(totalSessionCash - totalExpenses)}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Post Announcement</h3>
            <div className="space-y-4 mb-6">
              <Input
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="Announcement Title"
                className="bg-[#001a16] border-[#ffd700] text-white"
              />
              <textarea
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="Announcement Content"
                className="w-full bg-[#001a16] border border-[#ffd700] text-white p-3 rounded min-h-[120px]"
              />
              <button
                type="button"
                onClick={postAnnouncement}
                className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] cursor-pointer rounded px-4 py-2"
              >
                <Megaphone className="w-4 h-4 mr-2 inline" />
                Publish Announcement
              </button>
            </div>
            <div className="space-y-3">
              <h4 className="text-[#ffd700] font-semibold">Recent Announcements</h4>
              {announcements.slice(0, 5).map(ann => (
                <div key={ann.id} className="bg-[#001a16] border border-[#ffd700] p-3 rounded">
                  <h5 className="text-white font-semibold mb-1">{ann.title}</h5>
                  <p className="text-gray-400 text-sm mb-2">{ann.content}</p>
                  <p className="text-xs text-gray-500">{formatDate(ann.timestamp)}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};