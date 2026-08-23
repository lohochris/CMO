export interface ExecutiveOffice {
  officeId: string;
  title: string;
  role: string;
  route: string;
}

export const EXECUTIVE_OFFICES: Record<string, ExecutiveOffice> = {
  'HCC-CMO-EXEC-CH': { officeId: 'HCC-CMO-EXEC-CH', title: 'Chairman Office', role: 'chairman', route: '/executive/chairman' },
  'HCC-CMO-EXEC-SEC': { officeId: 'HCC-CMO-EXEC-SEC', title: 'General Secretariat', role: 'secretary', route: '/executive/secretary' },
  'HCC-CMO-EXEC-SE': { officeId: 'HCC-CMO-EXEC-SEC', title: 'General Secretariat', role: 'secretary', route: '/executive/secretary' },
  'HCC-CMO-EXEC-FS': { officeId: 'HCC-CMO-EXEC-FS', title: 'Financial Secretariat', role: 'fin_sec', route: '/executive/fin-sec' },
  'HCC-CMO-EXEC-TR': { officeId: 'HCC-CMO-EXEC-TR', title: 'Treasury Office', role: 'treasurer', route: '/executive/treasury' },
  'HCC-CMO-EXEC-PRO': { officeId: 'HCC-CMO-EXEC-PRO', title: 'Public Relations Office', role: 'pro', route: '/executive/pro' },
  'HCC-CMO-EXEC-PR': { officeId: 'HCC-CMO-EXEC-PRO', title: 'Public Relations Office', role: 'pro', route: '/executive/pro' },
  'HCC-CMO-EXEC-PV': { officeId: 'HCC-CMO-EXEC-PV', title: 'Provost Marshall Office', role: 'provost', route: '/executive/provost' },
  'HCC-CMO-EXEC-WF': { officeId: 'HCC-CMO-EXEC-WF', title: 'Welfare Directorate', role: 'welfare', route: '/executive/welfare' },
  'HCC-CMO-EXEC-WE': { officeId: 'HCC-CMO-EXEC-WF', title: 'Welfare Directorate', role: 'welfare', route: '/executive/welfare' },
  'HCC-CMO-SPRT-DIR': { officeId: 'HCC-CMO-SPRT-DIR', title: 'Sports Directorate', role: 'sports_director', route: '/sports/admin' },
};

export const OFFICE_ROLE_MAP: Record<string, string[]> = {
  'chairman': ['chairman', 'vice chairman', 'super_admin'],
  'general-secretary': ['secretary', 'general secretary', 'super_admin'],
  'financial-secretary': ['fin_sec', 'financial secretary', 'super_admin'],
  'treasury': ['treasurer', 'assistant treasurer', 'super_admin'],
  'pro': ['pro', 'public relations officer', 'super_admin'],
  'provost': ['provost', 'provost marshall', 'super_admin'],
  'welfare': ['welfare', 'welfare officer', 'super_admin'],
  'liturgy': ['liturgist', 'liturgical coordinator', 'super_admin'],
  'sports-admin': ['sports_director', 'sports coordinator', 'coach', 'referee', 'super_admin'],
};

export const STRICT_OFFICE_ROLES: Record<string, string[]> = {
  ...OFFICE_ROLE_MAP,

  // Family Units
  'wisdom': ['family_head', 'family_secretary', 'super_admin'],
  'talent': ['family_head', 'family_secretary', 'super_admin'],
  'honour': ['family_head', 'family_secretary', 'super_admin'],
  'integrity': ['family_head', 'family_secretary', 'super_admin'],

  // Sports Department Sub-portals
  'sports-treasury': ['sports_treasurer', 'treasurer', 'super_admin'],
  'sports-medical': ['medical_officer', 'super_admin'],
  'sports-coach': ['coach', 'head coach', 'super_admin'],
  'sports-referee': ['referee', 'match referee', 'super_admin'],
  'sports': ['sports_director', 'sports_treasurer', 'medical_officer', 'coach', 'referee', 'super_admin']
};

export const CANONICAL_EXECUTIVE_IDS = [
  'HCC-CMO-EXEC-CH',
  'HCC-CMO-EXEC-FS',
  'HCC-CMO-EXEC-TR',
  'HCC-CMO-EXEC-WE',
  'HCC-CMO-EXEC-PR',
  'HCC-CMO-EXEC-PV',
  'HCC-CMO-EXEC-SE',
  'HCC-CMO-EXEC-LT',
  'HCC-CMO-WIS-FH',
  'HCC-CMO-WIS-FS',
  'HCC-CMO-TAL-FH',
  'HCC-CMO-TAL-FS',
  'HCC-CMO-HON-FH',
  'HCC-CMO-HON-FS',
  'HCC-CMO-INT-FH',
  'HCC-CMO-INT-FS',
  'HCC-CMO-SPRT-DIR',
  'HCC-CMO-SPRT-TR',
  'HCC-CMO-SPRT-MED',
  'HCC-CMO-SPRT-COACH',
  'HCC-CMO-SPRT-REF'
];

export const OFFICE_ROLE_REQUIREMENTS = STRICT_OFFICE_ROLES;

/**
 * Normalizes office keys and verifies whether a member's role grants clearance for a target office.
 */
export function isRoleAuthorizedForOffice(
  userRole: string | undefined | null,
  targetOfficeKey: string
): boolean {
  if (!userRole) return false;

  const normalizedUserRole = userRole.toLowerCase().trim();

  // Explicitly deny regular members
  if (normalizedUserRole === 'member' || normalizedUserRole === 'member_active' || normalizedUserRole === 'regular' || normalizedUserRole === '') {
    return false;
  }

  let officeKey = targetOfficeKey.toLowerCase().trim().replace(/\s+/g, '-');
  if (officeKey === 'fin-sec') officeKey = 'financial-secretary';
  if (officeKey === 'liturgist') officeKey = 'liturgy';
  if (officeKey === 'secretary') officeKey = 'general-secretary';
  if (officeKey === 'treasurer') officeKey = 'treasury';
  if (officeKey === 'family-head' || officeKey === 'familychairman') officeKey = 'wisdom';
  if (officeKey === 'family-sec' || officeKey === 'familysecretary') officeKey = 'wisdom';

  const allowedRoles = OFFICE_ROLE_MAP[officeKey] ||
    STRICT_OFFICE_ROLES[officeKey] || 
    STRICT_OFFICE_ROLES[targetOfficeKey.toLowerCase().trim()] || 
    ['super_admin'];

  return allowedRoles.some((allowed) => {
    const normAllowed = allowed.toLowerCase().trim();
    return normalizedUserRole === normAllowed || normalizedUserRole.includes(normAllowed);
  });
}
