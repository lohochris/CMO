import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};

  try {
    const { data: roles, error: rError } = await supabase
      .from('members')
      .select('role');
    
    // count occurrences
    const roleCounts = {};
    if (roles) {
      for (const r of roles) {
        const role = r.role || 'null';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      }
    }
    info.roleCounts = roleCounts;
    info.rError = rError;

    // Fetch members with non-null roles or role like referee
    const { data: activeRoles, error: aError } = await supabase
      .from('members')
      .select('id, full_name, role')
      .not('role', 'is', null);
    info.activeRoles = activeRoles;
    info.aError = aError;

    fs.writeFileSync('scratch/db_roles.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_roles.json');
  } catch (err) {
    console.error(err);
    fs.writeFileSync('scratch/db_roles.json', JSON.stringify({ error: err.message }, null, 2));
  }
}

run();
