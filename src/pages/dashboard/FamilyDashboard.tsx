import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { Users, Trophy, ShieldCheck, Wallet, Heart, Receipt, Megaphone, TrendingUp, FileText, DollarSign, Printer } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Family, FamilyWelfareTicket, FamilyTransaction, FamilyExpense, FamilyAnnouncement } from '../../types';
import { calculateTotal, formatCurrency, formatDate, getCombinedTransactions, formatDateTime } from '../../utils/helpers';
import { generateTicketId, generateExpenseId, generateAnnouncementId } from '../../utils/idGenerators';

const familyList: Family[] = ['Wisdom', 'Honour', 'Integrity', 'Talent'];
const familyColors: Record<Family, string> = {
  Wisdom: 'text-blue-300',
  Honour: 'text-yellow-300',
  Integrity: 'text-green-300',
  Talent: 'text-purple-300'
};

const familyDescriptions: Record<Family, string> = {
  Wisdom: 'Stewardship, mentorship and financial discipline for every member.',
  Honour: 'Community trust, honor and exemplary leadership in service.',
  Integrity: 'Clear accountability, transparency, and family cohesion.',
  Talent: 'Creative planning, fellowship activation and event support.'
};

const familyDashboardPages = {
  Wisdom: { chairman: 'familyWisdomChairman', secretary: 'familyWisdomSecretary' },
  Honour: { chairman: 'familyHonourChairman', secretary: 'familyHonourSecretary' },
  Integrity: { chairman: 'familyIntegrityChairman', secretary: 'familyIntegritySecretary' },
  Talent: { chairman: 'familyTalentChairman', secretary: 'familyTalentSecretary' }
} as const;

const FAMILY_ROLES = {
  familyChairman: 'family_chairman',
  familySecretary: 'family_secretary'
};

export const FamilyHub = () => {
  const { members, currentUser, setCurrentPage } = useApp();

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-2">Family Hub</h2>
        <p className="text-gray-400">Explore the four families and open the matched subgroup dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {familyList.map((family) => {
          const familyMembers = members.filter(m => m.family === family);
          const chairman = familyMembers.find(m => m.role === 'family_chairman');
          const secretary = familyMembers.find(m => m.role === 'family_secretary');
          const isCurrentFamily = currentUser?.family === family;

          return (
            <Card key={family} className="bg-[#002520] border-2 border-[#ffd700] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-xl font-bold ${familyColors[family]}`}>{family} Family</h3>
                  <p className="text-gray-400 text-sm">{familyMembers.length} members</p>
                </div>
                <Trophy className={`w-7 h-7 ${familyColors[family]}`} />
              </div>
              <p className="text-gray-400 text-sm mb-3">{familyDescriptions[family]}</p>
              <p className="text-gray-300 text-sm mb-4">Chairman: <span className="text-white">{chairman?.name || 'Not assigned'}</span></p>
              <p className="text-gray-300 text-sm mb-4">Secretary: <span className="text-white">{secretary?.name || 'Not assigned'}</span></p>
              {isCurrentFamily && currentUser?.role === 'family_chairman' && (
                <Button onClick={() => setCurrentPage(familyDashboardPages[family].chairman)} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]">
                  Open {family} Chairman Dashboard
                </Button>
              )}
              {isCurrentFamily && currentUser?.role === 'family_secretary' && (
                <Button onClick={() => setCurrentPage(familyDashboardPages[family].secretary)} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]">
                  Open {family} Secretary Dashboard
                </Button>
              )}
              {!isCurrentFamily && (
                <p className="text-gray-500 text-sm">You must belong to this family to access its subgroup dashboard.</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const FamilyDashboardBase = ({ mode, family: dashboardFamily }: { mode: 'chairman' | 'secretary'; family?: Family }) => {
  const {
    members,
    setMembers,
    familyTransactions,
    setFamilyTransactions,
    familyExpenses,
    setFamilyExpenses,
    familyWelfareTickets,
    setFamilyWelfareTickets,
    familyAnnouncements,
    setFamilyAnnouncements,
    currentUser,
    setError,
    setSuccess
  } = useApp();

  const family = dashboardFamily || currentUser?.family;
  const canAccess = currentUser && family &&
    (mode === 'chairman' ? currentUser.role === 'family_chairman' : currentUser.role === 'family_secretary') &&
    currentUser.family === family;
  const familyMembers = members.filter(m => m.family === family);
  const familyTickets = familyWelfareTickets.filter(ticket => ticket.family === family);
  const familyLedger = getCombinedTransactions(
    familyTransactions.filter(tx => tx.family === family),
    familyExpenses.filter(exp => exp.family === family)
  );
  const totalIncome = calculateTotal(familyTransactions.filter(tx => tx.family === family));
  const totalFamilyExpenses = calculateTotal(familyExpenses.filter(exp => exp.family === family));
  const totalMembers = familyMembers.length;

  const [ticketMemberId, setTicketMemberId] = useState('');
  const [ticketCategory, setTicketCategory] = useState('');
  const [ticketAmount, setTicketAmount] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomePurpose, setNewIncomePurpose] = useState('');
  const [newIncomeDate, setNewIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [familyExpenseAmount, setFamilyExpenseAmount] = useState('');
  const [familyExpensePurpose, setFamilyExpensePurpose] = useState('');
  const [familyExpenseDate, setFamilyExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualSearchIndex, setManualSearchIndex] = useState(-1);
  const [manualMemberId, setManualMemberId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualPurpose, setManualPurpose] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  const handleCreateWelfareTicket = () => {
    setError('');
    if (!ticketMemberId || !ticketCategory || !ticketAmount) {
      setError('Please complete ticket details');
      return;
    }

    const member = familyMembers.find(m => m.id === ticketMemberId);
    if (!member) {
      setError('Family member not found');
      return;
    }

    const amount = parseFloat(ticketAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid amount');
      return;
    }

    const ticket: FamilyWelfareTicket = {
      ticketId: generateTicketId(familyTickets.length),
      memberId: member.id,
      memberName: member.name,
      category: ticketCategory,
      requestedAmount: amount,
      status: 'Awaiting Financial Audit',
      createdAt: new Date().toISOString(),
      family: family as Family
    };

    setFamilyWelfareTickets([...familyWelfareTickets, ticket]);
    setSuccess(`Family ticket created: ${ticket.ticketId}`);
    setTicketMemberId('');
    setTicketCategory('');
    setTicketAmount('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSettleFamilyTicket = (ticketId: string) => {
    const ticket = familyTickets.find(t => t.ticketId === ticketId);
    if (!ticket) return;

    const updatedTickets = familyWelfareTickets.map(t =>
      t.ticketId === ticketId
        ? { ...t, status: 'Settled & Cleared' as const, settledAt: new Date().toISOString() }
        : t
    );
    setFamilyWelfareTickets(updatedTickets);

    const expense: FamilyExpense = {
      id: generateExpenseId(),
      amount: ticket.requestedAmount,
      purpose: `Family disbursement ${ticket.ticketId}`,
      date: new Date().toISOString().split('T')[0],
      recordedBy: currentUser?.name || 'Family Treasurer',
      family: family as Family
    };
    setFamilyExpenses([...familyExpenses, expense]);
    setSuccess(`Family ticket ${ticketId} settled and recorded.`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRecordFamilyIncome = () => {
    setError('');
    if (!newIncomeAmount || !newIncomePurpose || !newIncomeDate) {
      setError('Please fill all income fields');
      return;
    }

    const amount = parseFloat(newIncomeAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid amount');
      return;
    }

    const transaction: FamilyTransaction = {
      memberId: 'FAMILY',
      amount,
      purpose: newIncomePurpose,
      timestamp: new Date(newIncomeDate).toISOString(),
      family: family as Family
    };

    setFamilyTransactions([...familyTransactions, transaction]);
    setSuccess(`Family income recorded: ${formatCurrency(amount)}`);
    setNewIncomeAmount('');
    setNewIncomePurpose('');
    setNewIncomeDate(new Date().toISOString().split('T')[0]);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRecordFamilyExpense = () => {
    setError('');
    if (!familyExpenseAmount || !familyExpensePurpose || !familyExpenseDate) {
      setError('Please fill all expense fields');
      return;
    }

    const amount = parseFloat(familyExpenseAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid amount');
      return;
    }

    const expense: FamilyExpense = {
      id: generateExpenseId(),
      amount,
      purpose: familyExpensePurpose,
      date: familyExpenseDate,
      recordedBy: currentUser?.name || 'Family Secretary',
      family: family as Family
    };

    setFamilyExpenses([...familyExpenses, expense]);
    setSuccess(`Family expense recorded: ${formatCurrency(amount)}`);
    setFamilyExpenseAmount('');
    setFamilyExpensePurpose('');
    setFamilyExpenseDate(new Date().toISOString().split('T')[0]);
    setTimeout(() => setSuccess(''), 3000);
  };

  const manualSearchResults = manualSearchQuery.trim()
    ? familyMembers
        .filter(m => `${m.name} ${m.id}`.toLowerCase().includes(manualSearchQuery.toLowerCase()))
        .slice(0, 10)
    : [];
  const selectedManualMember = familyMembers.find(m => m.id === manualMemberId);
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

  const handleManualTransaction = () => {
    setError('');

    // Programmatic Policy Check: Validate role permission matrices to verify identity
    const isAuthorized = currentUser && 
      (currentUser.role === 'family_chairman' || currentUser.role === 'family_secretary') &&
      currentUser.family === family;

    if (!isAuthorized) {
      setError('Authorization Failed: You must be an authorized family leader to register manual transactions.');
      return;
    }

    if (!manualMemberId || !manualAmount || !manualPurpose) {
      setError('Please fill all manual transaction fields');
      return;
    }

    const member = familyMembers.find(m => m.id === manualMemberId);
    if (!member) {
      setError('Family member ID not found');
      return;
    }

    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid amount. Amount must be positive.');
      return;
    }

    const updatedMembers = members.map(m =>
      m.id === manualMemberId
        ? { ...m, balance: m.balance + amount, status: 'Active' as const }
        : m
    );
    setMembers(updatedMembers);

    const transaction: FamilyTransaction = {
      memberId: manualMemberId,
      amount,
      purpose: manualPurpose,
      timestamp: new Date().toISOString(),
      family: family as Family
    };

    setFamilyTransactions([...familyTransactions, transaction]);
    setSuccess(`Manual transaction recorded: ${formatCurrency(amount)} for ${member.name}`);
    setManualMemberId('');
    setManualSearchQuery('');
    setManualAmount('');
    setManualPurpose('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handlePrintLedger = () => {
    window.print();
  };

  const handlePostFamilyAnnouncement = () => {
    if (!announcementTitle || !announcementContent) {
      setError('Please fill title and content');
      return;
    }

    const announcement: FamilyAnnouncement = {
      id: generateAnnouncementId(),
      title: announcementTitle,
      content: announcementContent,
      author: currentUser?.name || 'Family Office',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      family: family as Family
    };

    setFamilyAnnouncements([announcement, ...familyAnnouncements]);
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setSuccess('Family announcement posted');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (!currentUser || !family) {
    return (
      <div className="p-4 md:p-8">
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
          <h2 className="text-2xl font-bold text-[#ffd700] mb-4">Family Dashboard</h2>
          <p className="text-gray-300">You need to be assigned to a family and logged in to access this dashboard.</p>
        </Card>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="p-4 md:p-8">
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
          <h2 className="text-2xl font-bold text-[#ffd700] mb-4">Access Restricted</h2>
          <p className="text-gray-300">Your account does not have permission to manage this family dashboard.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-2">{family} Family {mode === 'chairman' ? 'Chairman' : 'Secretary'} Dashboard</h2>
        <p className="text-gray-400">Manage subgroup finance, welfare, and communications for the {family} Family.</p>
        <p className="text-gray-400 mt-1">{familyDescriptions[family]}</p>
        {/* Role tiles for quick actions */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {mode === 'chairman' ? (
            <>
              <div className="bg-[#001a16] border border-[#ffd700] p-3 rounded text-center">
                <p className="text-sm text-gray-400">Admin</p>
                <p className="text-white font-semibold">Manage Members</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-3 rounded text-center">
                <p className="text-sm text-gray-400">Welfare</p>
                <p className="text-white font-semibold">Approve Requests</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-3 rounded text-center">
                <p className="text-sm text-gray-400">Treasury</p>
                <p className="text-white font-semibold">Authorize Disbursements</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-3 rounded text-center">
                <p className="text-sm text-gray-400">Communications</p>
                <p className="text-white font-semibold">Publish Notices</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#001a16] border border-[#ffd700] p-3 rounded text-center">
                <p className="text-sm text-gray-400">Secretary</p>
                <p className="text-white font-semibold">Minutes & Records</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-3 rounded text-center">
                <p className="text-sm text-gray-400">Finance</p>
                <p className="text-white font-semibold">Collect & Reconcile</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-3 rounded text-center">
                <p className="text-sm text-gray-400">Reports</p>
                <p className="text-white font-semibold">Export Summaries</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-3 rounded text-center">
                <p className="text-sm text-gray-400">Support</p>
                <p className="text-white font-semibold">Member Help</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4">
          <Users className="w-8 h-8 text-[#ffd700] mb-2" />
          <p className="text-gray-400 text-sm">Family Members</p>
          <p className="text-2xl font-bold text-white">{totalMembers}</p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4">
          <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-gray-400 text-sm">Total Income</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalIncome)}</p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4">
          <Receipt className="w-8 h-8 text-red-400 mb-2" />
          <p className="text-gray-400 text-sm">Total Expenses</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalFamilyExpenses)}</p>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[#002520] border border-[#ffd700] flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">Overview</TabsTrigger>
          {mode === 'chairman' && <TabsTrigger value="welfare" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">Welfare & Disbursement</TabsTrigger>}
          <TabsTrigger value="finance" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">Finance</TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">Reports</TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Family Overview</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-gray-400 text-sm">Family Name</p>
                <p className="text-white font-semibold text-lg">{family}</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-gray-400 text-sm">Chairman</p>
                <p className="text-white font-semibold text-lg">{familyMembers.find(m => m.role === 'family_chairman')?.name || 'Unassigned'}</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-gray-400 text-sm">Secretary</p>
                <p className="text-white font-semibold text-lg">{familyMembers.find(m => m.role === 'family_secretary')?.name || 'Unassigned'}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {mode === 'chairman' && (
          <TabsContent value="welfare">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
                <h3 className="text-xl font-bold text-[#ffd700] mb-4">Create Family Welfare Request</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm block mb-2">Family Member</label>
                    <select
                      title="Select family member"
                      value={ticketMemberId}
                      onChange={(e) => setTicketMemberId(e.target.value)}
                      className="w-full bg-[#001a16] border border-[#ffd700] text-white p-2 rounded"
                    >
                      <option value="">Select member</option>
                      {familyMembers.map(member => (
                        <option key={member.id} value={member.id}>{member.name} ({member.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm block mb-2">Category</label>
                    <Input
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      placeholder="e.g., Medical Aid, School Support"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm block mb-2">Amount (₦)</label>
                    <Input
                      type="number"
                      value={ticketAmount}
                      onChange={(e) => setTicketAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>
                  <Button onClick={handleCreateWelfareTicket} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]">
                    Create Family Ticket
                  </Button>
                </div>
              </Card>

              <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
                <h3 className="text-xl font-bold text-[#ffd700] mb-4">Tickets Awaiting Disbursement</h3>
                <div className="space-y-4 max-h-[520px] overflow-y-auto">
                  {familyTickets.filter(ticket => ticket.status !== 'Settled & Cleared').length === 0 ? (
                    <p className="text-gray-400">No active family tickets</p>
                  ) : (
                    familyTickets.filter(ticket => ticket.status !== 'Settled & Cleared').map(ticket => (
                      <div key={ticket.ticketId} className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <div>
                            <p className="text-white font-semibold">{ticket.ticketId}</p>
                            <p className="text-gray-400 text-sm">{ticket.memberName}</p>
                          </div>
                          <span className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded">{ticket.status}</span>
                        </div>
                        <p className="text-[#ffd700] font-semibold mb-2">{formatCurrency(ticket.requestedAmount)}</p>
                        <p className="text-gray-300 text-sm mb-3">{ticket.category}</p>
                        <Button onClick={() => handleSettleFamilyTicket(ticket.ticketId)} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]">
                          Settle & Record Expense
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="finance">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Manual Transaction Entry</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Search family member</label>
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
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Purpose</label>
                  <Input
                    value={manualPurpose}
                    onChange={(e) => setManualPurpose(e.target.value)}
                    placeholder="e.g., Welfare Dues, Development Fund"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
                <Button
                  onClick={handleManualTransaction}
                  className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
                >
                  <DollarSign className="w-4 h-4 mr-2 inline" />
                  Record Manual Entry
                </Button>
              </div>
            </Card>

            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Record Family Income</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Amount (₦)</label>
                  <Input
                    type="number"
                    value={newIncomeAmount}
                    onChange={(e) => setNewIncomeAmount(e.target.value)}
                    className="bg-[#001a16] border-[#ffd700] text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Purpose</label>
                  <Input
                    value={newIncomePurpose}
                    onChange={(e) => setNewIncomePurpose(e.target.value)}
                    className="bg-[#001a16] border-[#ffd700] text-white"
                    placeholder="e.g., Covenant Offering, Event Income"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Date</label>
                  <Input
                    type="date"
                    value={newIncomeDate}
                    onChange={(e) => setNewIncomeDate(e.target.value)}
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
                <Button onClick={handleRecordFamilyIncome} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]">
                  Record Income
                </Button>
              </div>
            </Card>

            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Record Family Expense</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Amount (₦)</label>
                  <Input
                    type="number"
                    value={familyExpenseAmount}
                    onChange={(e) => setFamilyExpenseAmount(e.target.value)}
                    className="bg-[#001a16] border-[#ffd700] text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Purpose</label>
                  <Input
                    value={familyExpensePurpose}
                    onChange={(e) => setFamilyExpensePurpose(e.target.value)}
                    className="bg-[#001a16] border-[#ffd700] text-white"
                    placeholder="e.g., Supplies, Allowance, Disbursement"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Date</label>
                  <Input
                    type="date"
                    value={familyExpenseDate}
                    onChange={(e) => setFamilyExpenseDate(e.target.value)}
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
                <Button onClick={handleRecordFamilyExpense} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]">
                  Record Expense
                </Button>
              </div>
            </Card>
          </div>

          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 mt-6" id="family-ledger-report">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <h3 className="text-xl font-bold text-[#ffd700]">Family Ledger</h3>
              <Button onClick={handlePrintLedger} className="w-full md:w-auto bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]">
                <Printer className="w-4 h-4 mr-2 inline" />
                Print Statement
              </Button>
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
                  {familyLedger.map((item, idx) => (
                    <TableRow key={idx} className="border-[#ffd700]/30 hover:bg-[#001a16]">
                      <TableCell className="text-gray-400 text-sm">{formatDate(item.timestamp)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${item.type === 'income' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {item.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </TableCell>
                      <TableCell className="text-white">{item.purpose}</TableCell>
                      <TableCell className="text-green-500 font-semibold">{item.type === 'income' ? formatCurrency(item.amount) : '-'}</TableCell>
                      <TableCell className="text-red-500 font-semibold">{item.type === 'expense' ? formatCurrency(item.amount) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Family Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-gray-400 text-sm">Top Contributors (by amount)</p>
                <div className="mt-2 space-y-2">
                  {(() => {
                    const txs = familyTransactions.filter(t => t.family === family);
                    const byMember: Record<string, number> = {};
                    txs.forEach(t => { byMember[t.memberId] = (byMember[t.memberId] || 0) + t.amount; });
                    const top = Object.entries(byMember).sort((a,b) => b[1]-a[1]).slice(0,5);
                    if (top.length === 0) return <p className="text-gray-400">No contributions yet</p>;
                    return top.map(([memberId, amt]) => (
                      <div key={memberId} className="flex justify-between items-center">
                        <p className="text-white text-sm">{memberId}</p>
                        <p className="text-green-400 font-semibold">{formatCurrency(amt)}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-gray-400 text-sm">Expense Breakdown</p>
                <div className="mt-2 space-y-2">
                  {(() => {
                    const exps = familyExpenses.filter(e => e.family === family);
                    const byPurpose: Record<string, number> = {};
                    exps.forEach(e => { byPurpose[e.purpose] = (byPurpose[e.purpose] || 0) + e.amount; });
                    const list = Object.entries(byPurpose).sort((a,b) => b[1]-a[1]).slice(0,6);
                    if (list.length === 0) return <p className="text-gray-400">No expenses recorded</p>;
                    return list.map(([purpose, amt]) => (
                      <div key={purpose} className="flex justify-between items-center">
                        <p className="text-white text-sm truncate">{purpose}</p>
                        <p className="text-red-400 font-semibold">{formatCurrency(amt)}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="announcements">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4">Family Announcements</h3>
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
                className="w-full bg-[#001a16] border border-[#ffd700] text-white p-3 rounded min-h-[140px]"
              />
              <Button onClick={handlePostFamilyAnnouncement} className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]">
                <Megaphone className="w-4 h-4 mr-2 inline" />
                Post Announcement
              </Button>
            </div>
            <div className="space-y-4">
              {familyAnnouncements.filter(ann => ann.family === family).map(ann => (
                <div key={ann.id} className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                  <h4 className="text-white font-semibold mb-1">{ann.title}</h4>
                  <p className="text-gray-400 text-sm mb-2">{ann.content}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(ann.timestamp)}</p>
                </div>
              ))}
              {familyAnnouncements.filter(ann => ann.family === family).length === 0 && (
                <p className="text-gray-400">No family announcements yet.</p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const FamilyChairmanDashboard = () => <FamilyDashboardBase mode="chairman" />;
export const FamilySecretaryDashboard = () => <FamilyDashboardBase mode="secretary" />;
export const FamilyWisdomChairmanDashboard = () => <FamilyDashboardBase mode="chairman" family="Wisdom" />;
export const FamilyWisdomSecretaryDashboard = () => <FamilyDashboardBase mode="secretary" family="Wisdom" />;
export const FamilyHonourChairmanDashboard = () => <FamilyDashboardBase mode="chairman" family="Honour" />;
export const FamilyHonourSecretaryDashboard = () => <FamilyDashboardBase mode="secretary" family="Honour" />;
export const FamilyIntegrityChairmanDashboard = () => <FamilyDashboardBase mode="chairman" family="Integrity" />;
export const FamilyIntegritySecretaryDashboard = () => <FamilyDashboardBase mode="secretary" family="Integrity" />;
export const FamilyTalentChairmanDashboard = () => <FamilyDashboardBase mode="chairman" family="Talent" />;
export const FamilyTalentSecretaryDashboard = () => <FamilyDashboardBase mode="secretary" family="Talent" />;

export const FamilyPortal = ({ family }: { family: Family }) => {
  const { members, familyAnnouncements } = useApp();
  
  const familyMembers = members.filter(m => m.family === family);
  const announcements = familyAnnouncements.filter(ann => ann.family === family);
  
  const badgeColors = {
    Wisdom: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Honour: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    Integrity: 'text-green-400 bg-green-500/10 border-green-500/20',
    Talent: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans">
      {/* Premium Glassmorphic Welcome Card */}
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 mb-8 relative overflow-hidden shadow-2xl rounded-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#ffd700]/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className={`w-8 h-8 ${family === 'Honour' ? 'text-yellow-300' : family === 'Wisdom' ? 'text-blue-300' : family === 'Integrity' ? 'text-green-300' : 'text-purple-300'}`} />
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${badgeColors[family]}`}>
              Official Subunit Portal
            </span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-2">
            Welcome to the <span className="text-[#ffd700]">{family} Family</span> Portal
          </h2>
          <p className="text-gray-300 max-w-2xl text-sm md:text-base leading-relaxed">
            Stewardship, accountability, and strong brotherhood. Engage with your family members, stay updated with announcements, and follow unit activities.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Members Directory Card */}
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 shadow-xl lg:col-span-2 rounded-xl">
          <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Family Members Directory
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#ffd700]/30 hover:bg-[#001a16]">
                  <TableHead className="text-[#ffd700]">Name</TableHead>
                  <TableHead className="text-[#ffd700]">Phone Number</TableHead>
                  <TableHead className="text-[#ffd700]">Role</TableHead>
                  <TableHead className="text-[#ffd700]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyMembers.map((member) => (
                  <TableRow key={member.id} className="border-[#ffd700]/10 hover:bg-[#001a16]/60 transition-colors">
                    <TableCell className="text-white font-semibold py-4">{member.name}</TableCell>
                    <TableCell className="text-gray-400 text-sm py-4">{member.phone_number || 'N/A'}</TableCell>
                    <TableCell className="text-gray-300 text-sm py-4">
                      {member.role === 'family_chairman' ? (
                        <span className="text-yellow-400 font-bold">Chairman</span>
                      ) : member.role === 'family_secretary' ? (
                        <span className="text-yellow-400 font-bold">Secretary</span>
                      ) : (
                        <span>Member</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                        member.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {member.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {familyMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                      No members registered in this family yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Local Announcements Card */}
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 shadow-xl rounded-xl">
          <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Family Announcements
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {announcements.map((ann) => (
              <div key={ann.id} className="bg-[#001a16] border border-[#ffd700]/30 hover:border-[#ffd700]/50 p-4 rounded-xl transition-all duration-200 shadow-md">
                <h4 className="text-white font-bold mb-1 text-sm tracking-tight">{ann.title}</h4>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">{ann.content}</p>
                <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-[#ffd700]/10 pt-2">
                  <span className="font-medium">By: {ann.author}</span>
                  <span>{formatDate(ann.timestamp)}</span>
                </div>
              </div>
            ))}
            {announcements.length === 0 && (
              <div className="bg-[#001a16] border border-[#ffd700]/10 p-6 rounded-xl text-center">
                <p className="text-gray-400 text-sm">No announcements for the {family} family yet.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
