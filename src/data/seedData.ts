import { Member, Announcement } from '../types';

export const seedMembers: Member[] = [
  { id: 'HCC-CMOW-26-0001', name: 'Alao, Joseph', status: 'Active (Cleared)', balance: 15000, role: 'member', family: 'Wisdom', profilePic: null },
  { id: 'HCC-CMOH-26-0001', name: 'Ola, Peter', status: 'Active (Cleared)', balance: 0, role: 'family_chairman', family: 'Honour', profilePic: null },
  { id: 'HCC-CMOT-26-0001', name: 'Uche, Chinedu', status: 'Active (Cleared)', balance: 0, role: 'family_secretary', family: 'Talent', profilePic: null },
  { id: 'FIN-SEC-2026', name: 'Dondo, Christopher', status: 'Active (Cleared)', balance: 0, role: 'fin_sec', profilePic: null },
  { id: 'WELFARE-2026', name: 'Okafor, Emmanuel', status: 'Active (Cleared)', balance: 0, role: 'welfare', profilePic: null },
  { id: 'TREASURER-2026', name: 'Ibrahim, Musa', status: 'Active (Cleared)', balance: 0, role: 'treasurer', profilePic: null },
  { id: 'SECRETARY-2026', name: 'Eze, Chukwuma', status: 'Active (Cleared)', balance: 0, role: 'gen_sec', profilePic: null },
  { id: 'PRO-2026', name: 'Adebayo, Samuel', status: 'Active (Cleared)', balance: 0, role: 'pro', profilePic: null }
];

export const seedAnnouncements: Announcement[] = [
  {
    id: 'ANN-001',
    title: 'Welcome to the Digital Portal',
    content: 'We are pleased to launch the Holy Cross CMO Management Portal. All members can now track their contributions and access welfare services digitally.',
    author: 'Parish Priest',
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];