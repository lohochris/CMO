import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    const { data: events, error: eErr } = await supabase
      .from('sports_match_events')
      .select('*')
      .limit(1);
    
    info.events = events;
    info.eErr = eErr;

    fs.writeFileSync('scratch/db_match_events.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_match_events.json');
  } catch (err) {
    console.error(err);
  }
}

run();
