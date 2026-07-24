import fs from 'fs';

const url = "https://szwnnzccdgdqbkzokpsg.supabase.co/rest/v1/";
const apikey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

async function run() {
  try {
    console.log('Fetching OpenAPI schema from Supabase...');
    const response = await fetch(url, {
      headers: {
        'apikey': apikey,
        'Content-Type': 'application/json'
      }
    });

    const schema = await response.json();
    const paths = Object.keys(schema.paths || {});
    const definitions = Object.keys(schema.definitions || {});
    
    // Find keys matching event or sports
    const matchingPaths = paths.filter(p => p.toLowerCase().includes('event') || p.toLowerCase().includes('sports') || p.toLowerCase().includes('fixture'));
    const matchingDefs = definitions.filter(d => d.toLowerCase().includes('event') || d.toLowerCase().includes('sports') || d.toLowerCase().includes('fixture'));

    fs.writeFileSync('scratch/openapi_keys.json', JSON.stringify({
      matchingPaths,
      matchingDefs,
      allPaths: paths,
      allDefs: definitions
    }, null, 2));
    
    // Write full definition of anything matching event if found
    const eventDefs = {};
    definitions.forEach(d => {
      if (d.toLowerCase().includes('event')) {
        eventDefs[d] = schema.definitions[d];
      }
    });
    fs.writeFileSync('scratch/openapi_event_defs.json', JSON.stringify(eventDefs, null, 2));

    console.log('Done!');
  } catch (err) {
    console.error(err);
  }
}

run();
