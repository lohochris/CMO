import { useState, useEffect } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Plus, 
  History, 
  RotateCcw,
  Sparkles,
  FileText,
  Bookmark,
  Gavel
} from 'lucide-react';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';

interface MassDuty {
  id: string;
  date: string;
  massTitle: string;
  dutyRole: 'Readings' | 'Offertory' | 'Wardens' | 'Choir Support' | 'Altar Servers Support';
  assigneeType: 'member' | 'family';
  assigneeName: string;
  assigneeId?: string;
  notes?: string;
}

interface LiturgicalGuide {
  id: string;
  title: string;
  type: 'Feast Day' | 'General Guideline' | 'Rehearsal Notice' | 'Mass Program';
  date?: string;
  content: string;
}

export default function LiturgistDashboard() {
  const { currentUser, members, setMembers, setCurrentUser } = useApp();
  
  // Local states persisted in LocalStorage
  const [duties, setDuties] = useState<MassDuty[]>([]);
  const [guides, setGuides] = useState<LiturgicalGuide[]>([]);

  // Mass Duty Form States
  const [dutyDate, setDutyDate] = useState(new Date().toISOString().split('T')[0]);
  const [massTitle, setMassTitle] = useState('Sunday 8:00 AM General Mass');
  const [dutyRole, setDutyRole] = useState<'Readings' | 'Offertory' | 'Wardens' | 'Choir Support' | 'Altar Servers Support'>('Readings');
  const [assigneeType, setAssigneeType] = useState<'member' | 'family'>('member');
  const [assignedMemberId, setAssignedMemberId] = useState('');
  const [assignedFamily, setAssignedFamily] = useState('Wisdom');
  const [dutyNotes, setDutyNotes] = useState('');

  // Guide Form States
  const [guideTitle, setGuideTitle] = useState('');
  const [guideType, setGuideType] = useState<'Feast Day' | 'General Guideline' | 'Rehearsal Notice' | 'Mass Program'>('Feast Day');
  const [guideDate, setGuideDate] = useState('');
  const [guideContent, setGuideContent] = useState('');

  useEffect(() => {
    // Load local storage items
    const savedDuties = localStorage.getItem('cmo_liturgical_duties');
    if (savedDuties) {
      try {
        setDuties(JSON.parse(savedDuties));
      } catch (e) {
        console.error('Failed to parse liturgical duties', e);
      }
    } else {
      // Seed some initial duties
      const initial: MassDuty[] = [
        {
          id: 'DUTY-1',
          date: '2026-07-19',
          massTitle: 'Sunday 8:00 AM Holy Mass',
          dutyRole: 'Readings',
          assigneeType: 'member',
          assigneeName: 'Alao, Joseph',
          assigneeId: 'HCC-CMOW-26-0001',
          notes: 'Prepare First Reading (Genesis) and Second Reading (Ephesians).'
        },
        {
          id: 'DUTY-2',
          date: '2026-07-19',
          massTitle: 'Sunday 8:00 AM Holy Mass',
          dutyRole: 'Offertory',
          assigneeType: 'family',
          assigneeName: 'Wisdom Family',
          notes: 'The entire Wisdom Family will coordinate Offertory procession.'
        }
      ];
      setDuties(initial);
      localStorage.setItem('cmo_liturgical_duties', JSON.stringify(initial));
    }

    const savedGuides = localStorage.getItem('cmo_liturgical_guides');
    if (savedGuides) {
      try {
        setGuides(JSON.parse(savedGuides));
      } catch (e) {
        console.error('Failed to parse liturgical guides', e);
      }
    } else {
      // Seed some initial guides
      const initialGuides: LiturgicalGuide[] = [
        {
          id: 'GUIDE-1',
          title: 'Feast of Our Lady of Mount Carmel',
          type: 'Feast Day',
          date: '2026-07-16',
          content: 'CMO members are requested to dress in official parish wear. Special prayers will be held during the morning mass.'
        },
        {
          // Updated guideline description
          id: 'GUIDE-2',
          title: 'Reader Dress Code & Preparedness Guidelines',
          type: 'General Guideline',
          content: 'All assigned readers must report to the Sacristy 15 minutes before Mass, ensuring formal attire matching parish leadership regulations.'
        }
      ];
      setGuides(initialGuides);
      localStorage.setItem('cmo_liturgical_guides', JSON.stringify(initialGuides));
    }
  }, []);

  const saveDuties = (newDuties: MassDuty[]) => {
    setDuties(newDuties);
    localStorage.setItem('cmo_liturgical_duties', JSON.stringify(newDuties));
  };

  const saveGuides = (newGuides: LiturgicalGuide[]) => {
    setGuides(newGuides);
    localStorage.setItem('cmo_liturgical_guides', JSON.stringify(newGuides));
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
      toast.success('Profile avatar updated successfully!');
    } catch (e: any) {
      toast.error('Failed to upload profile picture: ' + e.message);
    }
  };

  const handleAddDuty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dutyDate || !massTitle) {
      toast.error('Please specify a date and Mass title.');
      return;
    }

    let assigneeName = '';
    let assigneeId = '';

    if (assigneeType === 'member') {
      const member = members.find(m => m.official_member_id === assignedMemberId || m.id === assignedMemberId);
      if (!member) {
        toast.error('Assigned member not found in roster.');
        return;
      }
      assigneeName = member.full_name || member.name;
      assigneeId = member.official_member_id || member.id;
    } else {
      assigneeName = `${assignedFamily} Family`;
    }

    const newDuty: MassDuty = {
      id: `DUTY-${Date.now()}`,
      date: dutyDate,
      massTitle,
      dutyRole,
      assigneeType,
      assigneeName,
      assigneeId: assigneeType === 'member' ? assigneeId : undefined,
      notes: dutyNotes.trim()
    };

    saveDuties([newDuty, ...duties]);
    toast.success(`Mass duty assigned successfully!`);
    setDutyNotes('');
    setAssignedMemberId('');
  };

  const handleRemoveDuty = (id: string) => {
    const updated = duties.filter(d => d.id !== id);
    saveDuties(updated);
    toast.success('Duty assignment removed');
  };

  const handleAddGuide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guideTitle || !guideContent) {
      toast.error('Please enter a guide title and content.');
      return;
    }

    const newGuide: LiturgicalGuide = {
      id: `GUIDE-${Date.now()}`,
      title: guideTitle,
      type: guideType,
      date: guideDate || undefined,
      content: guideContent.trim()
    };

    saveGuides([newGuide, ...guides]);
    toast.success('Liturgical guide published successfully!');
    setGuideTitle('');
    setGuideContent('');
    setGuideDate('');
  };

  const handleRemoveGuide = (id: string) => {
    const updated = guides.filter(g => g.id !== id);
    saveGuides(updated);
    toast.success('Liturgical guide removed');
  };

  const activeGeneralMembers = members.filter(m => m.role === 'member' && m.status !== 'Deceased');

  return (
    <div className="p-4 md:p-8 font-sans text-gray-200 min-h-screen bg-[#001a16]">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-[#002520] p-6 rounded-xl border border-[#ffd700]/20 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg text-[#ffd700] border border-blue-500/20 animate-pulse">
              <Sparkles className="w-8 h-8 text-[#ffd700]" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">Liturgical Coordination</h1>
              <p className="text-gray-400 text-sm mt-1">
                Liturgy Coordinator Portal
              </p>
            </div>
          </div>
        </div>

        {/* Compact Horizontal Profile Card (Sleek Horizontal Space-Saver) */}
        {currentUser && (
          <Card className="bg-[#002520] border border-[#ffd700]/20 p-4 mb-8 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <ProfilePictureUploader
                  currentImage={currentUser.profilePic}
                  onSave={handleProfilePictureSave}
                  memberName={currentUser.name}
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
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Role</p>
                    <p className="text-[#ffd700] font-bold text-sm">LITURGIST</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Assigned Duties</p>
                    <p className="text-white font-bold text-sm">{duties.length} Assignments</p>
                  </div>
                  <div className="bg-[#001a16] border border-[#ffd700]/10 rounded-lg p-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Active Guide Book</p>
                    <p className="text-white font-bold text-sm">{guides.length} Published</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Workspaces */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Duty Roster & Scheduler */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#002520] border border-[#ffd700]/10 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-[#ffd700]" />
                Mass & Duty Roster
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#ffd700]/10 text-gray-400 font-semibold">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Mass details</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duties.length > 0 ? (
                      duties.map((duty) => (
                        <tr key={duty.id} className="border-b border-[#ffd700]/5 hover:bg-[#001a16]/40 transition-colors">
                          <td className="py-4 px-4 font-mono text-gray-300 whitespace-nowrap">
                            {new Date(duty.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-white font-semibold text-xs uppercase">{duty.massTitle}</p>
                            {duty.notes && <p className="text-gray-400 text-[11px] mt-0.5">{duty.notes}</p>}
                          </td>
                          <td className="py-4 px-4">
                            <span className="bg-blue-500/10 text-blue-300 border border-blue-500/25 px-2 py-0.5 rounded text-xs font-semibold">
                              {duty.dutyRole}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-bold text-white uppercase text-xs">
                            {duty.assigneeName} {duty.assigneeId && <span className="text-gray-500 font-mono font-normal">({duty.assigneeId})</span>}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Button
                              onClick={() => handleRemoveDuty(duty.id)}
                              className="bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/30 text-red-400 text-xs px-2.5 py-1 h-auto"
                            >
                              Unassign
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          No mass duties scheduled yet. Use the editor panel to assign a duty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mass Duty Assign Panel */}
            <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#ffd700]" />
                Assign Liturgical Mass Duty
              </h3>
              <form onSubmit={handleAddDuty} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Mass Date</label>
                  <input
                    type="date"
                    value={dutyDate}
                    onChange={(e) => setDutyDate(e.target.value)}
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Mass Service Title</label>
                  <Input
                    type="text"
                    value={massTitle}
                    onChange={(e) => setMassTitle(e.target.value)}
                    placeholder="e.g. Sunday 8:00 AM Mass"
                    className="bg-[#001a16] border-[#ffd700]/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Liturgical Duty Role</label>
                  <select
                    value={dutyRole}
                    onChange={(e) => setDutyRole(e.target.value as any)}
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                  >
                    <option value="Readings">First/Second Readings</option>
                    <option value="Offertory">Offertory Procession</option>
                    <option value="Wardens">Wardens/Orderlies</option>
                    <option value="Choir Support">Choir Support</option>
                    <option value="Altar Servers Support">Altar Servers Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Assignee Class</label>
                  <div className="flex gap-4 mt-2">
                    <label className="inline-flex items-center text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={assigneeType === 'member'}
                        onChange={() => setAssigneeType('member')}
                        className="form-radio text-[#ffd700] mr-2"
                      />
                      Specific Member
                    </label>
                    <label className="inline-flex items-center text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={assigneeType === 'family'}
                        onChange={() => setAssigneeType('family')}
                        className="form-radio text-[#ffd700] mr-2"
                      />
                      Entire Family Unit
                    </label>
                  </div>
                </div>

                {assigneeType === 'member' ? (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Select Member</label>
                    <select
                      value={assignedMemberId}
                      onChange={(e) => setAssignedMemberId(e.target.value)}
                      className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                    >
                      <option value="">Choose penalizing assignee...</option>
                      {activeGeneralMembers.map(m => (
                        <option key={m.id} value={m.official_member_id || m.id}>{m.name} ({m.official_member_id})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Select Family Unit</label>
                    <select
                      value={assignedFamily}
                      onChange={(e) => setAssignedFamily(e.target.value)}
                      className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                    >
                      <option value="Wisdom">Wisdom Family</option>
                      <option value="Honour">Honour Family</option>
                      <option value="Integrity">Integrity Family</option>
                      <option value="Talent">Talent Family</option>
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Ledger Notes / Preparation Instructions</label>
                  <textarea
                    rows={2}
                    value={dutyNotes}
                    onChange={(e) => setDutyNotes(e.target.value)}
                    placeholder="Enter special details (rehearsal schedule, liturgical guidelines)..."
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 resize-none font-sans"
                  />
                </div>

                <div className="md:col-span-2">
                  <Button type="submit" className="w-full bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-bold">
                    Schedule Duty Assignment
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Liturgical Guide & feast days */}
          <div className="space-y-6">
            <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                <Bookmark className="w-5 h-5 text-[#ffd700]" />
                Liturgical Calendar & Guide
              </h2>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {guides.map((g) => (
                  <div key={g.id} className="bg-[#001a16] border border-[#ffd700]/10 p-4 rounded-lg relative">
                    <button
                      onClick={() => handleRemoveGuide(g.id)}
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs cursor-pointer"
                      title="Delete guideline"
                    >
                      Delete
                    </button>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        g.type === 'Feast Day' ? 'bg-yellow-500/20 text-yellow-400' :
                        g.type === 'Rehearsal Notice' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {g.type}
                      </span>
                      {g.date && <span className="text-[10px] text-gray-500 font-mono">{g.date}</span>}
                    </div>
                    <h4 className="text-white font-bold text-xs uppercase tracking-tight">{g.title}</h4>
                    <p className="text-gray-300 text-[11px] leading-relaxed mt-1">{g.content}</p>
                  </div>
                ))}
                {guides.length === 0 && (
                  <p className="text-gray-400 text-center py-6 text-sm">No guidelines or guides published.</p>
                )}
              </div>
            </Card>

            {/* Post/Publish Guide Form */}
            <Card className="bg-[#002520] border border-[#ffd700]/10 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#ffd700]" />
                Publish Guideline / Event
              </h3>
              <form onSubmit={handleAddGuide} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Title</label>
                  <Input
                    type="text"
                    value={guideTitle}
                    onChange={(e) => setGuideTitle(e.target.value)}
                    placeholder="e.g. Reader Rehearsal Notice"
                    className="bg-[#001a16] border-[#ffd700]/20 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Type</label>
                    <select
                      value={guideType}
                      onChange={(e) => setGuideType(e.target.value as any)}
                      className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-xs text-white focus:outline-none focus:border-[#ffd700]/50 cursor-pointer"
                    >
                      <option value="Feast Day">Feast Day</option>
                      <option value="General Guideline">Guideline</option>
                      <option value="Rehearsal Notice">Rehearsal</option>
                      <option value="Mass Program">Mass Program</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Event Date</label>
                    <input
                      type="date"
                      value={guideDate}
                      onChange={(e) => setGuideDate(e.target.value)}
                      className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-1.5 text-xs text-white focus:outline-none focus:border-[#ffd700]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">Guideline Content</label>
                  <textarea
                    rows={3}
                    value={guideContent}
                    onChange={(e) => setGuideContent(e.target.value)}
                    placeholder="Enter liturgical directions, announcements, or mass duty notes..."
                    className="w-full bg-[#001a16] border border-[#ffd700]/20 rounded p-2 text-sm text-white focus:outline-none focus:border-[#ffd700]/50 resize-none font-sans"
                  />
                </div>

                <Button type="submit" className="bg-[#ffd700] hover:bg-[#ffc700] text-[#001a16] font-bold mt-1">
                  Publish Guide
                </Button>
              </form>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
