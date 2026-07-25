import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    console.log('Querying sports_match_events...');
    const { data, error } = await supabase
      .from('sports_match_events')
      .select('*');
    info.data = data;
    info.error = error;

    fs.writeFileSync('scratch/db_select_events.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_select_events.json', data);
  } catch (err) {
    console.error(err);
  }
}

run();
