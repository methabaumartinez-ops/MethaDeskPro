/**
 * Apply Schema via direct Postgres connection
 * 
 * Supabase self-hosted (Easypanel) exposes Postgres via:
 * - Host: POSTGRES_HOST env var (or try common Easypanel patterns)
 * - Port: 5432
 * 
 * Usage: npx tsx scripts/apply-schema-pg.ts
 * 
 * Requires in .env:
 *   SUPABASE_DB_HOST   = VPS IP or Easypanel Postgres domain
 *   SUPABASE_DB_PASS   = Postgres password (POSTGRES_PASSWORD in Supabase stack)
 *   or
 *   POSTGRES_HOST / POSTGRES_PASSWORD
 */
import 'dotenv/config';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const SCHEMA_FILE = path.join(__dirname, 'supabase-schema.sql');

// Try multiple possible host configurations
const dbHost = process.env.SUPABASE_DB_HOST || process.env.POSTGRES_HOST || 'localhost';
const dbPass = process.env.SUPABASE_DB_PASS || process.env.POSTGRES_PASSWORD || 'postgres';
const dbPort = parseInt(process.env.POSTGRES_PORT || '5432');
const dbName = process.env.POSTGRES_DB || 'postgres';
const dbUser = process.env.POSTGRES_USER || 'postgres';

async function applySchema(host: string): Promise<boolean> {
    const client = new Client({
        host,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPass,
        connectionTimeoutMillis: 5000,
        ssl: host !== 'localhost' && host !== '127.0.0.1' ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log(`  Connecting to postgres://${dbUser}@${host}:${dbPort}/${dbName}...`);
        await client.connect();
        console.log('  ✓ Connected!');

        const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8');
        console.log(`  Executing schema (${schema.length} bytes)...`);

        await client.query(schema);
        console.log('  ✓ Schema applied successfully!');
        await client.end();
        return true;
    } catch (err: any) {
        try { await client.end(); } catch {}
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
            console.log(`  ✗ Cannot reach ${host}: ${err.message}`);
            return false;
        }
        // Other errors (SQL errors) — still connected, report SQL issue
        console.error(`  ✗ SQL Error: ${err.message}`);
        throw err;
    }
}

async function main() {
    console.log('=== Apply Supabase Schema via Postgres ===\n');
    console.log(`DB: ${dbUser}@${dbHost}:${dbPort}/${dbName}\n`);

    const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8');
    
    // Try the configured host first
    const hosts = [dbHost];
    
    // Add common Easypanel patterns if not already covered
    const extraHosts = [
        'methadesk-supabase-db.ph2gu6.easypanel.host',
        'methadesk-db.ph2gu6.easypanel.host',
    ].filter(h => !hosts.includes(h));
    hosts.push(...extraHosts);

    for (const host of hosts) {
        console.log(`\nTrying host: ${host}`);
        const success = await applySchema(host);
        if (success) {
            console.log('\n✅ Schema applied! Tables created in Postgres.');
            return;
        }
    }

    console.error('\n❌ Could not connect to Postgres via any known host.');
    console.error('\nTo apply the schema manually, run in your VPS:');
    console.error('  docker ps | grep supabase | grep db   # Find the DB container');
    console.error('  docker exec -i <container_id> psql -U postgres postgres < supabase-schema.sql');
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
