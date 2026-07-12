import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { UserPlus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Member, Family } from '../../types';
import { supabase } from '../../utils/supabaseClient';

const familyOptions: Family[] = ['Wisdom', 'Honour', 'Integrity', 'Talent'];

export const Register = () => {
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerFamily, setRegisterFamily] = useState<Family>('Wisdom');
  const [loading, setLoading] = useState(false);
  const { members, setMembers, setCurrentPage, setError, setSuccess } = useApp();

  const handleRegister = async () => {
    setError('');
    setSuccess('');
    
    if (!registerName.trim() || !registerPhone.trim() || !registerEmail.trim()) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Query the master roster table for phone number or email matches
      const { data: rosterMatch, error: rosterError } = await supabase
        .from('master_roster')
        .select('*')
        .or(`phone_number.eq.${registerPhone},email.eq.${registerEmail}`)
        .maybeSingle();

      if (rosterError || !rosterMatch) {
        setError('Verification failed: Your phone number or email is not listed on the official Holy Cross CMO Master Roster. Please contact the Financial Secretary.');
        setLoading(false);
        return;
      }

      // Check if this member has already registered in the system members table
      const alreadyRegistered = members.some(m => m.id === rosterMatch.official_member_id);
      if (alreadyRegistered) {
        setError('This member has already been registered in the system.');
        setLoading(false);
        return;
      }

      const newMember: Member = {
        id: rosterMatch.official_member_id,
        name: rosterMatch.full_name,
        status: 'Pending Validation',
        balance: 0,
        role: 'member',
        family: registerFamily,
        phone: rosterMatch.phone_number,
        email: rosterMatch.email,
        profilePic: null
      };

      await setMembers([...members, newMember]);
      setSuccess(`Registration submitted! Welcoming you as ${rosterMatch.full_name}. Awaiting validation from Financial Secretary.`);
      
      setRegisterName('');
      setRegisterPhone('');
      setRegisterEmail('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('Registration validation check failed:', err);
      setError('An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-md mx-auto">
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-[#ffd700] mb-6 flex items-center gap-2">
          <UserPlus className="w-6 h-6" />
          New Member Registration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm block mb-2">Full Name</label>
            <Input
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              placeholder="Enter full name"
              className="bg-[#001a16] border-[#ffd700] text-white"
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm block mb-2">Phone Number</label>
            <Input
              value={registerPhone}
              onChange={(e) => setRegisterPhone(e.target.value)}
              placeholder="08012345678"
              className="bg-[#001a16] border-[#ffd700] text-white"
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm block mb-2">Email Address</label>
            <Input
              type="email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              placeholder="member@hcc-cmo.org"
              className="bg-[#001a16] border-[#ffd700] text-white"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="register-family" className="text-gray-300 text-sm block mb-2">Family</label>
            <select
              id="register-family"
              title="Select family"
              aria-label="Family"
              value={registerFamily}
              onChange={(e) => setRegisterFamily(e.target.value as Family)}
              className="w-full bg-[#001a16] border border-[#ffd700] text-white p-2 rounded"
              disabled={loading}
            >
              {familyOptions.map((family) => (
                <option key={family} value={family}>{family}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleRegister}
            className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Submit Registration'}
          </Button>
          <p className="text-sm text-gray-400 text-center">
            Already registered?{' '}
            <button onClick={() => setCurrentPage('login')} className="text-[#ffd700] hover:underline" disabled={loading}>
              Login here
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};