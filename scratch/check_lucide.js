import * as lucide from 'lucide-react';
import fs from 'fs';

const keys = Object.keys(lucide);
const matches = keys.filter(k => k.toLowerCase().includes('alert') || k.toLowerCase().includes('square'));

fs.writeFileSync('scratch/lucide_matches.json', JSON.stringify({ matches }, null, 2));
console.log('Matches:', matches);
