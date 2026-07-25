import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    const { data, error } = await supabase
      .from('sports_fixtures')
      .select('id, referee_id')
      .limit(1);
    
    info.data = data;
    info.error = error;

    fs.writeFileSync('scratch/db_referee_col.json', JSON.stringify(info, null, 2));
    console.log(info);
  } catch (err) {
    console.error(err);
  }
}

run();
