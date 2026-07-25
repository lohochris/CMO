import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    const { data: d1, error: e1 } = await supabase.from('members').select('name').limit(1);
    const { data: d2, error: e2 } = await supabase.from('members').select('full_name').limit(1);
    
    info.name = { data: d1, error: e1 };
    info.full_name = { data: d2, error: e2 };

    fs.writeFileSync('scratch/db_member_cols.json', JSON.stringify(info, null, 2));
    console.log(info);
  } catch (err) {
    console.error(err);
  }
}

run();
