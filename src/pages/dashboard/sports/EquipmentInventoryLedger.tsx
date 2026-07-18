import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  ShieldCheck,
  Loader2,
  RefreshCw,
  PlusCircle,
  Save,
  X,
  Search,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  RotateCcw,
  ClipboardList,
  ArrowLeftRight,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useApp } from '../../../contexts/AppContext';
import { Button } from '../../../app/components/ui/button';
import { Input } from '../../../app/components/ui/input';
import { Card } from '../../../app/components/ui/card';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ItemCondition = 'New' | 'Good' | 'Worn' | 'Damaged' | 'Lost';
type ItemCategory = 'Ball' | 'Jersey' | 'Training_Cone' | 'Net' | 'First_Aid' | 'Footwear' | 'Protection' | 'Other';

interface InventoryItem {
  id: string;
  item_name: string;
  category: ItemCategory;
  total_quantity: number;
  available_quantity: number;
  allocated_quantity: number;
  condition: ItemCondition;
  notes: string | null;
  last_updated: string;
  updated_by: string | null;
}

interface AllocationLog {
  id: string;
  item_id: string;
  quantity: number;
  allocated_to: string;
  allocation_date: string;
  expected_return_date: string | null;
  returned: boolean;
  returned_date: string | null;
  depreciation_notes: string | null;
  loss_reported: boolean;
  logged_by: string | null;
  created_at: string;
  item?: { item_name: string; category: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<ItemCategory, { label: string; emoji: string; color: string }> = {
  Ball: { label: 'Ball', emoji: '⚽', color: 'text-white' },
  Jersey: { label: 'Jersey', emoji: '👕', color: 'text-blue-400' },
  Training_Cone: { label: 'Training Cone', emoji: '🔶', color: 'text-orange-400' },
  Net: { label: 'Goal Net', emoji: '🥅', color: 'text-gray-300' },
  First_Aid: { label: 'First Aid Kit', emoji: '🩹', color: 'text-red-400' },
  Footwear: { label: 'Footwear', emoji: '👟', color: 'text-yellow-400' },
  Protection: { label: 'Protective Gear', emoji: '🛡️', color: 'text-purple-400' },
  Other: { label: 'Other', emoji: '📦', color: 'text-gray-400' },
};

const CONDITION_META: Record<ItemCondition, { color: string; bg: string }> = {
  New: { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
  Good: { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  Worn: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  Damaged: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
  Lost: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
};

const ITEM_CATEGORIES: ItemCategory[] = ['Ball', 'Jersey', 'Training_Cone', 'Net', 'First_Aid', 'Footwear', 'Protection', 'Other'];
const ITEM_CONDITIONS: ItemCondition[] = ['New', 'Good', 'Worn', 'Damaged', 'Lost'];

const toastStyle = { background: '#002520', border: '1px solid rgba(255,215,0,0.3)', color: '#ffd700' };
const toastErrorStyle = { background: '#1a0000', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' };

const selectStyle = 'w-full h-9 px-3 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/50 transition-colors';

// ─────────────────────────────────────────────────────────────────────────────
// Quantity Stepper
// ─────────────────────────────────────────────────────────────────────────────

const QuantityStepper = ({ value, onChange, min = 0, max = 9999 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) => (
  <div className="flex items-center gap-1">
    <button
      onClick={() => onChange(Math.max(min, value - 1))}
      className="w-7 h-7 rounded-lg border border-[#ffd700]/20 text-gray-400 hover:text-[#ffd700] hover:border-[#ffd700]/40 hover:bg-[#ffd700]/5 transition-all flex items-center justify-center"
    >
      <Minus className="w-3 h-3" />
    </button>
    <span className="w-10 text-center font-mono text-sm text-white tabular-nums">{value}</span>
    <button
      onClick={() => onChange(Math.min(max, value + 1))}
      className="w-7 h-7 rounded-lg border border-[#ffd700]/20 text-gray-400 hover:text-[#ffd700] hover:border-[#ffd700]/40 hover:bg-[#ffd700]/5 transition-all flex items-center justify-center"
    >
      <Plus className="w-3 h-3" />
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// New Item Form
// ─────────────────────────────────────────────────────────────────────────────

interface NewItemFormProps {
  onClose: () => void;
  onSaved: () => void;
  managerName: string;
}

const NewItemForm = ({ onClose, onSaved, managerName }: NewItemFormProps) => {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Ball');
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<ItemCondition>('New');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!itemName.trim()) { toast.error('Item name is required.', { style: toastErrorStyle }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('sports_equipment').insert([{
        item_name: itemName.trim(),
        category,
        total_quantity: quantity,
        available_quantity: quantity,
        allocated_quantity: 0,
        condition,
        notes: notes.trim() || null,
        updated_by: managerName,
        last_updated: new Date().toISOString(),
      }]);
      if (error) throw error;
      toast.success(`"${itemName.trim()}" added to inventory.`, { style: toastStyle });
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add item.', { style: toastErrorStyle });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-[#001a16] border border-[#ffd700]/20 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ffd700]/10 bg-[#002520]">
          <h3 className="text-sm font-bold text-[#ffd700] flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Add New Equipment
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Item Name *</label>
            <Input
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="e.g. Size 5 Match Ball"
              className="bg-[#002520] border-[#ffd700]/20 text-white placeholder:text-gray-600 focus:border-[#ffd700]/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as ItemCategory)} className={selectStyle}>
                {ITEM_CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-[#001a16]">
                    {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Condition</label>
              <select value={condition} onChange={e => setCondition(e.target.value as ItemCondition)} className={selectStyle}>
                {ITEM_CONDITIONS.map(c => (
                  <option key={c} value={c} className="bg-[#001a16]">{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Initial Quantity</label>
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Storage location, serial numbers, specifications…"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-[#ffd700]/50 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold shadow-lg shadow-[#ffd700]/20">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Add to Inventory</>}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-[#ffd700]/20 text-gray-400 hover:text-white bg-transparent">Cancel</Button>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Allocation Form
// ─────────────────────────────────────────────────────────────────────────────

interface AllocFormProps {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
  managerName: string;
}

const AllocationForm = ({ item, onClose, onSaved, managerName }: AllocFormProps) => {
  const [qty, setQty] = useState(1);
  const [allocatedTo, setAllocatedTo] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [depreciationNotes, setDepreciationNotes] = useState('');
  const [lossReported, setLossReported] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAllocate = async () => {
    if (!allocatedTo.trim()) { toast.error('Please specify who this is allocated to.', { style: toastErrorStyle }); return; }
    if (qty > item.available_quantity) { toast.error(`Only ${item.available_quantity} unit(s) available.`, { style: toastErrorStyle }); return; }

    setSaving(true);
    try {
      const { error: logErr } = await supabase.from('sports_equipment_allocations').insert([{
        item_id: item.id,
        quantity: qty,
        allocated_to: allocatedTo.trim(),
        allocation_date: new Date().toISOString().split('T')[0],
        expected_return_date: returnDate || null,
        returned: false,
        loss_reported: lossReported,
        depreciation_notes: depreciationNotes.trim() || null,
        logged_by: managerName,
      }]);
      if (logErr) throw logErr;

      const { error: updateErr } = await supabase
        .from('sports_equipment')
        .update({
          available_quantity: item.available_quantity - qty,
          allocated_quantity: item.allocated_quantity + qty,
          last_updated: new Date().toISOString(),
          updated_by: managerName,
        })
        .eq('id', item.id);
      if (updateErr) throw updateErr;

      toast.success(`${qty}× ${item.item_name} allocated to ${allocatedTo}.`, { style: toastStyle });
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Allocation failed.', { style: toastErrorStyle });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-[#001a16] border border-[#ffd700]/20 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ffd700]/10 bg-[#002520]">
          <div>
            <h3 className="text-sm font-bold text-[#ffd700] flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              Log Equipment Handover
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {CATEGORY_META[item.category].emoji} {item.item_name} — {item.available_quantity} available
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Allocated To *</label>
            <Input
              value={allocatedTo}
              onChange={e => setAllocatedTo(e.target.value)}
              placeholder="Coach name, team name, or department…"
              className="bg-[#002520] border-[#ffd700]/20 text-white placeholder:text-gray-600 focus:border-[#ffd700]/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Quantity</label>
              <QuantityStepper value={qty} onChange={setQty} min={1} max={item.available_quantity} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Expected Return</label>
              <input
                type="date"
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/50 [color-scheme:dark]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Depreciation / Condition Notes</label>
            <textarea
              value={depreciationNotes}
              onChange={e => setDepreciationNotes(e.target.value)}
              placeholder="e.g. Item has minor scuffs, delivered in worn state…"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[#002520] border border-[#ffd700]/20 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-[#ffd700]/50 resize-none"
            />
          </div>
          <div
            onClick={() => setLossReported(l => !l)}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${
              lossReported
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-[#002520] border-[#ffd700]/10 hover:border-[#ffd700]/20'
            }`}
          >
            <span className={`text-xs font-semibold ${lossReported ? 'text-red-400' : 'text-gray-500'}`}>
              {lossReported ? '⚠ Field Resource Loss Reported' : 'Report Field Resource Loss'}
            </span>
            <AlertTriangle className={`w-4 h-4 ${lossReported ? 'text-red-400' : 'text-gray-700'}`} />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button onClick={handleAllocate} disabled={saving} className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold shadow-lg shadow-[#ffd700]/20">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : <><ArrowLeftRight className="w-4 h-4 mr-2" />Confirm Handover</>}
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

export const EquipmentInventoryLedger = () => {
  const { currentUser } = useApp();

  const role = currentUser?.role?.toLowerCase();
  const isAuthorised =
    role === 'sports_director' ||
    role === 'coach' ||
    role === 'chairman' ||
    role === 'cmo_chairman';

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<ItemCategory | 'All'>('All');
  const [activeView, setActiveView] = useState<'inventory' | 'allocations'>('inventory');
  const [showNewItem, setShowNewItem] = useState(false);
  const [allocatingItem, setAllocatingItem] = useState<InventoryItem | null>(null);

  const managerName = currentUser?.name ?? currentUser?.full_name ?? 'Manager';

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: invData, error: invErr }, { data: allocData, error: allocErr }] = await Promise.all([
        supabase.from('sports_equipment').select('*').order('category').order('item_name'),
        supabase
          .from('sports_equipment_allocations')
          .select(`*, item:sports_equipment(item_name, category)`)
          .order('allocation_date', { ascending: false })
          .limit(100),
      ]);
      if (invErr) throw invErr;
      if (allocErr) throw allocErr;
      setItems((invData as InventoryItem[]) ?? []);
      setAllocations((allocData as unknown as AllocationLog[]) ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load inventory.', { style: toastErrorStyle });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleMarkReturned = async (alloc: AllocationLog) => {
    try {
      const { error: allocErr } = await supabase
        .from('sports_equipment_allocations')
        .update({ returned: true, returned_date: new Date().toISOString().split('T')[0] })
        .eq('id', alloc.id);
      if (allocErr) throw allocErr;

      // Return qty to available pool
      const item = items.find(i => i.id === alloc.item_id);
      if (item) {
        await supabase.from('sports_equipment').update({
          available_quantity: item.available_quantity + alloc.quantity,
          allocated_quantity: Math.max(0, item.allocated_quantity - alloc.quantity),
          last_updated: new Date().toISOString(),
        }).eq('id', item.id);
      }

      toast.success('Equipment marked as returned.', { style: toastStyle });
      fetchInventory();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to mark as returned.', { style: toastErrorStyle });
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredItems = items.filter(i => {
    const matchSearch = i.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === 'All' || i.category === filterCategory;
    return matchSearch && matchCat;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalItems = items.reduce((s, i) => s + i.total_quantity, 0);
  const totalAvailable = items.reduce((s, i) => s + i.available_quantity, 0);
  const totalAllocated = items.reduce((s, i) => s + i.allocated_quantity, 0);
  const unreturned = allocations.filter(a => !a.returned && !a.loss_reported).length;

  // ── Access Guard ────────────────────────────────────────────────────────────
  if (!isAuthorised) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="max-w-md w-full bg-[#002520] border border-red-500/30 p-8 text-center rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <ShieldCheck className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Restricted</h2>
          <p className="text-gray-400 text-sm">The Equipment Ledger is reserved for Sports Directors, Coaches, and administration.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">

      {showNewItem && (
        <NewItemForm onClose={() => setShowNewItem(false)} onSaved={fetchInventory} managerName={managerName} />
      )}
      {allocatingItem && (
        <AllocationForm
          item={allocatingItem}
          onClose={() => setAllocatingItem(null)}
          onSaved={fetchInventory}
          managerName={managerName}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-[#ffd700]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Equipment Inventory Ledger</h1>
            <p className="text-xs text-gray-400 mt-0.5">Sports asset tracking, allocation & returns management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#ffd700]/20 text-[#ffd700] text-sm hover:bg-[#ffd700]/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Button
            onClick={() => setShowNewItem(true)}
            className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold shadow-lg shadow-[#ffd700]/20"
            size="sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Add Equipment
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Assets', value: totalItems, color: 'text-white', border: 'border-[#ffd700]/15' },
          { label: 'Available', value: totalAvailable, color: 'text-emerald-400', border: 'border-emerald-400/20' },
          { label: 'Allocated Out', value: totalAllocated, color: 'text-blue-400', border: 'border-blue-400/20' },
          { label: 'Unreturned', value: unreturned, color: unreturned > 0 ? 'text-orange-400' : 'text-gray-500', border: unreturned > 0 ? 'border-orange-400/30' : 'border-gray-600/20' },
        ].map(s => (
          <Card key={s.label} className={`bg-[#001a16] border ${s.border} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* ── Tab Toggle ── */}
      <div className="flex gap-1 p-1 bg-[#001a16] border border-[#ffd700]/10 rounded-xl w-fit">
        <button
          id="tab-inventory"
          onClick={() => setActiveView('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'inventory' ? 'bg-[#ffd700] text-[#001a16] shadow-md shadow-[#ffd700]/20' : 'text-gray-400 hover:text-white'}`}
        >
          <Package className="w-4 h-4" />
          Inventory Count
        </button>
        <button
          id="tab-allocations"
          onClick={() => setActiveView('allocations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'allocations' ? 'bg-[#ffd700] text-[#001a16] shadow-md shadow-[#ffd700]/20' : 'text-gray-400 hover:text-white'}`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Allocations & Returns
          {unreturned > 0 && (
            <span className="ml-1 w-4 h-4 text-[10px] font-black bg-orange-500 text-white rounded-full flex items-center justify-center">{unreturned}</span>
          )}
        </button>
      </div>

      {/* ── Inventory Matrix ── */}
      {activeView === 'inventory' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search equipment…"
                className="pl-9 bg-[#001a16] border-[#ffd700]/20 text-white placeholder:text-gray-600 focus:border-[#ffd700]/50"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as ItemCategory | 'All')}
              className="h-10 px-3 rounded-lg bg-[#001a16] border border-[#ffd700]/20 text-white text-sm focus:outline-none focus:border-[#ffd700]/50"
            >
              <option value="All">All Categories</option>
              {ITEM_CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-[#001a16]">
                  {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                </option>
              ))}
            </select>
          </div>

          <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-[#ffd700]/10 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#ffd700]" />
                Asset Count Matrix
              </h2>
              <span className="text-xs text-gray-500 bg-[#002520] px-2.5 py-1 rounded-full border border-[#ffd700]/10">
                {filteredItems.length} SKU{filteredItems.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-14 gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin text-[#ffd700]" />
                <span className="text-sm">Loading inventory…</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-600">
                <Package className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">No equipment found. Add items to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#ffd700]/10 bg-[#002520]/40">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Item</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Available</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Out</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Condition</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ffd700]/5">
                    {filteredItems.map(item => {
                      const catMeta = CATEGORY_META[item.category];
                      const condMeta = CONDITION_META[item.condition];
                      const utilPct = item.total_quantity > 0
                        ? Math.round((item.allocated_quantity / item.total_quantity) * 100)
                        : 0;
                      return (
                        <tr key={item.id} className="hover:bg-[#002520]/40 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{catMeta.emoji}</span>
                              <div>
                                <p className="font-semibold text-white group-hover:text-[#ffd700] transition-colors">{item.item_name}</p>
                                <p className={`text-xs ${catMeta.color}`}>{catMeta.label}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-mono font-bold text-white text-base">{item.total_quantity}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`font-mono font-bold text-base ${item.available_quantity === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {item.available_quantity}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono text-blue-400 text-sm font-bold">{item.allocated_quantity}</span>
                              {utilPct > 0 && (
                                <div className="w-12 h-1 rounded-full bg-[#002520] overflow-hidden">
                                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${utilPct}%` }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${condMeta.bg} ${condMeta.color}`}>
                              {item.condition}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setAllocatingItem(item)}
                              disabled={item.available_quantity === 0}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ffd700]/20 text-[#ffd700] text-xs font-medium hover:bg-[#ffd700]/10 hover:border-[#ffd700]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                              Allocate
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Allocations & Returns ── */}
      {activeView === 'allocations' && (
        <Card className="bg-[#001a16] border border-[#ffd700]/20 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-[#ffd700]/10 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-[#ffd700]" />
              Allocation & Returns Tracker
            </h2>
            <span className="text-xs text-gray-500 bg-[#002520] px-2.5 py-1 rounded-full border border-[#ffd700]/10">
              {allocations.length} log{allocations.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-14 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin text-[#ffd700]" />
            </div>
          ) : allocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-600">
              <ClipboardList className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">No allocation logs recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ffd700]/10 bg-[#002520]/40">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Item</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Qty</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Allocated To</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffd700]/5">
                  {allocations.map(alloc => (
                    <tr key={alloc.id} className={`hover:bg-[#002520]/40 transition-colors ${alloc.loss_reported ? 'bg-red-900/10' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">{(alloc.item as any)?.item_name ?? 'Unknown Item'}</p>
                        <p className="text-xs text-gray-500">{alloc.depreciation_notes ?? ''}</p>
                      </td>
                      <td className="px-4 py-4 text-center font-mono font-bold text-white">{alloc.quantity}</td>
                      <td className="px-4 py-4 text-gray-300">{alloc.allocated_to}</td>
                      <td className="px-4 py-4 text-center text-xs text-gray-500">
                        {new Date(alloc.allocation_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {alloc.loss_reported ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-400/10 border border-red-400/30 text-red-400">
                            <AlertTriangle className="w-3 h-3" />
                            Loss Reported
                          </span>
                        ) : alloc.returned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/10 border border-emerald-400/30 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Returned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-400/10 border border-blue-400/30 text-blue-400">
                            <AlertCircle className="w-3 h-3" />
                            Outstanding
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!alloc.returned && !alloc.loss_reported && (
                          <button
                            onClick={() => handleMarkReturned(alloc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400/20 text-emerald-400 text-xs font-medium hover:bg-emerald-400/10 transition-all duration-200"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Mark Returned
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default EquipmentInventoryLedger;
