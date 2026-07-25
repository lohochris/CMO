import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Querying sports_fixtures...');
  const { data, error } = await supabase
    .from('sports_fixtures')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample record:', data);
  }
}

run();
