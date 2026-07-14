import { useState } from 'react';
import { Card } from '../../app/components/ui/card';
import { Button } from '../../app/components/ui/button';
import { Input } from '../../app/components/ui/input';
import { LogIn } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabaseClient';
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

    // ── Executive ID canonical map ──────────────────────────────────────────────
    // Exactly 6 authorised login keys (the typed input). Each resolves to the
    // official_member_id value stored in the Supabase 'members' table.
    // To update a canonical key: change BOTH the map key and the DB record.
    // ────────────────────────────────────────────────────────────────────────────
    const EXEC_ALIAS_MAP: Record<string, string> = {
      'CHAIRMAN-2026':  'CMO-CHAIRMAN-2026', // → cmo_chairman role
      'FIN-SEC-2026':   'FIN-SEC-2026',      // → fin_sec role
      'WEL-OFF-2026':   'WELFARE-2026',      // → welfare role
      'WELFORCE-2026':  'WELFARE-2026',      // → welfare role (alternate alias)
      'TREAS-2026':     'TREASURER-2026',    // → treasurer role
      'SECRETARY-2026': 'SECRETARY-2026',    // → gen_sec role
      'PRO-2026':       'PRO-2026',          // → pro role
    };
    let resolvedId = EXEC_ALIAS_MAP[inputMemberId] ?? inputMemberId;

    // Keep resolvedId unpadded to match exact user inputs and database entries



    // ── Guaranteed Fallbacks for Whitelisted Accounts ──────────────────────────
    const MEMBER_FALLBACKS: Record<string, { name: string; id: string }> = {
      // 3-digit versions (original inputs)
      'HCC-CMO-26-001': { name: 'STANLEY UKAH', id: 'HCC-CMO-26-0001' },
      'HCC-CMO-26-004': { name: 'LOHO DONDO, CHRISTOPHER', id: 'HCC-CMO-26-0004' },
      'HCC-CMO-26-140': { name: 'SAMSON BALOGUN', id: 'HCC-CMO-26-0140' },
      'HCC-CMO-26-129': { name: 'FRANCIS IDIKU', id: 'HCC-CMO-26-0129' },
      'HCC-CMO-26-067': { name: 'PETER ALLEH', id: 'HCC-CMO-26-0067' },
      'HCC-CMO-26-010': { name: 'RAPHAEL GODWIN', id: 'HCC-CMO-26-0010' },

      // 4-digit normalized versions
      'HCC-CMO-26-0001': { name: 'STANLEY UKAH', id: 'HCC-CMO-26-0001' },
      'HCC-CMO-26-0004': { name: 'LOHO DONDO, CHRISTOPHER', id: 'HCC-CMO-26-0004' },
      'HCC-CMO-26-0140': { name: 'SAMSON BALOGUN', id: 'HCC-CMO-26-0140' },
      'HCC-CMO-26-0129': { name: 'FRANCIS IDIKU', id: 'HCC-CMO-26-0129' },
      'HCC-CMO-26-0067': { name: 'PETER ALLEH', id: 'HCC-CMO-26-0067' },
      'HCC-CMO-26-0010': { name: 'RAPHAEL GODWIN', id: 'HCC-CMO-26-0010' }
    };

    const ADMIN_REGISTRY: Record<string, Member> = {
      'CMO-CHAIRMAN-2026': { id: 'CMO-CHAIRMAN-2026', name: 'STANLEY UKAH', full_name: 'STANLEY UKAH', official_member_id: 'CMO-CHAIRMAN-2026', status: 'Active (Cleared)', balance: 0, role: 'cmo_chairman', profilePic: null },
      'FIN-SEC-2026':      { id: 'FIN-SEC-2026', name: 'LOHO DONDO, CHRISTOPHER', full_name: 'LOHO DONDO, CHRISTOPHER', official_member_id: 'FIN-SEC-2026', status: 'Active (Cleared)', balance: 0, role: 'fin_sec', profilePic: null },
      'WELFARE-2026':      { id: 'WELFARE-2026', name: 'SAMSON, BALOGUN', full_name: 'SAMSON, BALOGUN', official_member_id: 'WELFARE-2026', status: 'Active (Cleared)', balance: 0, role: 'welfare', profilePic: null },
      'TREASURER-2026':    { id: 'TREASURER-2026', name: 'FRANCIS IDIKU', full_name: 'FRANCIS IDIKU', official_member_id: 'TREASURER-2026', status: 'Active (Cleared)', balance: 0, role: 'treasurer', profilePic: null },
      'SECRETARY-2026':    { id: 'SECRETARY-2026', name: 'PETER ALLEH', full_name: 'PETER ALLEH', official_member_id: 'SECRETARY-2026', status: 'Active (Cleared)', balance: 0, role: 'gen_sec', profilePic: null },
      'PRO-2026':          { id: 'PRO-2026', name: 'RAPHAEL, GODWIN', full_name: 'RAPHAEL, GODWIN', official_member_id: 'PRO-2026', status: 'Active (Cleared)', balance: 0, role: 'pro', profilePic: null },
    };

    setLoading(true);
    try {
      // 1. Check if the Member ID exists in the active context array
      let member = members.find(m => m.id === resolvedId || m.official_member_id === resolvedId);

      // 2. If not in context, check master_roster in Supabase
      if (!member) {
        const { data: rosterData, error: rosterErr } = await supabase
          .from('master_roster')
          .select('*')
          .eq('official_member_id', resolvedId);

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
            family: rosterUser.family || undefined,
            phone: rosterUser.phone_number,
            phone_number: rosterUser.phone_number,
            email: rosterUser.email,
            profilePic: rosterUser.profile_picture_url || null
          };
          await setMembers([...members, newMember]);
          member = newMember;
        }
      }

      // 2b. Fallback: check the members table directly
      if (!member) {
        const { data: dbMembersData, error: dbErr } = await supabase
          .from('members')
          .select('*')
          .eq('official_member_id', resolvedId);

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
            family: dbMember.family as any || undefined,
            phone: dbMember.phone_number || undefined,
            phone_number: dbMember.phone_number || undefined,
            email: dbMember.email || undefined,
            profilePic: dbMember.profile_picture_url || null
          };
        }
      }

      // 2c. Fallback for whitelisted standard member profiles
      if (!member && (resolvedId in MEMBER_FALLBACKS || inputMemberId in MEMBER_FALLBACKS)) {
        const fallbackInfo = MEMBER_FALLBACKS[resolvedId] ?? MEMBER_FALLBACKS[inputMemberId];
        const memberName = fallbackInfo?.name ?? 'CMO Member';
        const canonicalId = fallbackInfo?.id ?? resolvedId;
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

      // 2d. Fallback for administrative profiles
      if (!member && resolvedId in ADMIN_REGISTRY) {
        member = ADMIN_REGISTRY[resolvedId];
      }

      // 2e. Enforce strict role alignment rules based on user authentication
      if (member) {
        if (resolvedId in ADMIN_REGISTRY) {
          // Force admin role alignment to prevent DB mismatches
          member.role = ADMIN_REGISTRY[resolvedId].role;
        } else {
          // Force standard member role configuration, retaining family officers
          const rawRole = (member.role || '').toLowerCase();
          if (rawRole !== 'family_chairman' && rawRole !== 'family_secretary') {
            member.role = 'member';
          }
        }
      }

      // 2f. All sources exhausted — ID is genuinely not recognised
      if (!member) {
        setError('Invalid Member ID. Please check your credentials or contact the Financial Secretary.');
        setLoading(false);
        return;
      }

      // 3. Validate status
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

      // 6. Default page routing — ordered from most-specific to least-specific
      if (member.role === 'fin_sec') setCurrentPage('fin_sec');
      else if (member.role === 'welfare') setCurrentPage('welfare');
      else if (member.role === 'treasurer') setCurrentPage('treasurer');
      else if (member.role === 'gen_sec') setCurrentPage('secretary');
      else if (member.role === 'pro') setCurrentPage('pro');
      else if (member.role === 'cmo_chairman' || member.role === 'chairman') setCurrentPage('chairman');
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