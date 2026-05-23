import { Family } from '../types';

const FAMILY_PREFIX: Record<Family, string> = {
  Wisdom: 'HCC-CMOW-26-',
  Honour: 'HCC-CMOH-26-',
  Integrity: 'HCC-CMOI-26-',
  Talent: 'HCC-CMOT-26-'
};

export const generateMemberId = (
  existingMembers: Array<{ id: string }> = [],
  family?: Family
): string => {
  const prefix = family ? FAMILY_PREFIX[family] : 'HCC-CMO-26-';
  const existingIds = existingMembers
    .filter(m => m.id.startsWith(prefix))
    .map(m => parseInt(m.id.split('-').pop() || '0', 10));
  const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
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