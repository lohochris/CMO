import { useState, useEffect } from 'react';
import type { WeddingStatus, Family } from '../../types';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { CheckCircle, FileText, Settings, X, Users, BookOpen, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { MemberAttendanceAndNotificationWidget } from '../../app/components/attendance/MemberAttendanceAndNotificationWidget';


export const MemberDashboard = () => {
  const { currentUser, members, transactions, setMembers, setCurrentUser, setSuccess, setError, setCurrentPage } = useApp();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editHomeTownAddress, setEditHomeTownAddress] = useState(currentUser?.homeTownAddress || '');
  const [editResidentialAddress, setEditResidentialAddress] = useState(currentUser?.residentialAddress || '');
  const [editMaritalStatus, setEditMaritalStatus] = useState(currentUser?.maritalStatus || '');
  const [editWeddingStatus, setEditWeddingStatus] = useState<WeddingStatus | ''>(currentUser?.weddingStatus || '');
  const [editCommunicant, setEditCommunicant] = useState(currentUser?.communicant || false);
  const [editPostHeld, setEditPostHeld] = useState(currentUser?.postHeld || '');
  const [editNumberOfChildren, setEditNumberOfChildren] = useState(currentUser?.numberOfChildren || 0);
  const [editWifeName, setEditWifeName] = useState(currentUser?.wifeName || '');
  const [editWifePhone, setEditWifePhone] = useState(currentUser?.wifePhone || '');
  const [formCmoFamily, setFormCmoFamily] = useState<Family | ''>(currentUser?.family || '');
  const [editDateOfBirth, setEditDateOfBirth] = useState(currentUser?.date_of_birth || '');
  const [editOccupation, setEditOccupation] = useState(currentUser?.occupation || '');
  const [editNokName, setEditNokName] = useState(currentUser?.nok_name || '');
  const [editNokRelationship, setEditNokRelationship] = useState(currentUser?.nok_relationship || '');
  const [editNokPhone, setEditNokPhone] = useState(currentUser?.nok_phone || '');

  const handleProfilePictureSave = async (imageDataUrl: string, imageFile: Blob) => {
    if (!currentUser) return;

    const storageUrl = await uploadProfilePicture(currentUser.id, imageFile, imageDataUrl);
    const finalImageUrl = storageUrl || imageDataUrl;

    const updatedMembers = members.map(m =>
      m.id === currentUser.id ? { ...m, profilePic: finalImageUrl } : m
    );
    setMembers(updatedMembers);
    setCurrentUser({ ...currentUser, profilePic: finalImageUrl });
    setSuccess('✓ Profile picture updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSettingsOpen = () => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditPhone(currentUser.phone || '');
      setEditEmail(currentUser.email || '');
      setEditHomeTownAddress(currentUser.homeTownAddress || '');
      setEditResidentialAddress(currentUser.residentialAddress || '');
      setEditMaritalStatus(currentUser.maritalStatus || '');
      setEditWeddingStatus(currentUser.weddingStatus || '');
      setEditCommunicant(currentUser.communicant || false);
      setEditPostHeld(currentUser.postHeld || '');
      setEditNumberOfChildren(currentUser.numberOfChildren || 0);
      setEditWifeName(currentUser.wifeName || '');
      setEditWifePhone(currentUser.wifePhone || '');
      setFormCmoFamily(currentUser.family || '');
      setEditDateOfBirth(currentUser.date_of_birth || '');
      setEditOccupation(currentUser.occupation || '');
      setEditNokName(currentUser.nok_name || '');
      setEditNokRelationship(currentUser.nok_relationship || '');
      setEditNokPhone(currentUser.nok_phone || '');
      setIsSettingsOpen(true);
    }
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    setError('');
  };

  const [settingsLoading, setSettingsLoading] = useState(false);

  const [liveTransactions, setLiveTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [pastoralMessages, setPastoralMessages] = useState<any[]>([]);
  const [pastoralLoading, setPastoralLoading] = useState(false);

  const fetchPastoralMessages = async () => {
    if (!currentUser) return;
    setPastoralLoading(true);
    try {
      const memberId = currentUser.official_member_id || currentUser.id;
      const { data, error } = await supabase
        .from('pastoral_messages')
        .select('*')
        .eq('official_member_id', memberId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPastoralMessages(data || []);
    } catch (err) {
      console.error('Error fetching pastoral messages:', err);
    } finally {
      setPastoralLoading(false);
    }
  };

  const handleAcknowledgeMessage = async (msgId: string) => {
    try {
      const { error } = await supabase
        .from('pastoral_messages')
        .update({ is_read: true, read: true })
        .eq('id', msgId);
      if (error) throw error;
      toast.success('Message acknowledged!');
      fetchPastoralMessages();
    } catch (err: any) {
      console.error('Failed to acknowledge message:', err);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchTransactions = async () => {
      setTxLoading(true);
      try {
        const { data: userLogs, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('official_member_id', (currentUser as any).official_member_id || currentUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLiveTransactions(userLogs || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setTxLoading(false);
      }
    };

    fetchTransactions();

    // Realtime Postgres changes subscription on 'transactions' table to refresh transaction history feed instantly
    const txChannel = supabase
      .channel(`member-tx-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `official_member_id=eq.${(currentUser as any).official_member_id || currentUser.id}`
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchPastoralMessages();

    const pastoralChannel = supabase
      .channel(`member-pastoral-${currentUser.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'pastoral_messages',
          filter: `official_member_id=eq.${currentUser.official_member_id || currentUser.id}`
        },
        () => {
          fetchPastoralMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pastoralChannel);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    const fellowshipChannel = supabase
      .channel(`member-fellowship-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fellowship_meetings' },
        () => {
          fetchPastoralMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fellowship_attendance' },
        () => {
          fetchPastoralMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(fellowshipChannel);
    };
  }, [currentUser?.id]);

  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const fetchSpiritualAssignments = async () => {
    if (!currentUser) return;
    setAssignmentsLoading(true);
    try {
      const userFamily = (currentUser.cmo_family || currentUser.family || '').replace(/\s*Family\s*/gi, '').trim();
      const memberId = currentUser.official_member_id || currentUser.id;
      
      let query = supabase
        .from('liturgical_assignments')
        .select('*');
      
      if (userFamily) {
        query = query.or(`assigned_member_id.eq.${memberId},assigned_family.eq.${userFamily}`);
      } else {
        query = query.eq('assigned_member_id', memberId);
      }
      
      const { data, error } = await query.order('activity_date', { ascending: true });
      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchSpiritualAssignments();
    
    // Subscribe to changes on liturgical_assignments table to dynamic sync
    const spiritualChannel = supabase
      .channel(`member-spiritual-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'liturgical_assignments' },
        () => {
          fetchSpiritualAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(spiritualChannel);
    };
  }, [currentUser?.id]);

  const getStatusBadge = (status: string) => {
    const statusVal = status || 'Assigned';
    if (statusVal === 'Completed') {
      return (
        <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">
          Completed
        </span>
      );
    }
    if (statusVal === 'Pending') {
      return (
        <span className="bg-orange-950/60 text-orange-400 border border-orange-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">
          Pending
        </span>
      );
    }
    return (
      <span className="bg-blue-950/60 text-[#ffd700] border border-blue-500/30 px-2.5 py-0.5 rounded text-xs font-semibold">
        Assigned
      </span>
    );
  };

  const handleProfileUpdate = async () => {
    setError('');
    if (!editName.trim()) {
      setError('Name cannot be empty');
      return;
    }
    if (!editPhone.trim()) {
      setError('Phone number cannot be empty');
      return;
    }

    if (!editWeddingStatus) {
      setError('Please select whether you are Wedded or Not Wedded');
      return;
    }

    if (editWeddingStatus === 'Wedded' && !editMaritalStatus) {
      setError('Please select your marital status');
      return;
    }

    if (!currentUser) return;

    if (!formCmoFamily) {
      setError('Please select your CMO Family');
      return;
    }

    setSettingsLoading(true);
    try {
      const updatePayload = {
        full_name: editName,
        phone_number: editPhone,
        phone: editPhone, // Alignment safeguard mapping
        email: editEmail,
        address: editResidentialAddress,
        home_town_address: editHomeTownAddress,
        residential_address: editResidentialAddress,
        marriage_status: editWeddingStatus,
        marital_status: editMaritalStatus,
        number_of_children: Number(editNumberOfChildren) || 0,
        communicant: editCommunicant,
        wifes_name: editWifeName,
        wifes_phone: editWifePhone,
        church_position: editPostHeld,
        post_held: editPostHeld,
        cmo_family: formCmoFamily || null,
        date_of_birth: editDateOfBirth || null,
        occupation: editOccupation?.trim() || null,
        nok_name: editNokName?.trim() || null,
        nok_relationship: editNokRelationship?.trim() || null,
        nok_phone: editNokPhone?.trim() || null
      };

      // A. Update the Active Profiles Table ('members') in Supabase
      const { error: membersErr } = await supabase
        .from('members')
        .update(updatePayload)
        .eq('official_member_id', currentUser.id);

      if (membersErr) {
        throw new Error(`Failed to update members table: ${membersErr.message}`);
      }

      const updatedMembers = members.map(m =>
        m.id === currentUser.id ? {
          ...m,
          name: editName,
          phone: editPhone,
          email: editEmail,
          homeTownAddress: editHomeTownAddress,
          residentialAddress: editResidentialAddress,
          maritalStatus: editWeddingStatus === 'Wedded' ? (editMaritalStatus as any) : undefined,
          weddingStatus: editWeddingStatus as any,
          communicant: editCommunicant,
          postHeld: editPostHeld,
          numberOfChildren: editNumberOfChildren,
          wifeName: editWifeName,
          wifePhone: editWifePhone,
          family: formCmoFamily || undefined,
          date_of_birth: editDateOfBirth || null,
          occupation: editOccupation?.trim() || null,
          nok_name: editNokName?.trim() || null,
          nok_relationship: editNokRelationship?.trim() || null,
          nok_phone: editNokPhone?.trim() || null
        } : m
      );

      // setMembers updates AppContext state
      setMembers(updatedMembers);

      setCurrentUser({
        ...currentUser,
        name: editName,
        phone: editPhone,
        email: editEmail,
        homeTownAddress: editHomeTownAddress,
        residentialAddress: editResidentialAddress,
        maritalStatus: editWeddingStatus === 'Wedded' ? (editMaritalStatus as any) : undefined,
        weddingStatus: editWeddingStatus as any,
        communicant: editCommunicant,
        postHeld: editPostHeld,
        numberOfChildren: editNumberOfChildren,
        wifeName: editWifeName,
        wifePhone: editWifePhone,
        family: formCmoFamily || undefined,
        date_of_birth: editDateOfBirth || null,
        occupation: editOccupation?.trim() || null,
        nok_name: editNokName?.trim() || null,
        nok_relationship: editNokRelationship?.trim() || null,
        nok_phone: editNokPhone?.trim() || null
      });

      setSuccess('✓ Profile updated successfully across active profile and master roster!');
      setIsSettingsOpen(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Profile update failed:', err);
      setError(err.message || 'An error occurred while updating profile.');
    } finally {
      setSettingsLoading(false);
    }
  };

  if (!currentUser) return null;

  const userTransactions = transactions.filter(t => t.memberId === currentUser.id);
  const profileNeedsUpdate = !currentUser.full_name?.trim() || !currentUser.phone_number?.trim() || !currentUser.family;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8">
        <div className="flex flex-col gap-4 justify-between items-start md:flex-row md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#ffd700]">Member Dashboard</h2>
            {profileNeedsUpdate && (
              <p className="mt-2 text-sm text-gray-300 max-w-xl">
                Please update your profile in Settings with all required information. Once complete, this message will disappear.
              </p>
            )}
          </div>
          <button
            onClick={handleSettingsOpen}
            title="Edit profile settings"
            aria-label="Edit profile settings"
            className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] p-2 rounded transition-all"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Pastoral Messages Card */}
        {pastoralMessages.length > 0 && (
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-5 mb-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#ffd700]" />
            <div className="flex items-start gap-4 pl-2">
              <div className="p-2.5 bg-[#ffd700]/10 rounded-lg text-[#ffd700] border border-[#ffd700]/25">
                <Sparkles className="w-5 h-5 text-[#ffd700]" />
              </div>
              <div className="flex-grow">
                <h4 className="text-sm font-extrabold text-[#ffd700] uppercase tracking-wider mb-2">Pastoral Office Message</h4>
                <div className="space-y-4">
                  {pastoralMessages.map((msg) => (
                    <div key={msg.id} className="border-b border-[#ffd700]/10 pb-3 last:border-0 last:pb-0">
                      <p className="text-white text-xs leading-relaxed italic">
                        "{msg.message || msg.content}"
                      </p>
                      <div className="flex justify-between items-center mt-2.5">
                        <span className="text-[10px] text-gray-400 font-mono">
                          Received: {new Date(msg.created_at || msg.timestamp || new Date()).toLocaleDateString()}
                        </span>
                        <Button
                          onClick={() => handleAcknowledgeMessage(msg.id)}
                          className="bg-[#ffd700]/15 hover:bg-[#ffd700] hover:text-[#001a16] text-[#ffd700] text-[10px] font-bold px-3 py-1 h-auto"
                        >
                          Mark as Read
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Master Header: Full-Width Member Identity Profile Card */}
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 mb-6 rounded-xl shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <ProfilePictureUploader
                currentImage={currentUser.profilePic}
                onSave={handleProfilePictureSave}
                memberName={currentUser.full_name || currentUser.name || ''}
                size="sm"
              />
            </div>
            <div className="flex-grow w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Name</p>
                  <p className="text-white font-bold text-sm truncate">{currentUser.name}</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Member ID</p>
                  <p className="text-white font-bold text-sm truncate">{currentUser.id}</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Status</p>
                  <p className="text-green-500 font-bold text-sm flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    {currentUser.status}
                  </p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Phone</p>
                  <p className="text-white font-bold text-sm truncate">{currentUser.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Member Attendance & Real-Time Executive Notification Center */}
        <div className="mb-6">
          <MemberAttendanceAndNotificationWidget currentUser={currentUser} />
        </div>

        <div className="mb-6">
          {currentUser.family ? (
            <Button
              onClick={() => setCurrentPage(`family/${currentUser.family?.toLowerCase()}` as any)}
              className="w-full bg-gradient-to-r from-[#ffd700] to-[#ffd700]/80 text-[#001a16] font-bold py-3 px-6 rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Users className="w-5 h-5" />
              Enter My {currentUser.family?.replace(/\s*Family\s*/gi, '').trim()} Family Portal
            </Button>
          ) : (
            <div className="bg-[#001a16] border border-yellow-500/30 p-4 rounded text-center text-sm text-gray-300">
              You do not have an assigned family yet. Please edit your Profile Settings below to join a family.
            </div>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-xl text-[#ffd700] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Your Transaction History
          </h3>
          <div className="bg-[#001a16] border border-[#ffd700] rounded p-4">
            {txLoading ? (
              <p className="text-gray-400 text-center py-4">Loading transactions...</p>
            ) : liveTransactions.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {liveTransactions.map((txn, idx) => {
                  const paymentDate = new Date(txn.created_at || txn.timestamp || new Date());
                  const formattedTimestamp = paymentDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) + ' at ' + paymentDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  });

                  const displayPurpose = txn.purpose === 'Other Levy' && txn.notes
                    ? `Other Levy (${txn.notes})`
                    : txn.purpose;

                  return (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-[#ffd700]/30">
                      <div>
                        <p className="text-white font-semibold">{displayPurpose}</p>
                        <p className="text-gray-400 text-xs">{formattedTimestamp}</p>
                      </div>
                      <p className="text-green-500 font-semibold">{formatCurrency(txn.amount)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Spiritual Assignments Card */}
        <div className="mt-8 border-t border-[#ffd700]/20 pt-6">
          <h3 className="text-xl text-[#ffd700] mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Upcoming Spiritual Assignments
          </h3>
          <div className="bg-[#001a16] border border-[#ffd700] rounded p-4">
            {assignmentsLoading ? (
              <p className="text-gray-400 text-center py-4">Loading assignments...</p>
            ) : assignments.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No upcoming spiritual assignments scheduled.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-3 bg-[#002520]/60 rounded border border-[#ffd700]/25 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-white font-bold text-sm uppercase">{assignment.activity_name}</h4>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Role: <span className="text-[#ffd700] font-semibold">{assignment.duty_role}</span>
                      </p>
                      {assignment.notes && <p className="text-gray-400 text-xs italic mt-1 font-mono">Instruction: {assignment.notes}</p>}
                    </div>
                    <div className="text-right flex flex-col md:items-end gap-1.5">
                      <span className="bg-[#ffd700]/15 text-[#ffd700] px-2.5 py-0.5 rounded text-xs font-mono font-bold">
                        {new Date(assignment.activity_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {getStatusBadge(assignment.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Profile Settings Dialog */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#002520]">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-[#ffd700]">Edit Profile</h3>
                <p className="mt-2 text-sm text-gray-300 max-w-xl">
                  Fill in your personal and contact details here. When all required fields are provided, this reminder will disappear from the dashboard.
                </p>
              </div>
              <button
                onClick={handleSettingsClose}
                title="Close"
                aria-label="Close dialog"
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Personal Information */}
              <div className="border-t border-[#ffd700]/30 pt-4">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-4">Personal Information</h4>
                
                <div>
                  <label htmlFor="edit-name" className="text-gray-300 text-sm block mb-2">
                    Full Name *
                  </label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter full name"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="edit-phone" className="text-gray-300 text-sm block mb-2">
                      Phone Number *
                    </label>
                    <Input
                      id="edit-phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="08012345678"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-email" className="text-gray-300 text-sm block mb-2">
                      Email Address (Optional)
                    </label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="edit-dob" className="text-gray-300 text-sm block mb-2">
                      Date of Birth
                    </label>
                    <Input
                      id="edit-dob"
                      type="date"
                      value={editDateOfBirth}
                      onChange={(e) => setEditDateOfBirth(e.target.value)}
                      className="bg-[#001a16] border-[#ffd700] text-white w-full"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-occupation" className="text-gray-300 text-sm block mb-2">
                      Occupation
                    </label>
                    <Input
                      id="edit-occupation"
                      value={editOccupation}
                      onChange={(e) => setEditOccupation(e.target.value)}
                      placeholder="e.g. Engineer, Teacher, Doctor"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>
                </div>

                <div className="mt-4 font-sans">
                  <label htmlFor="edit-family" className="text-gray-300 text-sm block mb-2">
                    CMO Family *
                  </label>
                  <select
                    id="edit-family"
                    title="Select Family"
                    value={formCmoFamily}
                    onChange={(e) => setFormCmoFamily(e.target.value as Family)}
                    className="w-full bg-[#001a16] border border-[#ffd700] text-white p-2 rounded disabled:opacity-60 cursor-pointer"
                    disabled={settingsLoading || Boolean(currentUser?.family)}
                  >
                    {!currentUser?.family && <option value="">Select a family</option>}
                    <option value="Wisdom">Wisdom Family</option>
                    <option value="Honour">Honour Family</option>
                    <option value="Integrity">Integrity Family</option>
                    <option value="Talent">Talent Family</option>
                  </select>
                  {Boolean(currentUser?.family) && (
                    <p className="text-gray-400 text-xs mt-1">
                      Family assigned. To change your group, please contact the Financial Secretary or Chairman.
                    </p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="border-t border-[#ffd700]/30 pt-4">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-4">Address</h4>
                
                <div>
                  <label htmlFor="edit-hometown" className="text-gray-300 text-sm block mb-2">
                    Home Town Address
                  </label>
                  <Input
                    id="edit-hometown"
                    value={editHomeTownAddress}
                    onChange={(e) => setEditHomeTownAddress(e.target.value)}
                    placeholder="Enter home town address"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="edit-residential" className="text-gray-300 text-sm block mb-2">
                    Residential Address
                  </label>
                  <Input
                    id="edit-residential"
                    value={editResidentialAddress}
                    onChange={(e) => setEditResidentialAddress(e.target.value)}
                    placeholder="Enter residential address"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
              </div>

              {/* Marital & Family Status */}
              <div className="border-t border-[#ffd700]/30 pt-4">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-4">Marital & Family Status</h4>
                
                <div>
                  <label htmlFor="edit-wedding" className="text-gray-300 text-sm block mb-2">
                    Marriage Status
                  </label>
                  <select
                    id="edit-wedding"
                    value={editWeddingStatus}
                    onChange={(e) => {
                      const value = e.target.value as WeddingStatus | '';
                      setEditWeddingStatus(value);
                      if (value !== 'Wedded') {
                        setEditMaritalStatus('');
                      }
                    }}
                    className="bg-[#001a16] border-2 border-[#ffd700] text-white rounded px-3 py-2 w-full focus:outline-none focus:border-[#ffc700]"
                  >
                    <option value="">Select marriage status</option>
                    <option value="Wedded">Wedded</option>
                    <option value="Not Wedded">Not Wedded</option>
                  </select>
                </div>

                {editWeddingStatus === 'Wedded' && (
                  <div className="mt-4">
                    <label htmlFor="edit-marital" className="text-gray-300 text-sm block mb-2">
                      Marital Status
                    </label>
                    <select
                      id="edit-marital"
                      value={editMaritalStatus}
                      onChange={(e) => setEditMaritalStatus(e.target.value)}
                      className="bg-[#001a16] border-2 border-[#ffd700] text-white rounded px-3 py-2 w-full focus:outline-none focus:border-[#ffc700]"
                    >
                      <option value="">Select marital status</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="edit-children" className="text-gray-300 text-sm block mb-2">
                      Number of Children
                    </label>
                    <Input
                      id="edit-children"
                      type="number"
                      min="0"
                      value={editNumberOfChildren}
                      onChange={(e) => setEditNumberOfChildren(parseInt(e.target.value) || 0)}
                      placeholder="0 (Nil if no child)"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-gray-300 text-sm">
                      <input
                        type="checkbox"
                        checked={editCommunicant}
                        onChange={(e) => setEditCommunicant(e.target.checked)}
                        className="w-4 h-4 bg-[#001a16] border-[#ffd700] rounded"
                      />
                      Communicant
                    </label>
                  </div>
                </div>

                {(editMaritalStatus === 'Married' || editMaritalStatus === 'Widowed') && (
                  <>
                    <div className="mt-4">
                      <label htmlFor="edit-wife-name" className="text-gray-300 text-sm block mb-2">
                        Wife's Name
                      </label>
                      <Input
                        id="edit-wife-name"
                        value={editWifeName}
                        onChange={(e) => setEditWifeName(e.target.value)}
                        placeholder="Enter wife's name"
                        className="bg-[#001a16] border-[#ffd700] text-white"
                      />
                    </div>

                    <div className="mt-4">
                      <label htmlFor="edit-wife-phone" className="text-gray-300 text-sm block mb-2">
                        Wife's Phone Number
                      </label>
                      <Input
                        id="edit-wife-phone"
                        value={editWifePhone}
                        onChange={(e) => setEditWifePhone(e.target.value)}
                        placeholder="08012345678"
                        className="bg-[#001a16] border-[#ffd700] text-white"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="border-t border-[#ffd700]/30 pt-4">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-4">Emergency Contact</h4>
                
                <div>
                  <label htmlFor="edit-nok-name" className="text-gray-300 text-sm block mb-2">
                    Next of Kin Name
                  </label>
                  <Input
                    id="edit-nok-name"
                    value={editNokName}
                    onChange={(e) => setEditNokName(e.target.value)}
                    placeholder="Enter next of kin name"
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="edit-nok-relationship" className="text-gray-300 text-sm block mb-2">
                      Next of Kin Relationship
                    </label>
                    <Input
                      id="edit-nok-relationship"
                      value={editNokRelationship}
                      onChange={(e) => setEditNokRelationship(e.target.value)}
                      placeholder="e.g. Wife, Son, Brother"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-nok-phone" className="text-gray-300 text-sm block mb-2">
                      Next of Kin Phone Number
                    </label>
                    <Input
                      id="edit-nok-phone"
                      value={editNokPhone}
                      onChange={(e) => setEditNokPhone(e.target.value)}
                      placeholder="08012345678"
                      className="bg-[#001a16] border-[#ffd700] text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Church & Position */}
              <div className="border-t border-[#ffd700]/30 pt-4">
                <h4 className="text-lg font-semibold text-[#ffd700] mb-4">Church Position</h4>
                
                <div>
                  <label htmlFor="edit-post" className="text-gray-300 text-sm block mb-2">
                    Post Held
                  </label>
                  <Input
                    id="edit-post"
                    value={editPostHeld}
                    onChange={(e) => setEditPostHeld(e.target.value)}
                    placeholder="e.g., Treasurer, Secretary, etc."
                    className="bg-[#001a16] border-[#ffd700] text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#ffd700]/30">
                <Button
                  onClick={handleProfileUpdate}
                  className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
                  disabled={settingsLoading}
                >
                  {settingsLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={handleSettingsClose}
                  variant="outline"
                  className="flex-1 border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16]"
                  disabled={settingsLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};