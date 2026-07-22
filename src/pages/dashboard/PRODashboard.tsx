import { useState, useEffect } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { Megaphone, CalendarDays, Bell, Plus, Trash2, Edit, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { formatDate } from '../../utils/helpers';
import { supabase } from '../../lib/supabaseClient';
import { GeneralGalleryManager } from '../../app/components/gallery/GeneralGalleryManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';

export const PRODashboard = () => {
  // Lock Engine States
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pro_officer_session_unlocked') === 'true';
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

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const { currentUser, announcements, setAnnouncements, members, setMembers, setCurrentUser, setSuccess, setError } = useApp();

  // State for upcoming programs
  const [programs, setPrograms] = useState([
    { id: 'PROG-001', title: 'Youth Outreach', date: '2026-08-15', details: 'Coordinate volunteers for community outreach and member engagement.' },
    { id: 'PROG-002', title: 'Parish Family Day', date: '2026-09-05', details: 'Prepare guest list, announcements, and logistics for the family day program.' },
    { id: 'PROG-003', title: 'Leadership Workshop', date: '2026-10-10', details: 'Run a program for new leaders and church officers across departments.' }
  ]);
  const [editingProgram, setEditingProgram] = useState<any | null>(null);
  const [programTitle, setProgramTitle] = useState('');
  const [programDate, setProgramDate] = useState('');
  const [programDetails, setProgramDetails] = useState('');

  useEffect(() => {
    const fetchMemberCount = async () => {
      try {
        const { count, error } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true });
        
        if (!error && count !== null) {
          setTotalMembers(count);
        }
      } catch (err) {
        console.error("Error fetching real member count:", err);
      }
    };

    fetchMemberCount();
  }, []);

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

  // Handler A: Verify Input Credentials
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsVerifyingPin(true);
    try {
      const { data: isValid, error } = await supabase.rpc('verify_executive_pin', {
        input_role: 'PRO_OFFICER',
        input_pin: pinInput
      });
      if (error) throw error;
      if (isValid) {
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('pro_officer_session_unlocked', 'true');
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
    sessionStorage.removeItem('pro_officer_session_unlocked');
  };

  // Handler B: Re-hash and Mutation API
  const handleUpdateExecutivePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);
    setIsSubmittingPinChange(true);
    try {
      const { data: isSuccess, error } = await supabase.rpc('change_executive_pin', {
        target_role: 'PRO_OFFICER',
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

  // Program Handlers
  const handleSaveProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!programTitle || !programDate || !programDetails) {
      setError('Please fill all program fields');
      return;
    }

    if (editingProgram) {
      // Edit existing
      setPrograms(programs.map(p => p.id === editingProgram.id ? {
        ...p,
        title: programTitle,
        date: programDate,
        details: programDetails
      } : p));
      setEditingProgram(null);
      setSuccess('Program updated successfully');
    } else {
      // Add new
      const newProg = {
        id: `PROG-${Date.now()}`,
        title: programTitle,
        date: programDate,
        details: programDetails
      };
      setPrograms([...programs, newProg]);
      setSuccess('New program scheduled successfully');
    }

    setProgramTitle('');
    setProgramDate('');
    setProgramDetails('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleEditClick = (program: any) => {
    setEditingProgram(program);
    setProgramTitle(program.title);
    setProgramDate(program.date);
    setProgramDetails(program.details);
  };

  const handleDeleteProgram = (id: string) => {
    setPrograms(programs.filter(p => p.id !== id));
    setSuccess('Program deleted successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[#ffd700] mb-0">PRO Office Dashboard</h2>
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
                    <div className="border-t border-white/10 my-4" />
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
                  {currentUser.office_title && (
                    <span className="text-[10px] text-gray-400 block mt-0.5">{currentUser.office_title}</span>
                  )}
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Role</p>
                  <p className="text-[#ffd700] font-bold text-sm">PRO OFFICER</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Total Members</p>
                  <p className="text-white font-bold text-sm">{totalMembers}</p>
                </div>
                <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Announcements</p>
                  <p className="text-white font-bold text-sm">{announcements.length} Published</p>
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
            <p className="text-sm text-gray-400 mt-1">Please enter your Authorization PIN to unlock administrative features.</p>
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
              {isVerifyingPin ? "Verifying..." : "Unlock PRO Portal"}
            </button>
          </form>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-[#002520] border border-[#ffd700]/20 w-full justify-start p-1 flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Overview
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Announcements & Broadcasts
            </TabsTrigger>
            <TabsTrigger value="programs" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Upcoming Programs
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-[#ffd700] data-[state=active]:text-[#001a16] text-[#ffd700] cursor-pointer px-4 py-2 text-sm font-semibold rounded">
              Media & Gallery Pipeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick overview summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#002520] border border-[#ffd700]/20 p-5 rounded-xl flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Upcoming PRO Programs</p>
                  <h4 className="text-2xl font-bold text-[#ffd700] mt-1">{programs.length} Events Scheduled</h4>
                  <p className="text-xs text-gray-500 mt-1">Manage events in the "Upcoming Programs" tab</p>
                </div>
                <CalendarDays className="w-10 h-10 text-[#ffd700] opacity-80" />
              </Card>
              <Card className="bg-[#002520] border border-[#ffd700]/20 p-5 rounded-xl flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Active Announcements</p>
                  <h4 className="text-2xl font-bold text-white mt-1">{announcements.length} Published</h4>
                  <p className="text-xs text-gray-500 mt-1">Post updates in the "Announcements & Broadcasts" tab</p>
                </div>
                <Megaphone className="w-10 h-10 text-[#ffd700] opacity-80" />
              </Card>
            </div>

            {/* Action Items widget */}
            <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-6 h-6 text-[#ffd700]" />
                <h3 className="text-xl font-bold text-[#ffd700]">Action Items</h3>
              </div>
              <ul className="list-disc list-inside space-y-3 text-gray-300 text-sm">
                <li>Publish program announcements to members.</li>
                <li>Coordinate with Welfare and Treasurer for events.</li>
                <li>Create reminders for volunteer and outreach teams.</li>
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-6">
            {/* Publish Program Announcement form */}
            <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-[#ffd700] mb-4">Publish Program Announcement</h3>
              <div className="space-y-4">
                <Input
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Announcement Title"
                  className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                />
                <textarea
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Message to members"
                  className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-3 rounded min-h-[140px] focus:outline-none focus:border-[#ffd700] text-sm"
                />
                <Button
                  onClick={postAnnouncement}
                  className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold"
                >
                  Publish Announcement
                </Button>
              </div>
            </Card>

            {/* Announcements Feed list card */}
            <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Megaphone className="w-6 h-6 text-[#ffd700]" />
                <h3 className="text-xl font-bold text-[#ffd700]">Active Board Notices</h3>
              </div>
              <div className="space-y-4">
                {announcements.map(ann => (
                  <div key={ann.id} className="bg-[#001a16] border border-[#ffd700]/10 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-white font-semibold">{ann.title}</p>
                      <span className="text-xs text-gray-500">{formatDate(ann.timestamp)}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{ann.content}</p>
                    <p className="text-[10px] text-gray-500 mt-2 font-semibold">Posted by: {ann.author || 'PRO Office'}</p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-gray-400 text-center py-6 italic text-sm">No announcements published yet.</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="programs" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to Add/Edit Program */}
              <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl shadow-lg lg:col-span-1">
                <h3 className="text-xl font-bold text-[#ffd700] mb-4">
                  {editingProgram ? 'Edit Scheduled Program' : 'Schedule New Program'}
                </h3>
                <form onSubmit={handleSaveProgram} className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs font-semibold mb-1 uppercase">Program Title</label>
                    <Input
                      value={programTitle}
                      onChange={(e) => setProgramTitle(e.target.value)}
                      placeholder="e.g. Parish Youth Summit"
                      className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs font-semibold mb-1 uppercase">Event Date</label>
                    <Input
                      type="date"
                      value={programDate}
                      onChange={(e) => setProgramDate(e.target.value)}
                      className="bg-[#001a16] border-[#ffd700]/30 text-white focus:border-[#ffd700]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs font-semibold mb-1 uppercase">Event Details</label>
                    <textarea
                      value={programDetails}
                      onChange={(e) => setProgramDetails(e.target.value)}
                      placeholder="Describe logistics, volunteers, and goals..."
                      className="w-full bg-[#001a16] border border-[#ffd700]/30 text-white p-3 rounded min-h-[100px] focus:outline-none focus:border-[#ffd700] text-sm"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1 bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold cursor-pointer"
                    >
                      {editingProgram ? 'Save Changes' : 'Schedule Program'}
                    </Button>
                    {editingProgram && (
                      <Button
                        type="button"
                        onClick={() => {
                          setEditingProgram(null);
                          setProgramTitle('');
                          setProgramDate('');
                          setProgramDetails('');
                        }}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 font-bold cursor-pointer"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </Card>

              {/* List of Programs */}
              <Card className="bg-[#002520] border-2 border-[#ffd700]/30 p-6 rounded-xl shadow-lg lg:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <CalendarDays className="w-6 h-6 text-[#ffd700]" />
                  <h3 className="text-xl font-bold text-[#ffd700]">Scheduled Programs</h3>
                </div>
                <div className="space-y-4">
                  {programs.map(program => (
                    <div key={program.id} className="bg-[#001a16] border border-[#ffd700]/10 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-lg">{program.title}</p>
                        <p className="text-[#ffd700] text-xs font-semibold mt-0.5">{formatDate(program.date)}</p>
                        <p className="text-gray-400 text-sm mt-2">{program.details}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          onClick={() => handleEditClick(program)}
                          className="p-2 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20 rounded cursor-pointer"
                          title="Edit Program"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteProgram(program.id)}
                          className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded cursor-pointer"
                          title="Delete Program"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {programs.length === 0 && (
                    <p className="text-gray-400 text-center py-10 italic text-sm">No upcoming programs scheduled.</p>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <GeneralGalleryManager
              currentUserName={currentUser?.name || 'PRO Officer'}
              isExecutive={isExecutiveUnlocked}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
