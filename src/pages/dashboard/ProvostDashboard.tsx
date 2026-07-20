import { useState, useEffect } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { Member } from '../../types';
import { toast } from 'sonner';
import { 
  ShieldAlert, 
  Scale, 
  Search, 
  Gavel, 
  CheckCircle2, 
  BookOpen,
  DollarSign,
  Camera,
  Clock,
  AlertCircle,
  FileCheck,
  Lock,
  UserCheck,
  XCircle
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { GeneralGalleryManager } from '../../app/components/gallery/GeneralGalleryManager';
import { ProvostAttendanceWorkspace } from '../../app/components/attendance/ProvostAttendanceWorkspace';

interface DisciplinaryLog {
  id: string;
  memberId: string;
  memberName: string;
  infraction: string;
  timestamp: string;
  status: 'Active' | 'Resolved';
}

export default function ProvostDashboard() {
  const { currentUser, members, setMembers, setCurrentUser, refreshDatabase } = useApp();

  // Tab State: 3 Core Unified Workspaces
  const [activeTab, setActiveTab] = useState<'rollcall' | 'escrow' | 'gallery'>('rollcall');

  // Lock Engine States
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('provost_session_unlocked') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Hidden PIN Configuration States (Inside Update Profile Photo Modal)
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  
  // Local Disciplinary Logs State (Persisted in LocalStorage)
  const [disciplinaryLogs, setDisciplinaryLogs] = useState<DisciplinaryLog[]>([]);
  
  // Fine Ledger Form States
  const [fineMemberId, setFineMemberId] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [fineInfraction, setFineInfraction] = useState('Lateness');
  const [fineAmount, setFineAmount] = useState('500');
  const [fineNotes, setFineNotes] = useState('');
  const [submittingFine, setSubmittingFine] = useState(false);
  const [recentFines, setRecentFines] = useState<any[]>([]);
  const [loadingFines, setLoadingFines] = useState(false);

  // Escrow Grid Filter & Search States
  const [escrowFilter, setEscrowFilter] = useState<'ALL' | 'UNPAID' | 'PENDING' | 'CLEARED'>('ALL');
  const [escrowSearch, setEscrowSearch] = useState('');
  const [updatingFineId, setUpdatingFineId] = useState<string | number | null>(null);

  // Infraction presets with suggested default fine amounts
  const INFRACTION_PRESETS: Record<string, number> = {
    'Lateness': 500,
    'Absence': 1000,
    'Insubordination': 2000,
    'Dress Code Violation': 500,
    'Conduct / Unbecoming Behavior': 1500,
    'Late Dues Penalty': 1000,
    'Custom Penalty': 1000,
  };

  useEffect(() => {
    // Load local disciplinary logs
    const savedLogs = localStorage.getItem('cmo_disciplinary_logs');
    if (savedLogs) {
      try {
        setDisciplinaryLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error('Failed to parse disciplinary logs', e);
      }
    }
    fetchRecentFines();
  }, []);

  const saveLogsToLocal = (newLogs: DisciplinaryLog[]) => {
    setDisciplinaryLogs(newLogs);
    localStorage.setItem('cmo_disciplinary_logs', JSON.stringify(newLogs));
  };

  const fetchRecentFines = async () => {
    setLoadingFines(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .like('purpose', 'Provost Fine:%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRecentFines(data || []);
    } catch (err: any) {
      console.error('Error fetching recent fines:', err);
    } finally {
      setLoadingFines(false);
    }
  };

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
      toast.success('Profile picture updated successfully!');
    } catch (e: any) {
      toast.error('Failed to upload profile picture: ' + e.message);
    }
  };

  // Handler A: Verify Input Credentials
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);
    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'PROVOST',
        input_pin: pinInput
      });
      if (error) throw error;
      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('provost_session_unlocked', 'true');
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
    sessionStorage.removeItem('provost_session_unlocked');
  };

  // Handler B: Re-hash and Mutation API
  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);
    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'PROVOST',
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
        setPinChangeError("Current Gateway PIN is invalid.");
      }
    } catch (error: any) {
      console.error("PIN Update Error:", error.message);
      setPinChangeError("Failed to persist security token update.");
    } finally {
      setIsSubmittingPinChange(false);
    }
  };

  // Toggle Infraction Status
  const logInfraction = (member: Member, infractionType: string) => {
    const newLog: DisciplinaryLog = {
      id: `INF-${Date.now()}`,
      memberId: member.official_member_id || member.id,
      memberName: member.full_name || member.name,
      infraction: infractionType,
      timestamp: new Date().toISOString(),
      status: 'Active'
    };

    const updatedLogs = [newLog, ...disciplinaryLogs];
    saveLogsToLocal(updatedLogs);
    toast.success(`Infraction (${infractionType}) logged for ${member.name}`);

    // Pre-fill the Fines Management Form
    setFineMemberId(member.official_member_id || member.id);
    setFineInfraction(infractionType);
    setFineAmount(String(INFRACTION_PRESETS[infractionType] || 1000));
    setFineNotes(`Automatic assessment for ${infractionType} logged on ${new Date().toLocaleDateString()}`);
  };

  const resolveInfractionLocal = (id: string) => {
    const updated = disciplinaryLogs.map(log => 
      log.id === id ? { ...log, status: 'Resolved' as const } : log
    );
    saveLogsToLocal(updated);
    toast.success('Infraction status marked as Resolved');
  };

  const clearInfractionLocal = (id: string) => {
    const updated = disciplinaryLogs.filter(log => log.id !== id);
    saveLogsToLocal(updated);
    toast.success('Infraction entry cleared from logs');
  };

  const clearAllLocalLogs = () => {
    if (window.confirm('Are you sure you want to clear the entire disciplinary log history?')) {
      saveLogsToLocal([]);
      toast.success('Disciplinary logs cleared');
    }
  };

  // Handle fine infraction selection change
  const handleInfractionChange = (type: string) => {
    setFineInfraction(type);
    setFineAmount(String(INFRACTION_PRESETS[type] || 1000));
  };

  // Submit Fine Assessment
  const handleFineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fineMemberId || !fineAmount || !fineInfraction) {
      toast.error('Please complete all ledger fields.');
      return;
    }

    const amountVal = parseFloat(fineAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Please enter a valid fine amount.');
      return;
    }

    const targetMember = members.find(m => m.official_member_id === fineMemberId || m.id === fineMemberId);
    if (!targetMember) {
      toast.error('Target member not found in roster database.');
      return;
    }

    setSubmittingFine(true);
    try {
      // 1. Get current balance of target member in Supabase
      const { data: dbMembers, error: fetchErr } = await supabase
        .from('members')
        .select('balance')
        .eq('official_member_id', fineMemberId);

      if (fetchErr) throw fetchErr;
      
      const currentBalance = dbMembers && dbMembers.length > 0 ? parseFloat(dbMembers[0].balance) : targetMember.balance;
      
      // Calculate new balance (fines deduct from balance, i.e., decrease it, making it negative if they owe)
      const newBalance = currentBalance - amountVal;

      // 2. Update balance in members table
      const { error: membersErr } = await supabase
        .from('members')
        .update({ balance: newBalance })
        .eq('official_member_id', fineMemberId);

      if (membersErr) throw membersErr;

      // 3. Update balance in master_roster table
      const { error: rosterErr } = await supabase
        .from('master_roster')
        .update({ balance: newBalance })
        .eq('official_member_id', fineMemberId);

      if (rosterErr) throw rosterErr;

      // 4. Log the transaction as a fine inflow with initial status 'Unpaid'
      const { error: txErr } = await supabase
        .from('transactions')
        .insert([{
          official_member_id: fineMemberId,
          member_name: targetMember.full_name || targetMember.name,
          amount: amountVal,
          purpose: `Provost Fine: ${fineInfraction}`,
          notes: fineNotes.trim() || `Fine issued for ${fineInfraction}`,
          transaction_type: 'income',
          status: 'Unpaid'
        }]);

      if (txErr) throw txErr;

      // 5. Update local contexts/states
      const updatedMembersList = members.map(m => 
        (m.official_member_id === fineMemberId || m.id === fineMemberId)
          ? { ...m, balance: newBalance }
          : m
      );
      setMembers(updatedMembersList);

      toast.success(`Fine of ₦${amountVal.toLocaleString()} logged against ${targetMember.name}`);
      
      setFineMemberId('');
      setMemberSearchQuery('');
      setIsMemberDropdownOpen(false);
      setFineNotes('');
      setFineAmount('500');
      setFineInfraction('Lateness');

      // Refresh transactions
      await fetchRecentFines();
      await refreshDatabase();
    } catch (err: any) {
      console.error('Fine assessment logging error:', err);
      toast.error(`Transaction failed: ${err.message}`);
    } finally {
      setSubmittingFine(false);
    }
  };

  // Handshake: Confirm Payment Received (Marks fine as "Pending Verification")
  const handleConfirmPaymentReceived = async (txId: string | number) => {
    setUpdatingFineId(txId);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'Pending Verification' })
        .eq('id', txId);

      if (error) throw error;

      // Update local state context
      setRecentFines(prev => prev.map(t => t.id === txId ? { ...t, status: 'Pending Verification' } : t));
      toast.success('Payment marked as "Pending Verification". Sent to Financial Secretary for audit & treasury commit!');
      await refreshDatabase();
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      toast.error('Failed to update fine state: ' + err.message);
    } finally {
      setUpdatingFineId(null);
    }
  };

  // Filters for General Members Directory
  const generalMembers = members.filter(m => 
    m.role === 'member' && m.status !== 'Deceased'
  );

  const filteredMembers = generalMembers.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (m.official_member_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFamily = selectedFamily ? m.family === selectedFamily : true;
    
    return matchesSearch && matchesFamily;
  });

  // Filtered Fines for Escrow Grid
  const filteredEscrowFines = recentFines.filter(tx => {
    const txStatus = tx.status || 'Unpaid';
    const matchesFilter = 
      escrowFilter === 'ALL' ? true :
      escrowFilter === 'UNPAID' ? (txStatus === 'Unpaid' || !tx.status) :
      escrowFilter === 'PENDING' ? (txStatus === 'Pending Verification') :
      escrowFilter === 'CLEARED' ? (txStatus === 'Cleared' || txStatus === 'Approved') : true;

    const query = escrowSearch.toLowerCase();
    const matchesSearch = !query || 
      (tx.member_name || '').toLowerCase().includes(query) ||
      (tx.official_member_id || '').toLowerCase().includes(query) ||
      (tx.purpose || '').toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const unpaidFinesCount = recentFines.filter(t => !t.status || t.status === 'Unpaid').length;
  const pendingVerificationCount = recentFines.filter(t => t.status === 'Pending Verification').length;
  const clearedFinesTotal = recentFines
    .filter(t => t.status === 'Cleared' || t.status === 'Approved')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <div className="p-4 md:p-8 font-sans text-gray-200 min-h-screen bg-[#001a16]">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#002520] p-6 rounded-xl border border-[#ffd700]/20 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-lg text-[#ffd700] border border-red-500/20">
              <ShieldAlert className="w-8 h-8 text-[#ffd700]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">Provost Marshall Office</h1>
              <p className="text-gray-400 text-sm mt-1">
                Acting Provost: <span className="text-[#ffd700] font-semibold">{currentUser?.name}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchRecentFines} className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold text-xs md:text-sm">
              Refresh Ledger
            </Button>
            {isExecutiveUnlocked && (
              <button
                onClick={handleLockDashboard}
                className="bg-[#001a16] hover:bg-[#ffd700]/10 text-[#ffd700] border border-[#ffd700]/30 px-3 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                title="Lock Executive Workspace"
              >
                <Lock className="h-4 w-4" />
                Lock
              </button>
            )}
          </div>
        </div>

        {/* Executive Profile Card */}
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
                      <div className="border-t border-white/10 my-4" />
                      <button 
                        type="button"
                        onClick={() => {
                          setIsChangingPin(!isChangingPin);
                          setPinChangeError(null);
                          setPinChangeSuccess(false);
                        }} 
                        className="text-[10px] text-gray-400 hover:text-[#ffd700] transition-colors block ml-auto focus:outline-none cursor-pointer"
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
                          <button type="submit" disabled={isSubmittingPinChange || newPin.length < 4 || currentPin.length < 4} className="w-full bg-[#ffd700] text-[#001a16] font-bold text-xs py-2 rounded hover:bg-[#e6c200] transition-colors disabled:opacity-40 cursor-pointer">
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
                    <p className="text-[#ffd700] font-bold text-sm">PROVOST MARSHALL</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Unpaid Fines</p>
                    <p className="text-red-400 font-bold text-sm">{unpaidFinesCount} Items</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Pending Verification</p>
                    <p className="text-amber-400 font-bold text-sm">{pendingVerificationCount} Items</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {!isExecutiveUnlocked ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#001411] border border-[#ffd700]/20 rounded-lg max-w-md mx-auto text-center space-y-6 my-8 shadow-xl">
            <div className="p-3 bg-[#002a24] rounded-full border border-[#ffd700]/30 text-[#ffd700]">
              <Lock className="h-8 w-8 text-[#ffd700]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#ffd700]">Executive Security Gateway</h3>
              <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to unlock the Provost workflows and fine ledger.</p>
            </div>
            <form onSubmit={handleVerifyPin} className="w-full space-y-4">
              <input type="password" maxLength={6} placeholder="Enter Secret PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))} className="w-full text-center tracking-widest bg-[#001f1a] border border-[#ffd700] text-white rounded p-3 focus:outline-none text-xl font-mono" />
              {pinError && <p className="text-red-400 text-xs font-semibold">{pinError}</p>}
              <button type="submit" disabled={isVerifyingPin || pinInput.length < 4} className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-[#001a16] font-bold py-2.5 rounded transition-colors disabled:opacity-50 cursor-pointer">
                {isVerifyingPin ? "Verifying..." : "Unlock Provost Portal"}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* High-Contrast 3-Tab Professional Selector Bar */}
            <div className="bg-[#002520] p-1.5 rounded-xl border border-[#ffd700]/30 shadow-lg flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('rollcall')}
                className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
                  activeTab === 'rollcall'
                    ? 'bg-[#ffd700] text-[#001a16] shadow-md scale-[1.01]'
                    : 'text-gray-300 hover:text-white hover:bg-[#001a16]/60'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Roll-Call & Disciplinary Hub</span>
              </button>

              <button
                onClick={() => setActiveTab('escrow')}
                className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
                  activeTab === 'escrow'
                    ? 'bg-[#ffd700] text-[#001a16] shadow-md scale-[1.01]'
                    : 'text-gray-300 hover:text-white hover:bg-[#001a16]/60'
                }`}
              >
                <Gavel className="w-4 h-4" />
                <span>Fines Escrow & Clearances</span>
                {unpaidFinesCount > 0 && (
                  <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-mono animate-pulse">
                    {unpaidFinesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('gallery')}
                className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
                  activeTab === 'gallery'
                    ? 'bg-[#ffd700] text-[#001a16] shadow-md scale-[1.01]'
                    : 'text-gray-300 hover:text-white hover:bg-[#001a16]/60'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Activity Gallery Manager</span>
              </button>
            </div>

            {/* Tab 1: Roll-Call & Disciplinary Hub Workspace */}
            {activeTab === 'rollcall' && (
              <div className="space-y-8">
                {/* 1. Live Roll-Call, 4-Hour Operational Session Timer & Pending Excuses Queue */}
                <ProvostAttendanceWorkspace members={members} />

                {/* 2. Manual Disciplinary Infraction Assessor Card */}
                <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-xl">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#ffd700]/20">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#ffd700]">Manual Disciplinary Infraction Assessor</h3>
                      <p className="text-xs text-gray-300">Log non-attendance infractions (Dress Code, Insubordination, Conduct, Late Dues) directly to Escrow</p>
                    </div>
                  </div>

                  <form onSubmit={handleFineSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Searchable Member Combobox */}
                      <div className="space-y-1 relative">
                        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Select Penalized Member</label>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Type name, ID, or family..."
                            value={memberSearchQuery}
                            onFocus={() => setIsMemberDropdownOpen(true)}
                            onChange={(e) => {
                              setMemberSearchQuery(e.target.value);
                              setIsMemberDropdownOpen(true);
                              if (!e.target.value) setFineMemberId('');
                            }}
                            className="bg-[#001a16] border-[#ffd700]/30 text-white text-xs pl-8 pr-8"
                            required={!fineMemberId}
                          />
                          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                          {fineMemberId && (
                            <button
                              type="button"
                              onClick={() => {
                                setFineMemberId('');
                                setMemberSearchQuery('');
                                setIsMemberDropdownOpen(true);
                              }}
                              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white cursor-pointer"
                              title="Clear selection"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Filtered Dropdown List */}
                        {isMemberDropdownOpen && (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#001a16] border-2 border-[#ffd700]/40 rounded-lg shadow-2xl max-h-56 overflow-y-auto divide-y divide-gray-800">
                            {members
                              .filter(m => m.status !== 'Deceased')
                              .filter(m => {
                                const q = memberSearchQuery.toLowerCase().trim();
                                if (!q) return true;
                                const nameMatch = (m.name || m.full_name || '').toLowerCase().includes(q);
                                const idMatch = (m.official_member_id || m.id || '').toLowerCase().includes(q);
                                const familyMatch = (m.family || m.cmo_family || '').toLowerCase().includes(q);
                                return nameMatch || idMatch || familyMatch;
                              })
                              .length === 0 ? (
                              <div className="p-3 text-xs text-gray-400 text-center">No matching member found</div>
                            ) : (
                              members
                                .filter(m => m.status !== 'Deceased')
                                .filter(m => {
                                  const q = memberSearchQuery.toLowerCase().trim();
                                  if (!q) return true;
                                  const nameMatch = (m.name || m.full_name || '').toLowerCase().includes(q);
                                  const idMatch = (m.official_member_id || m.id || '').toLowerCase().includes(q);
                                  const familyMatch = (m.family || m.cmo_family || '').toLowerCase().includes(q);
                                  return nameMatch || idMatch || familyMatch;
                                })
                                .map((m) => {
                                  const mId = m.official_member_id || m.id;
                                  const isSelected = mId === fineMemberId;
                                  return (
                                    <div
                                      key={m.id}
                                      onClick={() => {
                                        setFineMemberId(mId);
                                        setMemberSearchQuery(`${m.name || m.full_name} (${mId})`);
                                        setIsMemberDropdownOpen(false);
                                      }}
                                      className={`p-2.5 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                        isSelected ? 'bg-[#003830] text-[#ffd700]' : 'hover:bg-[#002a24] text-white'
                                      }`}
                                    >
                                      <div>
                                        <span className="font-bold block">{m.name || m.full_name}</span>
                                        <span className="text-gray-400 font-mono text-[11px]">ID: {mId}</span>
                                      </div>
                                      {m.family && (
                                        <span className="px-2 py-0.5 bg-[#002a24] text-[#ffd700] text-[10px] rounded border border-[#ffd700]/20 font-semibold">
                                          {m.family}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Infraction Type</label>
                        <select
                          value={fineInfraction}
                          onChange={(e) => handleInfractionChange(e.target.value)}
                          className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white rounded p-2.5 text-xs focus:border-[#ffd700] focus:outline-none cursor-pointer"
                        >
                          {Object.keys(INFRACTION_PRESETS).map((preset) => (
                            <option key={preset} value={preset}>
                              {preset}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Fine Amount (₦)</label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="500"
                            value={fineAmount}
                            onChange={(e) => setFineAmount(e.target.value)}
                            className="bg-[#001a16] border-[#ffd700]/30 text-white pl-8 text-xs font-mono"
                            required
                          />
                          <span className="absolute left-2.5 top-2.5 text-[#ffd700] font-extrabold text-xs select-none">₦</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Infraction Notes & Justification</label>
                      <Input
                        type="text"
                        value={fineNotes}
                        onChange={(e) => setFineNotes(e.target.value)}
                        placeholder="Provide details regarding the infraction..."
                        className="bg-[#001a16] border-[#ffd700]/30 text-white text-xs"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingFine}
                      className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#e6c200] font-bold text-xs py-2.5 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Gavel className="w-4 h-4" />
                      {submittingFine ? 'Logging Fine...' : 'Log Disciplinary Fine to Escrow'}
                    </Button>
                  </form>
                </Card>
              </div>
            )}

            {/* Tab 2: Fines Escrow & Clearances Workspace */}
            {activeTab === 'escrow' && (
              <div className="space-y-6">
                {/* Summary Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#002520] border border-[#ffd700]/20 rounded-xl p-4 shadow-lg">
                    <p className="text-gray-400 text-xs font-semibold uppercase">Total Fine Assessments</p>
                    <p className="text-2xl font-black text-white mt-1">{recentFines.length}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Logged in Provost ledger</p>
                  </div>
                  <div className="bg-[#002520] border border-red-500/30 rounded-xl p-4 shadow-lg">
                    <p className="text-red-400 text-xs font-semibold uppercase">Active Unpaid Fines</p>
                    <p className="text-2xl font-black text-red-400 mt-1">{unpaidFinesCount}</p>
                    <p className="text-[10px] text-red-300/60 mt-1">Awaiting payment submission</p>
                  </div>
                  <div className="bg-[#002520] border border-amber-500/30 rounded-xl p-4 shadow-lg">
                    <p className="text-amber-400 text-xs font-semibold uppercase">Pending Verification</p>
                    <p className="text-2xl font-black text-amber-400 mt-1">{pendingVerificationCount}</p>
                    <p className="text-[10px] text-amber-300/60 mt-1">Awaiting FinSec Treasury commit</p>
                  </div>
                  <div className="bg-[#002520] border border-green-500/30 rounded-xl p-4 shadow-lg">
                    <p className="text-green-400 text-xs font-semibold uppercase">Cleared Treasury Fines</p>
                    <p className="text-2xl font-black text-green-400 mt-1">{formatCurrency(clearedFinesTotal)}</p>
                    <p className="text-[10px] text-green-300/60 mt-1">Committed & cleared</p>
                  </div>
                </div>

                {/* Main Management Grid Container */}
                <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 rounded-xl shadow-lg">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Gavel className="w-5 h-5 text-[#ffd700]" />
                        Fines Escrow & Clearances Grid
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Track fine payment lifecycle: Mark unpaid items as <span className="text-[#ffd700] font-semibold">&ldquo;Pending Verification&rdquo;</span> when physical cash/transfer is received.
                      </p>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Input
                          type="text"
                          placeholder="Search member / infraction..."
                          value={escrowSearch}
                          onChange={(e) => setEscrowSearch(e.target.value)}
                          className="bg-[#001a16] border-[#ffd700]/20 text-xs text-white pl-8"
                        />
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                      </div>
                      
                      <div className="flex bg-[#001a16] border border-[#ffd700]/20 rounded-lg p-1 w-full sm:w-auto">
                        {(['ALL', 'UNPAID', 'PENDING', 'CLEARED'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setEscrowFilter(tab)}
                            className={`flex-1 px-3 py-1 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                              escrowFilter === tab 
                                ? 'bg-[#ffd700] text-[#001a16]' 
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fines Grid Display */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#ffd700]/10 text-gray-400 font-semibold text-xs uppercase tracking-wider">
                          <th className="py-3 px-4">Member Info</th>
                          <th className="py-3 px-4">Infraction Details</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Date Assessed</th>
                          <th className="py-3 px-4 text-center">Lifecycle Status</th>
                          <th className="py-3 px-4 text-right">Verification Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ffd700]/5">
                        {loadingFines ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400 animate-pulse text-xs">
                              Fetching fines escrow records...
                            </td>
                          </tr>
                        ) : filteredEscrowFines.length > 0 ? (
                          filteredEscrowFines.map((tx) => {
                            const statusStr = tx.status || 'Unpaid';
                            const isUnpaid = statusStr === 'Unpaid';
                            const isPending = statusStr === 'Pending Verification';
                            const isCleared = statusStr === 'Cleared' || statusStr === 'Approved';

                            return (
                              <tr key={tx.id} className="hover:bg-[#001a16]/50 transition-colors">
                                <td className="py-4 px-4">
                                  <p className="font-bold text-white uppercase text-sm">{tx.member_name}</p>
                                  <p className="text-gray-400 text-xs font-mono">{tx.official_member_id}</p>
                                </td>
                                <td className="py-4 px-4">
                                  <p className="text-gray-200 font-semibold text-xs">{tx.purpose}</p>
                                  {tx.notes && <p className="text-gray-400 text-[11px] italic mt-0.5">{tx.notes}</p>}
                                </td>
                                <td className="py-4 px-4 font-mono font-bold text-red-400">
                                  {formatCurrency(Number(tx.amount))}
                                </td>
                                <td className="py-4 px-4 text-gray-400 text-xs font-mono">
                                  {new Date(tx.created_at).toLocaleString()}
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    isCleared ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                    isPending ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                    'bg-red-500/20 text-red-400 border border-red-500/30'
                                  }`}>
                                    {isCleared && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {isPending && <Clock className="w-3.5 h-3.5" />}
                                    {isUnpaid && <AlertCircle className="w-3.5 h-3.5" />}
                                    {statusStr}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  {isUnpaid && (
                                    <Button
                                      onClick={() => handleConfirmPaymentReceived(tx.id)}
                                      disabled={updatingFineId === tx.id}
                                      className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-bold text-xs px-3 py-1.5 h-auto cursor-pointer shadow-md transition-transform active:scale-95"
                                    >
                                      {updatingFineId === tx.id ? (
                                        'Updating...'
                                      ) : (
                                        <span className="flex items-center gap-1.5">
                                          <FileCheck className="w-3.5 h-3.5" />
                                          Confirm Payment Received
                                        </span>
                                      )}
                                    </Button>
                                  )}
                                  {isPending && (
                                    <span className="text-amber-400/90 text-xs italic font-medium flex items-center justify-end gap-1">
                                      <Clock className="w-3.5 h-3.5 animate-spin" />
                                      Awaiting Treasury Audit
                                    </span>
                                  )}
                                  {isCleared && (
                                    <span className="text-green-400 text-xs font-semibold flex items-center justify-end gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Committed to Treasury
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                              No fine records found matching the active filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab 3: Activity Gallery Manager Workspace */}
            {activeTab === 'gallery' && (
              <div className="bg-[#002520] border border-[#ffd700]/20 rounded-xl p-6 shadow-xl w-full">
                <GeneralGalleryManager
                  currentUserName={currentUser?.name || 'Provost Marshal'}
                  isExecutive={isExecutiveUnlocked}
                />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
