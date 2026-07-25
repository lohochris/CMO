import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    const { data, error } = await supabase
      .from('sports_match_events')
      .insert([{
        player_id: '9ee20e46-37c0-4985-ae73-102559d3ebe2'
      }]);
    
    info.data = data;
    info.error = error;
    fs.writeFileSync('scratch/db_test_player_id.json', JSON.stringify(info, null, 2));
    console.log(info);
  } catch (err) {
    console.error(err);
  }
}

run();
