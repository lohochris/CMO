import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DollarSign,
  ShieldCheck,
  Loader2,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Save,
  X,
  Download,
  Printer,
  Filter,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useApp } from '../../../contexts/AppContext';
import { Button } from '../../../app/components/ui/button';
import { Input } from '../../../app/components/ui/input';
import { Card } from '../../../app/components/ui/card';
import { toast } from 'sonner';
import { ProfilePictureUploader } from '../../../app/components/common/ProfilePictureUploader';
import { uploadProfilePicture } from '../../../utils/supabaseHelpers';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TransactionType = 'Revenue' | 'Expenditure';
type LedgerCategory =
  | 'Registration_Fee'
  | 'Sponsorship'
  | 'Equipment_Expense'
  | 'Facility_Booking'
  | 'Prize_Fund'
  | 'Medical_Expense'
  | 'Transport'
  | 'Miscellaneous';

interface LedgerEntry {
  id: string;
  transaction_type: TransactionType;
  category: LedgerCategory;
  amount: number;
  description: string;
  reference_id: string;
  transaction_date: string;
  logged_by: string;
  tournament_id: string | null;
  created_at: string;
  tournament?: { title: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<LedgerCategory, { label: string; icon: string }> = {
  Registration_Fee: { label: 'Registration Fee', icon: '🏷️' },
  Sponsorship: { label: 'Sponsorship', icon: '🤝' },
  Equipment_Expense: { label: 'Equipment Expense', icon: '⚙️' },
  Facility_Booking: { label: 'Facility Booking', icon: '🏟️' },
  Prize_Fund: { label: 'Prize Fund', icon: '🏆' },
  Medical_Expense: { label: 'Medical Expense', icon: '🩺' },
  Transport: { label: 'Transport', icon: '🚌' },
  Miscellaneous: { label: 'Miscellaneous', icon: '📋' },
};

const LEDGER_CATEGORIES: LedgerCategory[] = [
  'Registration_Fee', 'Sponsorship', 'Equipment_Expense', 'Facility_Booking',
  'Prize_Fund', 'Medical_Expense', 'Transport', 'Miscellaneous',
];

const toastStyle = { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' };
const toastErrorStyle = { background: '#1a0000', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatNaira = (amount: number): string =>
  `₦${new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;

const generateRef = (): string =>
  `SPT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

const selectStyle = 'w-full h-9 px-3 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/50 transition-colors';

// ─────────────────────────────────────────────────────────────────────────────
// New Entry Form
// ─────────────────────────────────────────────────────────────────────────────

interface EntryFormProps {
  onClose: () => void;
  onSaved: () => void;
  loggerName: string;
  tournaments: Array<{ id: string; title: string }>;
}

const EntryForm = ({ onClose, onSaved, loggerName, tournaments }: EntryFormProps) => {
  const [txType, setTxType] = useState<TransactionType>('Revenue');
  const [category, setCategory] = useState<LedgerCategory>('Registration_Fee');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [tournamentId, setTournamentId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid positive amount.', { style: toastErrorStyle }); return;
    }
    if (!description.trim()) {
      toast.error('Description is required.', { style: toastErrorStyle }); return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('sports_ledgers').insert([{
        transaction_type: txType,
        category,
        amount: parsedAmount,
        description: description.trim(),
        reference_id: generateRef(),
        transaction_date: txDate,
        logged_by: loggerName,
        tournament_id: tournamentId || null,
      }]);
      if (error) throw error;
      toast.success(`${txType} entry of ${formatNaira(parsedAmount)} recorded.`, { style: toastStyle });
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to record entry.', { style: toastErrorStyle });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-lg bg-[#001a16] border border-[#ffd700]/20 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ffd700]/10 bg-[#002520]">
          <h3 className="text-sm font-bold text-[#ffd700] flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            New Ledger Entry
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">

          {/* Transaction type toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Transaction Type *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setTxType('Revenue'); setCategory('Registration_Fee'); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all duration-150 ${
                  txType === 'Revenue'
                    ? 'bg-emerald-400/15 border-emerald-400/40 text-emerald-400'
                    : 'border-[#ffd700]/10 text-gray-500 hover:text-gray-300 bg-[#002520]'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Revenue
              </button>
              <button
                onClick={() => { setTxType('Expenditure'); setCategory('Equipment_Expense'); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all duration-150 ${
                  txType === 'Expenditure'
                    ? 'bg-red-400/15 border-red-400/40 text-red-400'
                    : 'border-[#ffd700]/10 text-gray-500 hover:text-gray-300 bg-[#002520]'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                Expenditure
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value as LedgerCategory)} className={selectStyle}>
                {LEDGER_CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-[#001a16]">
                    {CATEGORY_META[c].icon} {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Amount (₦) *</label>
              <Input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
                className="bg-[#002520] border-[#ffd700]/20 text-white placeholder:text-gray-600 focus:border-[#ffd700]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide a clear description of this transaction…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-[#ffd700]/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Transaction Date</label>
              <input
                type="date"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Tournament (optional)</label>
              <select value={tournamentId} onChange={e => setTournamentId(e.target.value)} className={selectStyle}>
                <option value="" className="bg-[#001a16]">Not linked</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#001a16]">{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-600">Logged by: <span className="text-gray-400">{loggerName}</span> · Ref auto-generated</p>
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold shadow-lg shadow-[#ffd700]/20"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Recording…</> : <><Save className="w-4 h-4 mr-2" />Record Entry</>}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-[#ffd700]/20 text-gray-400 hover:text-white bg-transparent">Cancel</Button>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const SportsFinancialHub = () => {
  const { currentUser, setCurrentUser, members, setMembers, setSuccess } = useApp();

  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  const handleProfilePictureSave = async (imageDataUrl: string, imageFile: Blob) => {
    if (!currentUser) return;
    try {
      const storageUrl = await uploadProfilePicture(currentUser.id, imageFile, imageDataUrl);
      const finalImageUrl = storageUrl || imageDataUrl;

      const updatedMembers = members.map(m =>
        m.id === currentUser.id ? { ...m, profilePic: finalImageUrl } : m
      );
      setMembers(updatedMembers);
      setCurrentUser({ ...currentUser, profilePic: finalImageUrl });
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      toast.error('Failed to upload profile picture: ' + err.message);
    }
  };

  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);
    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'Treasurer',
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

  const ALLOWED_FINANCIAL_ROLES = [
    'HCC-CMO-EXEC-TR',
    'HCC-CMO-EXEC-FS',
    'HCC-CMO-SPRT-TR', 
    'HCC-CMO-SPRT-FS',
    'HCC-CMO-SPRT-DIR',
    'TREASURER',
    'SPORTS_TREASURER',
    'FINANCIAL_SECRETARY'
  ];

  const role = currentUser?.role?.toUpperCase();
  const officialId = (currentUser?.official_member_id || currentUser?.id || '').toUpperCase();
  const isAuthorised =
    ALLOWED_FINANCIAL_ROLES.includes(officialId) ||
    ALLOWED_FINANCIAL_ROLES.includes(role || '') ||
    role === 'SPORTS_DIRECTOR' ||
    role === 'FIN_SEC' ||
    role === 'CHAIRMAN' ||
    role === 'CMO_CHAIRMAN';

  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sports_treasurer_session_unlocked') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);
    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'Treasurer',
        input_pin: pinInput
      });
      if (error) throw error;
      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('sports_treasurer_session_unlocked', 'true');
        setPinInput("");
      } else {
        setPinError("Invalid Executive Security PIN. Access Denied.");
      }
    } catch (error: any) {
      console.error("Security Gateway Exception:", error.message);
      setPinError("Verification gateway encountered an error.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleLockDashboard = () => {
    setIsExecutiveUnlocked(false);
    sessionStorage.removeItem('sports_treasurer_session_unlocked');
  };

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [tournaments, setTournaments] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<TransactionType | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<LedgerCategory | 'All'>('All');
  const [filterTournament, setFilterTournament] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const loggerName = currentUser?.name ?? currentUser?.full_name ?? 'Officer';

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ledgerData, error: ledgerErr }, { data: tData, error: tErr }] = await Promise.all([
        supabase
          .from('sports_ledgers')
          .select(`*, tournament:sports_tournaments(title)`)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('sports_tournaments').select('id, title').order('created_at', { ascending: false }),
      ]);
      if (ledgerErr) throw ledgerErr;
      if (tErr) throw tErr;
      setEntries((ledgerData as unknown as LedgerEntry[]) ?? []);
      setTournaments((tData as Array<{ id: string; title: string }>) ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load financial data.', { style: toastErrorStyle });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived financials ─────────────────────────────────────────────────────
  const totalRevenue = entries
    .filter(e => e.transaction_type === 'Revenue')
    .reduce((s, e) => s + e.amount, 0);

  const totalExpenditure = entries
    .filter(e => e.transaction_type === 'Expenditure')
    .reduce((s, e) => s + e.amount, 0);

  const netBalance = totalRevenue - totalExpenditure;

  // Category breakdown
  const categoryTotals = LEDGER_CATEGORIES.map(cat => {
    const rev = entries.filter(e => e.category === cat && e.transaction_type === 'Revenue').reduce((s, e) => s + e.amount, 0);
    const exp = entries.filter(e => e.category === cat && e.transaction_type === 'Expenditure').reduce((s, e) => s + e.amount, 0);
    return { cat, rev, exp, total: rev - exp };
  }).filter(c => c.rev > 0 || c.exp > 0);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = entries.filter(e => {
    if (filterType !== 'All' && e.transaction_type !== filterType) return false;
    if (filterCategory !== 'All' && e.category !== filterCategory) return false;
    if (filterTournament && e.tournament_id !== filterTournament) return false;
    if (dateFrom && e.transaction_date < dateFrom) return false;
    if (dateTo && e.transaction_date > dateTo) return false;
    return true;
  });

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Reference ID', 'Date', 'Type', 'Category', 'Description', 'Amount (₦)', 'Tournament', 'Logged By'];
    const rows = filtered.map(e => [
      e.reference_id,
      e.transaction_date,
      e.transaction_type,
      CATEGORY_META[e.category]?.label ?? e.category,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount.toFixed(2),
      (e.tournament as any)?.title ?? '',
      e.logged_by,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CMO_Sports_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully.', { style: toastStyle });
  };

  const handlePrint = () => {
    window.print();
  };

  // ── Access Guard ────────────────────────────────────────────────────────────
  if (!isAuthorised) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="max-w-md w-full bg-[#002520] border border-red-500/30 p-8 text-center rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <ShieldCheck className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Restricted</h2>
          <p className="text-gray-400 text-sm">
            The Sports Financial Hub is restricted to <span className="text-[#ffd700] font-semibold">Treasurers</span>,
            Financial Secretaries, Sports Directors, and executive administration.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">

      {showForm && (
        <EntryForm
          onClose={() => setShowForm(false)}
          onSaved={fetchData}
          loggerName={loggerName}
          tournaments={tournaments}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sports Financial Hub</h1>
            <p className="text-xs text-gray-400 mt-0.5">Revenue, expenditure auditing & financial reporting</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#ffd700]/20 text-[#ffd700] text-sm hover:bg-[#ffd700]/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {isExecutiveUnlocked && (
            <>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-400/30 text-emerald-400 text-sm hover:bg-emerald-400/10 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600/30 text-gray-400 text-sm hover:bg-gray-600/10 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold shadow-lg shadow-[#ffd700]/20"
                size="sm"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                New Entry
              </Button>
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
            </>
          )}
        </div>
      </div>

      {currentUser && (
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 rounded-xl shadow-lg">
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
                            <input type="password" maxLength={6} placeholder="••••••" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))} className="w-full bg-[#001411] border border-gray-700 text-white p-2 rounded text-sm text-center font-mono focus:border-[#ffd700] focus:outline-none" required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-400">New Secret PIN</label>
                            <input type="password" maxLength={6} placeholder="••••••" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} className="w-full bg-[#001411] border border-gray-700 text-white p-2 rounded text-sm text-center font-mono focus:border-[#ffd700] focus:outline-none" required />
                          </div>
                        </div>
                        {pinChangeError && <p className="text-red-400 text-xs font-semibold text-center">{pinChangeError}</p>}
                        {pinChangeSuccess && <p className="text-green-400 text-xs font-semibold text-center">PIN successfully updated!</p>}
                        <button type="submit" disabled={isSubmittingPinChange || newPin.length < 4 || currentPin.length < 4} className="w-full bg-[#ffd700] text-[#001a16] font-bold text-xs py-2 rounded hover:bg-[#e6c200] transition-colors disabled:opacity-40">
                          {isSubmittingPinChange ? "Processing Update..." : "Confirm Security Change"}
                        </button>
                      </form>
                    )}
                  </>
                }
              />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold text-white">{currentUser.full_name || currentUser.name}</h3>
              <p className="text-[#ffd700] text-xs font-semibold uppercase tracking-wider mt-1">
                {currentUser.office_title || 'Treasurer Workspace'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Revenue vs Expenditure Dashboard ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <Card className="bg-[#001a16] border border-emerald-400/20 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 tracking-tight">
            {isExecutiveUnlocked ? (
              formatNaira(totalRevenue)
            ) : (
              <span className="tracking-widest text-[#ffd700]/40">••••••</span>
            )}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {entries.filter(e => e.transaction_type === 'Revenue').length} transactions
          </p>
        </Card>

        {/* Total Expenditure */}
        <Card className="bg-[#001a16] border border-red-400/20 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Expenditure</span>
            <div className="w-8 h-8 rounded-lg bg-red-400/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-400 tracking-tight">
            {isExecutiveUnlocked ? (
              formatNaira(totalExpenditure)
            ) : (
              <span className="tracking-widest text-[#ffd700]/40">••••••</span>
            )}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {entries.filter(e => e.transaction_type === 'Expenditure').length} transactions
          </p>
        </Card>

        {/* Net Balance */}
        <Card className={`bg-[#001a16] border rounded-2xl p-5 shadow-xl ${netBalance >= 0 ? 'border-[#ffd700]/30' : 'border-orange-400/30'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Net Balance</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${netBalance >= 0 ? 'bg-[#ffd700]/10' : 'bg-orange-400/10'}`}>
              <BarChart3 className={`w-4 h-4 ${netBalance >= 0 ? 'text-[#ffd700]' : 'text-orange-400'}`} />
            </div>
          </div>
          <p className={`text-2xl font-black tracking-tight ${netBalance >= 0 ? 'text-[#ffd700]' : 'text-orange-400'}`}>
            {isExecutiveUnlocked ? (
              <>{netBalance < 0 ? '−' : ''}{formatNaira(Math.abs(netBalance))}</>
            ) : (
              <span className="tracking-widest text-[#ffd700]/40">••••••</span>
            )}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {netBalance >= 0 ? 'Surplus position' : 'Deficit position'}
          </p>
        </Card>
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
            <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to view financial transaction streams and breakdown statistics.</p>
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

      {/* ── Category Breakdown ── */}
      {categoryTotals.length > 0 && (
        <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#ffd700]" />
            Category Breakdown
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categoryTotals.map(({ cat, rev, exp }) => (
              <div key={cat} className="bg-[#002520] rounded-xl p-3 border border-[#ffd700]/10">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <span>{CATEGORY_META[cat].icon}</span>
                  <span className="truncate">{CATEGORY_META[cat].label}</span>
                </p>
                {rev > 0 && <p className="text-xs text-emerald-400 font-mono">+{formatNaira(rev)}</p>}
                {exp > 0 && <p className="text-xs text-red-400 font-mono">−{formatNaira(exp)}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Filter Controls ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 p-1 bg-[#001a16] border border-[#ffd700]/10 rounded-xl">
            {(['All', 'Revenue', 'Expenditure'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  filterType === t
                    ? t === 'Revenue'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : t === 'Expenditure'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-[#ffd700] text-[#001a16]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showFilters
                ? 'border-[#ffd700]/40 text-[#ffd700] bg-[#ffd700]/5'
                : 'border-[#ffd700]/20 text-gray-400 hover:text-white hover:border-[#ffd700]/30'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#001a16] border border-[#ffd700]/10 rounded-xl">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value as LedgerCategory | 'All')}
                className="w-full h-8 px-2 rounded-lg bg-[#002520] border border-[#ffd700]/15 text-white text-xs focus:outline-none"
              >
                <option value="All">All Categories</option>
                {LEDGER_CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-[#001a16]">{CATEGORY_META[c].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tournament</label>
              <select
                value={filterTournament}
                onChange={e => setFilterTournament(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-[#002520] border border-[#ffd700]/15 text-white text-xs focus:outline-none"
              >
                <option value="">All Tournaments</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#001a16]">{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-[#002520] border border-[#ffd700]/15 text-white text-xs focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-[#002520] border border-[#ffd700]/15 text-white text-xs focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Audit Stream Table ── */}
      <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl overflow-hidden shadow-xl" ref={tableRef}>
        <div className="px-6 py-4 border-b border-[#ffd700]/10 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#ffd700]" />
            Audit Stream
          </h2>
          <span className="text-xs text-gray-500 bg-[#002520] px-2.5 py-1 rounded-full border border-[#ffd700]/10">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-sm">Loading financial records…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-600">
            <Receipt className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">No transactions match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#ffd700]/10 bg-[#002520]/40">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffd700]/5">
                {filtered.map(entry => {
                  const isRevenue = entry.transaction_type === 'Revenue';
                  const catMeta = CATEGORY_META[entry.category];
                  return (
                    <tr key={entry.id} className="hover:bg-[#002520]/40 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-400">
                          {new Date(entry.transaction_date).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-mono text-gray-500 bg-[#002520] px-2 py-0.5 rounded">
                          {entry.reference_id}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-300 flex items-center gap-1">
                          <span>{catMeta?.icon}</span>
                          <span>{catMeta?.label ?? entry.category}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white max-w-xs truncate">{entry.description}</p>
                        {(entry.tournament as any)?.title && (
                          <p className="text-xs text-[#ffd700]/50 mt-0.5">{(entry.tournament as any).title}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-mono font-bold text-base ${isRevenue ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isRevenue ? '+' : '−'}{formatNaira(entry.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          isRevenue
                            ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                            : 'bg-red-400/10 border-red-400/30 text-red-400'
                        }`}>
                          {isRevenue
                            ? <ArrowUpRight className="w-3 h-3" />
                            : <ArrowDownRight className="w-3 h-3" />}
                          {entry.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-500">{entry.logged_by}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer totals for filtered view */}
              <tfoot>
                <tr className="border-t border-[#ffd700]/20 bg-[#002520]/60">
                  <td colSpan={4} className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Filtered Totals ({filtered.length} rows)
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(() => {
                      const rev = filtered.filter(e => e.transaction_type === 'Revenue').reduce((s, e) => s + e.amount, 0);
                      const exp = filtered.filter(e => e.transaction_type === 'Expenditure').reduce((s, e) => s + e.amount, 0);
                      const net = rev - exp;
                      return (
                        <div className="space-y-0.5">
                          {rev > 0 && <p className="text-xs font-mono text-emerald-400">+{formatNaira(rev)}</p>}
                          {exp > 0 && <p className="text-xs font-mono text-red-400">−{formatNaira(exp)}</p>}
                          <p className={`text-sm font-black font-mono ${net >= 0 ? 'text-[#ffd700]' : 'text-orange-400'}`}>
                            {net < 0 ? '−' : ''}{formatNaira(Math.abs(net))}
                          </p>
                        </div>
                      );
                    })()}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      </>
      )}
    </div>
  );
};

export default SportsFinancialHub;
