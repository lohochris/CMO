import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { LogIn } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export const Login = () => {
  const [loginId, setLoginId] = useState('');
  const { members, setCurrentUser, setCurrentPage, setError, setSuccess, selectedFamily, setSelectedFamily } = useApp();

  const handleLogin = () => {
    setError('');
    const member = members.find(m => m.id === loginId.toUpperCase());

    if (!member) {
      setError('Invalid Member ID');
      return;
    }

    if (member.status === 'Pending Validation') {
      setError('Your account is pending validation. Please contact the Financial Secretary.');
      return;
    }

    setCurrentUser(member);

    // If user came via family selection, ensure they belong to that family
    if (selectedFamily) {
      if (member.family !== selectedFamily) {
        setError('You do not belong to the selected family. Please contact the admin for assistance.');
        setSelectedFamily && setSelectedFamily(null);
        setCurrentPage('dashboard');
        setLoginId('');
        setTimeout(() => setError(''), 6000);
        return;
      }
      // member belongs to selected family — route appropriately
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
      return;
    }

    // No family pre-selection — default routing
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
            />
          </div>
          <Button
            onClick={handleLogin}
            className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
          >
            Login
          </Button>
          <p className="text-sm text-gray-400 text-center">
            Don't have an ID?{' '}
            <button onClick={() => setCurrentPage('register')} className="text-[#ffd700] hover:underline">
              Register here
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};