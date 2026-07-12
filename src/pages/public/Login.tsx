import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { LogIn } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../utils/supabaseClient';
import { Member } from '../../types';

export const Login = () => {
  const [loginId, setLoginId] = useState('');
  const [loading, setLoading] = useState(false);
  const { members, setMembers, setCurrentUser, setCurrentPage, setError, setSuccess, selectedFamily, setSelectedFamily } = useApp();

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    
    const inputMemberId = loginId.toUpperCase().trim();
    if (!inputMemberId) {
      setError('Please enter a Member ID');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if the Member ID exists in the active members list
      let member = members.find(m => m.id === inputMemberId);

      // 2. If not found in members state, check master_roster in Supabase
      if (!member) {
        const { data: rosterUser, error: rosterErr } = await supabase
          .from('master_roster')
          .select('*')
          .eq('official_member_id', inputMemberId)
          .single();

        if (rosterErr || !rosterUser) {
          setError('Invalid Member ID');
          setLoading(false);
          return;
        }

        // Dynamically pre-load and register the master roster member into the members database
        const newMember: Member = {
          id: rosterUser.official_member_id,
          name: rosterUser.full_name,
          status: 'Active (Cleared)', // Pre-loaded master roster members are approved and active by default
          balance: 0,
          role: 'member',
          family: 'Wisdom', // Default family assignment
          phone: rosterUser.phone_number,
          email: rosterUser.email,
          profilePic: null
        };

        // Sync registration to Supabase members table
        await setMembers([...members, newMember]);
        member = newMember;
      }

      // 3. Validate status
      if (member.status === 'Pending Validation') {
        setError('Your account is pending validation. Please contact the Financial Secretary.');
        setLoading(false);
        return;
      }

      // 4. Set active user session
      setCurrentUser(member);

      // 5. Family selected check
      if (selectedFamily) {
        if (member.family !== selectedFamily) {
          setError('You do not belong to the selected family. Please contact the admin for assistance.');
          setSelectedFamily && setSelectedFamily(null);
          setCurrentPage('dashboard');
          setLoginId('');
          setLoading(false);
          setTimeout(() => setError(''), 6000);
          return;
        }

        if (member.role === 'family_chairman') {
          const page = `family${member.family}Chairman` as const;
          setCurrentPage(page);
        } else if (member.role === 'family_secretary') {
          const page = `family${member.family}Secretary` as const;
          setCurrentPage(page);
        } else {
          setCurrentPage('dashboard');
        }
        setSelectedFamily && setSelectedFamily(null);
        setSuccess(`Welcome, ${member.name}!`);
        setLoginId('');
        setTimeout(() => setSuccess(''), 3000);
        setLoading(false);
        return;
      }

      // 6. Default page routing
      if (member.role === 'welfare') setCurrentPage('welfare');
      else if (member.role === 'treasurer') setCurrentPage('treasurer');
      else if (member.role === 'gen_sec') setCurrentPage('secretary');
      else if (member.role === 'pro') setCurrentPage('pro');
      else if (member.role === 'family_chairman' && member.family) {
        const page = `family${member.family}Chairman` as const;
        setCurrentPage(page);
      } else if (member.role === 'family_secretary' && member.family) {
        const page = `family${member.family}Secretary` as const;
        setCurrentPage(page);
      } else {
        setCurrentPage('dashboard');
      }

      setSuccess(`Welcome, ${member.name}!`);
      setLoginId('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Login authentication error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-md mx-auto">
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-[#ffd700] mb-6 flex items-center gap-2">
          <LogIn className="w-6 h-6" />
          Member Login
        </h2>
        {selectedFamily && (
          <div className="mb-4 p-3 rounded bg-[#001a16] border border-[#ffd700] text-gray-200">
            You selected <strong className="text-white">{selectedFamily} Family</strong>. Please login to access your family dashboard.
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm block mb-2">Member ID</label>
            <Input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value.toUpperCase())}
              placeholder="Enter your Member ID"
              className="bg-[#001a16] border-[#ffd700] text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleLogin}
            className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
          <p className="text-sm text-gray-400 text-center">
            Don't have an ID?{' '}
            <button onClick={() => setCurrentPage('register')} className="text-[#ffd700] hover:underline" disabled={loading}>
              Register here
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};