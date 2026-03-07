/**
 * Import Qdrant-exported data into self-hosted Supabase (Postgres)
 * 
 * Usage:  npx tsx scripts/import-to-supabase.ts
 * 
 * Requires env vars (set in Easypanel or .env.local):
 *   SUPABASE_URL         = http://supabase-kong:8000 (or external domain)
 *   SUPABASE_SERVICE_ROLE_KEY = your self-hosted service_role JWT
 * 
 * This script:
 *   1. Reads JSON exports from scripts/qdrant-export/
 *   2. Validates FK relationships (orphan detection)
 *   3. Imports valid records into Supabase via REST API
 *   4. Reports orphans, errors, and skipped records
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[Import] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    console.error('For self-hosted Easypanel: use internal Kong URL (http://supabase-kong:8000)');
    console.error('or external domain (https://supabase.yourdomain.com).');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const EXPORT_DIR = path.join(__dirname, 'qdrant-export');

// Import order matters — parents before children (FK constraints)
const IMPORT_ORDER = [
    'projekte',
    'mitarbeiter',
    'workers',
    'lieferanten',
    'subunternehmer',
    'fahrzeuge',
    'material',
    'lagerorte',
    'users',
    'teams',
    'ausfuehrung_resources',
    // Children
    'teilsysteme',
    'positionen',
    'unterpositionen',
    'lagerbewegungen',
    'fahrzeug_reservierungen',
    'reservierungen',
    'bestellungen',
    'kosten',
    'team_members',
    'tasks',
    'subtasks',
    'ausfuehrung_tasks',
    'ausfuehrung_subtasks',
    'ausfuehrung_task_resources',
    'dashboard_requests',
    'conversation_logs',
    'dokumente',
    'changelog',
];

// Fields that should NOT be sent to Supabase (auto-managed)
const SKIP_FIELDS = ['created_at', 'updated_at'];

function cleanRecord(record: any): any {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(record)) {
        if (SKIP_FIELDS.includes(key)) continue;
        // Convert undefined/null dates to null
        if (value === '' || value === undefined) {
            cleaned[key] = null;
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

async function importCollection(name: string, records: any[]): Promise<{inserted: number; errors: number; skipped: number}> {
    let inserted = 0;
    let errors = 0;
    let skipped = 0;

    // Batch upsert in chunks of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE).map(cleanRecord);

        const { data, error } = await supabase
            .from(name)
            .upsert(batch as any, { onConflict: 'id', ignoreDuplicates: false })
            .select('id');

        if (error) {
            console.error(`  [ERROR] ${name} batch ${i}-${i + batch.length}: ${error.message}`);
            errors += batch.length;

            // Retry one-by-one for the failed batch
            for (const record of batch) {
                const { error: singleError } = await supabase
                    .from(name)
                    .upsert(record as any, { onConflict: 'id' });

                if (singleError) {
                    console.error(`    [SKIP] ${record.id}: ${singleError.message}`);
                    skipped++;
                } else {
                    inserted++;
                    errors--; // Correct the batch error count
                }
            }
        } else {
            inserted += data?.length || batch.length;
        }
    }

    return { inserted, errors, skipped };
}

async function detectOrphans(data: Record<string, any[]>): Promise<{orphans: Record<string, any[]>; report: string[]}> {
    const report: string[] = [];
    const orphans: Record<string, any[]> = {};
    const projectIds = new Set((data['projekte'] || []).map(p => p.id));
    const tsIds = new Set((data['teilsysteme'] || []).map(t => t.id));
    const posIds = new Set((data['positionen'] || []).map(p => p.id));

    // TS without valid project
    const orphanTs = (data['teilsysteme'] || []).filter(t => t.projektId && !projectIds.has(t.projektId));
    if (orphanTs.length > 0) {
        orphans['teilsysteme'] = orphanTs;
        report.push(`[ORPHAN] ${orphanTs.length} Teilsysteme without valid projektId`);
    }

    // Pos without valid TS
    const orphanPos = (data['positionen'] || []).filter(p => p.teilsystemId && !tsIds.has(p.teilsystemId));
    if (orphanPos.length > 0) {
        orphans['positionen'] = orphanPos;
        report.push(`[ORPHAN] ${orphanPos.length} Positionen without valid teilsystemId`);
    }

    // UntPos without valid Pos
    const orphanUntPos = (data['unterpositionen'] || []).filter(u => u.positionId && !posIds.has(u.positionId));
    if (orphanUntPos.length > 0) {
        orphans['unterpositionen'] = orphanUntPos;
        report.push(`[ORPHAN] ${orphanUntPos.length} Unterpositionen without valid positionId`);
    }

    if (report.length === 0) report.push('[OK] No orphans detected');
    return { orphans, report };
}

async function main() {
    console.log('=== Qdrant → Supabase Import ===\n');
    console.log(`Supabase URL: ${SUPABASE_URL}`);

    if (!fs.existsSync(EXPORT_DIR)) {
        console.error(`Export dir not found: ${EXPORT_DIR}`);
        console.error('Run `npx tsx scripts/export-qdrant-data.ts` first.');
        process.exit(1);
    }

    // Load all exported data
    const allData: Record<string, any[]> = {};
    for (const collection of IMPORT_ORDER) {
        const filePath = path.join(EXPORT_DIR, `${collection}.json`);
        if (fs.existsSync(filePath)) {
            allData[collection] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } else {
            allData[collection] = [];
        }
    }

    // Orphan detection
    console.log('\n--- Orphan Detection ---');
    const { orphans, report } = await detectOrphans(allData);
    report.forEach(line => console.log(`  ${line}`));

    // Save orphans to separate file
    if (Object.keys(orphans).length > 0) {
        const orphanFile = path.join(EXPORT_DIR, '_orphans.json');
        fs.writeFileSync(orphanFile, JSON.stringify(orphans, null, 2));
        console.log(`  Orphans saved to: ${orphanFile}`);
    }

    // Filter out orphans from import data (but keep the orphan records in the _orphans.json file for review)
    const orphanIds = new Set<string>();
    for (const orphanList of Object.values(orphans)) {
        orphanList.forEach(o => orphanIds.add(o.id));
    }

    console.log('\n--- Importing to Supabase ---');
    let totalInserted = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    for (const collection of IMPORT_ORDER) {
        const records = (allData[collection] || []).filter(r => !orphanIds.has(r.id));
        if (records.length === 0) {
            console.log(`  ${collection.padEnd(30)} ○ empty/skipped`);
            continue;
        }

        const result = await importCollection(collection, records);
        totalInserted += result.inserted;
        totalErrors += result.errors;
        totalSkipped += result.skipped;

        const status = result.errors > 0
            ? `✓ ${result.inserted} | ✗ ${result.errors} errors | ⊘ ${result.skipped} skipped`
            : `✓ ${result.inserted} records`;
        console.log(`  ${collection.padEnd(30)} ${status}`);
    }

    console.log(`\n--- Summary ---`);
    console.log(`  Inserted: ${totalInserted}`);
    console.log(`  Errors:   ${totalErrors}`);
    console.log(`  Skipped:  ${totalSkipped}`);
    console.log(`  Orphans:  ${orphanIds.size} (saved to _orphans.json for review)`);

    // Save import report
    const reportFile = path.join(EXPORT_DIR, '_import_report.txt');
    fs.writeFileSync(reportFile, [
        `Supabase Import Report`,
        `Date: ${new Date().toISOString()}`,
        `Target: ${SUPABASE_URL}`,
        `Inserted: ${totalInserted}`,
        `Errors: ${totalErrors}`,
        `Skipped: ${totalSkipped}`,
        `Orphans: ${orphanIds.size}`,
    ].join('\n'));

    console.log(`\nReport saved to: ${reportFile}`);
}

main().catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
});
