import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    console.log('Inserting test record into sports_match_events...');
    const { data, error } = await supabase
      .from('sports_match_events')
      .insert([{
        fixture_id: 'eed8498e-1df5-41e4-844d-c60d388fbb05',
        minute: 10,
        event_type: 'Goal',
        description: 'Test goal',
        team_id: '481ca11d-df0d-4a25-88b1-9ed58c8b5ed8',
        player_id: '9ee20e46-37c0-4985-ae73-102559d3ebe2'
      }])
      .select('*');
    info.data = data;
    info.error = error;

    // Also clean up if successful
    if (data && data.length > 0) {
      console.log('Insert succeeded! Cleaning up...');
      await supabase
        .from('sports_match_events')
        .delete()
        .eq('id', data[0].id);
    }

    fs.writeFileSync('scratch/db_insert_res.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_insert_res.json');
  } catch (err) {
    console.error(err);
  }
}

run();
