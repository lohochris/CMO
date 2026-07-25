import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidates = [
  'id', 'fixture_id', 'match_id', 'minute', 'match_minute', 'minute_elapsed',
  'event_type', 'type', 'notes', 'description', 'details', 'team_id', 'team_name',
  'player_id', 'athlete_id', 'member_id', 'user_id', 'person_id', 'scorer_id',
  'athlete_profile_id', 'athlete_registry_id', 'sports_athlete_id',
  'referee_id', 'official_id', 'created_at', 'updated_at', 'tenant_id',
  'created_by', 'role', 'status', 'event_details', 'player_name', 'athlete_name'
];

async function run() {
  const results = {};
  for (const col of candidates) {
    const { data, error } = await supabase
      .from('sports_match_events')
      .select(col)
      .limit(1);
    
    if (error) {
      if (error.message.includes('Could not find the') && error.message.includes('column')) {
        results[col] = false;
      } else {
        // Some other error (e.g. column type or RLS, but the column exists!)
        results[col] = true;
      }
    } else {
      results[col] = true; // Exists and selected successfully
    }
  }

  const existingCols = Object.keys(results).filter(k => results[k]);
  fs.writeFileSync('scratch/db_select_probe_res.json', JSON.stringify({ results, existingCols }, null, 2));
  console.log('Existing columns:', existingCols);
}

run();
