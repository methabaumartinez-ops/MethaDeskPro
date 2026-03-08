/**
 * Create all Supabase tables via Supabase JS client
 * Uses table creation via REST + individual INSERT-based table verification
 * 
 * Strategy: Use @supabase/supabase-js which handles auth correctly,
 * and create tables via SQL through the 'rpc' or via a stored procedure approach.
 * 
 * Usage: npx tsx scripts/create-tables.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function checkConnection(): Promise<boolean> {
    // Try a simple REST call to see if we can reach PostgREST properly
    try {
        const { error } = await supabase.from('projekte').select('id').limit(1);
        // If table doesn't exist: PGRST116 (relation does not exist) - that's OK
        // If 401: auth issue
        // If 200: table exists already
        if (error) {
            if (error.message.includes('relation') || error.message.includes('does not exist') || error.code === 'PGRST116') {
                console.log('  Connected OK (table does not exist yet — ready to create)');
                return true;
            }
            if (error.message.includes('Invalid') || error.code === '401') {
                console.error('  Auth error:', error.message);
                return false;
            }
            // Any other error might also indicate connectivity
            console.log(`  Connected (response: ${error.code} ${error.message})`);
            return true;
        }
        console.log('  Connected OK (table `projekte` already exists)');
        return true;
    } catch (err: any) {
        console.error('  Connection error:', err.message);
        return false;
    }
}

async function tableExists(tableName: string): Promise<boolean> {
    const { error } = await supabase.from(tableName).select('id').limit(1);
    if (!error) return true;
    // PGRST116 or "relation does not exist" means table doesn't exist
    return !error.message?.includes('does not exist') && error.code !== 'PGRST116';
}

async function main() {
    console.log('=== Supabase Connection Test + Table Check ===\n');
    console.log(`URL: ${SUPABASE_URL}`);

    const connected = await checkConnection();
    if (!connected) {
        console.error('\n❌ Auth failure. The SERVICE_ROLE_KEY may not match the JWT_SECRET in your Supabase stack.');
        console.error('Check Easypanel → Supabase stack → Environment → JWT_SECRET and SERVICE_ROLE_KEY match.');
        process.exit(1);
    }

    // Check which tables already exist
    console.log('\n--- Table existence check ---');
    const tables = [
        'projekte', 'teilsysteme', 'positionen', 'unterpositionen',
        'mitarbeiter', 'workers', 'lieferanten', 'fahrzeuge',
        'material', 'users', 'tasks', 'bestellungen'
    ];

    for (const t of tables) {
        const exists = await tableExists(t);
        console.log(`  ${t.padEnd(25)} ${exists ? '✓ exists' : '○ not found'}`);
    }

    console.log('\n--- Summary ---');
    console.log('If tables show "not found": run supabase-schema.sql in Studio SQL Editor or psql.');
    console.log('If tables show "exists": schema is already applied, run import next.\n');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
