import { useState, useEffect } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Heart, Megaphone, CheckCircle2, Clock, AlertTriangle, ShieldCheck, ArrowUpRight, X, MapPin, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatDateTime, isAdministrativeId } from '../../utils/helpers';
import { WELFARE_CATEGORIES } from '../../utils/constants';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { supabase } from '../../lib/supabaseClient';
import { WelfareTicket, WelfareNotification } from '../../types';
import { getAllWelfareNotifications, elevateToWelfareTicket } from '../../lib/welfareNotificationService';
import { GeneralGalleryManager } from '../../app/components/gallery/GeneralGalleryManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';


export const WelfareDashboard = () => {
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('welfare_session_unlocked') === 'true';
    }
    return false;
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Hidden PIN Management State (Inside Profile Picture Modal)
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [isSubmittingPinChange, setIsSubmittingPinChange] = useState(false);

  const [welfareFormMemberId, setWelfareFormMemberId] = useState('');
  const [welfareCategory, setWelfareCategory] = useState('');
  const [welfareAmount, setWelfareAmount] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchIndex, setMemberSearchIndex] = useState(-1);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');

  // Welfare Ticket Filter State
  const [ticketFilter, setTicketFilter] = useState<'All' | 'Pending' | 'Completed' | 'Declined'>('All');

  // Intake Queue & Ticket Elevation State
  const [intakeNotifications, setIntakeNotifications] = useState<WelfareNotification[]>([]);
  const [elevatingNotif, setElevatingNotif] = useState<WelfareNotification | null>(null);
  const [elevateCategory, setElevateCategory] = useState<string>('Medical Assistance');
  const [elevateAmount, setElevateAmount] = useState<string>('');
  const [elevateDetails, setElevateDetails] = useState<string>('');
  const [isElevating, setIsElevating] = useState<boolean>(false);

  const fetchIntakeQueue = async () => {
    const notifs = await getAllWelfareNotifications();
    setIntakeNotifications(notifs);
  };

  useEffect(() => {
    fetchIntakeQueue();
    const channel = supabase
      .channel('welfare_notifications_officer_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'welfare_notifications' }, () => {
        fetchIntakeQueue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleConfirmElevate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elevatingNotif) return;
    const amount = parseFloat(elevateAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please specify a positive requested amount.');
      return;
    }
    if (amount > 50000) {
      setError('Constitutional Cap Violation: Welfare disbursement request cannot exceed ₦50,000.');
      return;
    }

    setIsElevating(true);
    setError('');
    try {
      const generatedTicketId = await elevateToWelfareTicket(elevatingNotif.id, {
        requestedAmount: amount,
        category: elevateCategory,
        reasonDetails: elevateDetails.trim() || elevatingNotif.description,
        memberName: elevatingNotif.memberName,
        officialMemberId: elevatingNotif.officialMemberId,
      });

      setSuccess(`Emergency intake elevated to official Welfare Ticket (${generatedTicketId})!`);
      setElevatingNotif(null);
      setElevateAmount('');
      setElevateDetails('');
      fetchIntakeQueue();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error elevating ticket:', err);
      setError(`Elevation failed: ${err.message}`);
    } finally {
      setIsElevating(false);
    }
  };

  const {
    members, setMembers,
    welfareTickets, setWelfareTickets,
    announcements, setAnnouncements,
    currentUser, setCurrentUser,
    setError, setSuccess
  } = useApp();


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

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);

    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'WELFARE OFFICER',
        input_pin: pinInput
      });

      if (error) throw error;

      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('welfare_session_unlocked', 'true');
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
    sessionStorage.removeItem('welfare_session_unlocked');
  };

  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);
    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'WELFARE OFFICER',
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

  const [suggestions, setSuggestions] = useState<WelfareTicket[] | any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const queryTerm = memberSearchQuery.trim();
    if (!queryTerm) {
      setSuggestions([]);
      return;
    }

    const selectedMember = members.find(m => (m.official_member_id || m.id) === welfareFormMemberId);
    if (selectedMember && (selectedMember.full_name || selectedMember.name) === queryTerm) {
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .neq('status', 'Deceased')
          .or(`full_name.ilike.%${queryTerm}%,official_member_id.ilike.%${queryTerm}%`)
          .order('full_name', { ascending: true })
          .limit(1000);

        if (!error && data) {
          const mapped = data
            .map((m: any) => ({
              id: m.official_member_id,
              official_member_id: m.official_member_id,
              name: m.full_name,
              full_name: m.full_name,
              phone: m.phone_number || undefined,
              phone_number: m.phone_number || undefined,
              status: m.status,
              balance: Number(m.balance || 0),
              role: m.role || 'member',
              family: m.cmo_family || undefined,
              cmo_family: m.cmo_family || undefined,
              familyUnit: m.cmo_family || undefined,
              profilePic: m.avatar_url || null,
              createdAt: m.created_at,
              updatedAt: m.updated_at
            }))
            .filter((m: any) => {
              const id = m.official_member_id || m.id || '';
              return id.startsWith('HCC-') ? true : !isAdministrativeId(id);
            });
          setSuggestions(mapped);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Error searching members in WelfareDashboard:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [memberSearchQuery, welfareFormMemberId, members]);

  const showMemberSearchResults = Boolean(
    memberSearchQuery.trim() && suggestions.length > 0 && !suggestions.some(m => (m.official_member_id || m.id) === welfareFormMemberId)
  );

  const selectMember = (memberId: string | undefined, memberName: string) => {
    setWelfareFormMemberId(memberId || '');
    setMemberSearchQuery(memberName);
    setMemberSearchIndex(-1);
  };

  const handleWelfareTicketSubmit = async () => {
    setError('');
    if (!welfareFormMemberId || !welfareCategory || !welfareAmount) {
      setError('Please fill all fields');
      return;
    }

    const member = members.find(m => (m.official_member_id || m.id) === welfareFormMemberId);
    if (!member) {
      setError('Member ID not found');
      return;
    }

    const amount = parseFloat(welfareAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid amount. Please specify a positive value.');
      return;
    }

    if (amount > 50000) {
      setError(`Constitutional Policy Violation: Welfare request of ₦${amount.toLocaleString()} exceeds the maximum disbursement cap of ₦50,000.`);
      return;
    }

    const finalCategory = (welfareCategory === "Wife's Death" || welfareCategory === "Others") && reasonDetails.trim()
      ? `${welfareCategory} (${reasonDetails.trim()})`
      : welfareCategory;

    try {
      const { data: insertedList, error: insertErr } = await supabase
        .from('welfare_tickets')
        .insert({
          official_member_id: welfareFormMemberId,
          member_name: member.full_name || member.name,
          category: finalCategory,
          requested_amount: amount,
          reason_details: (welfareCategory === "Wife's Death" || welfareCategory === "Others") ? reasonDetails.trim() : '',
          status: 'Pending'
        })
        .select('*');

      if (insertErr) {
        console.error("Supabase insert error:", insertErr);
        setError(`Database Error: ${insertErr.message}`);
        return;
      }

      const inserted = insertedList && insertedList.length > 0 ? insertedList[0] : null;

      const newTicket: WelfareTicket = {
        ticketId: inserted?.ticket_id || inserted?.id || `TK-${Date.now()}`,
        memberId: welfareFormMemberId,
        memberName: member.full_name || member.name,
        category: finalCategory,
        requestedAmount: amount,
        status: 'Pending',
        createdAt: inserted?.created_at || new Date().toISOString(),
        reasonDetails: inserted?.reason_details || reasonDetails.trim()
      };

      setWelfareTickets([...welfareTickets, newTicket]);
      setSuccess(`Welfare ticket created: ${newTicket.ticketId}`);
      setWelfareFormMemberId('');
      setWelfareCategory('');
      setWelfareAmount('');
      setMemberSearchQuery('');
      setReasonDetails('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error("Welfare ticket submission failed:", err);
      setError(`Submission failed: ${err.message}`);
    }
  };

  const generateAnnouncementId = (): string => `ANN-${Date.now()}`;

  const postAnnouncement = () => {
    if (!announcementTitle || !announcementContent) {
      setError('Please fill announcement title and content');
      return;
    }

    const announcement = {
      id: generateAnnouncementId(),
      title: announcementTitle,
      content: announcementContent,
      author: currentUser?.name || 'Welfare Office',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    };

    setAnnouncements([announcement, ...announcements]);
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setSuccess('Announcement published to the community');
    setTimeout(() => setSuccess(''), 3000);
  };

  const filteredTickets = welfareTickets.filter(t => {
    if (ticketFilter === 'All') return true;
    if (ticketFilter === 'Pending') {
      return t.status === 'Pending' || t.status === 'Awaiting Financial Audit' || t.status === 'Awaiting Disbursement';
    }
    if (ticketFilter === 'Completed') {
      return t.status === 'Completed' || t.status === 'Settled & Cleared';
    }
    if (ticketFilter === 'Declined') {
      return t.status === 'Declined';
    }
    return true;
  });

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-0">Welfare Department</h2>
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

      {currentUser && (
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 mb-6 rounded-xl shadow-lg">
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
                              placeholder="••••••"
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
                              placeholder="••••••"
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
                  {currentUser.office_title && (
                    <span className="text-[10px] text-gray-400 block mt-0.5">{currentUser.office_title}</span>
                  )}
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Role</p>
                  <p className="text-[#ffd700] font-bold text-sm">WELFARE OFFICER</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Pending Tickets</p>
                  <p className="text-white font-bold text-sm">{welfareTickets.filter(t => t.status === 'Pending').length} Tickets</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Settled & Completed</p>
                  <p className="text-white font-bold text-sm">{welfareTickets.filter(t => t.status === 'Settled & Cleared' || t.status === 'Completed').length} Tickets</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!isExecutiveUnlocked ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#001411] border border-[#ffd700]/20 rounded-lg max-w-md mx-auto text-center space-y-6 my-8 shadow-xl">
          <div className="p-3 bg-[#002a24] rounded-full border border-[#ffd700]/30 text-[#ffd700]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#ffd700]">Executive Security Gateway</h3>
            <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to unlock assistance request workflows and case tickets.</p>
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
              {isVerifyingPin ? "Verifying..." : "Unlock Welfare Portal"}
            </button>
          </form>
        </div>
      ) : (
        <Tabs defaultValue="tickets" className="w-full">
          <TabsList className="bg-[#002520] border border-[#ffd700]/20 w-full justify-start p-1 flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="tickets" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Ticket Management
            </TabsTrigger>
            <TabsTrigger value="intake" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded flex items-center gap-1.5">
              Incident Intake Queue ({intakeNotifications.filter(n => n.status !== 'Elevated_To_Ticket' && n.status !== 'Dismissed').length})
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Welfare Announcements
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Media & Gallery Pipeline
            </TabsTrigger>
          </TabsList>


          <TabsContent value="tickets" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* New Ticket Form */}
              <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Create Assistance Request
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="welfare-member-search" className="text-gray-300 text-sm block mb-2">Search Member Name or ID</label>
                    <div className="relative">
                      <Input
                        id="welfare-member-search"
                        value={memberSearchQuery}
                        onChange={(e) => {
                          setMemberSearchQuery(e.target.value);
                          setMemberSearchIndex(-1);
                          setWelfareFormMemberId('');
                        }}
                        onKeyDown={(e) => {
                          if (suggestions.length === 0) return;
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setMemberSearchIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
                          }
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setMemberSearchIndex((prev) => Math.max(prev - 1, 0));
                          }
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const selected = suggestions[memberSearchIndex >= 0 ? memberSearchIndex : 0];
                            if (selected) {
                              selectMember(selected.official_member_id, selected.full_name || selected.name);
                            }
                          }
                          if (e.key === 'Escape') {
                            setMemberSearchIndex(-1);
                          }
                        }}
                        placeholder="Search by name or ID"
                        className="bg-[#001a16] border-[#ffd700] text-white"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1pignore="true"
                      />
                      {showMemberSearchResults && (
                        <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded border border-[#ffd700]/50 bg-[#001a16] shadow-lg">
                          {suggestions.map((m, index) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setWelfareFormMemberId(m.official_member_id || '');
                                setMemberSearchQuery(m.full_name || m.name);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm ${memberSearchIndex === index ? 'bg-[#ffd700]/30 text-white' : 'text-white hover:bg-[#ffd700]/20'}`}
                            >
                              {(m.full_name || m.name)?.toUpperCase()} — {m.official_member_id}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="welfare-member-id" className="text-gray-300 text-sm block mb-2">Member ID</label>
                    <Input
                      id="welfare-member-id"
                      value={welfareFormMemberId}
                      onChange={(e) => setWelfareFormMemberId(e.target.value.toUpperCase())}
                      placeholder="HCC-CMO-26-XXXX"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="welfare-category" className="text-gray-300 text-sm block mb-2">Package Category</label>
                    <select
                      id="welfare-category"
                      value={welfareCategory}
                      onChange={(e) => setWelfareCategory(e.target.value)}
                      className="w-full bg-[#001a16] border border-[#ffd700] text-white p-2 rounded cursor-pointer focus:outline-none"
                    >
                      <option value="">Select category</option>
                      {WELFARE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Wife's Death">Wife's Death</option>
                      <option value="Others">Others</option>
                    </select>
                    {(welfareCategory === "Wife's Death" || welfareCategory === "Others") && (
                      <div className="mt-4 flex flex-col space-y-2">
                        <label className="text-sm font-bold text-[#ffd700]">Provide Specific Details / Reason</label>
                        <textarea 
                          className="w-full p-2 bg-[#001a16] border border-[#ffd700] rounded text-white focus:outline-none focus:ring-1 focus:ring-[#ffd700] text-sm"
                          rows={3}
                          placeholder="Enter specific details regarding the case here..."
                          value={reasonDetails}
                          onChange={(e) => setReasonDetails(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm block mb-2">Requested Amount (₦)</label>
                    <Input
                      type="number"
                      value={welfareAmount}
                      onChange={(e) => setWelfareAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>
                  <Button
                    onClick={handleWelfareTicketSubmit}
                    className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Submit Request
                  </Button>
                </div>
              </Card>

              {/* All Welfare Tickets List */}
              <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
                  <h3 className="text-xl font-bold text-[#ffd700]">All Welfare Tickets</h3>
                  
                  {/* Status Filters */}
                  <div className="flex gap-1.5 flex-wrap">
                    {(['All', 'Pending', 'Completed', 'Declined'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setTicketFilter(filter)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                          ticketFilter === filter
                            ? 'bg-[#ffd700] text-[#001a16] border-[#ffd700]'
                            : 'bg-[#001a16] text-[#ffd700] border-[#ffd700]/20 hover:border-[#ffd700]/50'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredTickets.slice().reverse().map(ticket => (
                    <div key={ticket.ticketId} className="bg-[#001a16] border border-[#ffd700]/10 p-4 rounded-lg hover:border-[#ffd700]/30 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-semibold">{ticket.ticketId}</p>
                          <p className="text-gray-400 text-xs">{ticket.memberName}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          ticket.status === 'Awaiting Financial Audit' || ticket.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                          ticket.status === 'Awaiting Disbursement' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
                          ticket.status === 'Declined' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                          'bg-green-500/20 text-green-500 border border-green-500/30'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-1">{ticket.category}</p>
                      <p className="text-[#ffd700] font-bold text-base">{formatCurrency(ticket.requestedAmount)}</p>
                      {ticket.status === 'Declined' && ticket.declineReason && (
                        <p className="text-xs italic text-red-400 mt-2 bg-red-950/20 border border-red-500/20 p-2 rounded">
                          Reason: {ticket.declineReason}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-500 mt-2 font-mono">
                        Created: {formatDateTime(ticket.createdAt)}
                      </p>
                    </div>
                  ))}
                  {filteredTickets.length === 0 && (
                    <p className="text-gray-400 text-center py-10 italic text-sm">No tickets found for status '{ticketFilter}'.</p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="intake" className="space-y-6">
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#ffd700]/20 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Welfare Incident Intake Queue
                  </h3>
                  <p className="text-xs text-gray-300 mt-1">
                    Review incoming emergency reports, inspect Family Head verification notes, and elevate valid cases into official Welfare Tickets (capped at ₦50,000).
                  </p>
                </div>
              </div>

              {intakeNotifications.length === 0 ? (
                <div className="text-center py-12 bg-[#001a16] rounded-xl border border-emerald-900/40">
                  <p className="text-gray-400 text-sm">No emergency incident notifications in the intake queue.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {intakeNotifications.map((notif) => {
                    const isFamilyVerified = notif.status === 'Family_Verified' || Boolean(notif.familyHeadVerifiedAt);
                    const isElevated = notif.status === 'Elevated_To_Ticket';
                    const isSubmitted = notif.status === 'Submitted' && !isFamilyVerified;

                    return (
                      <div key={notif.id} className="bg-[#001a16] border border-[#ffd700]/20 rounded-xl p-5 shadow-md space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-400 uppercase">{notif.memberName} ({notif.officialMemberId})</span>
                            <span className="text-xs text-gray-400">• {notif.cmoFamily} Family</span>
                            <span className="bg-[#ffd700]/15 text-[#ffd700] text-xs font-bold px-2 py-0.5 rounded border border-[#ffd700]/30">
                              {notif.eventCategory}
                            </span>
                          </div>
                          {isSubmitted && (
                            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" /> Awaiting Family Head Verification
                            </span>
                          )}
                          {isFamilyVerified && !isElevated && (
                            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Family Verified — Ready to Elevate
                            </span>
                          )}
                          {isElevated && (
                            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold flex items-center gap-1">
                              Elevated to Ticket #{notif.elevatedTicketId}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-white">{notif.title}</h4>
                          <p className="text-xs text-gray-300 mt-1">{notif.description}</p>
                          {notif.locationOrHospital && (
                            <p className="text-xs text-amber-300 mt-1 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0" /> Hospital / Location: {notif.locationOrHospital}
                            </p>
                          )}
                        </div>

                        {notif.familyHeadNotes && (
                          <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-lg text-xs text-blue-200">
                            <p className="font-bold text-blue-300 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Family Head Verification Note:
                            </p>
                            <p className="italic mt-0.5">"{notif.familyHeadNotes}"</p>
                          </div>
                        )}

                        <div className="pt-2 border-t border-gray-800 flex justify-between items-center flex-wrap gap-2">
                          <span className="text-[10px] text-gray-500 font-mono">Reported Date: {notif.incidentDate}</span>
                          {!isElevated && (
                            <Button
                              disabled={!isFamilyVerified}
                              onClick={() => {
                                if (!isFamilyVerified) return;
                                setElevatingNotif(notif);
                                setElevateCategory(notif.eventCategory === 'Health & Hospitalization' ? 'Medical Assistance' : notif.eventCategory === 'Loss of Wife' ? "Wife's Death" : 'Emergency Assistance');
                                setElevateDetails(`Emergency Intake Report: ${notif.title}. ${notif.description}`);
                                setElevateAmount('20000');
                              }}
                              className={`font-bold text-xs py-1.5 px-4 h-auto flex items-center gap-1 ${
                                isFamilyVerified
                                  ? 'bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] cursor-pointer'
                                  : 'bg-gray-800 text-gray-400 border border-gray-700 cursor-not-allowed opacity-50'
                              }`}
                              title={!isFamilyVerified ? "Requires Family Head verification prior to ticket elevation" : "Elevate to official Welfare Ticket"}
                            >
                              <ArrowUpRight className="w-4 h-4" /> Elevate to Official Ticket
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ticket Elevation Modal */}
              {elevatingNotif && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-[#ffd700]/20 pb-3">
                      <h3 className="text-base font-bold text-[#ffd700] flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-[#ffd700]" />
                        Elevate to Official Welfare Ticket
                      </h3>
                      <button onClick={() => setElevatingNotif(null)} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="bg-[#001a16] p-3 rounded-lg border border-[#ffd700]/20 text-xs text-gray-300">
                      <p className="font-bold text-white">{elevatingNotif.memberName} ({elevatingNotif.officialMemberId})</p>
                      <p className="text-amber-400 mt-0.5">{elevatingNotif.title}</p>
                    </div>

                    <form onSubmit={handleConfirmElevate} className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1">Package Category</label>
                        <select
                          value={elevateCategory}
                          onChange={(e) => setElevateCategory(e.target.value)}
                          className="w-full bg-[#001a16] border border-[#ffd700]/30 rounded p-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                        >
                          {WELFARE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1">Requested Amount (₦) [Max ₦50,000]</label>
                        <Input
                          type="number"
                          placeholder="e.g. 20000"
                          max={50000}
                          value={elevateAmount}
                          onChange={(e) => setElevateAmount(e.target.value)}
                          className="bg-[#001a16] border-[#ffd700]/30 text-white font-mono text-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300 block mb-1">Case Details / Audit Narrative</label>
                        <textarea
                          rows={3}
                          value={elevateDetails}
                          onChange={(e) => setElevateDetails(e.target.value)}
                          className="w-full bg-[#001a16] border border-[#ffd700]/30 rounded p-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                        <Button type="button" variant="outline" onClick={() => setElevatingNotif(null)} className="text-xs border-gray-600 text-gray-300">
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isElevating} className="bg-[#ffd700] text-[#001a16] font-bold text-xs hover:bg-[#ffc700]">
                          {isElevating ? 'Elevating...' : 'Confirm Ticket Elevation'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>


          <TabsContent value="announcements" className="space-y-6">
            <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Publish Welfare Announcement</h3>
              <div className="space-y-4 mb-6">
                <Input
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Announcement Title"
                  className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                />
                <textarea
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Announcement Content"
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-3 rounded min-h-[120px] focus:outline-none focus:border-[#ffd700] text-sm"
                />
                <Button
                  onClick={postAnnouncement}
                  className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold"
                >
                  Publish Announcement
                </Button>
              </div>

              <div className="border-t border-[#ffd700]/20 my-6" />

              <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#ffd700]" />
                Welfare Broadcast Feed
              </h3>
              <div className="space-y-4">
                {announcements.map(ann => (
                  <div key={ann.id} className="bg-[#001a16] border border-[#ffd700]/10 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[#ffd700] font-semibold">{ann.title}</p>
                      <span className="text-xs text-gray-500 font-mono">{formatDateTime(ann.timestamp)}</span>
                    </div>
                    <p className="text-gray-300 text-sm mt-1">{ann.content}</p>
                    <p className="text-[10px] text-gray-500 mt-2 font-semibold">Broadcast Author: {ann.author || 'Welfare Office'}</p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-gray-400 text-center py-8 italic text-sm">No welfare announcements published yet.</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <GeneralGalleryManager
              currentUserName={currentUser?.name || 'Welfare Officer'}
              isExecutive={isExecutiveUnlocked}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};