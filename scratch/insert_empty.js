import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    console.log('Inserting empty record...');
    const { data, error } = await supabase
      .from('sports_match_events')
      .insert([{}])
      .select('*');
    info.data = data;
    info.error = error;

    if (data && data.length > 0) {
      console.log('Insert succeeded! Cleaning up...');
      await supabase
        .from('sports_match_events')
        .delete()
        .eq('id', data[0].id);
    }

    fs.writeFileSync('scratch/db_insert_empty.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_insert_empty.json');
  } catch (err) {
    console.error(err);
  }
}

run();
