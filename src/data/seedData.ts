import { Member, Announcement } from '../types';

export const seedMembers: Member[] = [
  { id: 'HCC-CMOW-26-0001', name: 'Alao, Joseph', status: 'Active', balance: 15000, role: 'member', family: 'Wisdom', profilePic: null, createdAt: '2025-12-01T00:00:00.000Z' },
  { id: 'HCC-CMOH-26-0001', name: 'Ola, Peter', status: 'Active', balance: 0, role: 'family_chairman', family: 'Honour', profilePic: null, createdAt: '2025-12-01T00:00:00.000Z' },
  { id: 'HCC-CMOT-26-0001', name: 'Uche, Chinedu', status: 'Active', balance: 0, role: 'family_secretary', family: 'Talent', profilePic: null, createdAt: '2025-12-01T00:00:00.000Z' },
  { id: 'FIN-SEC-2026', name: 'LOHO DONDO, CHRISTOPHER', status: 'Active', balance: 0, role: 'fin_sec', profilePic: null, createdAt: '2025-12-01T00:00:00.000Z' },
  { id: 'WELFARE-2026', name: 'SAMSON, BALOGUN', status: 'Active', balance: 0, role: 'welfare', profilePic: null, createdAt: '2025-12-01T00:00:00.000Z' },
  { id: 'TREASURER-2026', name: 'FRANCIS IDIKU', status: 'Active', balance: 0, role: 'treasurer', profilePic: null, createdAt: '2025-12-01T00:00:00.000Z' },
  { id: 'SECRETARY-2026', name: 'PETER ALLEH', status: 'Active', balance: 0, role: 'gen_sec', profilePic: null, createdAt: '2025-12-01T00:00:00.000Z' },
  { id: 'PRO-2026', name: 'RAPHAEL, GODWIN', status: 'Active', balance: 0, role: 'pro', profilePic: null, createdAt: '2025-12-01T00:00:00.000Z' },
  { id: 'CMO-CHAIRMAN-2026', name: 'STANLEY UKAH', status: 'Active', balance: 0, role: 'cmo_chairman', profilePic: null, createdAt: '2025-12-01T00:00:00.000Z' }
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