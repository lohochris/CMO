import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};

  try {
    console.log('Querying members record...');
    const { data: member, error: mError } = await supabase
      .from('members')
      .select('*')
      .limit(1);
    info.member = member;
    info.memberError = mError;

    fs.writeFileSync('scratch/db_info_members.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_info_members.json');
  } catch (err) {
    console.error(err);
    fs.writeFileSync('scratch/db_info_members.json', JSON.stringify({ error: err.message }, null, 2));
  }
}

run();
