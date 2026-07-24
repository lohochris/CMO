import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: execs, error } = await supabase
      .from('cmo_executives')
      .select('*');
    
    fs.writeFileSync('scratch/db_execs.json', JSON.stringify({ execs, error }, null, 2));
    console.log('Done! Written to scratch/db_execs.json');
  } catch (err) {
    console.error(err);
  }
}

run();
