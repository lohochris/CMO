import { useState, useEffect } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { Users, CheckCircle, AlertCircle, TrendingUp, DollarSign, Camera, Megaphone, FileText, Upload, Edit, Trash2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { generateMemberId, generateExpenseId } from '../../utils/idGenerators';
import { formatCurrency, formatDate, getCombinedTransactions, calculateTotal, isAdministrativeId } from '../../utils/helpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { supabase } from '../../lib/supabaseClient';
import logoImage from '../../imports/CMO.png';
import { Member, Family, MemberStatus } from '../../types';
import { FinesEscrowVerificationLedger } from '../../app/components/common/FinesEscrowVerificationLedger';


export const FinSecDashboard = () => {
  const {
    members, setMembers,
    transactions, setTransactions,
    welfareTickets, setWelfareTickets,
    expenses, setExpenses,
    announcements, setAnnouncements,
    currentUser, setCurrentUser,
    setError, setSuccess,
    totalIncome,
    totalExpenses,
    vaultBalance,
    refreshDatabase
  } = useApp();

  const [rosterCount, setRosterCount] = useState(0);
  const [dbMembersList, setDbMembersList] = useState<any[]>([]);
  const [rosterList, setRosterList] = useState<any[]>([]);
  const [registrySearch, setRegistrySearch] = useState('');

  useEffect(() => {
    const fetchLiveCounts = async () => {
      try {
        // Fetch all rows from master_roster
        const { data: rosterData, error: rosterErr } = await supabase
          .from('master_roster')
          .select('*');

        if (rosterErr) throw rosterErr;
        setRosterList(rosterData || []);
        setRosterCount(rosterData?.length || 0);

        // Fetch all active profiles currently synced in the members table
        const { data: currentMembers, error: membersErr } = await supabase
          .from('members')
          .select('*');

        if (membersErr) throw membersErr;
        setDbMembersList(currentMembers || []);
      } catch (err: any) {
        console.error('Error fetching live counts:', err);
      }
    };

    fetchLiveCounts();
  }, [members]);

  // Step-up authentication states
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('financial_secretary_session_unlocked') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // PIN modify states
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  // Form States
  const [manualMemberId, setManualMemberId] = useState('');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualSearchIndex, setManualSearchIndex] = useState(-1);
  const [manualAmount, setManualAmount] = useState('');
  const [manualPurpose, setManualPurpose] = useState('');
  const [customLevyNotes, setCustomLevyNotes] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomePurpose, setIncomePurpose] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePurpose, setExpensePurpose] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [decliningTicketId, setDecliningTicketId] = useState<string | null>(null);
  const [declineReasonText, setDeclineReasonText] = useState('');

  // Member editing states
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editMemberFamily, setEditMemberFamily] = useState<Family | ''>('');
  const [editMemberStatus, setEditMemberStatus] = useState<MemberStatus | ''>('');
  const [adminEditLoading, setAdminEditLoading] = useState(false);

  const handleEditMemberSave = async () => {
    if (!editingMember) return;
    setError('');
    setSuccess('');

    if (!editMemberName.trim()) {
      setError('Name is required');
      return;
    }

    setAdminEditLoading(true);
    try {
      const updatePayload = {
        full_name: editMemberName,
        phone_number: editMemberPhone,
        phone: editMemberPhone,
        cmo_family: editMemberFamily || null,
        status: editMemberStatus
      };

      // 1. Update members table
      const { error: memberErr } = await supabase
        .from('members')
        .update(updatePayload)
        .eq('official_member_id', editingMember.id);

      if (memberErr) throw memberErr;

      // 2. Update master_roster table
      const { error: rosterErr } = await supabase
        .from('master_roster')
        .update(updatePayload)
        .eq('official_member_id', editingMember.id);

      if (rosterErr) throw rosterErr;

      // 3. Update local state
      const updatedMembers = members.map(m =>
        m.id === editingMember.id
          ? {
              ...m,
              name: editMemberName,
              full_name: editMemberName,
              phone: editMemberPhone,
              phone_number: editMemberPhone,
              family: editMemberFamily || undefined,
              status: editMemberStatus as any
            }
          : m
      );
      setMembers(updatedMembers);

      setSuccess('✓ Member profile updated successfully!');
      setEditingMember(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to update member:', err);
      setError(err.message || 'Failed to update member.');
    } finally {
      setAdminEditLoading(false);
    }
  };

  // Date range filter states
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-01-01`;
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const humanRoster = members.filter(m => {
    const memberId = m.official_member_id || m.id || '';
    if (memberId.startsWith('HCC-')) return true;
    return !isAdministrativeId(memberId);
  });
  const pendingMembers = humanRoster.filter(m => m.status === 'Pending' || m.status === 'Inactive');
  const activeMembers = humanRoster.filter(m => m.status === 'Active');
  const totalMembersCount = humanRoster.filter(m => m.status !== 'Deceased').length;
  const activeMembersCount = humanRoster.filter(m => m.status === 'Active').length;

  const filteredMembers = humanRoster.filter(m => {
    const q = registrySearch.toLowerCase();
    if (!q) return true;
    return (
      (m.official_member_id || '').toLowerCase().includes(q) ||
      (m.full_name || m.name || '').toLowerCase().includes(q) ||
      (m.phone_number || m.phone || '').toLowerCase().includes(q)
    );
  });
  const pendingTickets = welfareTickets.filter(t => t.status === 'Awaiting Financial Audit' || t.status === 'Pending');
  const totalSessionCash = vaultBalance;

  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date((tx as any).created_at || tx.timestamp);
    const start = new Date(filterStartDate + "T00:00:00");
    const end = new Date(filterEndDate + "T23:59:59");
    return txDate >= start && txDate <= end;
  });

  const filteredIncome = filteredTransactions
    .filter(t => (t as any).transactionType === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const filteredExpenses = filteredTransactions
    .filter(t => (t as any).transactionType === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const manualSearchResults = manualSearchQuery.trim()
    ? rosterList
        .filter(m => {
          const fullName = (m.full_name || '').toLowerCase();
          const officialMemberId = (m.official_member_id || '').toLowerCase();
          const query = manualSearchQuery.toLowerCase();
          
          // Exclude Deceased members and administrative accounts
          const existingMem = members.find(x => (x.official_member_id || x.id) === m.official_member_id);
          const isDeceased = existingMem?.status === 'Deceased';
          const memberId = m.official_member_id || '';
          const isNotAdmin = memberId.startsWith('HCC-') 
            ? true 
            : !isAdministrativeId(memberId);
          
          return !isDeceased && isNotAdmin && (fullName.includes(query) || officialMemberId.includes(query));
        })
        .slice(0, 10)
    : [];
  const selectedManualMember = rosterList.find(m => m.official_member_id === manualMemberId);
  const showManualSearchResults = Boolean(
    manualSearchQuery.trim() &&
    manualSearchResults.length > 0 &&
    (!selectedManualMember || manualSearchQuery !== `${selectedManualMember.full_name} — ${selectedManualMember.official_member_id}`)
  );

  const selectManualMember = (memberId: string, displayText: string) => {
    setManualMemberId(memberId);
    setManualSearchQuery(displayText);
    setManualSearchIndex(-1);
  };

  const validateMember = async (index: number) => {
    const pendingMember = pendingMembers[index];
    if (!pendingMember) return;

    const memberUUID = pendingMember.id;
    const existingId = pendingMember.official_member_id || pendingMember.id || '';
    const hasValidId = existingId && existingId.startsWith('HCC-');

    let generatedNewId = existingId;
    if (!hasValidId) {
      generatedNewId = generateMemberId(members, pendingMember.family);
    }

    try {
      // Update the registered member's official ID and status
      const { error } = await supabase
        .from('members')
        .update({ 
          official_member_id: generatedNewId, // Write 'HCC-CMO-26-165' here!
          status: 'Active'                    // Set them as validated
        })
        .eq('id', memberUUID);                // Match by their internal primary key UUID

      if (error) {
        console.error("Database update error on validateMember:", error);
        setError(`Database Error: ${error.message}`);
        return;
      }

      const updatedMembers = members.map(m =>
        m === pendingMember
          ? { 
              ...m, 
              id: generatedNewId, 
              official_member_id: generatedNewId, 
              status: 'Active' as const, 
              createdAt: m.createdAt || new Date().toISOString() 
            }
          : m
      );

      setMembers(updatedMembers);
      setSuccess(hasValidId ? `Member validated! ID preserved: ${generatedNewId}` : `Member validated! ID assigned: ${generatedNewId}`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error("Validation error:", err);
      setError(`Validation failed: ${err.message}`);
    }
  };

  const approveTicket = async (ticketId: string) => {
    setError('');
    const ticket = welfareTickets.find(t => t.ticketId === ticketId);
    if (!ticket) {
      setError('Welfare ticket not found.');
      return;
    }

    const member = members.find(m => m.id === ticket.memberId);
    if (!member) {
      setError('Associated member not found.');
      return;
    }

    // 1. Cap Check: Max ₦50,000 disbursement
    if (ticket.requestedAmount > 50000) {
      setError(`Constitutional Policy Violation: Disbursement request of ₦${ticket.requestedAmount.toLocaleString()} exceeds the maximum cap of ₦50,000.`);
      return;
    }

    // 2. Member Balance Check: Dues must be cleared (balance must be >= 0)
    if (member.balance < 0) {
      setError(`Constitutional Policy Violation: Member ${member.name} has outstanding dues (balance: ₦${member.balance.toLocaleString()}). Welfare tickets cannot be approved until balances are cleared.`);
      return;
    }

    try {
      const { error: dbErr } = await supabase
        .from('welfare_tickets')
        .update({
          status: 'Approved',
          approved_at: new Date().toISOString(),
          decline_reason: null
        })
        .eq('ticket_id', ticketId);

      if (dbErr) {
        console.error("Supabase update error on approval:", dbErr);
        setError(`Database Error: ${dbErr.message}`);
        return;
      }

      const updatedTickets = welfareTickets.map(t =>
        t.ticketId === ticketId
          ? { ...t, status: 'Approved' as const, approvedAt: new Date().toISOString(), declineReason: undefined }
          : t
      );
      setWelfareTickets(updatedTickets);
      setSuccess(`Ticket ${ticketId} approved for disbursement`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error("Failed to approve ticket:", err);
      setError(`Failed to approve ticket: ${err.message}`);
    }
  };

  const submitDeclineTicket = async (ticketId: string) => {
    setError('');
    if (!declineReasonText.trim()) {
      setError('Please type a reason for declining this request.');
      return;
    }

    try {
      const { error: dbErr } = await supabase
        .from('welfare_tickets')
        .update({
          status: 'Declined',
          decline_reason: declineReasonText.trim()
        })
        .eq('ticket_id', ticketId);

      if (dbErr) {
        console.error("Supabase update error on decline:", dbErr);
        setError(`Database Error: ${dbErr.message}`);
        return;
      }

      const updatedTickets = welfareTickets.map(t =>
        t.ticketId === ticketId
          ? { ...t, status: 'Declined' as const, declineReason: declineReasonText.trim() }
          : t
      );
      setWelfareTickets(updatedTickets);
      setSuccess(`Ticket ${ticketId} declined successfully.`);
      setDecliningTicketId(null);
      setDeclineReasonText('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error("Failed to decline ticket:", err);
      setError(`Failed to decline ticket: ${err.message}`);
    }
  };

  const handleToggleActiveInactive = async (memberId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    setError('');
    try {
      const { error: dbErr } = await supabase
        .from('members')
        .update({ status: nextStatus })
        .eq('official_member_id', memberId);

      if (dbErr) {
        console.error("Supabase update error on toggle status:", dbErr);
        setError(`Database Error: ${dbErr.message}`);
        return;
      }

      // Update local state context
      const updatedMembers = members.map(m =>
        (m.official_member_id || m.id) === memberId
          ? { ...m, status: nextStatus as any }
          : m
      );
      setMembers(updatedMembers);
      setSuccess(`Member ${memberId} status updated to ${nextStatus}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error("Failed to toggle status:", err);
      setError(`Failed to update status: ${err.message}`);
    }
  };

  const handleMarkDeceased = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to mark this member as Deceased? This will lock their account and freeze their profile.')) {
      return;
    }
    setError('');
    try {
      const { error: dbErr } = await supabase
        .from('members')
        .update({ status: 'Deceased' })
        .eq('official_member_id', memberId);

      if (dbErr) {
        console.error("Supabase update error on mark deceased:", dbErr);
        setError(`Database Error: ${dbErr.message}`);
        return;
      }

      // Update local state context
      const updatedMembers = members.map(m =>
        (m.official_member_id || m.id) === memberId
          ? { ...m, status: 'Deceased' as const }
          : m
      );
      setMembers(updatedMembers);
      setSuccess(`Member ${memberId} marked as Deceased.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error("Failed to mark member as deceased:", err);
      setError(`Failed to mark member as deceased: ${err.message}`);
    }
  };

  const handleManualTransaction = async () => {
    setError('');

    // Security Verification: Require active authenticated Supabase session or validation of administrative credential token
    const isAuthorizedAdmin = currentUser?.id === 'FIN-SEC-2026' || currentUser?.role === 'fin_sec';
    if (!isAuthorizedAdmin) {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) {
        setError('Authorization Failed: You must be signed in to an active session to record manual transactions.');
        return;
      }
    }

    if (!manualMemberId || !manualAmount || !manualPurpose) {
      setError('Please fill all transaction fields');
      return;
    }

    if (manualPurpose === 'Other Levy' && !customLevyNotes.trim()) {
      setError('Please specify the exact reason or title for the Other Levy.');
      return;
    }

    const member = members.find(m => m.id === manualMemberId) || rosterList.find(m => m.official_member_id === manualMemberId);
    if (!member) {
      setError('Member ID not found');
      return;
    }

    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid transaction amount. Amount must be positive.');
      return;
    }

    const selectedMemberId = (member as any).official_member_id || member.id;
    
    // Validate if member is Deceased or Admin
    const actualMember = members.find(m => (m.official_member_id || m.id) === selectedMemberId);
    if (actualMember && actualMember.status === 'Deceased') {
      setError('Constitutional Policy Violation: Cannot record transactions for a Deceased member.');
      return;
    }
    if (isAdministrativeId(selectedMemberId)) {
      setError('Policy Violation: Cannot record transactions for administrative profiles.');
      return;
    }

    const selectedMemberName = (member as any).full_name || (member as any).name || 'Member';
    const amountInput = manualAmount;
    const purposeInput = manualPurpose;

    const { data: insertedData, error: txErr } = await supabase
      .from('transactions')
      .insert([{
        official_member_id: selectedMemberId,
        member_name: selectedMemberName,
        amount: parseFloat(amountInput),
        purpose: purposeInput,
        notes: purposeInput === 'Other Levy' ? customLevyNotes : null,
        transaction_type: 'income',
        recorded_by: 'FIN-SEC-2026',
        status: 'Approved'
      }])
      .select('id, official_member_id, member_name, amount, purpose, notes, transaction_type, created_at');

    if (txErr) {
      console.error("Transaction Insert Error:", txErr);
      setError(`Database Error: ${txErr.message}`);
      return;
    }

    const insertedRow = insertedData && insertedData[0] ? insertedData[0] : null;
    const insertedId = insertedRow ? insertedRow.id : undefined;
    const insertedTimestamp = insertedRow ? insertedRow.created_at : new Date().toISOString();

    // Fetch existing balance, add the new amount, and update both tables
    let currentMemberBalance = 0;
    const { data: dbMem, error: fetchMemErr } = await supabase
      .from('members')
      .select('balance')
      .eq('official_member_id', selectedMemberId)
      .maybeSingle();

    if (fetchMemErr) {
      console.error("Fetch Member Balance Error:", fetchMemErr);
    }

    if (dbMem) {
      currentMemberBalance = parseFloat(dbMem.balance) || 0;
    } else {
      currentMemberBalance = parseFloat(member.balance) || 0;
    }

    const newBalance = (parseFloat(currentMemberBalance as any) || 0) + parseFloat(amountInput);

    const { error: memberUpdateErr } = await supabase.from('members').update({ balance: newBalance }).eq('official_member_id', selectedMemberId);
    if (memberUpdateErr) {
      console.error("Members Balance Update Error:", memberUpdateErr);
    }

    // When any payment is recorded, activate the member
    const { error: statusError } = await supabase
      .from('members')
      .update({ status: 'Active' })
      .eq('official_member_id', selectedMemberId);
    if (statusError) {
      console.error("Status Update Error:", statusError);
    }

    const { error: rosterUpdateErr } = await supabase.from('master_roster').update({ balance: newBalance }).eq('official_member_id', selectedMemberId);
    if (rosterUpdateErr) {
      console.error("Master Roster Balance Update Error:", rosterUpdateErr);
    }

    const updatedMembers = members.map(m =>
      m.id === manualMemberId || m.id === selectedMemberId
        ? { ...m, balance: newBalance, status: 'Active' as const }
        : m
    );
    setMembers(updatedMembers);

    const transaction = {
      id: insertedId,
      memberId: selectedMemberId,
      memberName: selectedMemberName,
      amount,
      purpose: manualPurpose,
      notes: manualPurpose === 'Other Levy' ? customLevyNotes : undefined,
      transactionType: 'income',
      timestamp: insertedTimestamp
    };
    setTransactions([...transactions, transaction]);

    const memberName = (member as any).name || (member as any).full_name || 'Member';
    setSuccess(`Transaction recorded: ${formatCurrency(amount)} for ${memberName}`);
    setManualMemberId('');
    setManualSearchQuery('');
    setCustomLevyNotes('');
    setManualAmount('');
    setManualPurpose('');
    setTimeout(() => setSuccess(''), 3000);
    
    // Refresh to synchronize totals across all dashboards
    await refreshDatabase();
  };

  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editTxPurpose, setEditTxPurpose] = useState('');
  const [editTxNotes, setEditTxNotes] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('');

  const startEditingTx = (txn: any) => {
    setEditingTxId(txn.id);
    setEditTxPurpose(txn.purpose);
    setEditTxNotes(txn.notes || '');
    setEditTxAmount(String(txn.amount));
  };

  const cancelEditingTx = () => {
    setEditingTxId(null);
    setEditTxPurpose('');
    setEditTxNotes('');
    setEditTxAmount('');
  };

  const saveEditingTx = async (txnId: number) => {
    setError('');
    const amt = parseFloat(editTxAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Amount must be positive');
      return;
    }
    if (!editTxPurpose.trim()) {
      setError('Purpose is required');
      return;
    }

    try {
      const { error: updateErr } = await supabase
        .from('transactions')
        .update({
          purpose: editTxPurpose,
          notes: editTxPurpose === 'Other Levy' ? editTxNotes : null,
          amount: amt
        })
        .eq('id', txnId);

      if (updateErr) throw updateErr;

      // Update local transactions state
      setTransactions(prev =>
        prev.map(t =>
          (t as any).id === txnId
            ? { ...t, purpose: editTxPurpose, notes: editTxPurpose === 'Other Levy' ? editTxNotes : undefined, amount: amt }
            : t
        )
      );

      setSuccess('Transaction updated successfully');
      setEditingTxId(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      setError(`Update failed: ${err.message}`);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, official_member_id, member_name, amount, purpose, notes, transaction_type, created_at');
      if (error) throw error;
      if (data) {
        setTransactions(
          data.map((t: any) => ({
            id: t.id,
            memberId: t.official_member_id,
            memberName: t.member_name,
            amount: Number(t.amount),
            purpose: t.purpose,
            notes: t.notes || undefined,
            transactionType: t.transaction_type,
            timestamp: t.created_at
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  const handleDelete = async (transactionId: any) => {
    if (!transactionId) return;
    if (!window.confirm('Are you sure you want to delete this transaction record? This cannot be undone.')) {
      return;
    }

    setError('');
    // 1. Direct database CRUD execution
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) {
      console.error("Database deletion failed:", error);
      setError(`Delete failed: ${error.message}`);
      return;
    }

    setSuccess('Transaction deleted successfully');
    setTimeout(() => setSuccess(''), 3000);

    // 2. Refresh data from the database immediately after deletion to sync all views
    await fetchTransactions();
  };

  const handleRecordIncome = async () => {
    setError('');
    if (!incomeAmount || !incomePurpose || !incomeDate) {
      setError('Please fill all income fields');
      return;
    }

    const amount = parseFloat(incomeAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid income amount. Amount must be positive.');
      return;
    }

    try {
      const { error: txErr } = await supabase
        .from('transactions')
        .insert([{
          official_member_id: 'GENERAL-INCOME',
          member_name: 'CMO General Account',
          amount: parseFloat(incomeAmount),
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

      // Refresh transactions
      await refreshDatabase();
    } catch (err: any) {
      console.error('Record income failed:', err);
      setError(`Record Income failed: ${err.message}`);
    }
  };

  const handleRecordExpense = async () => {
    setError('');
    if (!expenseAmount || !expensePurpose || !expenseDate) {
      setError('Please fill all expense fields');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid expense amount. Amount must be positive.');
      return;
    }

    try {
      const { error: txErr } = await supabase
        .from('transactions')
        .insert([{
          official_member_id: 'GENERAL-EXPENSE',
          member_name: 'CMO Operational Expense',
          amount: parseFloat(expenseAmount),
          purpose: expensePurpose,
          transaction_type: 'expense',
          timestamp: new Date(expenseDate).toISOString(),
          status: 'Approved'
        }]);

      if (txErr) {
        console.error("Expense Insert Error:", txErr);
        setError(`Database Error: ${txErr.message}`);
        return;
      }

      setSuccess(`Expense recorded: ${formatCurrency(amount)}`);
      setExpenseAmount('');
      setExpensePurpose('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh transactions
      await refreshDatabase();
    } catch (err: any) {
      console.error('Record expense failed:', err);
      setError(`Record Expense failed: ${err.message}`);
    }
  };

  // Quote-aware CSV row parser
  const parseCsvRow = (line: string): string[] => {
    const result: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    result.push(cell.trim());
    return result;
  };

  const handleCsvUpload = () => {
    setError('');
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

        // Deduplication set to enforce transactional idempotency
        const existingTxnHashes = new Set(
          transactions.map(t => `${t.memberId}-${t.amount}-${t.purpose}`)
        );

        dataLines.forEach(line => {
          const row = parseCsvRow(line);
          if (row.length < 2) return;

          const memberId = row[0];
          const amountStr = row[1];
          const purpose = row[2] || 'Bulk Upload';

          if (!memberId || !amountStr) return;

          const amount = parseFloat(amountStr);
          // Sanity checks: reject malformed parse values and amount <= 0
          if (isNaN(amount) || amount <= 0) {
            console.warn(`Skipping invalid CSV record: Member ${memberId}, Amount ${amountStr}`);
            return;
          }

          // Idempotency: skip duplicates
          const hash = `${memberId}-${amount}-${purpose}`;
          if (existingTxnHashes.has(hash)) {
            console.warn(`Skipping duplicate transaction from CSV: ${hash}`);
            return;
          }
          existingTxnHashes.add(hash);

          const memberIndex = updatedMembers.findIndex(m => m.id === memberId);
          if (memberIndex === -1) return;

          // Skip if Deceased or Admin
          if (updatedMembers[memberIndex].status === 'Deceased') {
            console.warn(`Skipping CSV transaction for Deceased member: ${memberId}`);
            return;
          }
          if (isAdministrativeId(memberId)) {
            console.warn(`Skipping CSV transaction for administrative profile: ${memberId}`);
            return;
          }

          updatedMembers[memberIndex] = {
            ...updatedMembers[memberIndex],
            balance: updatedMembers[memberIndex].balance + amount,
            status: 'Active'
          };

          // Fire a database update to activate the member
          supabase
            .from('members')
            .update({ status: 'Active' })
            .eq('official_member_id', memberId)
            .then(({ error }) => {
              if (error) console.error("CSV Status Update Error:", error);
            });

          newTransactions.push({
            memberId,
            amount,
            purpose,
            transactionType: 'income',
            timestamp: new Date().toISOString()
          });

          processedCount++;
        });

        setMembers(updatedMembers);
        setTransactions([...transactions, ...newTransactions]);
        setSuccess(`CSV processed: ${processedCount} new transactions recorded!`);
        setCsvFile(null);
        setTimeout(() => setSuccess(''), 5000);
      } catch (err) {
        setError('Error processing CSV file');
      }
    };
    reader.readAsText(csvFile);
  };

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

  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);

    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'Financial_Secretary',
        old_pin: currentPin,
        new_pin: newPin
      });

      if (error) throw error;

      if (isSuccess) {
        setPinChangeSuccess(true);
        setCurrentPin("");
        setNewPin("");
        // Automatically collapse the form after a successful update
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

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);

    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'Financial_Secretary',
        input_pin: pinInput
      });

      if (error) throw error;

      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('financial_secretary_session_unlocked', 'true');
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
    sessionStorage.removeItem('financial_secretary_session_unlocked');
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
      <div className="mb-6 no-print">
        <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-2">Executive Dashboard</h2>
        <p className="text-gray-400">Financial Secretary Control Panel</p>
      </div>

      {/* Profile Management & Summary */}
      {currentUser && (
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 mb-6 rounded-xl shadow-lg no-print">
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
                              placeholder="•••••"
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
                              placeholder="•••••"
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
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Role</p>
                  <p className="text-[#ffd700] font-bold text-sm">FINANCIAL SECRETARY</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Total Members</p>
                  <p className="text-white font-bold text-sm">{totalMembersCount} Registered</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Pending Welfare</p>
                  <p className="text-white font-bold text-sm">{pendingTickets.length} Tickets</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 no-print">
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all cursor-pointer">
          <Users className="w-8 h-8 text-[#ffd700] mb-2" />
          <p className="text-gray-400 text-sm">Total Members</p>
          <p className="text-2xl font-bold text-white">{totalMembersCount}</p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all cursor-pointer">
          <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-gray-400 text-sm">Active Members</p>
          <p className="text-2xl font-bold text-white">{activeMembersCount}</p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all cursor-pointer">
          <AlertCircle className="w-8 h-8 text-yellow-500 mb-2" />
          <p className="text-gray-400 text-sm">Pending Tickets</p>
          <p className="text-2xl font-bold text-white">{pendingTickets.length}</p>
        </Card>
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 hover:scale-105 transition-all cursor-pointer">
          <TrendingUp className="w-8 h-8 text-[#ffd700] mb-2" />
          <p className="text-[#ffd700] text-sm">Session Cash</p>
          <p className="text-xl md:text-2xl font-bold text-white">
            {isExecutiveUnlocked ? (
              formatCurrency(totalSessionCash)
            ) : (
              <span className="text-xl md:text-2xl font-bold tracking-widest text-[#ffd700]/40">••••••</span>
            )}
          </p>
        </Card>
      </div>

      {/* Fines Escrow & Treasury Verification Sub-Ledger */}
      <div className="no-print">
        <FinesEscrowVerificationLedger />
      </div>

      <Tabs defaultValue="validation" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 no-print">
          <TabsList className="bg-[#002520] border border-[#ffd700] flex-wrap mb-0">
            <TabsTrigger value="validation" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
              Validation Queue
            </TabsTrigger>
            <TabsTrigger value="welfare-audit" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
              Welfare Audit
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
              Record Payment
            </TabsTrigger>
            <TabsTrigger value="income" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
              Income Log
            </TabsTrigger>
            <TabsTrigger value="expense" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
              Expense Log
            </TabsTrigger>
            <TabsTrigger value="bulk" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
              Bulk CSV Upload
            </TabsTrigger>
            <TabsTrigger value="ledger" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
              General Ledger
            </TabsTrigger>
            <TabsTrigger value="roster" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
              Membership Registry
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] cursor-pointer">
              Announcements
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
              {/* Padlock Icon SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#ffd700]">Executive Security Gateway</h3>
              <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to unlock administrative features and view the register metrics.</p>
            </div>
            <form onSubmit={handleVerifyPin} className="w-full space-y-4">
              <input
                type="password"
                maxLength={6}
                placeholder="Enter Secret PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))} // Numbers only rule
                className="w-full text-center tracking-widest bg-[#001f1a] border border-[#ffd700] text-white rounded p-3 focus:outline-none text-xl font-mono"
              />
              {pinError && <p className="text-red-400 text-xs font-semibold">{pinError}</p>}
              <button
                type="submit"
                disabled={isVerifyingPin || pinInput.length < 4}
                className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-[#001a16] font-bold py-2.5 rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isVerifyingPin ? "Verifying..." : "Unlock Vault Space"}
              </button>
            </form>
          </div>
        ) : (
          <>
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
                          {decliningTicketId === ticket.ticketId ? (
                            <div className="flex flex-col space-y-2 min-w-[200px]">
                              <textarea
                                value={declineReasonText}
                                onChange={(e) => setDeclineReasonText(e.target.value)}
                                placeholder="Reason for declining..."
                                className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-2 rounded text-xs focus:outline-none focus:border-[#ffd700]"
                                rows={2}
                              />
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => submitDeclineTicket(ticket.ticketId)}
                                  className="bg-red-600 text-white hover:bg-red-500 text-xs cursor-pointer rounded px-2 py-1 flex-1 font-semibold"
                                >
                                  Submit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDecliningTicketId(null);
                                    setDeclineReasonText('');
                                  }}
                                  className="bg-gray-600 text-white hover:bg-gray-500 text-xs cursor-pointer rounded px-2 py-1 flex-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => approveTicket(ticket.ticketId)}
                                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] text-xs cursor-pointer rounded px-3 py-2"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDecliningTicketId(ticket.ticketId);
                                  setDeclineReasonText('');
                                }}
                                className="bg-red-600 text-white hover:bg-red-500 text-xs cursor-pointer rounded px-3 py-2"
                              >
                                Decline
                              </button>
                            </>
                          )}
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
                        selectManualMember(selected.official_member_id, `${selected.full_name} — ${selected.official_member_id}`);
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
                        onClick={() => selectManualMember(member.official_member_id, `${member.full_name} — ${member.official_member_id}`)}
                        className={`w-full text-left px-3 py-2 text-sm ${manualSearchIndex === index ? 'bg-[#ffd700]/30 text-white' : 'text-white hover:bg-[#ffd700]/20'}`}
                      >
                        {member.full_name} — {member.official_member_id}
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
                     Selected: <span className="text-[#ffd700]">{selectedManualMember.full_name}</span>
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
                <select
                  value={manualPurpose}
                  onChange={(e) => {
                    setManualPurpose(e.target.value);
                    if (e.target.value !== 'Other Levy') {
                      setCustomLevyNotes('');
                    }
                  }}
                  className="w-full bg-[#001a16] border border-[#ffd700] text-white p-2 rounded focus:outline-none focus:ring-1 focus:ring-[#ffd700] h-10 cursor-pointer"
                >
                  <option value="" disabled>Select Purpose</option>
                  <option value="Dues">Dues</option>
                  <option value="Harvest Levy">Harvest Levy</option>
                  <option value="Death Levy">Death Levy</option>
                  <option value="Hosting of Deanery">Hosting of Deanery</option>
                  <option value="Fathering Sunday">Fathering Sunday</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Other Levy">Other Levy</option>
                </select>
              </div>
              {manualPurpose === 'Other Levy' && (
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Levy Specification</label>
                  <textarea
                    value={customLevyNotes}
                    onChange={(e) => setCustomLevyNotes(e.target.value)}
                    placeholder="Please specify the exact reason or title for this levy (Required for transparency)"
                    className="w-full bg-[#001a16] border border-[#ffd700] text-white p-3 rounded focus:outline-none focus:ring-1 focus:ring-[#ffd700] min-h-[80px]"
                    required
                  />
                </div>
              )}
              <button
                type="button"
                onClick={handleManualTransaction}
                className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] cursor-pointer rounded px-4 py-2"
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
                  HCC-CMO-26-0002, 3000, "Development Fund, special collection"
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
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6 printable-statement-container">
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body, html, #root, main, .min-h-screen, .p-4, .md\\:p-8 {
                  background: white !important;
                  color: black !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                header, footer, .sticky, .no-print, button, input, select, [role="tablist"], .fixed, button.fixed {
                  display: none !important;
                }
                .mb-6:has(h2), .no-print {
                  display: none !important;
                }
                .printable-statement-container {
                  background: white !important;
                  color: black !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  width: 100% !important;
                }
                /* Target table, signatures, and summary metrics specifically for black text/borders, leaving themed header colors intact */
                .printable-statement-container table,
                .printable-statement-container table *,
                .print-summary-grid,
                .print-summary-grid *,
                .print-signatures-container,
                .print-signatures-container * {
                  color: black !important;
                  border-color: #000000 !important;
                }
                .printable-themed-header {
                  background-color: #002B19 !important;
                  color: white !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .printable-themed-header * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .text-gold-print {
                  color: #FFCC00 !important;
                }
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  margin-top: 10px !important;
                }
                th, td {
                  border: 1px solid #000000 !important;
                  padding: 6px 8px !important;
                  font-size: 11px !important;
                  text-align: left !important;
                }
                th {
                  background-color: #f3f4f6 !important;
                  font-weight: bold !important;
                }
                .print-summary-grid {
                  display: grid !important;
                  grid-template-cols: repeat(3, minmax(0, 1fr)) !important;
                  gap: 1rem !important;
                  margin-top: 1.5rem !important;
                  border-top: 2px solid #000000 !important;
                  padding-top: 1rem !important;
                }
                .print-summary-card {
                  border: 1px solid #000000 !important;
                  padding: 0.5rem !important;
                  text-align: center !important;
                  background: #f9fafb !important;
                }
                .print-summary-card p {
                  margin: 0 !important;
                  font-size: 11px !important;
                }
                .print-summary-card .val {
                  font-size: 14px !important;
                  font-weight: bold !important;
                }
              }
            `}} />

            {/* Print-only Themed Statement Header */}
            <div className="hidden print:block mb-6 bg-[#002B19] border-b-4 border-[#FFCC00] p-6 rounded-t-lg printable-themed-header">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <img
                    src={logoImage}
                    alt="Holy Cross CMO Logo"
                    className="w-14 h-14 rounded-full border-2 border-[#FFCC00] object-cover"
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-[#FFCC00] text-gold-print tracking-wide uppercase font-sans">Catholic Men Organisation</h1>
                    <p className="text-sm text-gray-100 font-semibold font-sans">Holy Cross Parish Chapter, Badawa — Kano Diocese</p>
                    <p className="text-xs text-gray-300 font-medium">Office of the Financial Secretary</p>
                  </div>
                </div>
                <div className="text-right text-white">
                  <p className="text-sm font-bold text-[#FFCC00] text-gold-print uppercase tracking-wider">Financial Statement</p>
                  <p className="text-xs text-gray-200 mt-1 font-semibold">Period: {formatDate(filterStartDate)} to {formatDate(filterEndDate)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Generated: {new Date().toLocaleString('en-US', { hour12: true })}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
              <h3 className="text-xl font-bold text-[#ffd700]">Transaction Ledger & CRUD Manager</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">From:</span>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="bg-[#001a16] border border-[#ffd700] text-white text-sm rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#ffd700]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">To:</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="bg-[#001a16] border border-[#ffd700] text-white text-sm rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#ffd700]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="border border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] cursor-pointer rounded px-4 py-1.5 text-sm flex items-center gap-2 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  Print Statement
                </button>
              </div>
            </div>
            {/* SUB-SECTION A: INFLOWS / INCOME GENERATED */}
            <div className="mb-4 mt-6 border-b border-[#ffd700]/30 print:border-[#002B19] pb-2">
              <h4 className="text-lg font-bold text-[#ffd700] print:text-[#002B19] uppercase tracking-wide">
                SECTION A: INFLOWS / INCOME GENERATED
              </h4>
            </div>
            <div className="overflow-x-auto mb-8">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ffd700] hover:bg-[#001a16]">
                    <TableHead className="text-[#ffd700]">Date & Time</TableHead>
                    <TableHead className="text-[#ffd700]">Member Name</TableHead>
                    <TableHead className="text-[#ffd700]">Member ID</TableHead>
                    <TableHead className="text-[#ffd700]">Purpose & Notes</TableHead>
                    <TableHead className="text-[#ffd700]">Amount (₦)</TableHead>
                    <TableHead className="text-[#ffd700] text-right no-print">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions
                    .filter(tx => tx.transactionType === 'income')
                    .slice()
                    .reverse()
                    .map((transaction) => {
                      const isEditing = editingTxId === transaction.id;
                      let memberName = 'N/A (General Entry)';
                      if (transaction.memberId === 'GENERAL-INCOME') {
                        memberName = 'CMO General Account';
                      } else if (transaction.memberId === 'GENERAL-EXPENSE') {
                        memberName = 'CMO Operational Expense';
                      } else {
                        const member = rosterList.find(r => r.official_member_id === transaction.memberId) || members.find(m => m.id === transaction.memberId);
                        if (member) {
                          memberName = member.full_name || member.name || 'N/A (General Entry)';
                        }
                      }

                      const paymentDate = new Date(transaction.timestamp);
                      const formattedDate = paymentDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) + ' ' + paymentDate.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });

                      return (
                        <TableRow key={transaction.id} className="border-[#ffd700]/30 hover:bg-[#001a16]">
                          <TableCell className="text-gray-400 text-sm">{formattedDate}</TableCell>
                          <TableCell className="text-white font-semibold">{memberName}</TableCell>
                          <TableCell className="text-white font-mono text-sm">{transaction.memberId}</TableCell>
                          <TableCell className="text-white">
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <select
                                  value={editTxPurpose}
                                  onChange={(e) => {
                                    setEditTxPurpose(e.target.value);
                                    if (e.target.value !== 'Other Levy') {
                                      setEditTxNotes('');
                                    }
                                  }}
                                  className="bg-[#001a16] border border-[#ffd700] text-white p-1 rounded text-sm cursor-pointer"
                                >
                                  <option value="Dues">Dues</option>
                                  <option value="Harvest Levy">Harvest Levy</option>
                                  <option value="Death Levy">Death Levy</option>
                                  <option value="Hosting of Deanery">Hosting of Deanery</option>
                                  <option value="Fathering Sunday">Fathering Sunday</option>
                                  <option value="Insurance">Insurance</option>
                                  <option value="Other Levy">Other Levy</option>
                                </select>
                                {editTxPurpose === 'Other Levy' && (
                                  <input
                                    type="text"
                                    value={editTxNotes}
                                    onChange={(e) => setEditTxNotes(e.target.value)}
                                    placeholder="Levy specification"
                                    className="bg-[#001a16] border border-[#ffd700] text-white p-1 rounded text-sm"
                                  />
                                )}
                              </div>
                            ) : (
                              transaction.purpose === 'Other Levy' && transaction.notes
                                ? `Other Levy (${transaction.notes})`
                                : transaction.purpose
                            )}
                          </TableCell>
                          <TableCell className="text-[#ffd700] font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editTxAmount}
                                onChange={(e) => setEditTxAmount(e.target.value)}
                                className="bg-[#001a16] border border-[#ffd700] text-white p-1 rounded text-sm w-24"
                              />
                            ) : (
                              formatCurrency(transaction.amount)
                            )}
                          </TableCell>
                          <TableCell className="text-right no-print">
                            {isEditing ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveEditingTx(transaction.id as number)}
                                  className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 rounded cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingTx}
                                  className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-2 py-1 rounded cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditingTx(transaction)}
                                  className="border border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] p-1.5 rounded cursor-pointer transition-all"
                                  title="Edit"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(transaction.id as number)}
                                  className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white p-1.5 rounded cursor-pointer transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {filteredTransactions.filter(tx => tx.transactionType === 'income').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                        No matching income records registered for this date period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* SUB-SECTION B: OUTFLOWS / OPERATIONAL EXPENSES */}
            <div className="mb-4 mt-8 border-b border-[#ffd700]/30 print:border-[#002B19] pb-2">
              <h4 className="text-lg font-bold text-[#ffd700] print:text-[#002B19] uppercase tracking-wide">
                SECTION B: OUTFLOWS / OPERATIONAL EXPENSES
              </h4>
            </div>
            <div className="overflow-x-auto mb-8">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ffd700] hover:bg-[#001a16]">
                    <TableHead className="text-[#ffd700]">Date & Time</TableHead>
                    <TableHead className="text-[#ffd700]">Member Name</TableHead>
                    <TableHead className="text-[#ffd700]">Member ID</TableHead>
                    <TableHead className="text-[#ffd700]">Purpose & Notes</TableHead>
                    <TableHead className="text-[#ffd700]">Amount (₦)</TableHead>
                    <TableHead className="text-[#ffd700] text-right no-print">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions
                    .filter(tx => tx.transactionType === 'expense')
                    .slice()
                    .reverse()
                    .map((transaction) => {
                      const isEditing = editingTxId === transaction.id;
                      let memberName = 'N/A (General Entry)';
                      if (transaction.memberId === 'GENERAL-INCOME') {
                        memberName = 'CMO General Account';
                      } else if (transaction.memberId === 'GENERAL-EXPENSE') {
                        memberName = 'CMO Operational Expense';
                      } else {
                        const member = rosterList.find(r => r.official_member_id === transaction.memberId) || members.find(m => m.id === transaction.memberId);
                        if (member) {
                          memberName = member.full_name || member.name || 'N/A (General Entry)';
                        }
                      }

                      const paymentDate = new Date(transaction.timestamp);
                      const formattedDate = paymentDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) + ' ' + paymentDate.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });

                      return (
                        <TableRow key={transaction.id} className="border-[#ffd700]/30 hover:bg-[#001a16]">
                          <TableCell className="text-gray-400 text-sm">{formattedDate}</TableCell>
                          <TableCell className="text-white font-semibold">{memberName}</TableCell>
                          <TableCell className="text-white font-mono text-sm">{transaction.memberId}</TableCell>
                          <TableCell className="text-white">
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <select
                                  value={editTxPurpose}
                                  onChange={(e) => {
                                    setEditTxPurpose(e.target.value);
                                    if (e.target.value !== 'Other Levy') {
                                      setEditTxNotes('');
                                    }
                                  }}
                                  className="bg-[#001a16] border border-[#ffd700] text-white p-1 rounded text-sm cursor-pointer"
                                >
                                  <option value="Dues">Dues</option>
                                  <option value="Harvest Levy">Harvest Levy</option>
                                  <option value="Death Levy">Death Levy</option>
                                  <option value="Hosting of Deanery">Hosting of Deanery</option>
                                  <option value="Fathering Sunday">Fathering Sunday</option>
                                  <option value="Insurance">Insurance</option>
                                  <option value="Other Levy">Other Levy</option>
                                </select>
                                {editTxPurpose === 'Other Levy' && (
                                  <input
                                    type="text"
                                    value={editTxNotes}
                                    onChange={(e) => setEditTxNotes(e.target.value)}
                                    placeholder="Levy specification"
                                    className="bg-[#001a16] border border-[#ffd700] text-white p-1 rounded text-sm"
                                  />
                                )}
                              </div>
                            ) : (
                              transaction.purpose === 'Other Levy' && transaction.notes
                                ? `Other Levy (${transaction.notes})`
                                : transaction.purpose
                            )}
                          </TableCell>
                          <TableCell className="text-[#ffd700] font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editTxAmount}
                                onChange={(e) => setEditTxAmount(e.target.value)}
                                className="bg-[#001a16] border border-[#ffd700] text-white p-1 rounded text-sm w-24"
                              />
                            ) : (
                              formatCurrency(transaction.amount)
                            )}
                          </TableCell>
                          <TableCell className="text-right no-print">
                            {isEditing ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveEditingTx(transaction.id as number)}
                                  className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 rounded cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingTx}
                                  className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-2 py-1 rounded cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditingTx(transaction)}
                                  className="border border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16] p-1.5 rounded cursor-pointer transition-all"
                                  title="Edit"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(transaction.id as number)}
                                  className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white p-1.5 rounded cursor-pointer transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {filteredTransactions.filter(tx => tx.transactionType === 'expense').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                        No matching expense records registered for this date period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 print-summary-grid">
              <div className="bg-[#001a16] border border-green-500 p-4 rounded print-summary-card">
                <p className="text-green-500 text-sm mb-1">Total Income</p>
                <p className="text-white text-xl font-bold val">{formatCurrency(filteredIncome)}</p>
              </div>
              <div className="bg-[#001a16] border border-red-500 p-4 rounded print-summary-card">
                <p className="text-red-500 text-sm mb-1">Total Expenses</p>
                <p className="text-white text-xl font-bold val">{formatCurrency(filteredExpenses)}</p>
              </div>
              <div className="bg-[#001a16] border border-[#ffd700] p-4 rounded print-summary-card">
                <p className="text-[#ffd700] text-sm mb-1">Net Balance</p>
                <p className="text-white text-xl font-bold val">{formatCurrency(filteredIncome - filteredExpenses)}</p>
              </div>
            </div>

            {/* Dual Executive Sign-off Footer */}
            <div className="mt-16 hidden print:grid grid-cols-2 gap-12 pt-8 border-t border-dashed border-gray-400 print-signatures-container">
              {/* Left Column: Financial Secretary */}
              <div className="flex flex-col space-y-4">
                <div className="border-b border-gray-900 w-48 h-8"></div>
                <p className="text-sm font-bold text-gray-900">Financial Secretary</p>
                <p className="text-xs text-gray-500">Name: _______________________</p>
                <p className="text-xs text-gray-500">Date: ____ / ____ / 2026</p>
              </div>

              {/* Right Column: Treasurer */}
              <div className="flex flex-col space-y-4 items-end text-right">
                <div className="flex flex-col space-y-4 w-48 items-end">
                  <div className="border-b border-gray-900 w-48 h-8"></div>
                  <p className="text-sm font-bold text-gray-900">CMO Treasurer</p>
                  <p className="text-xs text-gray-500">Name: _______________________</p>
                  <p className="text-xs text-gray-500">Date: ____ / ____ / 2026</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Membership Registry */}
        <TabsContent value="roster">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
                <FileText className="w-5 h-5" /> Holy Cross CMO — Membership Registry
              </h3>
              <span className="text-xs text-gray-500">
                {filteredMembers.length} of {humanRoster.length} member{humanRoster.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="mb-4">
              <Input
                id="registry-search"
                placeholder="Search by member ID, name, or phone number…"
                value={registrySearch}
                onChange={(e) => setRegistrySearch(e.target.value)}
                className="bg-[#001a16] border-[#ffd700]/30 text-white placeholder:text-gray-500 focus:border-[#ffd700] max-w-md"
              />
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#ffd700]/20 hover:bg-[#001a16]/50">
                    <TableHead className="text-[#ffd700]">Member ID</TableHead>
                    <TableHead className="text-[#ffd700]">Full Name</TableHead>
                    <TableHead className="text-[#ffd700]">Phone Number</TableHead>
                    <TableHead className="text-[#ffd700]">Status</TableHead>
                    <TableHead className="text-[#ffd700] text-right">Ledger Balance</TableHead>
                    <TableHead className="text-[#ffd700] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id} className="border-b border-[#ffd700]/10 hover:bg-[#001a16]/50">
                      <TableCell className="text-white font-mono text-xs">{member.official_member_id || member.id}</TableCell>
                      <TableCell className="text-white font-medium">{member.full_name || member.name}</TableCell>
                      <TableCell className="text-gray-300 text-xs">{member.phone_number || member.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          member.status === 'Active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : member.status === 'Deceased'
                            ? 'bg-red-950 text-red-400 border border-red-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}>
                          {member.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#ffd700]">
                        {formatCurrency(member.balance)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMember(member);
                              setEditMemberName(member.full_name || member.name);
                              setEditMemberPhone(member.phone || member.phone_number || '');
                              setEditMemberFamily(member.family || '');
                              setEditMemberStatus(member.status);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-1 px-2 rounded cursor-pointer"
                          >
                            Edit
                          </button>
                          {member.status !== 'Deceased' ? (
                            <div className="flex gap-2">
                              {member.status === 'Active' ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleActiveInactive(member.official_member_id || member.id, member.status)}
                                  className="bg-amber-600 hover:bg-amber-500 text-[#001a16] font-semibold text-xs py-1 px-2 rounded cursor-pointer"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleActiveInactive(member.official_member_id || member.id, member.status)}
                                  className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-semibold text-xs py-1 px-2 rounded cursor-pointer"
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                  type="button"
                                  onClick={() => handleMarkDeceased(member.official_member_id || member.id)}
                                  className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs py-1 px-2 rounded cursor-pointer"
                                >
                                  Mark Deceased
                                </button>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs italic font-bold">Profile Frozen</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                        {registrySearch ? `No members match "${registrySearch}".` : 'No church members found in registry.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
          </>
        )}
      </Tabs>

      {/* Administrative Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans animate-fadeIn">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 max-w-md w-full shadow-2xl rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#ffd700]">Edit Member Details</h3>
              <button 
                onClick={() => setEditingMember(null)}
                className="text-gray-400 hover:text-white transition-colors text-lg"
                aria-label="Close edit member modal"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Full Name</label>
                <Input
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  className="bg-[#001a16] border-[#ffd700]/30 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Phone Number</label>
                <Input
                  value={editMemberPhone}
                  onChange={(e) => setEditMemberPhone(e.target.value)}
                  className="bg-[#001a16] border-[#ffd700]/30 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">CMO Family</label>
                <select
                  value={editMemberFamily}
                  onChange={(e) => setEditMemberFamily(e.target.value as Family)}
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-2 rounded focus:outline-none focus:border-[#ffd700] h-10 cursor-pointer"
                >
                  <option value="">No assigned family</option>
                  <option value="Wisdom">Wisdom Family</option>
                  <option value="Honour">Honour Family</option>
                  <option value="Integrity">Integrity Family</option>
                  <option value="Talent">Talent Family</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Account Status</label>
                <select
                  value={editMemberStatus}
                  onChange={(e) => setEditMemberStatus(e.target.value as MemberStatus)}
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-2 rounded focus:outline-none focus:border-[#ffd700] h-10 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Deceased">Deceased</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button 
                onClick={() => setEditingMember(null)}
                variant="outline"
                className="flex-1 border-[#ffd700]/40 text-gray-300 hover:bg-[#ffd700]/10 hover:text-white"
                disabled={adminEditLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditMemberSave}
                className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold"
                disabled={adminEditLoading}
              >
                {adminEditLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};