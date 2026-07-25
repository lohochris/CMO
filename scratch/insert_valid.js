import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    console.log('Inserting with verified columns...');
    const { data, error } = await supabase
      .from('sports_match_events')
      .insert([{
        fixture_id: 'eed8498e-1df5-41e4-844d-c60d388fbb05',
        minute_elapsed: 10,
        event_type: 'Goal',
        notes: 'Test note',
        team_id: '481ca11d-df0d-4a25-88b1-9ed58c8b5ed8'
      }])
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

    fs.writeFileSync('scratch/db_insert_valid.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_insert_valid.json', info);
  } catch (err) {
    console.error(err);
  }
}

run();
