import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const candidates = {
  fixture: ['fixture_id', 'match_id'],
  minute: ['minute', 'match_minute', 'event_minute', 'time_elapsed', 'elapsed'],
  event_type: ['event_type', 'type', 'event_name'],
  description: ['description', 'notes', 'details', 'comment', 'message'],
  team: ['team_id', 'team_name', 'team'],
  player: ['player_id', 'athlete_id', 'member_id', 'player']
};

async function testColumn(col, val) {
  const { error } = await supabase
    .from('sports_match_events')
    .insert([{ [col]: val }]);
  
  if (error) {
    if (error.message.includes('Could not find the') && error.message.includes('column')) {
      return false; // Does not exist
    }
    return true; // Exists (failed due to other error like RLS or type mismatch)
  }
  return true; // Exists (and insert succeeded/RLS bypassed somehow)
}

async function run() {
  const results = {};
  
  for (const [category, cols] of Object.entries(candidates)) {
    results[category] = [];
    for (const col of cols) {
      console.log(`Testing candidate column: ${col}...`);
      let val = 'test';
      if (category === 'minute') val = 10; // Use numeric for minute candidates
      const exists = await testColumn(col, val);
      if (exists) {
        results[category].push(col);
      }
    }
  }

  fs.writeFileSync('scratch/db_test_cols_res.json', JSON.stringify(results, null, 2));
  console.log('Done! Results written to scratch/db_test_cols_res.json', results);
}

run();
