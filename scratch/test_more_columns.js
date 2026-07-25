import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidates = {
  minute: [
    'minute_elapsed', 'event_time', 'time', 'match_time', 'match_minute_elapsed',
    'timeline_minute', 'occurrence_minute', 'game_minute', 'minute_of_match', 'event_at',
    'minute_logged', 'event_min', 'match_min'
  ],
  player: [
    'scorer_id', 'player_member_id', 'user_id', 'scorer_member_id', 'athlete_member_id',
    'assist_id', 'assisted_by_id', 'official_member_id', 'assigned_member_id', 'member_id',
    'card_player_id', 'offending_player_id'
  ]
};

async function testColumn(col, val) {
  const { error } = await supabase
    .from('sports_match_events')
    .insert([{ [col]: val }]);
  
  if (error) {
    if (error.message.includes('Could not find the') && error.message.includes('column')) {
      return false; // Does not exist
    }
    return true; // Exists (failed due to other error)
  }
  return true; // Exists
}

async function run() {
  const results = {};
  
  for (const [category, cols] of Object.entries(candidates)) {
    results[category] = [];
    for (const col of cols) {
      let val = 'test';
      if (category === 'minute') val = 10;
      const exists = await testColumn(col, val);
      if (exists) {
        results[category].push(col);
      }
    }
  }

  fs.writeFileSync('scratch/db_test_cols_res_2.json', JSON.stringify(results, null, 2));
  console.log('Results:', results);
}

run();
