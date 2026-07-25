import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://szwnnzccdgdqbkzokpsg.supabase.co";
const supabaseAnonKey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const info = {};

  try {
    console.log('Querying sports_fixtures sample...');
    const { data: fixtures, error: fError } = await supabase
      .from('sports_fixtures')
      .select('*')
      .limit(3);
    info.fixtures = fixtures;
    info.fixturesError = fError;

    console.log('Querying sports_tournaments sample...');
    const { data: tournaments, error: tError } = await supabase
      .from('sports_tournaments')
      .select('*')
      .limit(3);
    info.tournaments = tournaments;
    info.tournamentsError = tError;

    console.log('Querying sports_teams sample...');
    const { data: teams, error: teamsError } = await supabase
      .from('sports_teams')
      .select('*')
      .limit(3);
    info.teams = teams;
    info.teamsError = teamsError;

    console.log('Querying referees...');
    const { data: referees, error: rError } = await supabase
      .from('members')
      .select('id, name, role')
      .in('role', ['referee', 'sports_director', 'coach', 'Referee', 'Coach', 'Sports_Director']);
    info.referees = referees;
    info.refereesError = rError;

    fs.writeFileSync('scratch/db_info.json', JSON.stringify(info, null, 2));
    console.log('Done! Written to scratch/db_info.json');
  } catch (err) {
    console.error(err);
    fs.writeFileSync('scratch/db_info.json', JSON.stringify({ error: err.message }, null, 2));
  }
}

run();
