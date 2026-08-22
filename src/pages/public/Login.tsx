import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { LogIn, UserCheck, ShieldCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { isUuid } from '../../utils/supabaseHelpers';
import { Member } from '../../types';
import { Heading } from '../../app/components/common/Heading';

export const Login = () => {
  const [loginType, setLoginType] = useState<'member' | 'executive'>('member');
  const [loginId, setLoginId] = useState('');
  const [executiveId, setExecutiveId] = useState('');
  const [loading, setLoading] = useState(false);
  const { members, setMembers, setCurrentUser, setCurrentPage, setError, setSuccess, selectedFamily, setSelectedFamily } = useApp();

  const navigate = (path: string) => {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    setCurrentPage(cleanPath as any);
  };

  const resolveExecutiveRoute = (memberId: string, role: string, family?: string): string => {
    const id = memberId.toUpperCase().trim();
    const r = (role || '').toLowerCase().trim();
    const f = (family || '').toLowerCase().trim();

    // 1. Direct ID-Based Matching (Canonical)
    if (id === 'HCC-CMO-EXEC-CH') return '/executive/chairman';
    if (id === 'HCC-CMO-EXEC-SE') return '/executive/general-secretary';
    if (id === 'HCC-CMO-EXEC-FS') return '/executive/financial-secretary';
    if (id === 'HCC-CMO-EXEC-TR') return '/executive/treasury';
    if (id === 'HCC-CMO-EXEC-PR') return '/executive/pro';
    if (id === 'HCC-CMO-EXEC-PV') return '/executive/provost';
    if (id === 'HCC-CMO-EXEC-WE') return '/executive/welfare';
    if (id === 'HCC-CMO-EXEC-LT') return '/executive/liturgy';

    // 2. Sports Department
    if (id.startsWith('HCC-CMO-SPRT-') || r.includes('sports') || ['coach', 'referee', 'medical_officer'].includes(r)) {
      return '/sports/admin';
    }

    // 3. Family Leaders
    if (id.startsWith('HCC-CMO-WIS-') || (r.includes('family') && f === 'wisdom')) return '/family/wisdom';
    if (id.startsWith('HCC-CMO-TAL-') || (r.includes('family') && f === 'talent')) return '/family/talent';
    if (id.startsWith('HCC-CMO-HON-') || (r.includes('family') && f === 'honour')) return '/family/honour';
    if (id.startsWith('HCC-CMO-INT-') || (r.includes('family') && f === 'integrity')) return '/family/integrity';

    // 4. Fallback by Stored DB Role
    switch (r) {
      case 'chairman': return '/executive/chairman';
      case 'secretary':
      case 'general secretary': return '/executive/general-secretary';
      case 'fin_sec':
      case 'financial secretary': return '/executive/financial-secretary';
      case 'treasurer': return '/executive/treasury';
      case 'pro': return '/executive/pro';
      case 'provost': return '/executive/provost';
      case 'welfare': return '/executive/welfare';
      case 'liturgist': return '/executive/liturgy';
      default: return '/executive/directory';
    }
  };

  const handleExecutiveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = (executiveId || loginId).trim().toUpperCase();
    if (!cleanId) {
      setError('Please enter your Official Executive / Role ID.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let member: { id: string; official_member_id: string; full_name: string; role: string; cmo_family?: string } | null = null;

      const { data: dbMember, error: dbError } = await supabase
        .from('members')
        .select('id, official_member_id, full_name, role, cmo_family')
        .eq('official_member_id', cleanId)
        .maybeSingle();

      if (dbMember) {
        member = {
          id: dbMember.id,
          official_member_id: dbMember.official_member_id || cleanId,
          full_name: dbMember.full_name || cleanId,
          role: dbMember.role || 'member',
          cmo_family: dbMember.cmo_family || undefined
        };
      } else {
        // Fallback resolution for canonical executive IDs and administrative alias keys
        const CANONICAL_FALLBACK_MAP: Record<string, { role: string; name: string; family?: string }> = {
          'HCC-CMO-EXEC-CH': { role: 'chairman', name: 'EXECUTIVE CHAIRMAN' },
          'HCC-CMO-EXEC-FS': { role: 'fin_sec', name: 'FINANCIAL SECRETARY' },
          'HCC-CMO-EXEC-TR': { role: 'treasurer', name: 'TREASURER' },
          'HCC-CMO-EXEC-WE': { role: 'welfare', name: 'WELFARE OFFICER' },
          'HCC-CMO-EXEC-PR': { role: 'pro', name: 'PUBLIC RELATIONS OFFICER' },
          'HCC-CMO-EXEC-PV': { role: 'provost', name: 'PROVOST MARSHALL' },
          'HCC-CMO-EXEC-SE': { role: 'secretary', name: 'GENERAL SECRETARY' },
          'HCC-CMO-EXEC-LT': { role: 'liturgist', name: 'LITURGICAL COORDINATOR' },
          'HCC-CMO-WIS-FH':  { role: 'family_head', name: 'WISDOM FAMILY HEAD', family: 'Wisdom' },
          'HCC-CMO-WIS-FS':  { role: 'family_secretary', name: 'WISDOM FAMILY SECRETARY', family: 'Wisdom' },
          'HCC-CMO-TAL-FH':  { role: 'family_head', name: 'TALENT FAMILY HEAD', family: 'Talent' },
          'HCC-CMO-TAL-FS':  { role: 'family_secretary', name: 'TALENT FAMILY SECRETARY', family: 'Talent' },
          'HCC-CMO-HON-FH':  { role: 'family_head', name: 'HONOUR FAMILY HEAD', family: 'Honour' },
          'HCC-CMO-HON-FS':  { role: 'family_secretary', name: 'HONOUR FAMILY SECRETARY', family: 'Honour' },
          'HCC-CMO-INT-FH':  { role: 'family_head', name: 'INTEGRITY FAMILY HEAD', family: 'Integrity' },
          'HCC-CMO-INT-FS':  { role: 'family_secretary', name: 'INTEGRITY FAMILY SECRETARY', family: 'Integrity' },
          'HCC-CMO-SPRT-DIR':   { role: 'sports_director', name: 'SPORTS DIRECTOR' },
          'HCC-CMO-SPRT-TR':    { role: 'sports_treasurer', name: 'SPORTS TREASURER' },
          'HCC-CMO-SPRT-MED':   { role: 'medical_officer', name: 'SPORTS MEDICAL OFFICER' },
          'HCC-CMO-SPRT-COACH': { role: 'coach', name: 'SPORTS HEAD COACH' },
          'HCC-CMO-SPRT-REF':   { role: 'referee', name: 'SPORTS MATCH REFEREE' },
          'CMO-CHAIRMAN-2026': { role: 'cmo_chairman', name: 'STANLEY UKAH' },
          'CHAIRMAN':          { role: 'cmo_chairman', name: 'STANLEY UKAH' },
          'FIN-SEC-2026':      { role: 'fin_sec', name: 'LOHO DONDO, CHRISTOPHER' },
          'FIN-SEC':           { role: 'fin_sec', name: 'LOHO DONDO, CHRISTOPHER' },
          'FINSEC':            { role: 'fin_sec', name: 'LOHO DONDO, CHRISTOPHER' },
          'WELFARE-2026':      { role: 'welfare', name: 'SAMSON BALOGUN' },
          'WELFARE':           { role: 'welfare', name: 'SAMSON BALOGUN' },
          'TREASURER-2026':    { role: 'treasurer', name: 'FRANCIS IDIKU' },
          'TREASURER':         { role: 'treasurer', name: 'FRANCIS IDIKU' },
          'SECRETARY-2026':    { role: 'gen_sec', name: 'PETER ALLEH' },
          'SECRETARY':         { role: 'gen_sec', name: 'PETER ALLEH' },
          'PRO-2026':          { role: 'pro', name: 'RAPHAEL GODWIN' },
          'PRO':               { role: 'pro', name: 'RAPHAEL GODWIN' },
          'PROVOST-2026':      { role: 'provost', name: 'PROVOST OFFICERS' },
          'PROVOST':           { role: 'provost', name: 'PROVOST OFFICERS' },
          'LITURGIST-2026':    { role: 'liturgist', name: 'LITURGICAL TEAM' },
          'LITURGIST':         { role: 'liturgist', name: 'LITURGICAL TEAM' },
          'SPORTS-ADMIN-2026': { role: 'sports_director', name: 'SPORTS DIRECTOR' }
        };

        if (cleanId in CANONICAL_FALLBACK_MAP) {
          const fallback = CANONICAL_FALLBACK_MAP[cleanId];
          member = {
            id: cleanId,
            official_member_id: cleanId,
            full_name: fallback.name,
            role: fallback.role,
            cmo_family: fallback.family
          };
        }
      }

      if (dbError || !member) {
        setError(`Invalid Executive ID: "${cleanId}". Record not found in official roster.`);
        return;
      }

      const userRole = (member.role || 'member').toLowerCase().trim();

      if (userRole === 'member' || userRole === 'regular' || userRole === '') {
        setError(`Access Denied: ${cleanId} is a General Member ID. Please use the "Member ID" login tab.`);
        return;
      }

      sessionStorage.setItem('cmo_auth_member_id', member.official_member_id);
      sessionStorage.setItem('cmo_auth_role', member.role);
      sessionStorage.setItem('cmo_auth_name', member.full_name);
      sessionStorage.setItem('cmo_auth_family', member.cmo_family || '');

      setCurrentUser({
        id: member.id,
        official_member_id: member.official_member_id,
        name: member.full_name,
        full_name: member.full_name,
        status: 'Active (Cleared)',
        balance: 0,
        role: member.role as any,
        family: member.cmo_family as any,
        cmo_family: member.cmo_family,
        profilePic: null
      });

      // Resolve target route and navigate immediately
      const destination = resolveExecutiveRoute(member.official_member_id, member.role, member.cmo_family);
      navigate(destination);
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to authenticate at this time.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setSuccess('');

    const inputMemberId = (loginId || executiveId).toUpperCase().trim();
    if (!inputMemberId) {
      setError(loginType === 'executive' ? 'Please enter an Executive / Official ID' : 'Please enter a Member ID');
      return;
    }

    if (loginType === 'executive') {
      return handleExecutiveLogin({ preventDefault: () => {} } as React.FormEvent);
    }

    setLoading(true);
    try {
      let member: Member | null = null;

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

      // 2. Check public.members matching official_member_id or id
      if (!member) {
        const isInputUuid = isUuid(inputMemberId);
        const memberQuery = supabase
          .from('members')
          .select('*');

        const { data: dbMembersData, error: dbErr } = await (
          isInputUuid 
            ? memberQuery.or(`official_member_id.eq.${inputMemberId},id.eq.${inputMemberId}`)
            : memberQuery.eq('official_member_id', inputMemberId)
        );

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
          setExecutiveId('');
          setLoading(false);
          setTimeout(() => setError(''), 6000);
          return;
        }
        setSelectedFamily && setSelectedFamily(null);
        setCurrentPage('dashboard');
        setSuccess(`Welcome, ${member.name}!`);
        setLoginId('');
        setExecutiveId('');
        setTimeout(() => setSuccess(''), 3000);
        setLoading(false);
        return;
      }

      setCurrentPage('dashboard');

      setSuccess(`Welcome, ${member.name}!`);
      setLoginId('');
      setExecutiveId('');
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
        <Heading level={1} className="flex items-center gap-2 mb-5">
          <LogIn className="w-6 h-6" />
          {loginType === 'executive' ? 'Executive Login' : 'Member Login'}
        </Heading>

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

        <form onSubmit={loginType === 'executive' ? handleExecutiveLogin : handleLogin} className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm block mb-2 font-medium">
              {loginType === 'executive' ? 'Executive / Official ID' : 'CMO Member ID'}
            </label>
            <Input
              value={loginType === 'executive' ? (executiveId || loginId) : loginId}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setLoginId(val);
                setExecutiveId(val);
              }}
              placeholder="Enter your ID"
              className="bg-[#001a16] border-[#ffd700] text-white focus:ring-2 focus:ring-[#ffd700]"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              {loginType === 'executive'
                ? 'For operational office accounts and executive dashboards'
                : 'For general CMO membership tracking profiles'}
            </p>
          </div>
          <Button
            type="submit"
            className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700] font-bold py-2.5 shadow-lg"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : loginType === 'executive' ? 'Login to Executive Portal' : 'Login to Member Portal'}
          </Button>
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