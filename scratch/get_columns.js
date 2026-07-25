import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    const { data: cols, error: cErr } = await supabase.rpc('get_table_columns', { table_name: 'sports_match_events' });
    info.cols = cols;
    info.cErr = cErr;

    // Fallback: query a dummy select to get schema description
    if (cErr) {
      console.log('RPC not found, querying system tables directly...');
      const { data: cols2, error: cErr2 } = await supabase
        .from('sports_match_events')
        .select('*')
        .limit(0);
      info.cols2 = cols2;
      info.cErr2 = cErr2;
    }

    fs.writeFileSync('scratch/db_cols.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_cols.json');
  } catch (err) {
    console.error(err);
  }
}

run();
