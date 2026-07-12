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

export const WelfareDashboard = () => {
  const [welfareFormMemberId, setWelfareFormMemberId] = useState('');
  const [welfareCategory, setWelfareCategory] = useState('');
  const [welfareAmount, setWelfareAmount] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchIndex, setMemberSearchIndex] = useState(-1);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  
  const { members, welfareTickets, setWelfareTickets, setMembers, announcements, setAnnouncements, currentUser, setCurrentUser, setSuccess, setError } = useApp();

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

  const memberSearchResults = memberSearchQuery.trim()
    ? members.filter(m => `${m.name} ${m.id}`.toLowerCase().includes(memberSearchQuery.toLowerCase())).slice(0, 8)
    : [];

  const showMemberSearchResults = Boolean(
    memberSearchQuery.trim() && memberSearchResults.length > 0 && !memberSearchResults.some(m => m.id === welfareFormMemberId)
  );

  const selectMember = (memberId: string, displayText: string) => {
    setWelfareFormMemberId(memberId);
    setMemberSearchQuery(displayText);
    setMemberSearchIndex(-1);
  };

  const handleWelfareTicketSubmit = () => {
    setError('');
    if (!welfareFormMemberId || !welfareCategory || !welfareAmount) {
      setError('Please fill all fields');
      return;
    }

    const member = members.find(m => m.id === welfareFormMemberId);
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

    // 2. Member Balance Check: Dues must be cleared (balance must be >= 0)
    if (member.balance < 0) {
      setError(`Constitutional Policy Violation: Member ${member.name} has outstanding dues (balance: ₦${member.balance.toLocaleString()}). Assistance cannot be requested until balances are cleared.`);
      return;
    }

    // 3. Member Tenure Check: Must have been active for at least 180 days (6 months)
    const memberCreatedAt = member.createdAt ? new Date(member.createdAt).getTime() : Date.now();
    const tenureDays = (Date.now() - memberCreatedAt) / (1000 * 60 * 60 * 24);
    if (tenureDays < 180) {
      setError(`Constitutional Policy Violation: Member ${member.name} has only been active for ${Math.round(tenureDays)} days. 6 months of active membership (180 days) is required.`);
      return;
    }

    const ticket = {
      ticketId: generateTicketId(welfareTickets.length),
      memberId: welfareFormMemberId,
      memberName: member.name,
      category: welfareCategory,
      requestedAmount: amount,
      status: 'Awaiting Financial Audit' as const,
      createdAt: new Date().toISOString()
    };

    setWelfareTickets([...welfareTickets, ticket]);
    setSuccess(`Welfare ticket created: ${ticket.ticketId}`);
    setWelfareFormMemberId('');
    setWelfareCategory('');
    setWelfareAmount('');
    setMemberSearchQuery('');
    setTimeout(() => setSuccess(''), 3000);
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
              <Input
                id="welfare-member-search"
                value={memberSearchQuery}
                onChange={(e) => {
                  setMemberSearchQuery(e.target.value);
                  setMemberSearchIndex(-1);
                  setWelfareFormMemberId('');
                }}
                onKeyDown={(e) => {
                  if (memberSearchResults.length === 0) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMemberSearchIndex((prev) => Math.min(prev + 1, memberSearchResults.length - 1));
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMemberSearchIndex((prev) => Math.max(prev - 1, 0));
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const selected = memberSearchResults[memberSearchIndex >= 0 ? memberSearchIndex : 0];
                    if (selected) {
                      selectMember(selected.id, `${selected.name} (${selected.id})`);
                    }
                  }
                  if (e.key === 'Escape') {
                    setMemberSearchIndex(-1);
                  }
                }}
                placeholder="Search by name or ID"
                className="bg-[#001a16] border-[#ffd700] text-white"
                autoComplete="off"
              />
              {showMemberSearchResults && (
                <div className="mt-2 max-h-56 overflow-y-auto rounded border border-[#ffd700]/50 bg-[#001a16]">
                  {memberSearchResults.map((member, index) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => selectMember(member.id, `${member.name} (${member.id})`)}
                      className={`w-full text-left px-3 py-2 text-sm ${memberSearchIndex === index ? 'bg-[#ffd700]/30 text-white' : 'text-white hover:bg-[#ffd700]/20'}`}
                    >
                      {member.name} — {member.id}
                    </button>
                  ))}
                </div>
              )}
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
                className="w-full bg-[#001a16] border border-[#ffd700] text-white p-2 rounded"
              >
                <option value="">Select category</option>
                {WELFARE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
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