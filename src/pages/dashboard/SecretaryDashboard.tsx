import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { FileEdit, Mic, Download } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';

export const SecretaryDashboard = () => {
  const [minutesText, setMinutesText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const { currentUser, members, setMembers, setCurrentUser, announcements, setAnnouncements, setSuccess, setError } = useApp();

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

  const simulateAITranscription = () => {
    setIsRecording(true);
    setTimeout(() => {
      const template = `HOLY CROSS CMO MEETING MINUTES
Date: ${new Date().toLocaleDateString()}
Time: [Insert Time]
Venue: [Insert Venue]

ATTENDANCE:
- Parish Priest: [Name]
- Financial Secretary: Dondo, Christopher
- Welfare Officer: Okafor, Emmanuel
- Treasurer: Ibrahim, Musa
- General Secretary: Eze, Chukwuma
- Members Present: [Count]

AGENDA:
1. Opening Prayer
2. Review of Previous Minutes
3. Financial Report
4. Welfare Report
5. General Business
6. Closing Prayer

DISCUSSIONS:
[AI-captured discussion points will appear here...]

ACTION ITEMS:
- [ ] [Action item 1]
- [ ] [Action item 2]

NEXT MEETING: [Date and Time]

Recorded by: ${currentUser?.name}`;

      setMinutesText(template);
      setIsRecording(false);
      setSuccess('AI transcription complete!');
      setTimeout(() => setSuccess(''), 3000);
    }, 2000);
  };

  const exportMinutes = () => {
    const blob = new Blob([minutesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CMO_Minutes_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    setSuccess('Minutes exported successfully!');
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
      author: currentUser?.name || 'General Secretary',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    };

    setAnnouncements([announcement, ...announcements]);
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setSuccess('Announcement posted successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-6">General Secretary Department</h2>

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

      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6">
        <h3 className="text-xl font-bold text-[#ffd700] mb-4 flex items-center gap-2">
          <FileEdit className="w-5 h-5" />
          Meeting Minutes Editor
        </h3>

        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={simulateAITranscription}
              disabled={isRecording}
              className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
            >
              <Mic className="w-4 h-4 mr-2" />
              {isRecording ? 'Recording...' : 'AI Voice-to-Text Listener'}
            </Button>
            <Button
              onClick={exportMinutes}
              disabled={!minutesText}
              variant="outline"
              className="border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16]"
            >
              <Download className="w-4 h-4 mr-2" />
              Export & Publish Minutes
            </Button>
          </div>

          <textarea
            value={minutesText}
            onChange={(e) => setMinutesText(e.target.value)}
            placeholder="Minutes will appear here after AI transcription, or type manually..."
            className="w-full bg-[#001a16] border border-[#ffd700] text-white p-4 rounded min-h-[500px] font-mono text-sm"
          />
        </div>
      </Card>

      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 mt-6">
        <h3 className="text-xl font-bold text-[#ffd700] mb-4">Publish Announcement</h3>
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
            placeholder="Announcement details..."
            className="w-full bg-[#001a16] border border-[#ffd700] text-white p-3 rounded min-h-[120px]"
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