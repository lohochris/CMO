import fs from 'fs';

const url = "https://szwnnzccdgdqbkzokpsg.supabase.co/rest/v1/";
const apikey = "sb_publishable_eOWcmSHv1kxcEtTmtbuENQ_lDkCEtTd";

async function run() {
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': apikey,
        'Authorization': `Bearer ${apikey}`,
      }
    });

    const text = await response.text();
    fs.writeFileSync('scratch/openapi_raw.txt', `Status: ${response.status}\n\n${text}`);
    console.log('Status:', response.status);
  } catch (err) {
    console.error(err);
  }
}

run();
