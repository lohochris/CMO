import fs from 'fs';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
let url = '', key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    url = line.split('=')[1].trim().replace(/"/g, '');
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    key = line.split('=')[1].trim().replace(/"/g, '');
  }
}

const supabase = createSupabaseClient(url, key);

const { data, error } = await supabase.from('members').select('*').limit(1);
if (error) {
  console.error(error);
} else {
  console.log('Columns:', Object.keys(data[0]));
}
process.exit(0);
