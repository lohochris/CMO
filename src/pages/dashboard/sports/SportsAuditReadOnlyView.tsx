import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Printer,
  Filter,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Tag,
  Users,
  Wrench,
  Building2,
  Trophy,
  Stethoscope,
  Truck,
  FileText,
  Scale,
  Info,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useApp } from '../../../contexts/AppContext';
import { Card } from '../../../app/components/ui/card';
import { toast } from 'sonner';

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

const toastErrorStyle = { background: '#1a0000', border: '1px solid rgba(244,63,94,0.4)', color: '#fb7185' };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatNaira = (amount: number): string =>
  `₦${new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;

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
// Read-Only Component Definition
// ─────────────────────────────────────────────────────────────────────────────

export const SportsAuditReadOnlyView = () => {
  const { currentUser } = useApp();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [tournaments, setTournaments] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);

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
    (currentUser?.user_metadata as any)?.full_name ||
    'Parish Executive Auditor';

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
      toast.error(err?.message ?? 'Failed to load sports financial ledger.', { style: toastErrorStyle });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const runningBalanceMap = computeChronologicalEntriesWithBalance(entries);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* ── SCREEN VIEW (Hidden During Print) ── */}
      <div className="space-y-6 font-sans text-gray-200 print:hidden">

        {/* Informational Audit Banner */}
        <div className="bg-[#022014] border border-emerald-800/80 rounded-2xl p-4 flex items-center gap-3 text-emerald-300 text-xs shadow-lg">
          <Info className="w-5 h-5 text-yellow-500 shrink-0" />
          <span>
            <strong className="text-yellow-500">Auxiliary Fund Notice:</strong> This tab tracks independent Sports Department operational ledger entries for auditing purposes and is isolated from the main parish treasury.
          </span>
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Sports Department Auxiliary Treasury</h2>
              <p className="text-xs text-gray-400 mt-0.5">Read-only executive financial auditing stream</p>
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
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-800 text-gray-300 text-sm hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Statement
            </button>
          </div>
        </div>

        {/* ── Financial Metric Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#032B1B] border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-400 tracking-tight">{formatNaira(totalRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {entries.filter(e => e.transaction_type === 'Revenue').length} revenue entry(s)
            </p>
          </Card>

          <Card className="bg-[#032B1B] border border-rose-500/30 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Expenditure</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-400 tracking-tight">{formatNaira(totalExpenditure)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {entries.filter(e => e.transaction_type === 'Expenditure').length} expenditure entry(s)
            </p>
          </Card>

          <Card className={`bg-[#032B1B] border rounded-2xl p-5 shadow-xl ${netBalance >= 0 ? 'border-yellow-500/30' : 'border-rose-500/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Net Balance</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${netBalance >= 0 ? 'bg-yellow-500/10' : 'bg-rose-500/10'}`}>
                <Scale className={`w-4 h-4 ${netBalance >= 0 ? 'text-yellow-500' : 'text-rose-400'}`} />
              </div>
            </div>
            <p className={`text-2xl font-black tracking-tight ${netBalance >= 0 ? 'text-yellow-500' : 'text-rose-400'}`}>
              {netBalance < 0 ? '−' : ''}{formatNaira(Math.abs(netBalance))}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {netBalance >= 0 ? 'Surplus position' : 'Deficit position'}
            </p>
          </Card>
        </div>

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

        {/* ── Audit Stream Table (Read-Only: No Actions Column) ── */}
        <Card className="bg-[#032B1B] border border-emerald-800/80 rounded-2xl overflow-hidden shadow-xl" ref={tableRef}>
          <div className="px-6 py-4 border-b border-emerald-800/50 flex items-center justify-between bg-[#022014]">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-yellow-500" />
              Sports Audit Ledger Stream
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
                      </tr>
                    );
                  })}
                </tbody>
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
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
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

export default SportsAuditReadOnlyView;
