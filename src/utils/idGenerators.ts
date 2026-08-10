import { Family } from '../types';

const FAMILY_PREFIX: Record<Family, string> = {
  Wisdom: 'HCC-CMOW-26-',
  Honour: 'HCC-CMOH-26-',
  Integrity: 'HCC-CMOI-26-',
  Talent: 'HCC-CMOT-26-'
};

export const generateMemberId = (
  existingMembers: Array<{ id?: string; official_member_id?: string; member_code?: string }> = [],
  _family?: Family
): string => {
  const PREFIX = 'HCC-CMO-26-';
  let maxNumber = 0;

  existingMembers.forEach((m) => {
    const idStr = m.official_member_id || m.member_code || m.id || '';
    const match = idStr.match(/HCC-CMO-26-(\d+)/i) || idStr.match(/HCC-.*?-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  const nextNum = maxNumber > 0 ? maxNumber + 1 : 188;
  return `${PREFIX}${nextNum}`;
};

export const generateTicketId = (existingTicketsLength: number): string => {
  return `WLF-TKT-${String(existingTicketsLength + 1).padStart(4, '0')}`;
};

export const generateExpenseId = (): string => {
  return `EXP-${Date.now()}`;
};

export const generateAnnouncementId = (): string => {
  return `ANN-${Date.now()}`;
};