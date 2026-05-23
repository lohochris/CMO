import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { UserPlus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Member, Family } from '../../types';

const familyOptions: Family[] = ['Wisdom', 'Honour', 'Integrity', 'Talent'];

export const Register = () => {
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerFamily, setRegisterFamily] = useState<Family>('Wisdom');
  const { members, setMembers, setCurrentPage, setError, setSuccess } = useApp();

  const handleRegister = () => {
    setError('');
    if (!registerName.trim() || !registerPhone.trim()) {
      setError('Please fill all fields');
      return;
    }

    const newMember: Member = {
      id: '',
      name: registerName,
      status: 'Pending Validation',
      balance: 0,
      role: 'member',
      family: registerFamily,
      phone: registerPhone,
      profilePic: null
    };

    setMembers([...members, newMember]);
    setSuccess('Registration submitted! Awaiting validation from Financial Secretary.');
    setRegisterName('');
    setRegisterPhone('');
    setTimeout(() => setSuccess(''), 5000);
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
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm block mb-2">Phone Number</label>
            <Input
              value={registerPhone}
              onChange={(e) => setRegisterPhone(e.target.value)}
              placeholder="08012345678"
              className="bg-[#001a16] border-[#ffd700] text-white"
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
            >
              {familyOptions.map((family) => (
                <option key={family} value={family}>{family}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleRegister}
            className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
          >
            Submit Registration
          </Button>
          <p className="text-sm text-gray-400 text-center">
            Already registered?{' '}
            <button onClick={() => setCurrentPage('login')} className="text-[#ffd700] hover:underline">
              Login here
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};