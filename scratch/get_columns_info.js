import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};
  try {
    const { data: cols, error: cErr } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'sports_match_events');
    info.cols = cols;
    info.cErr = cErr;

    fs.writeFileSync('scratch/db_cols_info.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_cols_info.json');
  } catch (err) {
    console.error(err);
  }
}

run();
