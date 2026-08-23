import React, { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { LogIn, UserCheck, ShieldCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { Heading } from '../../app/components/common/Heading';

// Canonical Institutional Executive Key Registry (Permanent Offices)
const INSTITUTIONAL_OFFICE_REGISTRY: Record<string, { role: string; name: string; route: string; family?: string }> = {
  'HCC-CMO-EXEC-CH':  { role: 'chairman', name: 'Office of the Executive Chairman', route: '/executive/chairman' },
  'HCC-CMO-EXEC-FS':  { role: 'fin_sec', name: 'Office of the Financial Secretary', route: '/executive/fin-sec' },
  'HCC-CMO-EXEC-TR':  { role: 'treasurer', name: 'Office of the Treasurer', route: '/executive/treasury' },
  'HCC-CMO-EXEC-WE':  { role: 'welfare', name: 'Office of the Welfare Directorate', route: '/executive/welfare' },
  'HCC-CMO-EXEC-PR':  { role: 'pro', name: 'Office of Public Relations', route: '/executive/pro' },
  'HCC-CMO-EXEC-PV':  { role: 'provost', name: 'Office of the Provost Marshall', route: '/executive/provost' },
  'HCC-CMO-EXEC-SE':  { role: 'secretary', name: 'Office of the General Secretariat', route: '/executive/secretary' },
  'HCC-CMO-EXEC-SEC': { role: 'secretary', name: 'Office of the General Secretariat', route: '/executive/secretary' },
  'HCC-CMO-EXEC-LT':  { role: 'liturgist', name: 'Liturgical Team Directorate', route: '/executive/liturgist' },
  
  // Family Administrative Heads
  'HCC-CMO-WIS-FH':   { role: 'family_head', name: 'Wisdom Family Secretariat', route: '/family/wisdom', family: 'Wisdom' },
  'HCC-CMO-WIS-FS':   { role: 'family_secretary', name: 'Wisdom Family Secretariat', route: '/family/wisdom', family: 'Wisdom' },
  'HCC-CMO-TAL-FH':   { role: 'family_head', name: 'Talent Family Secretariat', route: '/family/talent', family: 'Talent' },
  'HCC-CMO-TAL-FS':   { role: 'family_secretary', name: 'Talent Family Secretariat', route: '/family/talent', family: 'Talent' },
  'HCC-CMO-HON-FH':   { role: 'family_head', name: 'Honour Family Secretariat', route: '/family/honour', family: 'Honour' },
  'HCC-CMO-HON-FS':   { role: 'family_secretary', name: 'Honour Family Secretariat', route: '/family/honour', family: 'Honour' },
  'HCC-CMO-INT-FH':   { role: 'family_head', name: 'Integrity Family Secretariat', route: '/family/integrity', family: 'Integrity' },
  'HCC-CMO-INT-FS':   { role: 'family_secretary', name: 'Integrity Family Secretariat', route: '/family/integrity', family: 'Integrity' },
  
  // Sports Directorate
  'HCC-CMO-SPRT-DIR': { role: 'sports_director', name: 'Sports Directorate', route: '/sports/admin' },
  'HCC-CMO-SPRT-TR':  { role: 'sports_treasurer', name: 'Sports Treasury', route: '/sports/admin' },
  'HCC-CMO-SPRT-MED': { role: 'medical_officer', name: 'Sports Medical Unit', route: '/sports/admin' },
};

export const Login: React.FC = () => {
  const { setCurrentUser, setCurrentPage, setError, setSuccess, selectedFamily, setSelectedFamily } = useApp();
  
  const [loginType, setLoginType] = useState<'member' | 'executive'>('member');
  const [loginId, setLoginId] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = (path: string) => {
    let cleanPath = path.startsWith('/') ? path.substring(1) : path;
    if (cleanPath === 'executive/treasury' || cleanPath === 'executive/treasurer') cleanPath = 'treasurer';
    else if (cleanPath === 'executive/chairman') cleanPath = 'chairman';
    else if (cleanPath === 'executive/fin-sec' || cleanPath === 'executive/financial-secretary') cleanPath = 'fin_sec';
    else if (cleanPath === 'executive/secretary' || cleanPath === 'executive/general-secretary') cleanPath = 'secretary';
    else if (cleanPath === 'executive/welfare') cleanPath = 'welfare';
    else if (cleanPath === 'executive/pro') cleanPath = 'pro';
    else if (cleanPath === 'executive/provost') cleanPath = 'provost';
    else if (cleanPath === 'executive/liturgist' || cleanPath === 'executive/liturgy') cleanPath = 'liturgist';
    else if (cleanPath === 'sports/admin') cleanPath = 'sports-admin';
    
    setCurrentPage(cleanPath as any);
  };

  // 1. EXECUTIVE AUTHENTICATION HANDLER
  const handleExecutiveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setError('');
    const cleanId = loginId.trim().toUpperCase();

    if (!cleanId) {
      setLocalError('Please enter an Executive / Office ID');
      return;
    }

    setLoading(true);
    try {
      // Match against purely institutional office key
      const office = INSTITUTIONAL_OFFICE_REGISTRY[cleanId];

      if (!office) {
        setLocalError(`Invalid Executive Key: "${cleanId}". Only designated Office IDs are permitted access.`);
        setLoading(false);
        return;
      }

      const execSession = {
        id: cleanId,
        official_member_id: cleanId,
        full_name: office.name,
        role: office.role,
        family: office.family || 'Central Executive',
        cmo_family: office.family || 'Central Executive',
        is_executive: true,
        is_executive_office: true,
      };

      // Persist clean session
      sessionStorage.setItem('cmo_auth_member_id', cleanId);
      sessionStorage.setItem('cmo_auth_role', office.role);
      sessionStorage.setItem('cmo_auth_name', office.name);
      localStorage.setItem('cmo_current_member', JSON.stringify(execSession));
      localStorage.setItem('cmo_current_user', JSON.stringify(execSession));

      setCurrentUser?.(execSession as any);
      setSuccess(`Authenticated as ${office.name}`);
      navigate(office.route);
    } catch (err) {
      console.error('Executive Login Error:', err);
      setLocalError('An unexpected error occurred during executive authorization.');
    } finally {
      setLoading(false);
    }
  };

  // 2. REGULAR MEMBER AUTHENTICATION HANDLER
  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setError('');
    const cleanId = loginId.trim().toUpperCase();

    if (!cleanId) {
      setLocalError('Please enter your Official Member ID');
      return;
    }

    setLoading(true);
    try {
      // Query live member record from Supabase
      const { data: member, error: dbError } = await supabase
        .from('members')
        .select('*')
        .eq('official_member_id', cleanId)
        .maybeSingle();

      if (dbError) {
        console.error('Database query error:', dbError);
        setLocalError('Network error checking member records.');
        setLoading(false);
        return;
      }

      if (!member) {
        setLocalError(`No active member registered with ID: "${cleanId}".`);
        setLoading(false);
        return;
      }

      // Check status constraints
      if (member.status === 'Deceased') {
        setLocalError('This account is locked.');
        setLoading(false);
        return;
      }

      if (member.status === 'Pending Validation' || member.status === 'Inactive') {
        setLocalError('Your account is pending validation. Please contact the Financial Secretary.');
        setLoading(false);
        return;
      }

      const memberSession = {
        id: member.id,
        official_member_id: member.official_member_id || cleanId,
        full_name: member.full_name || 'CMO Member',
        role: member.role || 'member',
        cmo_family: member.cmo_family || member.family,
        family: member.cmo_family || member.family,
        avatar_url: member.avatar_url || member.profile_picture_url,
        phone_number: member.phone_number || member.phone,
      };

      // Store session
      sessionStorage.setItem('cmo_auth_member_id', member.official_member_id || cleanId);
      sessionStorage.setItem('cmo_auth_role', member.role || 'member');
      sessionStorage.setItem('cmo_auth_name', member.full_name || 'CMO Member');
      localStorage.setItem('cmo_current_member', JSON.stringify(memberSession));
      localStorage.setItem('cmo_current_user', JSON.stringify(memberSession));

      setCurrentUser?.(memberSession as any);

      if (selectedFamily) {
        setSelectedFamily?.(null);
      }
      setSuccess(`Welcome, ${member.full_name}!`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Member Login Error:', err);
      setLocalError('Unable to authenticate member at this time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-md mx-auto">
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 shadow-2xl">
        <Heading level={1} className="flex items-center gap-2 mb-5">
          <LogIn className="w-6 h-6 text-[#ffd700]" />
          {loginType === 'executive' ? 'Executive Login' : 'Member Login'}
        </Heading>

        {/* Sleek Tab Selector / Toggle Switch */}
        <div className="flex rounded-lg bg-[#001a16] p-1 border border-[#ffd700]/30 mb-6">
          <button
            type="button"
            onClick={() => { setLoginType('member'); setLocalError(''); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs md:text-sm font-semibold rounded-md transition-all duration-200 ${
              loginType === 'member'
                ? 'bg-[#ffd700] text-[#001a16] shadow-md font-bold'
                : 'text-gray-300 hover:text-[#ffd700]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Member ID
          </button>
          <button
            type="button"
            onClick={() => { setLoginType('executive'); setLocalError(''); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs md:text-sm font-semibold rounded-md transition-all duration-200 ${
              loginType === 'executive'
                ? 'bg-[#ffd700] text-[#001a16] shadow-md font-bold'
                : 'text-gray-300 hover:text-[#ffd700]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Executive / Official ID
          </button>
        </div>

        {selectedFamily && (
          <div className="mb-4 p-3 rounded bg-[#001a16] border border-[#ffd700] text-gray-200 text-sm">
            You selected <strong className="text-white">{selectedFamily} Family</strong>. Please login to access your family dashboard.
          </div>
        )}

        {localError && (
          <div className="mb-4 p-3 rounded bg-red-900/40 border border-red-500/50 text-red-200 text-xs font-semibold">
            {localError}
          </div>
        )}

        <form onSubmit={loginType === 'executive' ? handleExecutiveLogin : handleMemberLogin} className="space-y-4">
          {loginType === 'member' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Membership ID
                </label>
                <Input
                  type="text"
                  required
                  autoComplete="off"
                  value={loginId}
                  onChange={(e) => {
                    setLoginId(e.target.value.toUpperCase());
                    setLocalError('');
                  }}
                  placeholder="Enter your ID"
                  className="w-full bg-[#001a16] border border-[#ffd700]/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] font-mono tracking-wide transition-all"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full py-3 px-4 bg-[#ffd700] hover:bg-[#ffc700] text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg active:scale-[0.99]"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Login to Member Portal'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#ffd700] uppercase tracking-wider mb-2">
                  Official ID / Key
                </label>
                <Input
                  type="text"
                  required
                  autoComplete="off"
                  value={loginId}
                  onChange={(e) => {
                    setLoginId(e.target.value.toUpperCase());
                    setLocalError('');
                  }}
                  placeholder="Enter your ID"
                  className="w-full bg-[#001a16] border border-[#ffd700]/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] font-mono tracking-wide transition-all"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full py-3 px-4 bg-[#ffd700] hover:bg-[#ffc700] text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg active:scale-[0.99]"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Authenticate Office Key'}
              </Button>
            </div>
          )}
          <p className="text-sm text-gray-400 text-center pt-2">
            Don't have an ID?{' '}
            <button type="button" onClick={() => setCurrentPage('register')} className="text-[#ffd700] hover:underline font-semibold" disabled={loading}>
              Register here
            </button>
          </p>
        </form>
      </Card>
    </div>
  );
};