/**
 * Apply Supabase Schema — Self-Hosted
 * 
 * Reads scripts/supabase-schema.sql and executes it against the self-hosted
 * Supabase instance using the REST API via Kong gateway.
 * 
 * Usage: npx tsx scripts/apply-schema.ts
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[Schema] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
    process.exit(1);
}

const SCHEMA_FILE = path.join(__dirname, 'supabase-schema.sql');

async function testConnection(): Promise<boolean> {
    try {
        console.log(`Testing connection to: ${SUPABASE_URL}`);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY!,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
        });
        console.log(`  Status: ${response.status} ${response.statusText}`);
        // 401 on /rest/v1/ root is normal for PostgREST — it means the server IS reachable
        return response.ok || response.status === 200 || response.status === 401;
    } catch (err: any) {
        console.error(`  Connection failed: ${err.message}`);
        return false;
    }
}

/**
 * Execute SQL via the pg-meta query endpoint (available in self-hosted Supabase)
 * Endpoint: POST /pg-meta/default/query
 */
async function executeSqlViaPgMeta(sql: string): Promise<boolean> {
    const endpoints = [
        '/pg-meta/default/query',
        '/pg/query',
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`  Trying pg-meta endpoint: ${endpoint}`);
            const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_KEY!,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                },
                body: JSON.stringify({ query: sql }),
            });

            if (response.ok) {
                console.log(`  ✓ Schema executed via ${endpoint}`);
                return true;
            } else {
                const text = await response.text();
                console.log(`  ${endpoint}: ${response.status} — ${text.substring(0, 200)}`);
            }
        } catch (err: any) {
            console.log(`  ${endpoint}: ${err.message}`);
        }
    }
    return false;
}

/**
 * Execute SQL by creating tables one at a time via individual statements
 * Split the schema file and execute each CREATE TABLE separately
 */
async function executeSqlStatementByStatement(sql: string): Promise<boolean> {
    // Split by semicolons, keeping only meaningful statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 10 && !s.startsWith('--'));

    console.log(`  Executing ${statements.length} SQL statements...`);
    let succeeded = 0;
    let failed = 0;

    for (const stmt of statements) {
        try {
            const response = await fetch(`${SUPABASE_URL}/pg-meta/default/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_KEY!,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                },
                body: JSON.stringify({ query: stmt + ';' }),
            });

            if (response.ok) {
                succeeded++;
            } else {
                const text = await response.text();
                // Check if it's just a "already exists" error
                if (text.includes('already exists')) {
                    succeeded++;
                } else {
                    console.error(`  [FAIL] ${stmt.substring(0, 60)}... → ${text.substring(0, 100)}`);
                    failed++;
                }
            }
        } catch (err: any) {
            console.error(`  [ERROR] ${stmt.substring(0, 60)}... → ${err.message}`);
            failed++;
        }
    }

    console.log(`  Results: ${succeeded} succeeded, ${failed} failed`);
    return failed === 0;
}

async function main() {
    console.log('=== Apply Supabase Schema ===\n');

    // Test connectivity
    const connected = await testConnection();
    if (!connected) {
        console.error('\n❌ Cannot reach Supabase at:', SUPABASE_URL);
        console.error('If running locally but Supabase is on the VPS:');
        console.error('  - The internal Docker URL is not accessible from your local machine');
        console.error('  - You need the external Supabase URL (e.g., https://supabase.yourdomain.com)');
        console.error('  - Or run this script directly on the VPS');
        process.exit(1);
    }

    console.log('✓ Connected to Supabase\n');

    // Read schema
    const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8');
    console.log(`Schema file: ${SCHEMA_FILE} (${schema.length} bytes)\n`);

    // Try full execution first
    console.log('Attempting full schema execution...');
    const fullSuccess = await executeSqlViaPgMeta(schema);

    if (!fullSuccess) {
        console.log('\nFull execution failed. Trying statement-by-statement...');
        await executeSqlStatementByStatement(schema);
    }

    console.log('\n=== Schema application complete ===');
}

main().catch(err => {
    console.error('Schema application failed:', err);
    process.exit(1);
});
