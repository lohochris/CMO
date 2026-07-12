import { useState } from 'react';
import type { WeddingStatus, Family } from '../../types';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { CheckCircle, FileText, Settings, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { uploadProfilePicture } from '../../utils/supabaseHelpers';
import { ProfilePictureUploader } from '../../app/components/common/ProfilePictureUploader';
import { supabase } from '../../utils/supabaseClient';

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
  const [formCmoFamily, setFormCmoFamily] = useState<Family>(currentUser?.family || 'Wisdom');

  const handleProfilePictureSave = async (imageDataUrl: string, imageFile: Blob) => {
    if (!currentUser) return;

    const storageUrl = await uploadProfilePicture(currentUser.id, imageFile);
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
      setFormCmoFamily(currentUser.family || 'Wisdom');
      setIsSettingsOpen(true);
    }
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    setError('');
  };

  const [settingsLoading, setSettingsLoading] = useState(false);

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
        cmo_family: formCmoFamily
      };

      // A. Update the Active Profiles Table ('members')
      const { error: membersErr } = await supabase
        .from('members')
        .update(updatePayload)
        .eq('official_member_id', currentUser.id);

      if (membersErr) {
        throw new Error(`Failed to update members table: ${membersErr.message}`);
      }

      // B. Update the Source of Record Table ('master_roster')
      const { error: rosterErr } = await supabase
        .from('master_roster')
        .update(updatePayload)
        .eq('official_member_id', currentUser.id);

      if (rosterErr) {
        throw new Error(`Failed to update master_roster table: ${rosterErr.message}`);
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
          family: formCmoFamily
        } : m
      );

      // setMembers updates AppContext state and triggers asynchronous sync for other profile metadata fields
      await setMembers(updatedMembers);

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
        family: formCmoFamily
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
  const profileNeedsUpdate = !currentUser.phone || !currentUser.homeTownAddress || !currentUser.residentialAddress || !currentUser.weddingStatus || (currentUser.weddingStatus === 'Wedded' && !currentUser.maritalStatus);

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

        {/* Profile Picture Uploader */}
        <ProfilePictureUploader
          currentImage={currentUser.profilePic}
          onSave={handleProfilePictureSave}
          memberName={currentUser.name}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {(['Wisdom', 'Honour', 'Integrity', 'Talent'] as const).map((family) => {
            const familyMembers = members.filter(m => m.family === family);
            return (
              <button
                key={family}
                type="button"
                onClick={() => setCurrentPage('familyHub')}
                className="bg-[#001a16] border border-[#ffd700] rounded p-4 text-left hover:bg-[#002520] transition-all"
              >
                <p className="text-gray-400 text-sm">{family} Family</p>
                <p className="text-white text-xl font-semibold">{familyMembers.length} members</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-[#001a16] border border-[#ffd700] p-4 md:p-6 rounded hover:scale-105 transition-all">
            <p className="text-gray-400 text-sm mb-1">Member ID</p>
            <p className="text-white font-semibold text-lg">{currentUser.id}</p>
          </div>
          <div className="bg-[#001a16] border border-[#ffd700] p-4 md:p-6 rounded hover:scale-105 transition-all">
            <p className="text-gray-400 text-sm mb-1">Current Balance</p>
            <p className="text-[#ffd700] font-bold text-2xl">{formatCurrency(currentUser.balance)}</p>
          </div>
          <div className="bg-[#001a16] border border-[#ffd700] p-4 md:p-6 rounded hover:scale-105 transition-all">
            <p className="text-gray-400 text-sm mb-1">Status</p>
            <p className="text-green-500 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {currentUser.status}
            </p>
          </div>
          <div className="bg-[#001a16] border border-[#ffd700] p-4 md:p-6 rounded hover:scale-105 transition-all">
            <p className="text-gray-400 text-sm mb-1">Phone</p>
            <p className="text-white">{currentUser.phone || 'Not provided'}</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl text-[#ffd700] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Your Transaction History
          </h3>
          <div className="bg-[#001a16] border border-[#ffd700] rounded p-4">
            {userTransactions.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {userTransactions.slice().reverse().map((txn, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-[#ffd700]/30">
                    <div>
                      <p className="text-white font-semibold">{txn.purpose}</p>
                      <p className="text-gray-400 text-xs">{formatDateTime(txn.timestamp)}</p>
                    </div>
                    <p className="text-green-500 font-semibold">{formatCurrency(txn.amount)}</p>
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

                <div className="mt-4">
                  <label htmlFor="edit-family" className="text-gray-300 text-sm block mb-2">
                    CMO Family Division *
                  </label>
                  <select
                    id="edit-family"
                    title="Select Family"
                    value={formCmoFamily}
                    onChange={(e) => setFormCmoFamily(e.target.value as Family)}
                    className="w-full bg-[#001a16] border border-[#ffd700] text-white p-2 rounded"
                    disabled={settingsLoading}
                  >
                    <option value="Wisdom">Wisdom Family</option>
                    <option value="Honour">Honour Family</option>
                    <option value="Integrity">Integrity Family</option>
                    <option value="Talent">Talent Family</option>
                  </select>
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