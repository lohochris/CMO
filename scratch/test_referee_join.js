import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    const { data: d1, error: e1 } = await supabase
      .from('sports_fixtures')
      .select(`
        id,
        referee:members(full_name)
      `)
      .limit(1);
    
    info.d1 = d1;
    info.e1 = e1;

    const { data: d2, error: e2 } = await supabase
      .from('sports_fixtures')
      .select(`
        id,
        referee:members!sports_fixtures_referee_id_fkey(full_name)
      `)
      .limit(1);
    
    info.d2 = d2;
    info.e2 = e2;

    fs.writeFileSync('scratch/db_referee_join.json', JSON.stringify(info, null, 2));
    console.log(info);
  } catch (err) {
    console.error(err);
  }
}

run();
