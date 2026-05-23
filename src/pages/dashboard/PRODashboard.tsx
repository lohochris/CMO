import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Megaphone, CalendarDays, Bell, Users } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { formatDate } from '../../utils/helpers';

export const PRODashboard = () => {
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const { currentUser, announcements, setAnnouncements, members, setMembers, setCurrentUser, setSuccess, setError } = useApp();

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
      setError('Please fill announcement title and content');
      return;
    }

    const announcement = {
      id: generateAnnouncementId(),
      title: announcementTitle,
      content: announcementContent,
      author: currentUser?.name || 'PRO Office',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    };

    setAnnouncements([announcement, ...announcements]);
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setSuccess('Program announcement posted');
    setTimeout(() => setSuccess(''), 3000);
  };

  const upcomingPrograms = [
    { id: 'PROG-001', title: 'Youth Outreach', date: '2026-08-15', details: 'Coordinate volunteers for community outreach and member engagement.' },
    { id: 'PROG-002', title: 'Parish Family Day', date: '2026-09-05', details: 'Prepare guest list, announcements, and logistics for the family day program.' },
    { id: 'PROG-003', title: 'Leadership Workshop', date: '2026-10-10', details: 'Run a program for new leaders and church officers across departments.' }
  ];

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-6">PRO Office Dashboard</h2>

      {currentUser && (
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div>
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Profile Picture</h3>
              <ProfilePictureUploader
                currentImage={currentUser.profilePic}
                onSave={handleProfilePictureSave}
                memberName={currentUser.name}
              />
            </div>
            <div className="md:col-span-2">
              <div className="space-y-3">
                <div className="bg-[#001a16] border border-[#ffd700] rounded p-4">
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white font-semibold">{currentUser.name}</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700] rounded p-4">
                  <p className="text-gray-400 text-sm">Role</p>
                  <p className="text-[#ffd700] font-semibold">PRO Officer</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700] rounded p-4">
                  <p className="text-gray-400 text-sm">Member Count</p>
                  <p className="text-white font-semibold">{members.length}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Megaphone className="w-6 h-6 text-[#ffd700]" />
            <h3 className="text-xl font-bold text-[#ffd700]">Announcements</h3>
          </div>
          <div className="space-y-3">
            {announcements.slice(0, 3).map(ann => (
              <div key={ann.id} className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-white font-semibold">{ann.title}</p>
                <p className="text-gray-400 text-sm">{ann.content}</p>
                <p className="text-xs text-gray-500 mt-2">{formatDate(ann.timestamp)}</p>
              </div>
            ))}
            {announcements.length === 0 && <p className="text-gray-400">No announcements yet</p>}
          </div>
        </Card>

        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
          <div className="flex items-center gap-3 mb-4">
            <CalendarDays className="w-6 h-6 text-[#ffd700]" />
            <h3 className="text-xl font-bold text-[#ffd700]">Upcoming Programs</h3>
          </div>
          <div className="space-y-4">
            {upcomingPrograms.map(program => (
              <div key={program.id} className="bg-[#001a16] border border-[#ffd700] p-4 rounded">
                <p className="text-white font-semibold">{program.title}</p>
                <p className="text-gray-400 text-sm">{formatDate(program.date)}</p>
                <p className="text-gray-400 text-sm mt-2">{program.details}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-[#ffd700]" />
            <h3 className="text-xl font-bold text-[#ffd700]">Action Items</h3>
          </div>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Publish program announcements to members.</li>
            <li>Coordinate with Welfare and Treasurer for events.</li>
            <li>Create reminders for volunteer and outreach teams.</li>
          </ul>
        </Card>
      </div>

      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
        <h3 className="text-xl font-bold text-[#ffd700] mb-4">Publish Program Announcement</h3>
        <div className="space-y-4">
          <Input
            value={announcementTitle}
            onChange={(e) => setAnnouncementTitle(e.target.value)}
            placeholder="Announcement Title"
            className="bg-[#001a16] border-[#ffd700] text-white"
          />
          <textarea
            value={announcementContent}
            onChange={(e) => setAnnouncementContent(e.target.value)}
            placeholder="Message to members"
            className="w-full bg-[#001a16] border border-[#ffd700] text-white p-3 rounded min-h-[140px]"
          />
          <Button
            onClick={postAnnouncement}
            className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
          >
            Publish Announcement
          </Button>
        </div>
      </Card>
    </div>
  );
};
