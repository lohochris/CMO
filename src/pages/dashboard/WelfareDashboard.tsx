import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Heart } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { generateTicketId } from '../../utils/idGenerators';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { WELFARE_CATEGORIES } from '../../utils/constants';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { supabase } from '../../lib/supabaseClient';
import { WelfareTicket } from '../../types';

export const WelfareDashboard = () => {
  const [welfareFormMemberId, setWelfareFormMemberId] = useState('');
  const [welfareCategory, setWelfareCategory] = useState('');
  const [welfareAmount, setWelfareAmount] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchIndex, setMemberSearchIndex] = useState(-1);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  
  const {
    members, setMembers,
    transactions, setTransactions,
    welfareTickets, setWelfareTickets,
    expenses, setExpenses,
    announcements, setAnnouncements,
    currentUser, setCurrentUser,
    setError, setSuccess
  } = useApp();

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

  const isAdministrativeId = (rawId: string): boolean => {
    const id = rawId.toUpperCase();
    return (
      id === 'FIN-SEC-2026'         ||
      id === 'WEL-OFF-2026'         ||
      id === 'WELFARE-2026'         ||
      id === 'TREAS-2026'           ||
      id === 'TREASURER-2026'       ||
      id === 'SECRETARY-2026'       ||
      id === 'PRO-2026'             ||
      id === 'CMO-CHAIRMAN-2026'    ||
      id === 'CHAIRMAN-2026'        ||
      id.startsWith('FIN-SEC-')     ||
      id.startsWith('WELFARE-')     ||
      id.startsWith('WEL-OFF-')     ||
      id.startsWith('TREASURER-')   ||
      id.startsWith('TREAS-')       ||
      id.startsWith('SECRETARY-')   ||
      id.startsWith('CMO-CHAIRMAN-')||
      id.startsWith('CHAIRMAN-')    ||
      id.startsWith('PRO-')
    );
  };

  const query = memberSearchQuery.toLowerCase().trim();
  const suggestions = query 
    ? members.filter(m => {
        const id = m.official_member_id || m.id || '';
        const isAdminRole = ['chairman', 'cmo_chairman', 'fin_sec', 'welfare', 'treasurer', 'gen_sec', 'pro'].includes((m.role || '').toLowerCase());
        const isAdminId = isAdministrativeId(id);
        if (isAdminRole || isAdminId) return false;
        
        return (m.full_name || m.name || "").toLowerCase().includes(query) || id.toLowerCase().includes(query);
      })
    : [];

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

    // 1. Cap Check: Maximum standard welfare disbursement is ₦50,000
    if (amount > 50000) {
      setError(`Constitutional Policy Violation: Welfare request of ₦${amount.toLocaleString()} exceeds the maximum disbursement cap of ₦50,000.`);
      return;
    }

    // 2. Member Balance Check bypassed: Welfare assistance request creation is permitted for all members regardless of ledger clearance.

    // 3. Member Tenure Check bypassed: Any member is constitutionally eligible for welfare assistance regardless of registered duration.

    const finalCategory = (welfareCategory === "Wife's Death" || welfareCategory === "Others") && reasonDetails.trim()
      ? `${welfareCategory} (${reasonDetails.trim()})`
      : welfareCategory;

    try {
      const { data: insertedList, error: insertErr } = await supabase
        .from('welfare_tickets')
        .insert([{
          official_member_id: welfareFormMemberId,
          category: finalCategory,
          amount: amount,
          reason_details: (welfareCategory === "Wife's Death" || welfareCategory === "Others") ? reasonDetails.trim() : '',
          status: 'Awaiting Financial Audit'
        }])
        .select('*');

      if (insertErr) {
        console.error("Supabase insert error:", insertErr);
        setError(`Database Error: ${insertErr.message}`);
        return;
      }

      const inserted = insertedList && insertedList.length > 0 ? insertedList[0] : null;

      const newTicket: WelfareTicket = {
        ticketId: inserted?.id || `TK-${Date.now()}`,
        memberId: welfareFormMemberId,
        memberName: member.full_name || member.name,
        category: finalCategory,
        requestedAmount: amount,
        status: 'Awaiting Financial Audit',
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

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-6">Welfare Department</h2>

      {currentUser && (
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 mb-6">
          <h3 className="text-xl font-bold text-[#ffd700] mb-4">Profile Picture</h3>
          <ProfilePictureUploader
            currentImage={currentUser.profilePic}
            onSave={handleProfilePictureSave}
            memberName={currentUser.name}
          />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Ticket Form */}
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
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
                className="w-full bg-[#001a16] border border-[#ffd700] text-white p-2 rounded cursor-pointer"
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
                  <label className="text-sm font-bold text-yellow-400">Provide Specific Details / Reason</label>
                  <textarea 
                    className="w-full p-2 bg-[#001a16] border border-[#ffd700] rounded text-white focus:outline-none focus:ring-1 focus:ring-[#ffd700]"
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
              className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
            >
              <Heart className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          </div>
        </Card>

        {/* Active Tickets */}
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
          <h3 className="text-xl font-bold text-[#ffd700] mb-4">All Welfare Tickets</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {welfareTickets.slice().reverse().map(ticket => (
              <div key={ticket.ticketId} className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-semibold">{ticket.ticketId}</p>
                    <p className="text-gray-400 text-sm">{ticket.memberName}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    ticket.status === 'Awaiting Financial Audit' ? 'bg-yellow-500/20 text-yellow-500' :
                    ticket.status === 'Awaiting Disbursement' ? 'bg-blue-500/20 text-blue-500' :
                    ticket.status === 'Declined' ? 'bg-red-500/20 text-red-500' :
                    'bg-green-500/20 text-green-500'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mb-1">{ticket.category}</p>
                <p className="text-[#ffd700] font-bold">{formatCurrency(ticket.requestedAmount)}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Created: {formatDateTime(ticket.createdAt)}
                </p>
              </div>
            ))}
            {welfareTickets.length === 0 && (
              <p className="text-gray-400 text-center py-8">No tickets created yet</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 mt-6">
        <h3 className="text-xl font-bold text-[#ffd700] mb-4">Welfare Announcements</h3>
        <div className="space-y-4 mb-4">
          <Input
            value={announcementTitle}
            onChange={(e) => setAnnouncementTitle(e.target.value)}
            placeholder="Announcement Title"
            className="bg-[#001a16] border-[#ffd700] text-white"
          />
          <textarea
            value={announcementContent}
            onChange={(e) => setAnnouncementContent(e.target.value)}
            placeholder="Announcement Content"
            className="w-full bg-[#001a16] border border-[#ffd700] text-white p-3 rounded min-h-[120px]"
          />
          <Button
            onClick={postAnnouncement}
            className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
          >
            Publish Announcement
          </Button>
        </div>
        <div className="space-y-3">
          {announcements.slice(0, 3).map(ann => (
            <div key={ann.id} className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
              <p className="text-[#ffd700] font-semibold">{ann.title}</p>
              <p className="text-gray-300 text-sm mb-2">{ann.content}</p>
              <p className="text-xs text-gray-500">{formatDateTime(ann.timestamp)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};