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
  Edit3,
  Trash2,
  Tag,
  Users,
  Wrench,
  Building2,
  Trophy,
  Stethoscope,
  Truck,
  FileText,
  Scale,
  CheckCircle2,
  Lock,
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
// Constants & Iconography
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<LedgerCategory, { label: string; icon: any }> = {
  Registration_Fee: { label: 'Registration Fee', icon: Tag },
  Sponsorship: { label: 'Sponsorship', icon: Users },
  Equipment_Expense: { label: 'Equipment Expense', icon: Wrench },
  Facility_Booking: { label: 'Facility Booking', icon: Building2 },
  Prize_Fund: { label: 'Prize Fund', icon: Trophy },
  Medical_Expense: { label: 'Medical Expense', icon: Stethoscope },
  Transport: { label: 'Transport', icon: Truck },
  Miscellaneous: { label: 'Miscellaneous', icon: FileText },
};

const LEDGER_CATEGORIES: LedgerCategory[] = [
  'Registration_Fee', 'Sponsorship', 'Equipment_Expense', 'Facility_Booking',
  'Prize_Fund', 'Medical_Expense', 'Transport', 'Miscellaneous',
];

const toastStyle = { background: '#022014', border: '1px solid rgba(234,179,8,0.4)', color: '#eab308' };
const toastErrorStyle = { background: '#1a0000', border: '1px solid rgba(244,63,94,0.4)', color: '#fb7185' };

const selectStyle = 'w-full h-10 px-3 rounded-xl bg-[#022014] border border-emerald-800 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors cursor-pointer';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatNaira = (amount: number): string =>
  `₦${new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;

const generateRef = (): string =>
  `SPT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

// Computes chronological running balance map for entries
const computeChronologicalEntriesWithBalance = (items: LedgerEntry[]) => {
  const sortedAsc = [...items].sort((a, b) => {
    const d1 = new Date(a.transaction_date).getTime();
    const d2 = new Date(b.transaction_date).getTime();
    if (d1 !== d2) return d1 - d2;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

  let running = 0;
  const mapWithBalance = new Map<string, number>();

  sortedAsc.forEach(entry => {
    if (entry.transaction_type === 'Revenue') {
      running += entry.amount;
    } else {
      running -= entry.amount;
    }
    mapWithBalance.set(entry.id, running);
  });

  return mapWithBalance;
};

// ─────────────────────────────────────────────────────────────────────────────
// Create & Edit Modal Form
// ─────────────────────────────────────────────────────────────────────────────

interface EntryFormProps {
  entryToEdit?: LedgerEntry | null;
  onClose: () => void;
  onSaved: () => void;
  loggerName: string;
  tournaments: Array<{ id: string; title: string }>;
}

const EntryForm = ({ entryToEdit, onClose, onSaved, loggerName, tournaments }: EntryFormProps) => {
  const [txType, setTxType] = useState<TransactionType>(entryToEdit?.transaction_type || 'Revenue');
  const [category, setCategory] = useState<LedgerCategory>(entryToEdit?.category || 'Registration_Fee');
  const [amount, setAmount] = useState(entryToEdit ? entryToEdit.amount.toString() : '');
  const [description, setDescription] = useState(entryToEdit?.description || '');
  const [txDate, setTxDate] = useState(
    entryToEdit?.transaction_date || new Date().toISOString().split('T')[0]
  );
  const [tournamentId, setTournamentId] = useState(entryToEdit?.tournament_id || '');
  const [saving, setSaving] = useState(false);

  const isEditing = !!entryToEdit;

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid positive amount.', { style: toastErrorStyle });
      return;
    }
    if (!description.trim()) {
      toast.error('Description is required.', { style: toastErrorStyle });
      return;
    }

    setSaving(true);
    try {
      if (isEditing && entryToEdit) {
        const { error } = await supabase
          .from('sports_ledgers')
          .update({
            transaction_type: txType,
            category,
            amount: parsedAmount,
            description: description.trim(),
            transaction_date: txDate,
            tournament_id: tournamentId || null,
          })
          .eq('id', entryToEdit.id);

        if (error) throw error;
        toast.success(`Ledger record "${entryToEdit.reference_id}" updated successfully.`, { style: toastStyle });
      } else {
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
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save entry.', { style: toastErrorStyle });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-4 sm:p-6 md:p-8 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:hidden">
      <div className="max-w-lg w-full mx-4 bg-[#032B1B] border border-emerald-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-200 text-left">
        {/* Header */}
        <div className="p-4 sm:p-6 shrink-0 border-b border-emerald-800/50 flex items-center justify-between bg-[#022014]">
          <h3 className="text-sm font-bold text-yellow-500 flex items-center gap-2">
            {isEditing ? <Edit3 className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
            {isEditing ? `Edit Entry: ${entryToEdit?.reference_id}` : 'New Ledger Entry'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar grow">
          {/* Transaction type toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2 uppercase tracking-wider">Transaction Type *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setTxType('Revenue'); if (!isEditing) setCategory('Registration_Fee'); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all duration-150 cursor-pointer ${
                  txType === 'Revenue'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow'
                    : 'border-emerald-800/40 text-gray-400 hover:text-gray-200 bg-[#022014]'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Revenue
              </button>
              <button
                type="button"
                onClick={() => { setTxType('Expenditure'); if (!isEditing) setCategory('Equipment_Expense'); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all duration-150 cursor-pointer ${
                  txType === 'Expenditure'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow'
                    : 'border-emerald-800/40 text-gray-400 hover:text-gray-200 bg-[#022014]'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                Expenditure
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5 uppercase tracking-wider">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value as LedgerCategory)} className={selectStyle}>
                {LEDGER_CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-[#022014]">
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5 uppercase tracking-wider">Amount (₦) *</label>
              <Input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
                className="bg-[#022014] border-emerald-800 text-white placeholder:text-gray-600 focus:border-yellow-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 uppercase tracking-wider">Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide a clear description of this transaction…"
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-[#022014] border border-emerald-800 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5 uppercase tracking-wider">Transaction Date</label>
              <input
                type="date"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#022014] border border-emerald-800 text-white text-sm focus:outline-none focus:border-yellow-500 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5 uppercase tracking-wider">Tournament (optional)</label>
              <select value={tournamentId} onChange={e => setTournamentId(e.target.value)} className={selectStyle}>
                <option value="" className="bg-[#022014]">Not linked</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#022014]">{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Logged by: <span className="text-gray-200 font-medium">{entryToEdit?.logged_by || loggerName}</span>
            {entryToEdit && <> · Ref: <span className="font-mono text-yellow-500">{entryToEdit.reference_id}</span></>}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 shrink-0 border-t border-emerald-800/50 flex justify-end gap-3 bg-[#022014]">
          <Button variant="outline" onClick={onClose} className="border-emerald-800 text-gray-400 hover:text-white bg-transparent">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold shadow-lg cursor-pointer"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
            ) : isEditing ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" />Update Entry</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Record Entry</>
            )}
          </Button>
        </div>
      </div>
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

  const authMemberId = (
    (typeof window !== 'undefined' ? sessionStorage.getItem('cmo_auth_member_id') : '') ||
    currentUser?.official_member_id ||
    currentUser?.id ||
    ''
  ).trim().toUpperCase();

  const authRole = (
    (typeof window !== 'undefined' ? sessionStorage.getItem('cmo_auth_role') : '') ||
    currentUser?.role ||
    ''
  ).toLowerCase().trim();

  const isAuthorised =
    authMemberId === 'HCC-CMO-SPRT-DIR' ||
    authRole === 'sports director' ||
    authRole === 'sports_director' ||
    authRole.includes('sports') ||
    ALLOWED_FINANCIAL_ROLES.includes(authMemberId) ||
    ALLOWED_FINANCIAL_ROLES.includes(authRole.toUpperCase()) ||
    authRole === 'fin_sec' ||
    authRole === 'chairman' ||
    authRole === 'cmo_chairman' ||
    authRole === 'super_admin';

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
  const [entryToEdit, setEntryToEdit] = useState<LedgerEntry | null>(null);

  const [filterType, setFilterType] = useState<TransactionType | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<LedgerCategory | 'All'>('All');
  const [filterTournament, setFilterTournament] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const loggerName =
    currentUser?.full_name ||
    currentUser?.name ||
    ((currentUser as any)?.user_metadata as any)?.full_name ||
    'Loho Christopher Dondo (Sports Treasurer)';

  // ── Fetch Data ─────────────────────────────────────────────────────────────
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

  // ── Delete Record Handler ───────────────────────────────────────────────
  const handleDeleteRecord = async (entry: LedgerEntry) => {
    if (!window.confirm(`Are you sure you want to delete transaction "${entry.reference_id}" (${entry.description})?`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('sports_ledgers')
        .delete()
        .eq('id', entry.id);

      if (error) throw error;
      toast.success(`Transaction record ${entry.reference_id} deleted successfully.`, { style: toastStyle });
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete record.', { style: toastErrorStyle });
    }
  };

  // ── Derived Financials ─────────────────────────────────────────────────────
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

  // Calculate chronological running balance for every record
  const runningBalanceMap = computeChronologicalEntriesWithBalance(entries);

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
      <div className="flex min-h-[60vh] items-center justify-center p-8 print:hidden">
        <Card className="max-w-md w-full bg-[#022014] border border-rose-500/30 p-8 text-center rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <ShieldCheck className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-rose-400 mb-2">Access Restricted</h2>
          <p className="text-gray-400 text-sm">
            The Sports Financial Hub is restricted to <span className="text-yellow-500 font-semibold">Treasurers</span>,
            Financial Secretaries, Sports Directors, and executive administration.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* ── SCREEN VIEW (Hidden During Print) ── */}
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans text-gray-200 print:hidden">

        {showForm && (
          <EntryForm
            entryToEdit={entryToEdit}
            onClose={() => {
              setShowForm(false);
              setEntryToEdit(null);
            }}
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
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-800 text-yellow-500 text-sm hover:bg-yellow-500/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {isExecutiveUnlocked && (
              <>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/10 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-800 text-gray-400 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print Statement
                </button>
                <Button
                  onClick={() => {
                    setEntryToEdit(null);
                    setShowForm(true);
                  }}
                  className="bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold shadow-lg cursor-pointer"
                  size="sm"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  New Entry
                </Button>
                <button
                  onClick={handleLockDashboard}
                  className="bg-[#022014] hover:bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
                  title="Lock Executive Workspace"
                >
                  <Lock className="w-4 h-4" />
                  Lock Dashboard
                </button>
              </>
            )}
          </div>
        </div>

        {currentUser && (
          <Card className="bg-[#022014] border border-emerald-800 p-4 rounded-2xl shadow-lg">
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
                        className="text-[10px] text-gray-400 hover:text-yellow-500 transition-colors block ml-auto focus:outline-none cursor-pointer"
                      >
                        Manage Gateway Access
                      </button>

                      {isChangingPin && (
                        <form onSubmit={handleUpdateExecutivePin} className="mt-4 p-4 bg-[#032B1B] rounded-xl border border-emerald-800 space-y-3 text-left">
                          <h4 className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">Modify Gateway Authorization PIN</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[11px] text-gray-400">Current PIN</label>
                              <input type="password" maxLength={6} placeholder="••••••" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))} className="w-full bg-[#022014] border border-emerald-800 text-white p-2 rounded-lg text-sm text-center font-mono focus:border-yellow-500 focus:outline-none" required />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] text-gray-400">New Secret PIN</label>
                              <input type="password" maxLength={6} placeholder="••••••" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} className="w-full bg-[#022014] border border-emerald-800 text-white p-2 rounded-lg text-sm text-center font-mono focus:border-yellow-500 focus:outline-none" required />
                            </div>
                          </div>
                          {pinChangeError && <p className="text-rose-400 text-xs font-semibold text-center">{pinChangeError}</p>}
                          {pinChangeSuccess && <p className="text-emerald-400 text-xs font-semibold text-center">PIN successfully updated!</p>}
                          <button type="submit" disabled={isSubmittingPinChange || newPin.length < 4 || currentPin.length < 4} className="w-full bg-yellow-500 text-slate-950 font-bold text-xs py-2 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-40 cursor-pointer">
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
                <p className="text-yellow-500 text-xs font-semibold uppercase tracking-wider mt-1">
                  {currentUser.office_title || 'Treasurer Workspace'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ── Revenue vs Expenditure Dashboard (grid-cols-1 md:grid-cols-3) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Revenue Card */}
          <Card className="bg-[#032B1B] border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-400 tracking-tight">
              {isExecutiveUnlocked ? (
                formatNaira(totalRevenue)
              ) : (
                <span className="tracking-widest text-yellow-500/40">••••••</span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {entries.filter(e => e.transaction_type === 'Revenue').length} revenue transaction(s)
            </p>
          </Card>

          {/* Total Expenditure Card */}
          <Card className="bg-[#032B1B] border border-rose-500/30 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Expenditure</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-400 tracking-tight">
              {isExecutiveUnlocked ? (
                formatNaira(totalExpenditure)
              ) : (
                <span className="tracking-widest text-yellow-500/40">••••••</span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {entries.filter(e => e.transaction_type === 'Expenditure').length} expenditure transaction(s)
            </p>
          </Card>

          {/* Net Balance Card */}
          <Card className={`bg-[#032B1B] border rounded-2xl p-5 shadow-xl ${netBalance >= 0 ? 'border-yellow-500/30' : 'border-rose-500/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Net Balance</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${netBalance >= 0 ? 'bg-yellow-500/10' : 'bg-rose-500/10'}`}>
                <Scale className={`w-4 h-4 ${netBalance >= 0 ? 'text-yellow-500' : 'text-rose-400'}`} />
              </div>
            </div>
            <p className={`text-2xl font-black tracking-tight ${netBalance >= 0 ? 'text-yellow-500' : 'text-rose-400'}`}>
              {isExecutiveUnlocked ? (
                <>{netBalance < 0 ? '−' : ''}{formatNaira(Math.abs(netBalance))}</>
              ) : (
                <span className="tracking-widest text-yellow-500/40">••••••</span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {netBalance >= 0 ? 'Surplus position' : 'Deficit position'}
            </p>
          </Card>
        </div>

        {!isExecutiveUnlocked ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#022014] border border-yellow-500/20 rounded-2xl max-w-md mx-auto text-center space-y-6 my-8 shadow-xl">
            <div className="p-3 bg-[#032B1B] rounded-full border border-yellow-500/30 text-yellow-500">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-yellow-500">Executive Security Gateway</h3>
              <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to view financial transaction streams and breakdown statistics.</p>
            </div>
            <form onSubmit={handleVerifyPin} className="w-full space-y-4">
              <input
                type="password"
                maxLength={6}
                placeholder="Enter Secret PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center tracking-widest bg-[#032B1B] border border-yellow-500 text-white rounded-xl p-3 focus:outline-none text-xl font-mono"
              />
              {pinError && <p className="text-rose-400 text-xs font-semibold">{pinError}</p>}
              <button type="submit" disabled={isVerifyingPin || pinInput.length < 4} className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                {isVerifyingPin ? "Verifying..." : "Unlock Vault Space"}
              </button>
            </form>
          </div>
        ) : (
          <>

        {/* ── Category Breakdown ── */}
        {categoryTotals.length > 0 && (
          <Card className="bg-[#032B1B] border border-emerald-800/80 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-yellow-500" />
              Category Breakdown
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categoryTotals.map(({ cat, rev, exp }) => {
                const CategoryIcon = CATEGORY_META[cat]?.icon || FileText;
                return (
                  <div key={cat} className="bg-[#022014] rounded-xl p-3 border border-emerald-800/60">
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                      <CategoryIcon className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      <span className="truncate">{CATEGORY_META[cat]?.label || cat}</span>
                    </p>
                    {rev > 0 && <p className="text-xs text-emerald-400 font-mono font-semibold">+{formatNaira(rev)}</p>}
                    {exp > 0 && <p className="text-xs text-rose-400 font-mono font-semibold">−{formatNaira(exp)}</p>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── Filter Controls ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 p-1 bg-[#032B1B] border border-emerald-800 rounded-xl">
              {(['All', 'Revenue', 'Expenditure'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-150 cursor-pointer ${
                    filterType === t
                      ? t === 'Revenue'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : t === 'Expenditure'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-yellow-500 text-slate-950'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm transition-colors cursor-pointer ${
                showFilters
                  ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
                  : 'border-emerald-800 text-gray-400 hover:text-white'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#032B1B] border border-emerald-800/80 rounded-2xl">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value as LedgerCategory | 'All')}
                  className="w-full h-9 px-2 rounded-xl bg-[#022014] border border-emerald-800 text-white text-xs focus:outline-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {LEDGER_CATEGORIES.map(c => (
                    <option key={c} value={c} className="bg-[#022014]">{CATEGORY_META[c].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tournament</label>
                <select
                  value={filterTournament}
                  onChange={e => setFilterTournament(e.target.value)}
                  className="w-full h-9 px-2 rounded-xl bg-[#022014] border border-emerald-800 text-white text-xs focus:outline-none cursor-pointer"
                >
                  <option value="">All Tournaments</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id} className="bg-[#022014]">{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full h-9 px-2 rounded-xl bg-[#022014] border border-emerald-800 text-white text-xs focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full h-9 px-2 rounded-xl bg-[#022014] border border-emerald-800 text-white text-xs focus:outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Audit Stream Table ── */}
        <Card className="bg-[#032B1B] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-xl" ref={tableRef}>
          <div className="px-6 py-4 border-b border-emerald-800/50 flex items-center justify-between bg-[#022014]">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-yellow-500" />
              Audit Stream
            </h2>
            <span className="text-xs text-gray-400 bg-[#032B1B] px-3 py-1 rounded-full border border-emerald-800 font-mono">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-14 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              <span className="text-sm">Loading financial records…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-500">
              <Receipt className="w-10 h-10 mb-3 opacity-30 text-yellow-500" />
              <p className="text-sm font-medium">No transactions match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-800/50 bg-[#022014]/80">
                    <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Reference</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="text-right px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Logged By</th>
                    <th className="text-right px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/30">
                  {filtered.map(entry => {
                    const isRevenue = entry.transaction_type === 'Revenue';
                    const catMeta = CATEGORY_META[entry.category];
                    const CategoryIcon = catMeta?.icon || FileText;

                    return (
                      <tr key={entry.id} className="hover:bg-[#022014]/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs text-gray-300 font-mono">
                            {new Date(entry.transaction_date).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-mono text-yellow-500 bg-[#022014] px-2.5 py-1 rounded-lg border border-emerald-800/60 font-semibold">
                            {entry.reference_id}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs text-gray-300 flex items-center gap-1.5">
                            <CategoryIcon className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                            <span>{catMeta?.label ?? entry.category}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-white max-w-xs truncate font-medium">{entry.description}</p>
                          {(entry.tournament as any)?.title && (
                            <p className="text-xs text-yellow-500/70 mt-0.5 font-semibold">{(entry.tournament as any).title}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <span className={`font-mono font-bold text-base ${isRevenue ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isRevenue ? '+' : '−'}{formatNaira(entry.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isRevenue
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}>
                            {isRevenue
                              ? <ArrowUpRight className="w-3.5 h-3.5" />
                              : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {entry.transaction_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs text-gray-400">{entry.logged_by}</span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEntryToEdit(entry);
                                setShowForm(true);
                              }}
                              className="p-1.5 rounded-lg border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500 hover:text-slate-950 transition-all duration-150 cursor-pointer shadow"
                              title="Edit Record"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(entry)}
                              className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-150 cursor-pointer shadow"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Footer totals for filtered view */}
                <tfoot>
                  <tr className="border-t border-emerald-800 bg-[#022014]">
                    <td colSpan={4} className="px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Filtered Totals ({filtered.length} rows)
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {(() => {
                        const rev = filtered.filter(e => e.transaction_type === 'Revenue').reduce((s, e) => s + e.amount, 0);
                        const exp = filtered.filter(e => e.transaction_type === 'Expenditure').reduce((s, e) => s + e.amount, 0);
                        const net = rev - exp;
                        return (
                          <div className="space-y-0.5">
                            {rev > 0 && <p className="text-xs font-mono text-emerald-400">+{formatNaira(rev)}</p>}
                            {exp > 0 && <p className="text-xs font-mono text-rose-400">−{formatNaira(exp)}</p>}
                            <p className={`text-sm font-black font-mono ${net >= 0 ? 'text-yellow-500' : 'text-rose-400'}`}>
                              {net < 0 ? '−' : ''}{formatNaira(Math.abs(net))}
                            </p>
                          </div>
                        );
                      })()}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
        </>
        )}
      </div>

      {/* ── OFFICIAL BANK-GRADE PRINTABLE STATEMENT (Visible ONLY on Print) ── */}
      <div id="printable-bank-statement" className="hidden print:block bg-white text-black font-serif p-2 space-y-3 max-w-4xl mx-auto leading-tight text-xs">
        {/* Inline CSS Isolation Rules */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-bank-statement, #printable-bank-statement * {
              visibility: visible !important;
            }
            #printable-bank-statement {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
          }
        `}</style>

        {/* A. Formal Letterhead Header */}
        <div className="border-b-2 border-black pb-2 text-center space-y-0.5">
          <h1 className="text-lg font-bold uppercase tracking-wider text-black font-serif">
            CATHOLIC MEN ORGANIZATION (CMO)
          </h1>
          <p className="text-[11px] font-medium text-gray-800">
            Holy Cross Catholic Church, Badawa, Kano Diocese — Sports Department
          </p>
          <h2 className="text-xs font-bold uppercase tracking-widest text-black pt-1 border-t border-gray-400 mt-1">
            OFFICIAL STATEMENT OF SPORTS FINANCIAL ACCOUNT
          </h2>

          {/* Generated Metadata Block (2-Column Grid) */}
          <div className="grid grid-cols-2 gap-2 text-left text-[11px] pt-2 border-t border-black font-sans">
            <div className="space-y-0.5">
              <p><span className="font-bold text-gray-800">Account / Workspace ID:</span> <span className="font-mono font-bold">HCC-CMO-SPRT-TR</span></p>
              <p><span className="font-bold text-gray-800">Account Name:</span> Sports Department General Treasury</p>
            </div>
            <div className="space-y-0.5 text-right">
              <p><span className="font-bold text-gray-800">Statement Date:</span> <span className="font-mono">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span></p>
              <p><span className="font-bold text-gray-800">Generated By:</span> Sports Treasurer Office / {loggerName}</p>
            </div>
          </div>
        </div>

        {/* B. Financial Summary Ledger Box */}
        <div className="border border-black p-2.5 rounded bg-gray-50/50 space-y-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-black font-sans border-b border-gray-400 pb-0.5">
            Executive Financial Summary
          </h3>
          <table className="w-full text-[11px] font-sans text-left">
            <thead>
              <tr className="border-b border-black font-bold text-black">
                <th className="py-0.5">Total Inflow (Revenue)</th>
                <th className="py-0.5">Total Outflow (Expenditure)</th>
                <th className="py-0.5 text-right">Closing Net Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-bold text-xs font-mono">
                <td className="py-1 text-emerald-800">{formatNaira(totalRevenue)}</td>
                <td className="py-1 text-rose-800">{formatNaira(totalExpenditure)}</td>
                <td className={`py-1 text-right ${netBalance >= 0 ? 'text-black font-black' : 'text-rose-900 font-black'}`}>
                  {netBalance < 0 ? '−' : ''}{formatNaira(Math.abs(netBalance))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* C. Formal Transaction Audit Trail Table */}
        <div className="space-y-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-black font-sans border-b border-black pb-0.5">
            Detailed Transaction Audit Trail ({filtered.length} Record{filtered.length !== 1 ? 's' : ''})
          </h3>
          <table className="w-full text-xs font-sans border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase tracking-wider">
                <th className="border border-gray-400 px-2 py-1.5 text-left">Value Date</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left">Transaction Ref</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left">Category & Narration</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right">Deposit (₦)</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right">Withdrawal (₦)</th>
                <th className="border border-gray-400 px-2 py-1.5 text-right">Running Balance (₦)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => {
                const isRev = entry.transaction_type === 'Revenue';
                const runningBal = runningBalanceMap.get(entry.id) ?? 0;
                const formattedDate = new Date(entry.transaction_date).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric'
                });
                const catLabel = CATEGORY_META[entry.category]?.label || entry.category;

                return (
                  <tr key={`print-${entry.id}`} className="border-b border-gray-300">
                    <td className="border border-gray-400 px-2 py-1.5 whitespace-nowrap font-mono">{formattedDate}</td>
                    <td className="border border-gray-400 px-2 py-1.5 font-mono text-xs">{entry.reference_id}</td>
                    <td className="border border-gray-400 px-2 py-1.5">
                      <span className="font-bold block">{catLabel}</span>
                      <span className="text-[11px] text-gray-700">{entry.description}</span>
                      {(entry.tournament as any)?.title && (
                        <span className="block text-[10px] text-gray-600 font-semibold mt-0.5">[{ (entry.tournament as any).title }]</span>
                      )}
                    </td>
                    <td className="border border-gray-400 px-2 py-1.5 text-right font-mono font-semibold">
                      {isRev ? formatNaira(entry.amount) : '—'}
                    </td>
                    <td className="border border-gray-400 px-2 py-1.5 text-right font-mono font-semibold">
                      {!isRev ? formatNaira(entry.amount) : '—'}
                    </td>
                    <td className={`border border-gray-400 px-2 py-1.5 text-right font-mono font-bold ${runningBal < 0 ? 'text-red-700' : 'text-black'}`}>
                      {runningBal < 0 ? '−' : ''}{formatNaira(Math.abs(runningBal))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* D. Official Sign-off & Audit Footer */}
        <div className="pt-3 font-sans">
          <p className="text-[10px] text-gray-600 text-center italic border-t border-gray-300 pt-3 mt-4 mb-4">
            This Statement of Financial Account accurately reflects all verified revenues and expenditures recorded in the CMO Sports Workspace ledger as of the generation date. Physical signatures below authenticate official executive review.
          </p>

          <div className="flex justify-between items-end mt-4 border-t border-gray-200 pt-4">
            {/* Left Block: Sports Director / Treasurer */}
            <div className="flex flex-col items-start">
              <div className="w-52 border-b border-gray-400 mb-2"></div>
              <p className="font-bold text-gray-900 text-sm">Sports Director / Treasurer</p>
              <p className="italic text-gray-600 text-xs">Holy Cross Catholic Church, Badawa, Kano</p>
            </div>

            {/* Right Block: CMO Chairman */}
            <div className="flex flex-col items-end text-right">
              <div className="w-52 border-b border-gray-400 mb-2"></div>
              <p className="font-bold text-gray-900 text-sm">CMO Chairman</p>
              <p className="italic text-gray-600 text-xs">Holy Cross Catholic Church, Badawa, Kano</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SportsFinancialHub;
