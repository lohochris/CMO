export const OFFICE_ROLE_REQUIREMENTS: Record<string, string[]> = {
  // Central Executive Offices
  'chairman': ['chairman', 'cmo_chairman', 'vice chairman', 'super_admin', 'executive'],
  'cmo_chairman': ['chairman', 'cmo_chairman', 'vice chairman', 'super_admin', 'executive'],
  'general-secretary': ['general secretary', 'gen_sec', 'secretary', 'assistant secretary', 'super_admin', 'executive'],
  'secretary': ['general secretary', 'gen_sec', 'secretary', 'assistant secretary', 'super_admin', 'executive'],
  'fin-sec': ['financial secretary', 'fin_sec', 'financial_secretary', 'assistant financial secretary', 'super_admin', 'executive'],
  'treasury': ['treasurer', 'super_admin', 'executive'],
  'treasurer': ['treasurer', 'super_admin', 'executive'],
  'pro': ['pro', 'public relations officer', 'super_admin', 'executive'],
  'provost': ['provost', 'provost marshall', 'super_admin', 'executive'],
  'welfare': ['welfare officer', 'welfare', 'super_admin', 'executive'],
  'auditor': ['auditor', 'internal auditor', 'super_admin', 'executive'],
  'liturgist': ['liturgist', 'super_admin', 'executive'],

  // Sports Department
  'sports': ['sports director', 'sports coordinator', 'team manager', 'sports_director', 'coach', 'referee', 'medical_officer', 'athlete', 'super_admin', 'executive'],
  'sports_director': ['sports director', 'sports coordinator', 'team manager', 'sports_director', 'coach', 'referee', 'medical_officer', 'athlete', 'super_admin', 'executive'],

  // Family Units
  'family-head': ['family_chairman', 'family_head', 'family chairman', 'family head', 'super_admin', 'executive', 'chairman', 'cmo_chairman'],
  'family-sec': ['family_secretary', 'family_sec', 'family secretary', 'super_admin', 'executive', 'gen_sec', 'secretary'],
  'familychairman': ['family_chairman', 'family_head', 'family chairman', 'family head', 'super_admin', 'executive', 'chairman', 'cmo_chairman'],
  'familysecretary': ['family_secretary', 'family_sec', 'family secretary', 'super_admin', 'executive', 'gen_sec', 'secretary'],
};

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
  if (normalizedUserRole === 'member' || normalizedUserRole === 'member_active') {
    return false;
  }

  const officeKey = targetOfficeKey.toLowerCase().trim().replace(/\s+/g, '-');
  const allowedRoles = OFFICE_ROLE_REQUIREMENTS[officeKey] || 
    OFFICE_ROLE_REQUIREMENTS[targetOfficeKey.toLowerCase().trim()] || 
    ['super_admin', 'executive'];

  return allowedRoles.some((allowed) => {
    const normAllowed = allowed.toLowerCase().trim();
    return normalizedUserRole.includes(normAllowed) || normAllowed === normalizedUserRole;
  });
}
