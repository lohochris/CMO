import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidates = [
  'player_id', 'athlete_id', 'member_id', 'user_id', 'person_id',
  'scorer_id', 'player_member_id', 'athlete_member_id', 'scorer_member_id',
  'athlete_registry_id', 'sports_athlete_id', 'sports_athletes_registry_id',
  'athlete_profile_id', 'captain_id', 'referee_id', 'official_id',
  'cmo_member_id', 'created_by', 'assist_id', 'assisted_by_id',
  'actor_id', 'subject_id', 'member_official_id', 'player_official_id',
  'athlete_official_id', 'recipient_id', 'card_player_id', 'offending_player_id',
  'jersey_number', 'player_name', 'athlete_name'
];

async function run() {
  const results = {};
  for (const col of candidates) {
    const { error } = await supabase
      .from('sports_match_events')
      .insert([{ [col]: '9ee20e46-37c0-4985-ae73-102559d3ebe2' }]);
    
    if (error) {
      results[col] = {
        code: error.code,
        message: error.message
      };
    } else {
      results[col] = {
        code: 'SUCCESS',
        message: 'Insert query parsed successfully'
      };
    }
  }

  fs.writeFileSync('scratch/db_probe_all_res.json', JSON.stringify(results, null, 2));
  console.log('Done! Results written to scratch/db_probe_all_res.json');
}

run();
