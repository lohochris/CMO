export const STRICT_OFFICE_ROLES: Record<string, string[]> = {
  // 8 Central Executive Offices
  'chairman': ['chairman', 'cmo_chairman', 'vice chairman', 'super_admin'],
  'cmo_chairman': ['chairman', 'cmo_chairman', 'vice chairman', 'super_admin'],
  'general-secretary': ['general secretary', 'assistant general secretary', 'gen_sec', 'secretary', 'super_admin'],
  'secretary': ['general secretary', 'assistant general secretary', 'gen_sec', 'secretary', 'super_admin'],
  'financial-secretary': ['financial secretary', 'assistant financial secretary', 'fin_sec', 'financial_secretary', 'fin sec', 'super_admin'],
  'fin-sec': ['financial secretary', 'assistant financial secretary', 'fin_sec', 'financial_secretary', 'fin sec', 'super_admin'],
  'treasury': ['treasurer', 'assistant treasurer', 'super_admin'],
  'treasurer': ['treasurer', 'assistant treasurer', 'super_admin'],
  'pro': ['public relations officer', 'pro', 'assistant pro', 'super_admin'],
  'provost': ['provost', 'provost marshall', 'chief provost', 'super_admin'],
  'welfare': ['welfare officer', 'welfare secretary', 'welfare', 'super_admin'],
  'auditor': ['auditor', 'internal auditor', 'super_admin'],
  'liturgist': ['liturgist', 'super_admin'],

  // Sports Hubs
  'sports-admin': ['sports director', 'sports coordinator', 'team manager', 'sports_director', 'super_admin'],
  'sports': ['sports director', 'sports coordinator', 'team manager', 'sports_director', 'coach', 'referee', 'medical_officer', 'athlete', 'super_admin'],
  'sports_director': ['sports director', 'sports coordinator', 'team manager', 'sports_director', 'super_admin'],

  // Family Units
  'family-head': ['family_chairman', 'family_head', 'family chairman', 'family head', 'chairman', 'cmo_chairman', 'super_admin'],
  'family-sec': ['family_secretary', 'family_sec', 'family secretary', 'gen_sec', 'secretary', 'super_admin'],
  'familychairman': ['family_chairman', 'family_head', 'family chairman', 'family head', 'chairman', 'cmo_chairman', 'super_admin'],
  'familysecretary': ['family_secretary', 'family_sec', 'family secretary', 'gen_sec', 'secretary', 'super_admin'],
};

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

  const officeKey = targetOfficeKey.toLowerCase().trim().replace(/\s+/g, '-');
  const allowedRoles = STRICT_OFFICE_ROLES[officeKey] || 
    STRICT_OFFICE_ROLES[targetOfficeKey.toLowerCase().trim()] || 
    ['super_admin'];

  return allowedRoles.some((allowed) => {
    const normAllowed = allowed.toLowerCase().trim();
    return normalizedUserRole === normAllowed || normalizedUserRole.includes(normAllowed);
  });
}
