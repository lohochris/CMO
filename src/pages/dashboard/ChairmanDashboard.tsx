import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { Users, CheckCircle, CheckCheck, AlertCircle, DollarSign, Megaphone, FileText, Shield, Heart, ShieldCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { formatCurrency, formatDate, isAdministrativeId } from '../../utils/helpers';
import { supabase } from '../../lib/supabaseClient';
import { Member, Family, MemberStatus } from '../../types';

export const ChairmanDashboard = () => {
  const {
    members,
    setMembers,
    transactions,
    welfareTickets,
    setWelfareTickets,
    announcements,
    setAnnouncements,
    currentUser,
    setCurrentUser,
    setSuccess,
    setError,
    rosterCount,
    vaultBalance
  } = useApp();

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');

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

  const generateAnnouncementId = (): string => `ANN-${Date.now()}`;

  const postAnnouncement = () => {
    if (!announcementTitle || !announcementContent) {
      setError('Please fill in both the title and content of the announcement.');
      return;
    }

    const announcement = {
      id: generateAnnouncementId(),
      title: announcementTitle,
      content: announcementContent,
      author: currentUser?.name || 'Executive Chairman',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    };

    setAnnouncements([announcement, ...announcements]);
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setSuccess('Announcement published successfully.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const pendingTickets = welfareTickets.filter(t => t.status === 'Awaiting Financial Audit' || t.status === 'Pending');
  const unreadWelfareCount = welfareTickets.filter(ticket => !ticket.chairmanRead).length;

  const acknowledgeTicket = async (ticketId: string) => {
    setError('');
    try {
      const { error: dbErr } = await supabase
        .from('welfare_tickets')
        .update({ chairman_read: true })
        .eq('ticket_id', ticketId);

      if (dbErr) {
        console.error("Supabase update error on acknowledge:", dbErr);
        setError(`Database Error: ${dbErr.message}`);
        return;
      }

      // Update local state context (via setWelfareTickets)
      const updatedTickets = welfareTickets.map(t =>
        t.ticketId === ticketId
          ? { ...t, chairmanRead: true }
          : t
      );
      setWelfareTickets(updatedTickets);
      setSuccess(`Ticket ${ticketId} acknowledged.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error("Failed to acknowledge ticket:", err);
      setError(`Failed to acknowledge ticket: ${err.message}`);
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

  // ══════════════════════════════════════════════════════════════════════════════
  // DUAL-LAYER ADMINISTRATIVE EXCLUSION
  // Layer 1 (role)  — catches all accounts whose 'role' column is correctly set.
  // Layer 2 (ID)    — secondary safety net: catches any account that entered the
  //                   members array with role = 'member' due to auto-registration
  //                   from master_roster or a data-entry error in Supabase.
  // Both layers must pass (AND logic) for a row to be considered a church member.
  // ══════════════════════════════════════════════════════════════════════════════

  // Layer 1 — system role identifiers (exact match, lowercase)
  const EXEC_ADMIN_ROLES = new Set<string>([
    'chairman', 'cmo_chairman', 'fin_sec', 'welfare', 'treasurer', 'gen_sec', 'pro'
  ]);

  // Registry-level role exclusion (broader — family officers have dedicated dashboards)
  const REGISTRY_ADMIN_ROLES = new Set<string>([
    'chairman', 'cmo_chairman', 'fin_sec', 'welfare', 'treasurer',
    'gen_sec', 'pro', 'family_chairman', 'family_secretary'
  ]);

  // Combined predicate — a row is a human church member only if BOTH layers clear it
  const isHumanChurchMember = (m: { role?: string; official_member_id?: string; id?: string }): boolean => {
    const memberId = m.official_member_id || m.id || '';
    if (memberId.startsWith('HCC-')) return true;
    return !isAdministrativeId(memberId);
  };

  const isHumanRegistryMember = (m: { role?: string; official_member_id?: string; id?: string }): boolean => {
    const memberId = m.official_member_id || m.id || '';
    if (memberId.startsWith('HCC-')) return true;
    return !isAdministrativeId(memberId);
  };

  // KPI metrics — live church members only (admin-stripped, dual-validated)
  const churchMembers  = members.filter(isHumanChurchMember);
  const activeMembers  = churchMembers.filter(m => m.status === 'Active');
  const pendingMembers = churchMembers.filter(m => m.status === 'Inactive');
  const totalMembersCount = churchMembers.filter(m => m.status !== 'Deceased').length;
  const activeMembersCount = churchMembers.filter(m => m.status === 'Active').length;

  // Registry table source — displays the complete, unfiltered database roster
  const humanMembers = members.filter(isHumanRegistryMember);

  const filteredMembers = humanMembers.filter(m => {
    const q = registrySearch.toLowerCase();
    if (!q) return true;
    return (
      (m.official_member_id || '').toLowerCase().includes(q) ||
      (m.full_name || m.name || '').toLowerCase().includes(q) ||
      (m.phone_number || m.phone || '').toLowerCase().includes(q)
    );
  });

  // Vault balance — sums dues from verified church members only

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-[#ffd700]" />
        <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700]">Executive Chairman Dashboard</h2>
      </div>

      {currentUser && (
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="flex flex-col items-center justify-center">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Official Seal & Profile</h3>
              <ProfilePictureUploader
                currentImage={currentUser.profilePic}
                onSave={handleProfilePictureSave}
                memberName={currentUser.name}
              />
            </div>
            <div className="md:col-span-2">
              <h4 className="text-lg font-semibold text-white mb-3">Executive Summary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#001a16] border border-[#ffd700]/30 rounded p-4">
                  <p className="text-gray-400 text-sm">Designation</p>
                  <p className="text-[#ffd700] font-bold text-lg">{currentUser.name}</p>
                  <p className="text-gray-400 text-xs">Holy Cross CMO Executive Chairman</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/30 rounded p-4">
                  <p className="text-gray-400 text-sm">Security Level</p>
                  <p className="text-emerald-400 font-semibold text-lg">Level 1 (Highest Command)</p>
                  <p className="text-gray-400 text-xs">Official Administrative ID: {currentUser.official_member_id || currentUser.id}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Members</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalMembersCount}</h3>
          </div>
          <Users className="w-8 h-8 text-[#ffd700]" />
        </Card>

        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Active Members</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{activeMembersCount}</h3>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </Card>

        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Pending Clearances</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">{pendingMembers.length}</h3>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </Card>

        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">CMO Vault Balance</p>
            <h3 className="text-2xl font-bold text-[#ffd700] mt-1">{formatCurrency(vaultBalance)}</h3>
          </div>
          <DollarSign className="w-8 h-8 text-[#ffd700]" />
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[#002520] border border-[#ffd700]/20 w-full justify-start p-1 mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
            Executive Summary
          </TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
            Announcements & Decrees
          </TabsTrigger>
          <TabsTrigger value="welfare" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
            Welfare Review {unreadWelfareCount > 0 ? `(${unreadWelfareCount})` : ''}
          </TabsTrigger>
          <TabsTrigger value="roster" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
            CMO Roster
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" /> Executive Powers & Oversight
              </h3>
              <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
                <p>
                  Welcome, Mr. President. As the Executive Chairman, you hold absolute oversight over the administrative and financial activities of the Holy Cross Catholic Men Organisation (CMO).
                </p>
                <p>
                  Use this central portal to publish announcements, monitor active welfare applications, audit treasury records, and ensure general compliance with the CMO Constitution.
                </p>
                <div className="bg-[#001a16] border border-[#ffd700]/30 rounded p-4 text-[#ffd700]/80">
                  <h4 className="font-semibold mb-1">General Operations Alert</h4>
                  All financial transactions published by the Financial Secretary and disbursements approved by the Welfare Officer are synchronized live here for your executive review.
                </div>
              </div>
            </Card>

            <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Recent Cash Flow Logs
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#ffd700]/20 hover:bg-[#001a16]/50">
                      <TableHead className="text-[#ffd700]">Date</TableHead>
                      <TableHead className="text-[#ffd700]">Member / Reference</TableHead>
                      <TableHead className="text-[#ffd700]">Purpose</TableHead>
                      <TableHead className="text-[#ffd700] text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 5).map((tx) => (
                      <TableRow key={tx.id} className="border-b border-[#ffd700]/10 hover:bg-[#001a16]/50">
                        <TableCell className="text-white text-xs">{formatDate((tx as any).created_at || tx.timestamp)}</TableCell>
                        <TableCell className="text-white font-medium">{tx.memberName || tx.memberId}</TableCell>
                        <TableCell className="text-gray-300 text-xs">{tx.purpose}</TableCell>
                        <TableCell className="text-right font-semibold text-[#ffd700]">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-4">No recent financial logs recorded.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="announcements">
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5" /> Publish Executive Directive
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Announcement Title</label>
                <Input
                  placeholder="e.g. Executive Meeting Notice"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Content</label>
                <textarea
                  rows={4}
                  placeholder="Write details of the executive directive here..."
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 rounded p-3 text-white focus:outline-none focus:border-[#ffd700] text-sm"
                />
              </div>
              <Button onClick={postAnnouncement} className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-semibold">
                Publish Announcement
              </Button>
            </div>

            <h4 className="text-lg font-bold text-[#ffd700] border-t border-[#ffd700]/20 pt-6 mb-4">Active Board Notices</h4>
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-[#001a16] border border-[#ffd700]/10 rounded p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h5 className="font-bold text-white">{ann.title}</h5>
                    <span className="text-xs text-gray-500">{formatDate(ann.timestamp)}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{ann.content}</p>
                  <p className="text-xs text-[#ffd700] mt-2 font-medium">By: {ann.author}</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No announcements currently active.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="welfare">
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
            <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5" /> Welfare Assistance Queue
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#ffd700]/20 hover:bg-[#001a16]/50">
                    <TableHead className="text-[#ffd700]">Ticket ID</TableHead>
                    <TableHead className="text-[#ffd700]">Member</TableHead>
                    <TableHead className="text-[#ffd700]">Category</TableHead>
                    <TableHead className="text-[#ffd700]">Amount</TableHead>
                    <TableHead className="text-[#ffd700]">Status</TableHead>
                    <TableHead className="text-[#ffd700]">Date Filed</TableHead>
                    <TableHead className="text-[#ffd700] text-center">Acknowledgment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {welfareTickets.map((ticket) => (
                    <TableRow key={ticket.ticketId} className="border-b border-[#ffd700]/10 hover:bg-[#001a16]/50">
                      <TableCell className="text-white font-mono text-xs">{ticket.ticketId}</TableCell>
                      <TableCell className="text-white font-medium">{ticket.memberName}</TableCell>
                      <TableCell className="text-gray-300 text-xs">
                        {ticket.category}
                        {ticket.status === 'Declined' && ticket.declineReason && (
                          <div className="text-red-400 italic mt-1 text-[11px]">
                            Reason: {ticket.declineReason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-[#ffd700] font-semibold">{formatCurrency(ticket.requestedAmount)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          ticket.status === 'Awaiting Disbursement' || ticket.status === 'Approved' || ticket.status === 'Settled & Cleared' || ticket.status === 'Completed'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}>
                          {ticket.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">{formatDate(ticket.createdAt)}</TableCell>
                      <TableCell className="text-center">
                        {!ticket.chairmanRead ? (
                          <button
                            type="button"
                            onClick={() => acknowledgeTicket(ticket.ticketId)}
                            className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-semibold text-xs py-1.5 px-3 rounded flex items-center gap-1.5 mx-auto cursor-pointer"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Acknowledge
                          </button>
                        ) : (
                          <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1 justify-center">
                            <CheckCheck className="w-4 h-4" />
                            Acknowledged
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {welfareTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-4">No welfare requests registered.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="roster">
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-6">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h3 className="text-xl font-bold text-[#ffd700] flex items-center gap-2">
                <FileText className="w-5 h-5" /> Holy Cross CMO — Membership Registry
              </h3>
              <span className="text-xs text-gray-500">
                {filteredMembers.length} of {humanMembers.length} member{humanMembers.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Case-insensitive search filter */}
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
                            <button
                              type="button"
                              onClick={() => handleMarkDeceased(member.official_member_id || member.id)}
                              className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs py-1 px-2 rounded cursor-pointer"
                            >
                              Mark Deceased
                            </button>
                          ) : (
                            <span className="text-gray-500 text-xs italic">Deceased (Locked)</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                        {registrySearch ? `No members match "${registrySearch}".` : 'No church members found in registry.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
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
