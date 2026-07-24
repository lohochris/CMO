import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

// Initialize client with information_schema
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'information_schema' }
});

async function run() {
  const info = {};
  try {
    console.log('Querying information_schema.columns...');
    const { data: cols, error: cErr } = await supabase
      .from('columns')
      .select('column_name, data_type')
      .eq('table_name', 'sports_match_events');
    
    info.cols = cols;
    info.cErr = cErr;

    // Let's also query public tables from information_schema.tables to verify what tables exist
    const { data: tables, error: tErr } = await supabase
      .from('tables')
      .select('table_name')
      .eq('table_schema', 'public');
    info.tables = tables;
    info.tErr = tErr;

    fs.writeFileSync('scratch/db_cols_real.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_cols_real.json');
  } catch (err) {
    console.error(err);
  }
}

run();
