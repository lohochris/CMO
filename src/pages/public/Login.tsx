import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { LogIn, UserCheck, ShieldCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { Member } from '../../types';

export const Login = () => {
  const [loginType, setLoginType] = useState<'member' | 'executive'>('member');
  const [loginId, setLoginId] = useState('');
  const [loading, setLoading] = useState(false);
  const { members, setMembers, setCurrentUser, setCurrentPage, setError, setSuccess, selectedFamily, setSelectedFamily } = useApp();

  const handleLogin = async () => {
    setError('');
    setSuccess('');

    const inputMemberId = loginId.toUpperCase().trim();
    if (!inputMemberId) {
      setError(loginType === 'executive' ? 'Please enter an Executive / Official ID' : 'Please enter a Member ID');
      return;
    }

    setLoading(true);
    try {
      let member: Member | null = null;

      if (loginType === 'executive') {
        // ── EXECUTIVE AUTHENTICATION PIPELINE ──────────────────────────────────────────
        // Direct route to public.cmo_executives filtering exclusively on text-based executive_id
        const EXEC_ALIAS_MAP: Record<string, string> = {
          'FIN-SEC-2026':   'FIN-SEC-2026',
          'WEL-OFF-2026':   'WELFARE-2026',
          'WELFORCE-2026':  'WELFARE-2026',
          'TREAS-2026':     'TREASURER-2026',
          'SECRETARY-2026': 'SECRETARY-2026',
          'PRO-2026':       'PRO-2026',
          'PROVOST-2026':   'PROVOST-2026',
          'LITURGIST-2026': 'LITURGIST-2026',
        };
        const resolvedId = EXEC_ALIAS_MAP[inputMemberId] ?? inputMemberId;

        const ADMIN_REGISTRY: Record<string, Member> = {
          'CMO-CHAIRMAN-2026': { id: 'CMO-CHAIRMAN-2026', name: 'STANLEY UKAH', full_name: 'STANLEY UKAH', official_member_id: 'CMO-CHAIRMAN-2026', status: 'Active (Cleared)', balance: 0, role: 'cmo_chairman', profilePic: null },
          'FIN-SEC-2026':      { id: 'FIN-SEC-2026', name: 'LOHO DONDO, CHRISTOPHER', full_name: 'LOHO DONDO, CHRISTOPHER', official_member_id: 'FIN-SEC-2026', status: 'Active (Cleared)', balance: 0, role: 'fin_sec', profilePic: null },
          'WELFARE-2026':      { id: 'WELFARE-2026', name: 'SAMSON, BALOGUN', full_name: 'SAMSON, BALOGUN', official_member_id: 'WELFARE-2026', status: 'Active (Cleared)', balance: 0, role: 'welfare', profilePic: null },
          'TREASURER-2026':    { id: 'TREASURER-2026', name: 'FRANCIS IDIKU', full_name: 'FRANCIS IDIKU', official_member_id: 'TREASURER-2026', status: 'Active (Cleared)', balance: 0, role: 'treasurer', profilePic: null },
          'SECRETARY-2026':    { id: 'SECRETARY-2026', name: 'PETER ALLEH', full_name: 'PETER ALLEH', official_member_id: 'SECRETARY-2026', status: 'Active (Cleared)', balance: 0, role: 'gen_sec', profilePic: null },
          'PRO-2026':          { id: 'PRO-2026', name: 'RAPHAEL, GODWIN', full_name: 'RAPHAEL, GODWIN', official_member_id: 'PRO-2026', status: 'Active (Cleared)', balance: 0, role: 'pro', profilePic: null },
          'PROVOST-2026':      { id: 'PROVOST-2026', name: 'PROVOST OFFICERS', full_name: 'PROVOST OFFICERS', official_member_id: 'PROVOST-2026', status: 'Active (Cleared)', balance: 0, role: 'provost', profilePic: null },
          'LITURGIST-2026':    { id: 'LITURGIST-2026', name: 'LITURGICAL TEAM', full_name: 'LITURGICAL TEAM', official_member_id: 'LITURGIST-2026', status: 'Active (Cleared)', balance: 0, role: 'liturgist', profilePic: null },
        };

        // Query cmo_executives using executive_id exclusively (bypassing UUID checks)
        const { data: execData, error: execErr } = await supabase
          .from('cmo_executives')
          .select('*')
          .eq('executive_id', resolvedId);

        const execRecord = execData && execData.length > 0 ? execData[0] : null;

        if (!execErr && execRecord) {
          const execId = execRecord.executive_id || execRecord.id;
          const roleKey = (execRecord.role_key || execRecord.role || '').toLowerCase();
          member = {
            id: execId,
            official_member_id: execId,
            name: execRecord.full_name || execRecord.name || execId,
            full_name: execRecord.full_name || execRecord.name || execId,
            phone_number: execRecord.phone_number || execRecord.phone || undefined,
            status: (execRecord.status || 'Active') as any,
            balance: Number(execRecord.balance || 0),
            role: roleKey as any,
            family: execRecord.cmo_family || execRecord.family as any || undefined,
            cmo_family: execRecord.cmo_family || execRecord.family || undefined,
            phone: execRecord.phone_number || execRecord.phone || undefined,
            email: execRecord.email || undefined,
            profilePic: execRecord.avatar_url || execRecord.profile_picture_url || null
          };
        }

        // Fallback for administrative registry whitelist
        if (!member && resolvedId in ADMIN_REGISTRY) {
          member = ADMIN_REGISTRY[resolvedId];
        }
        if (!member && inputMemberId in ADMIN_REGISTRY) {
          member = ADMIN_REGISTRY[inputMemberId];
        }

        if (!member) {
          setError('Invalid Executive / Official ID. Please check your credentials or contact system administrator.');
          setLoading(false);
          return;
        }
      } else {
        // ── MEMBER AUTHENTICATION PIPELINE ──────────────────────────────────────────────
        // Direct validation against public.members matching official_member_id
        const MEMBER_FALLBACKS: Record<string, { name: string; id: string }> = {
          'HCC-CMO-26-001': { name: 'STANLEY UKAH', id: 'HCC-CMO-26-0001' },
          'HCC-CMO-26-004': { name: 'LOHO DONDO, CHRISTOPHER', id: 'HCC-CMO-26-0004' },
          'HCC-CMO-26-140': { name: 'SAMSON BALOGUN', id: 'HCC-CMO-26-0140' },
          'HCC-CMO-26-129': { name: 'FRANCIS IDIKU', id: 'HCC-CMO-26-0129' },
          'HCC-CMO-26-067': { name: 'PETER ALLEH', id: 'HCC-CMO-26-0067' },
          'HCC-CMO-26-010': { name: 'RAPHAEL GODWIN', id: 'HCC-CMO-26-0010' },
          'HCC-CMO-26-0001': { name: 'STANLEY UKAH', id: 'HCC-CMO-26-0001' },
          'HCC-CMO-26-0004': { name: 'LOHO DONDO, CHRISTOPHER', id: 'HCC-CMO-26-0004' },
          'HCC-CMO-26-0140': { name: 'SAMSON BALOGUN', id: 'HCC-CMO-26-0140' },
          'HCC-CMO-26-0129': { name: 'FRANCIS IDIKU', id: 'HCC-CMO-26-0129' },
          'HCC-CMO-26-0067': { name: 'PETER ALLEH', id: 'HCC-CMO-26-0067' },
          'HCC-CMO-26-0010': { name: 'RAPHAEL GODWIN', id: 'HCC-CMO-26-0010' }
        };

        // 1. Check in active context members array
        member = members.find(m => m.id === inputMemberId || m.official_member_id === inputMemberId) || null;

        // 2. Check public.members matching official_member_id
        if (!member) {
          const { data: dbMembersData, error: dbErr } = await supabase
            .from('members')
            .select('*')
            .eq('official_member_id', inputMemberId);

          const dbMember = dbMembersData && dbMembersData.length > 0 ? dbMembersData[0] : null;

          if (!dbErr && dbMember) {
            member = {
              id: dbMember.official_member_id || dbMember.id,
              name: dbMember.full_name || dbMember.name,
              full_name: dbMember.full_name || dbMember.name,
              official_member_id: dbMember.official_member_id,
              status: dbMember.status as any,
              balance: Number(dbMember.balance) || 0,
              role: dbMember.role as any,
              family: dbMember.cmo_family || dbMember.family as any || undefined,
              phone: dbMember.phone_number || undefined,
              phone_number: dbMember.phone_number || undefined,
              email: dbMember.email || undefined,
              profilePic: dbMember.avatar_url || dbMember.profile_picture_url || null
            };
          }
        }

        // 3. Check master_roster in Supabase
        if (!member) {
          const { data: rosterData, error: rosterErr } = await supabase
            .from('master_roster')
            .select('*')
            .eq('official_member_id', inputMemberId);

          const rosterUser = rosterData && rosterData.length > 0 ? rosterData[0] : null;

          if (!rosterErr && rosterUser) {
            const newMember: Member = {
              id: rosterUser.official_member_id,
              name: rosterUser.full_name,
              full_name: rosterUser.full_name,
              official_member_id: rosterUser.official_member_id,
              status: 'Active (Cleared)',
              balance: 0,
              role: rosterUser.role || 'member',
              family: rosterUser.cmo_family || rosterUser.family || undefined,
              phone: rosterUser.phone_number,
              phone_number: rosterUser.phone_number,
              email: rosterUser.email,
              profilePic: rosterUser.avatar_url || rosterUser.profile_picture_url || null
            };
            await setMembers([...members, newMember]);
            member = newMember;
          }
        }

        // 4. Fallback for whitelisted standard member profiles
        if (!member && inputMemberId in MEMBER_FALLBACKS) {
          const fallbackInfo = MEMBER_FALLBACKS[inputMemberId];
          const memberName = fallbackInfo?.name ?? 'CMO Member';
          const canonicalId = fallbackInfo?.id ?? inputMemberId;
          member = {
            id: canonicalId,
            name: memberName,
            full_name: memberName,
            official_member_id: canonicalId,
            status: 'Active (Cleared)',
            balance: 0,
            role: 'member',
            profilePic: null
          };
        }

        if (!member) {
          setError('Invalid Member ID. Please check your credentials or contact the Financial Secretary.');
          setLoading(false);
          return;
        }
      }

      // ── STATUS VALIDATION ───────────────────────────────────────────
      if (member.status === 'Deceased') {
        setError('This account is locked.');
        setLoading(false);
        return;
      }

      if (member.status === 'Pending Validation' || (member.status === 'Inactive' && (member.official_member_id || member.id || '').startsWith('HCC-CMO-26-'))) {
        setError('Your account is pending validation. Please contact the Financial Secretary.');
        setLoading(false);
        return;
      }

      // ── ACTIVE USER SESSION & DASHBOARD FORWARDING ──────────────────
      setCurrentUser(member);

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
        setSelectedFamily && setSelectedFamily(null);
        setCurrentPage('dashboard');
        setSuccess(`Welcome, ${member.name}!`);
        setLoginId('');
        setTimeout(() => setSuccess(''), 3000);
        setLoading(false);
        return;
      }

      // Secure Gateway Forwarding: map role directly to administrative page
      const roleLower = (member.role || '').toLowerCase();
      if (roleLower === 'fin_sec' || roleLower === 'financial_secretary') setCurrentPage('fin_sec');
      else if (roleLower === 'welfare') setCurrentPage('welfare');
      else if (roleLower === 'treasurer' && member.official_member_id === 'HCC-CMO-SPRT-TR') setCurrentPage('sports_finance');
      else if (roleLower === 'treasurer') setCurrentPage('treasurer');
      else if (roleLower === 'sports_director') setCurrentPage('sports_admin');
      else if (roleLower === 'medical_officer') setCurrentPage('medical_portal');
      else if (roleLower === 'coach') setCurrentPage('coach_workspace');
      else if (roleLower === 'referee') setCurrentPage('referee_center');
      else if (roleLower === 'athlete') setCurrentPage('athlete_hub');
      else if (roleLower === 'gen_sec' || roleLower === 'secretary') setCurrentPage('secretary');
      else if (roleLower === 'pro') setCurrentPage('pro');
      else if (roleLower === 'provost') setCurrentPage('provost');
      else if (roleLower === 'liturgist') setCurrentPage('liturgist');
      else if (roleLower === 'cmo_chairman' || roleLower === 'chairman') setCurrentPage('chairman');
      else {
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
      <Card className="bg-[#002520] border-2 border-[#ffd700] p-6 md:p-8 shadow-2xl">
        <h2 className="text-xl md:text-2xl font-bold text-[#ffd700] mb-5 flex items-center gap-2">
          <LogIn className="w-6 h-6" />
          {loginType === 'executive' ? 'Executive Login' : 'Member Login'}
        </h2>

        {/* Sleek Tab Selector / Toggle Switch */}
        <div className="flex rounded-lg bg-[#001a16] p-1 border border-[#ffd700]/30 mb-6">
          <button
            type="button"
            onClick={() => { setLoginType('member'); setError(''); }}
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
            onClick={() => { setLoginType('executive'); setError(''); }}
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

        <div className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm block mb-2 font-medium">
              {loginType === 'executive' ? 'Executive / Official ID' : 'CMO Member ID'}
            </label>
            <Input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value.toUpperCase())}
              placeholder="Enter your ID"
              className="bg-[#001a16] border-[#ffd700] text-white focus:ring-2 focus:ring-[#ffd700]"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              {loginType === 'executive'
                ? 'For operational office accounts and executive dashboards'
                : 'For general CMO membership tracking profiles'}
            </p>
          </div>
          <Button
            onClick={handleLogin}
            className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold py-2.5 shadow-lg"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : loginType === 'executive' ? 'Login to Executive Portal' : 'Login to Member Portal'}
          </Button>
          <p className="text-sm text-gray-400 text-center pt-2">
            Don't have an ID?{' '}
            <button onClick={() => setCurrentPage('register')} className="text-[#ffd700] hover:underline font-semibold" disabled={loading}>
              Register here
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};