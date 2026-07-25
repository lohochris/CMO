import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  PackageCheck,
  RotateCcw,
  Plus,
  Calendar,
  User,
  Users,
  Layers,
  AlertCircle,
  X,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  RefreshCw,
  PlusCircle,
  Save,
  Search,
  ArrowLeftRight,
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

type ItemCondition = 'New' | 'Good' | 'Fair' | 'Worn' | 'Damaged' | 'Lost';
type ItemCategory = 'Ball' | 'Jersey' | 'Training_Cone' | 'Net' | 'First_Aid' | 'Footwear' | 'Protection' | 'Other';
type AssigneeCategory = 'Family Unit' | 'Team' | 'Member' | 'Official';

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
  item_id?: string;
  equipment_id?: string;
  quantity?: number;
  quantity_allocated?: number;
  quantity_returned?: number;
  allocated_to?: string;
  assigned_to_name?: string;
  assigned_to_type?: string;
  assignee_category?: AssigneeCategory;
  allocation_date?: string;
  allocated_at?: string;
  expected_return_date?: string | null;
  actual_return_date?: string | null;
  condition_on_issue?: ItemCondition;
  condition_on_return?: ItemCondition;
  status?: string;
  returned?: boolean;
  returned_date?: string | null;
  depreciation_notes?: string | null;
  notes?: string | null;
  logged_by?: string | null;
  created_at?: string;
  item?: { item_name: string; category: string };
  sports_equipment?: { id?: string; item_name: string; category: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  'Allocated': { label: 'Allocated Out', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'Partial Return': { label: 'Partially Returned', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'Partially Returned': { label: 'Partially Returned', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'Fully Returned': { label: 'Returned', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  'Returned': { label: 'Returned', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  'Overdue': { label: 'Overdue', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'Lost/Damaged': { label: 'Lost / Damaged', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  'Loss Reported': { label: 'Loss Reported', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  Ball: { label: 'Ball', color: 'text-white' },
  Jersey: { label: 'Jersey', color: 'text-blue-400' },
  Training_Cone: { label: 'Training Cone', color: 'text-orange-400' },
  Net: { label: 'Goal Net', color: 'text-gray-300' },
  First_Aid: { label: 'First Aid Kit', color: 'text-red-400' },
  Footwear: { label: 'Footwear', color: 'text-yellow-400' },
  Protection: { label: 'Protective Gear', color: 'text-purple-400' },
  Other: { label: 'Other', color: 'text-gray-400' },
};

const CONDITION_META: Record<string, { color: string; bg: string }> = {
  New: { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
  Good: { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  Fair: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  Worn: { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  Damaged: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
  Lost: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
};

const ITEM_CATEGORIES: ItemCategory[] = ['Ball', 'Jersey', 'Training_Cone', 'Net', 'First_Aid', 'Footwear', 'Protection', 'Other'];
const ITEM_CONDITIONS: ItemCondition[] = ['New', 'Good', 'Fair', 'Worn', 'Damaged', 'Lost'];

const toastStyle = { background: '#090d16', border: '1px solid rgba(16,185,129,0.5)', color: '#facc15' };
const toastErrorStyle = { background: '#1a0000', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' };

const selectStyle = 'w-full h-10 px-3 rounded-xl bg-slate-950 border border-emerald-900/80 text-white text-sm focus:outline-none focus:border-yellow-400 transition-colors';

// ─────────────────────────────────────────────────────────────────────────────
// Quantity Stepper
// ─────────────────────────────────────────────────────────────────────────────

const QuantityStepper = ({ value, onChange, min = 0, max = 9999 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) => (
  <div className="flex items-center gap-1.5">
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - 1))}
      className="w-8 h-8 rounded-lg border border-emerald-900/80 bg-slate-950 text-gray-400 hover:text-yellow-400 hover:border-yellow-400/50 transition-all flex items-center justify-center cursor-pointer"
    >
      -
    </button>
    <span className="w-10 text-center font-mono text-sm text-white font-bold tabular-nums">{value}</span>
    <button
      type="button"
      onClick={() => onChange(Math.min(max, value + 1))}
      className="w-8 h-8 rounded-lg border border-emerald-900/80 bg-slate-950 text-gray-400 hover:text-yellow-400 hover:border-yellow-400/50 transition-all flex items-center justify-center cursor-pointer"
    >
      +
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Component 1: "+ Allocate Equipment" Modal
// ─────────────────────────────────────────────────────────────────────────────

interface AllocateEquipmentModalProps {
  items: InventoryItem[];
  members: any[];
  onClose: () => void;
  onSaved: () => void;
  managerName: string;
}

const AllocateEquipmentModal = ({ items, members, onClose, onSaved, managerName }: AllocateEquipmentModalProps) => {
  const { currentUser } = useApp();

  const activeOfficialId =
    currentUser?.official_member_id ||
    'HCC-CMO-SPRT-DIR';

  const availableItems = items.filter(i => i.available_quantity > 0);
  const [selectedItemId, setSelectedItemId] = useState<string>(availableItems[0]?.id || '');
  const [assigneeCategory, setAssigneeCategory] = useState<AssigneeCategory>('Family Unit');
  const [recipient, setRecipient] = useState<string>('Wisdom Family');
  const [searchMemberQuery, setSearchMemberQuery] = useState<string>('');
  const [qtyAllocated, setQtyAllocated] = useState<number>(1);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [conditionOnIssue, setConditionOnIssue] = useState<ItemCondition>('New');
  const [saving, setSaving] = useState(false);

  const selectedItem = items.find(i => i.id === selectedItemId);

  useEffect(() => {
    if (assigneeCategory === 'Family Unit') {
      setRecipient('Wisdom Family');
    } else if (assigneeCategory === 'Team') {
      setRecipient('CMO Football Team');
    } else if (assigneeCategory === 'Member' || assigneeCategory === 'Official') {
      if (members && members.length > 0) {
        setRecipient(members[0].full_name || members[0].name || '');
      }
    }
  }, [assigneeCategory, members]);

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      toast.error('Please select an equipment item.', { style: toastErrorStyle });
      return;
    }
    if (!recipient.trim()) {
      toast.error('Please specify a recipient.', { style: toastErrorStyle });
      return;
    }
    if (qtyAllocated < 1 || qtyAllocated > selectedItem.available_quantity) {
      toast.error(`Quantity must be between 1 and ${selectedItem.available_quantity}.`, { style: toastErrorStyle });
      return;
    }

    setSaving(true);
    try {
      const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const memberObj = members.find(m => (m.full_name || m.name) === recipient.trim());
      const rawMemId = memberObj?.official_member_id || memberObj?.id;
      const validMemberId = rawMemId ? (isUuid(rawMemId) || rawMemId.startsWith('HCC-CMO') ? rawMemId : null) : null;

      const allocationPayload = {
        equipment_id: selectedItem.id, // Standardized FK key
        item_id: selectedItem.id,      // Backward compatibility key
        assigned_to_type: assigneeCategory || 'Family Unit',
        assignee_category: assigneeCategory || 'Family Unit',
        assigned_to_name: recipient.trim(),
        allocated_to: recipient.trim(),
        member_id: validMemberId,
        quantity_allocated: Number(qtyAllocated),
        quantity: Number(qtyAllocated),
        quantity_returned: 0,
        allocation_date: new Date().toISOString().split('T')[0],
        allocated_at: new Date().toISOString(),
        expected_return_date: expectedReturnDate || null,
        condition_on_issue: conditionOnIssue || 'Good',
        status: 'Allocated',
        returned: false,
        allocated_by: activeOfficialId,
        logged_by: managerName,
      };

      const { error: allocErr } = await supabase
        .from('sports_equipment_allocations')
        .insert([allocationPayload]);

      if (allocErr) throw allocErr;

      const { error: invErr } = await supabase
        .from('sports_equipment')
        .update({
          available_quantity: selectedItem.available_quantity - qtyAllocated,
          allocated_quantity: selectedItem.allocated_quantity + qtyAllocated,
          last_updated: new Date().toISOString(),
          updated_by: managerName
        })
        .eq('id', selectedItem.id);

      if (invErr) throw invErr;

      toast.success(`${qtyAllocated}× ${selectedItem.item_name} allocated to ${recipient}.`, { style: toastStyle });
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Allocation error:', err);
      toast.error(err.message || 'Allocation failed.', { style: toastErrorStyle });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-4 sm:p-6 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-emerald-900/80 rounded-2xl shadow-2xl overflow-hidden text-gray-200">
        {/* Header */}
        <div className="p-5 border-b border-emerald-900/50 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-yellow-400">
            <PackageCheck className="w-5 h-5" />
            <h3 className="text-base font-bold">Allocate Equipment</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleAllocateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* 1. Equipment Select */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-yellow-400" />
              Equipment Item *
            </label>
            {availableItems.length === 0 ? (
              <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50">
                No equipment items are currently available for allocation.
              </p>
            ) : (
              <select
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
                className={selectStyle}
              >
                {availableItems.map(i => (
                  <option key={i.id} value={i.id} className="bg-slate-900">
                    {i.item_name} (Available: {i.available_quantity})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Assignee Category */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-yellow-400" />
              Assignee Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Family Unit', 'Team', 'Member', 'Official'] as AssigneeCategory[]).map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setAssigneeCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    assigneeCategory === cat
                      ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-md'
                      : 'bg-slate-950 text-gray-400 border-emerald-900/60 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Recipient Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-yellow-400" />
              Recipient ({assigneeCategory}) *
            </label>
            {assigneeCategory === 'Family Unit' && (
              <select
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className={selectStyle}
              >
                {['Wisdom Family', 'Honour Family', 'Talent Family', 'Integrity Family', 'Grand Pillar'].map(fam => (
                  <option key={fam} value={fam} className="bg-slate-900">{fam}</option>
                ))}
              </select>
            )}

            {assigneeCategory === 'Team' && (
              <select
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className={selectStyle}
              >
                {['CMO Football Team', 'CMO Table Tennis Team', 'CMO Athletics Squad', 'CMO Volleyball Team'].map(t => (
                  <option key={t} value={t} className="bg-slate-900">{t}</option>
                ))}
              </select>
            )}

            {(assigneeCategory === 'Member' || assigneeCategory === 'Official') && (
              <div className="space-y-2">
                <Input
                  value={searchMemberQuery}
                  onChange={e => setSearchMemberQuery(e.target.value)}
                  placeholder="Filter member by name..."
                  className="bg-slate-950 border-emerald-900/80 text-white text-xs"
                />
                <select
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  className={selectStyle}
                >
                  {members
                    .filter(m => (m.name || m.full_name || '').toLowerCase().includes(searchMemberQuery.toLowerCase()))
                    .map(m => {
                      const nameStr = m.full_name || m.name;
                      const idStr = m.official_member_id || m.id;
                      return (
                        <option key={m.id} value={nameStr} className="bg-slate-900">
                          {nameStr} ({idStr})
                        </option>
                      );
                    })}
                </select>
              </div>
            )}
          </div>

          {/* 4. Quantity & Return Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Quantity Allocated *
              </label>
              <Input
                type="number"
                min={1}
                max={selectedItem?.available_quantity || 1}
                value={qtyAllocated}
                onChange={e => setQtyAllocated(parseInt(e.target.value) || 1)}
                className="bg-slate-950 border-emerald-900/80 text-white font-mono"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Max available: {selectedItem?.available_quantity || 0}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                Expected Return Date
              </label>
              <input
                type="date"
                value={expectedReturnDate}
                onChange={e => setExpectedReturnDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-emerald-900/80 text-white text-sm focus:outline-none focus:border-yellow-400 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* 5. Condition on Issue */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Condition on Issue *
            </label>
            <select
              value={conditionOnIssue}
              onChange={e => setConditionOnIssue(e.target.value as ItemCondition)}
              className={selectStyle}
            >
              <option value="New" className="bg-slate-900">New</option>
              <option value="Good" className="bg-slate-900">Good</option>
              <option value="Fair" className="bg-slate-900">Fair</option>
            </select>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-emerald-900/50 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-emerald-900/80 text-gray-400 hover:text-white bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || availableItems.length === 0}
              className="bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold shadow-lg cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Confirm Allocation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Component 3: "Log Return" Action Modal
// ─────────────────────────────────────────────────────────────────────────────

interface LogReturnModalProps {
  allocation: AllocationLog;
  onClose: () => void;
  onSaved: () => void;
}

const LogReturnModal = ({ allocation, onClose, onSaved }: LogReturnModalProps) => {
  const qtyAllocated = allocation.quantity_allocated || allocation.quantity || 1;
  const prevReturned = allocation.quantity_returned || 0;
  const remainingToReturn = Math.max(1, qtyAllocated - prevReturned);

  const [returnQty, setReturnQty] = useState<number>(remainingToReturn);
  const [conditionOnReturn, setConditionOnReturn] = useState<'Good' | 'Damaged' | 'Lost'>('Good');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (returnQty < 1 || returnQty > remainingToReturn) {
      toast.error(`Return quantity must be between 1 and ${remainingToReturn}.`, { style: toastErrorStyle });
      return;
    }

    setSubmitting(true);
    try {
      const newTotalReturned = prevReturned + returnQty;
      const isFullyReturned = newTotalReturned >= qtyAllocated;
      const newStatus = isFullyReturned ? 'Returned' : 'Partial Return';

      // 1. Update sports_equipment_allocations
      const { error: allocErr } = await supabase
        .from('sports_equipment_allocations')
        .update({
          quantity_returned: newTotalReturned,
          condition_on_return: conditionOnReturn,
          notes: returnNotes.trim() || null,
          depreciation_notes: returnNotes.trim() || null,
          status: newStatus,
          returned: isFullyReturned,
          returned_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', allocation.id);

      if (allocErr) throw allocErr;

      // 2. Restock sports_equipment available_quantity
      const { data: itemData } = await supabase
        .from('sports_equipment')
        .select('available_quantity, allocated_quantity')
        .eq('id', allocation.item_id)
        .maybeSingle();

      if (itemData) {
        await supabase
          .from('sports_equipment')
          .update({
            available_quantity: itemData.available_quantity + returnQty,
            allocated_quantity: Math.max(0, itemData.allocated_quantity - returnQty),
            last_updated: new Date().toISOString()
          })
          .eq('id', allocation.item_id);
      }

      toast.success(`Successfully logged return of ${returnQty} unit(s).`, { style: toastStyle });
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Return error:', err);
      toast.error(err.message || 'Failed to log return.', { style: toastErrorStyle });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-4 sm:p-6 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-emerald-900/80 rounded-2xl shadow-2xl overflow-hidden text-gray-200">
        {/* Header */}
        <div className="p-5 border-b border-emerald-900/50 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-yellow-400">
            <RotateCcw className="w-5 h-5" />
            <h3 className="text-base font-bold">Log Equipment Return</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-900/60 text-xs space-y-1">
            <p className="text-white font-bold">{(allocation.item as any)?.item_name || 'Equipment Item'}</p>
            <p className="text-gray-400">
              Assigned To: <span className="text-yellow-400 font-semibold">{allocation.allocated_to}</span>
            </p>
            <p className="text-gray-400">
              Allocated: <span className="text-gray-200 font-mono">{qtyAllocated}</span> | Previously Returned: <span className="text-emerald-400 font-mono">{prevReturned}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Quantity Returned *
            </label>
            <Input
              type="number"
              min={1}
              max={remainingToReturn}
              value={returnQty}
              onChange={e => setReturnQty(parseInt(e.target.value) || 1)}
              className="bg-slate-950 border-emerald-900/80 text-white font-mono"
            />
            <p className="text-[10px] text-gray-400 mt-1">Returning {returnQty} of {remainingToReturn} remaining</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Condition on Return *
            </label>
            <select
              value={conditionOnReturn}
              onChange={e => setConditionOnReturn(e.target.value as any)}
              className={selectStyle}
            >
              <option value="Good" className="bg-slate-900">Good</option>
              <option value="Damaged" className="bg-slate-900">Damaged</option>
              <option value="Lost" className="bg-slate-900">Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              value={returnNotes}
              onChange={e => setReturnNotes(e.target.value)}
              placeholder="Comments on equipment state or return details..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-emerald-900/80 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-400 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-emerald-900/50 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-emerald-900/80 text-gray-400 hover:text-white bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold shadow-lg cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Submit Return Log
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// New Item Form Component
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
    <div className="fixed inset-0 z-50 p-4 sm:p-6 md:p-8 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-emerald-900/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-200 text-left">
        {/* Header */}
        <div className="p-4 sm:p-6 shrink-0 border-b border-emerald-900/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Add New Equipment
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar grow">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Item Name *</label>
            <Input
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="e.g. Size 5 Match Ball"
              className="bg-slate-950 border-emerald-900/80 text-white placeholder:text-gray-600 focus:border-yellow-400"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as ItemCategory)} className={selectStyle}>
                {ITEM_CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-slate-900">
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Condition</label>
              <select value={condition} onChange={e => setCondition(e.target.value as ItemCondition)} className={selectStyle}>
                {ITEM_CONDITIONS.map(c => (
                  <option key={c} value={c} className="bg-slate-900">{c}</option>
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
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-emerald-900/80 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-yellow-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 shrink-0 border-t border-emerald-900/50 flex justify-end gap-3 bg-slate-950">
          <Button variant="outline" onClick={onClose} className="border-emerald-900/80 text-gray-400 hover:text-white bg-transparent">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold shadow-lg">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Add to Inventory</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const EquipmentInventoryLedger = () => {
  const { currentUser, members } = useApp();

  const activeOfficialId =
    currentUser?.official_member_id ||
    'HCC-CMO-SPRT-DIR';

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

  // Modals
  const [showNewItem, setShowNewItem] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedLogReturnAlloc, setSelectedLogReturnAlloc] = useState<AllocationLog | null>(null);

  const managerName = currentUser?.name ?? currentUser?.full_name ?? 'Manager';

  // ── Fetch Data ─────────────────────────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const { data: invData, error: invErr } = await supabase
        .from('sports_equipment')
        .select('*')
        .order('category')
        .order('item_name');

      if (invErr) throw invErr;

      // Explicit relation query targeting equipment_id
      let allocData: any[] = [];
      const { data: primaryAllocData, error: allocErr } = await supabase
        .from('sports_equipment_allocations')
        .select(`
          id,
          equipment_id,
          assigned_to_type,
          assigned_to_name,
          member_id,
          quantity_allocated,
          quantity_returned,
          allocated_at,
          expected_return_date,
          actual_return_date,
          returned_date,
          condition_on_issue,
          status,
          notes,
          sports_equipment!equipment_id (
            id,
            item_name,
            category
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (allocErr) {
        console.warn('Primary equipment_id query fallback:', allocErr);
        const { data: fallbackAllocData } = await supabase
          .from('sports_equipment_allocations')
          .select(`*, item:sports_equipment(id, item_name, category)`)
          .order('allocation_date', { ascending: false })
          .limit(100);
        allocData = fallbackAllocData || [];
      } else {
        allocData = primaryAllocData || [];
      }

      setItems((invData as InventoryItem[]) ?? []);
      setAllocations((allocData as unknown as AllocationLog[]) ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load inventory.', { style: toastErrorStyle });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

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
  const unreturnedCount = allocations.filter(a => !a.returned && (a.quantity_returned || 0) < (a.quantity_allocated || a.quantity || 1)).length;

  // ── Access Guard ────────────────────────────────────────────────────────────
  if (!isAuthorised) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="max-w-md w-full bg-slate-900 border border-red-500/30 p-8 text-center rounded-2xl shadow-2xl">
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans text-gray-200">

      {showNewItem && (
        <NewItemForm onClose={() => setShowNewItem(false)} onSaved={fetchInventory} managerName={managerName} />
      )}
      {showAllocateModal && (
        <AllocateEquipmentModal
          items={items}
          members={members || []}
          onClose={() => setShowAllocateModal(false)}
          onSaved={fetchInventory}
          managerName={managerName}
        />
      )}
      {selectedLogReturnAlloc && (
        <LogReturnModal
          allocation={selectedLogReturnAlloc}
          onClose={() => setSelectedLogReturnAlloc(null)}
          onSaved={fetchInventory}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-500/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-yellow-400" />
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
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-900/80 text-yellow-400 text-sm hover:bg-yellow-400/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Button
            onClick={() => setShowAllocateModal(true)}
            className="bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold shadow-lg cursor-pointer"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Allocate Equipment
          </Button>
          <Button
            onClick={() => setShowNewItem(true)}
            variant="outline"
            className="border-emerald-900/80 text-gray-300 hover:text-white bg-transparent cursor-pointer"
            size="sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5 text-yellow-400" />
            Add SKU
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Assets', value: totalItems, color: 'text-white', border: 'border-emerald-900/60' },
          { label: 'Available', value: totalAvailable, color: 'text-emerald-400', border: 'border-emerald-500/30' },
          { label: 'Allocated Out', value: totalAllocated, color: 'text-blue-400', border: 'border-blue-500/30' },
          { label: 'Unreturned', value: unreturnedCount, color: unreturnedCount > 0 ? 'text-yellow-400' : 'text-gray-500', border: unreturnedCount > 0 ? 'border-yellow-500/30' : 'border-emerald-900/60' },
        ].map(s => (
          <Card key={s.label} className={`bg-slate-900 border ${s.border} rounded-2xl p-4 text-center shadow-lg`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* ── Tab Toggle ── */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-emerald-900/80 rounded-xl w-fit">
        <button
          id="tab-inventory"
          onClick={() => setActiveView('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
            activeView === 'inventory'
              ? 'bg-yellow-400 text-slate-950 shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          Inventory SKU Matrix
        </button>
        <button
          id="tab-allocations"
          onClick={() => setActiveView('allocations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
            activeView === 'allocations'
              ? 'bg-yellow-400 text-slate-950 shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          Allocation & Returns Tracker
          {unreturnedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black bg-yellow-400 text-slate-950 rounded-full">{unreturnedCount}</span>
          )}
        </button>
      </div>

      {/* ── Component 2: Inventory SKU Matrix ── */}
      {activeView === 'inventory' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search equipment..."
                className="pl-9 bg-slate-900 border-emerald-900/80 text-white placeholder:text-gray-600 focus:border-yellow-400"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as ItemCategory | 'All')}
              className="h-10 px-3 rounded-xl bg-slate-900 border border-emerald-900/80 text-white text-sm focus:outline-none focus:border-yellow-400 cursor-pointer"
            >
              <option value="All">All Categories</option>
              {ITEM_CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-slate-900">
                  {CATEGORY_META[c].label}
                </option>
              ))}
            </select>
          </div>

          <Card className="bg-slate-900 border border-emerald-900/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-emerald-900/50 flex items-center justify-between bg-slate-950">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-yellow-400" />
                Asset Count Matrix
              </h2>
              <span className="text-xs text-gray-400 bg-slate-900 px-3 py-1 rounded-full border border-emerald-900/60 font-mono">
                {filteredItems.length} SKU{filteredItems.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-14 gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
                <span className="text-sm">Loading inventory...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-500">
                <Package className="w-10 h-10 mb-3 opacity-20 text-yellow-400" />
                <p className="text-sm font-medium">No equipment found. Add items to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-emerald-900/50 bg-slate-950/80">
                      <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Item Name</th>
                      <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                      <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Available</th>
                      <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Allocated Out</th>
                      <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Condition</th>
                      <th className="text-right px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/30">
                    {filteredItems.map(item => {
                      const catMeta = CATEGORY_META[item.category] || { label: item.category || 'Equipment', color: 'text-gray-300' };
                      const condMeta = CONDITION_META[item.condition] || { color: 'text-gray-300', bg: 'bg-slate-800 border-slate-700' };
                      const utilPct = item.total_quantity > 0
                        ? Math.round((item.allocated_quantity / item.total_quantity) * 100)
                        : 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-white">{item.item_name}</p>
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
                                <div className="w-12 h-1 rounded-full bg-slate-950 overflow-hidden">
                                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${utilPct}%` }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${condMeta.bg} ${condMeta.color}`}>
                              {item.condition}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAllocateModal(true);
                              }}
                              disabled={item.available_quantity === 0}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-400 hover:text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
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

      {/* ── Component 2: Allocations & Returns Tracker Table ── */}
      {activeView === 'allocations' && (
        <Card className="bg-slate-900 border border-emerald-900/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-emerald-900/50 flex flex-wrap items-center justify-between gap-3 bg-slate-950">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-yellow-400" />
              <h2 className="text-base font-bold text-white">
                Allocation & Returns Tracker
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 bg-slate-900 px-3 py-1 rounded-full border border-emerald-900/60 font-mono">
                {allocations.length} Record{allocations.length !== 1 ? 's' : ''}
              </span>
              <Button
                onClick={() => setShowAllocateModal(true)}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Allocate Equipment
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-14 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
              <span className="text-sm">Loading allocations...</span>
            </div>
          ) : allocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-500">
              <PackageCheck className="w-10 h-10 mb-3 opacity-30 text-yellow-400" />
              <p className="text-sm font-medium">No active equipment allocations recorded yet.</p>
              <Button
                onClick={() => setShowAllocateModal(true)}
                className="mt-3 bg-yellow-400/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-400 hover:text-slate-950 text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer"
              >
                + Allocate Equipment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-900/50 bg-slate-950/80">
                    <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Equipment Item</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned To</th>
                    <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Qty Allocated</th>
                    <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Qty Returned</th>
                    <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Issue Date</th>
                    <th className="text-center px-4 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/30">
                  {allocations.map(alloc => {
                    const itemObj = (alloc as any).sports_equipment || (alloc as any).item;
                    const itemName = itemObj?.item_name || 'Equipment Item';
                    const recipientName = alloc.assigned_to_name || alloc.allocated_to || '—';
                    const recipientCategory = alloc.assigned_to_type || alloc.assignee_category;
                    const qtyAlloc = alloc.quantity_allocated || alloc.quantity || 1;
                    const qtyRet = alloc.quantity_returned || 0;
                    const rawStatus = alloc.status || (alloc.returned ? 'Returned' : 'Allocated');

                    {/* Safe Badge Rendering */}
                    const badge = STATUS_BADGES[rawStatus] || STATUS_BADGES[alloc.returned ? 'Returned' : 'Allocated'] || {
                      label: rawStatus || 'Allocated',
                      color: 'bg-slate-800 text-slate-300 border-slate-700'
                    };

                    const isFullyReturned = alloc.returned || qtyRet >= qtyAlloc || rawStatus === 'Returned' || rawStatus === 'Fully Returned';

                    return (
                      <tr key={alloc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-white flex items-center gap-2">
                            <Layers className="w-4 h-4 text-yellow-500 shrink-0" />
                            {itemName}
                          </p>
                          {alloc.notes && <p className="text-xs text-gray-400 mt-0.5">{alloc.notes}</p>}
                        </td>
                        <td className="px-4 py-4 text-gray-200 font-medium">
                          {recipientName}
                          {recipientCategory && (
                            <span className="block text-[10px] text-gray-400 uppercase tracking-wider">{recipientCategory}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center font-mono font-bold text-white">{qtyAlloc}</td>
                        <td className="px-4 py-4 text-center font-mono font-bold text-emerald-400">{qtyRet}</td>
                        <td className="px-4 py-4 text-center text-xs text-gray-400 font-mono">
                          {new Date(alloc.allocated_at || alloc.allocation_date || alloc.created_at || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${badge.color}`}>
                            {isFullyReturned ? <CheckCircle2 className="w-3.5 h-3.5" /> : <PackageCheck className="w-3.5 h-3.5" />}
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!isFullyReturned && (
                            <button
                              onClick={() => setSelectedLogReturnAlloc(alloc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-400 hover:text-slate-950 transition-all duration-200 cursor-pointer shadow"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Log Return
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
