import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import { Users, CheckCircle, AlertCircle, DollarSign, Megaphone, FileText, Shield, Heart } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { formatCurrency, formatDate } from '../../utils/helpers';

export const ChairmanDashboard = () => {
  const {
    members,
    setMembers,
    transactions,
    welfareTickets,
    announcements,
    setAnnouncements,
    currentUser,
    setCurrentUser,
    setSuccess,
    setError
  } = useApp();

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');

  const handleProfilePictureSave = async (imageDataUrl: string, imageFile: Blob) => {
    if (!currentUser) return;

    const storageUrl = await uploadProfilePicture(currentUser.id, imageFile);
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

  const pendingTickets = welfareTickets.filter(t => t.status === 'Awaiting Financial Audit');

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

  // Layer 2 — known administrative ID prefixes/values (uppercase, anchored)
  // Using startsWith / exact value checks — NOT broad .includes() — to prevent
  // false-positive exclusion of legitimate member IDs that share common substrings.
  const isAdministrativeId = (rawId: string): boolean => {
    const id = rawId.toUpperCase();
    return (
      id === 'FIN-SEC-2026'         || // Financial Secretary
      id === 'WEL-OFF-2026'         || // Welfare Officer
      id === 'WELFARE-2026'         || // Welfare Officer
      id === 'TREAS-2026'           || // Treasurer
      id === 'TREASURER-2026'       || // Treasurer
      id === 'SECRETARY-2026'       || // General Secretary
      id === 'PRO-2026'             || // Public Relations Officer
      id === 'CMO-CHAIRMAN-2026'    || // CMO Executive Chairman
      id === 'CHAIRMAN-2026'        || // Executive Chairman
      id.startsWith('FIN-SEC-')     || // future fin-sec cohort IDs
      id.startsWith('WELFARE-')     || // future welfare cohort IDs
      id.startsWith('WEL-OFF-')     || // future welfare cohort IDs
      id.startsWith('TREASURER-')   || // future treasurer cohort IDs
      id.startsWith('TREAS-')       || // future treasurer cohort IDs
      id.startsWith('SECRETARY-')   || // future secretary cohort IDs
      id.startsWith('CMO-CHAIRMAN-')|| // future chairman cohort IDs
      id.startsWith('CHAIRMAN-')    || // future chairman cohort IDs
      id.startsWith('PRO-')            // future PRO cohort IDs
    );
  };

  // Combined predicate — a row is a human church member only if BOTH layers clear it
  const isHumanChurchMember = (m: { role?: string; official_member_id?: string; id?: string }): boolean => {
    const roleOk = !EXEC_ADMIN_ROLES.has((m.role ?? '').toLowerCase());
    const idOk   = !isAdministrativeId(m.official_member_id || m.id || '');
    return roleOk && idOk;
  };

  const isHumanRegistryMember = (m: { role?: string; official_member_id?: string; id?: string }): boolean => {
    const roleOk = !REGISTRY_ADMIN_ROLES.has((m.role ?? '').toLowerCase());
    const idOk   = !isAdministrativeId(m.official_member_id || m.id || '');
    return roleOk && idOk;
  };

  // KPI metrics — live church members only (admin-stripped, dual-validated)
  const churchMembers  = members.filter(isHumanChurchMember);
  const activeMembers  = churchMembers.filter(m => m.status === 'Active (Cleared)');
  const pendingMembers = churchMembers.filter(m => m.status === 'Pending Validation');

  // Registry table source — dual-validated, displays all human members (including family officers)
  const humanMembers = members.filter(isHumanChurchMember);

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
  const totalFunds = churchMembers.reduce((sum, m) => sum + (m.balance || 0), 0);

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
            <h3 className="text-2xl font-bold text-white mt-1">{churchMembers.length}</h3>
          </div>
          <Users className="w-8 h-8 text-[#ffd700]" />
        </Card>

        <Card className="bg-[#002520] border border-[#ffd700]/20 p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Active (Cleared)</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{activeMembers.length}</h3>
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
            <h3 className="text-2xl font-bold text-[#ffd700] mt-1">{formatCurrency(totalFunds)}</h3>
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
            Welfare Review ({pendingTickets.length})
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {welfareTickets.map((ticket) => (
                    <TableRow key={ticket.ticketId} className="border-b border-[#ffd700]/10 hover:bg-[#001a16]/50">
                      <TableCell className="text-white font-mono text-xs">{ticket.ticketId}</TableCell>
                      <TableCell className="text-white font-medium">{ticket.memberName}</TableCell>
                      <TableCell className="text-gray-300 text-xs">{ticket.category}</TableCell>
                      <TableCell className="text-[#ffd700] font-semibold">{formatCurrency(ticket.requestedAmount)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          ticket.status === 'Awaiting Disbursement' || ticket.status === 'Settled & Cleared'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}>
                          {ticket.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">{formatDate(ticket.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {welfareTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-4">No welfare requests registered.</TableCell>
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
                          member.status === 'Active (Cleared)'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}>
                          {member.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#ffd700]">
                        {formatCurrency(member.balance)}
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
    </div>
  );
};
