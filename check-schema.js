const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking positionen...");
    const { data: posData, error: posErr } = await supabase.from('positionen').select('posNummer').limit(1);
    if (posErr) {
        console.log("Error selecting posNummer from positionen:", posErr.message);
    } else {
        console.log("posNummer exists in positionen!");
    }

    console.log("Checking unterpositionen...");
    const { data: untData, error: untErr } = await supabase.from('unterpositionen').select('posNummer').limit(1);
    if (untErr) {
        console.log("Error selecting posNummer from unterpositionen:", untErr.message);
    } else {
        console.log("posNummer exists in unterpositionen!");
    }
}

checkSchema();
