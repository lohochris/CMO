import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: assignments, error: aErr } = await supabase
      .from('office_assignments')
      .select('*');
    
    const { data: members, error: mErr } = await supabase
      .from('members')
      .select('id, full_name, official_member_id');

    fs.writeFileSync('scratch/db_assignments.json', JSON.stringify({ assignments, members, errors: { aErr, mErr } }, null, 2));
    console.log('Done! Written to scratch/db_assignments.json');
  } catch (err) {
    console.error(err);
  }
}

run();
