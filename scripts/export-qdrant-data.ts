/**
 * Export Qdrant Collections to JSON
 * 
 * Usage:  npx tsx scripts/export-qdrant-data.ts
 * 
 * Exports all operational data from Qdrant collections into JSON files
 * in scripts/qdrant-export/. This is the backup step before migrating to Supabase.
 * 
 * Also performs orphan detection:
 *   - TS without valid projektId
 *   - Positionen without valid teilsystemId
 *   - Unterpositionen without valid positionId
 */
import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import * as fs from 'fs';
import * as path from 'path';

const QDRANT_URL = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/+$/, '');
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

const client = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
    port: QDRANT_URL.startsWith('https') ? 443 : 6333,
    checkCompatibility: false,
    timeout: 60000,
});

const COLLECTIONS = [
    'projekte', 'teilsysteme', 'positionen', 'unterpositionen',
    'material', 'mitarbeiter', 'workers', 'fahrzeuge',
    'fahrzeug_reservierungen', 'reservierungen', 'lieferanten', 'subunternehmer',
    'teams', 'team_members', 'tasks', 'subtasks',
    'ausfuehrung_tasks', 'ausfuehrung_subtasks', 'ausfuehrung_task_resources', 'ausfuehrung_resources',
    'bestellungen', 'kosten', 'users', 'dashboard_requests', 'conversation_logs',
    'lagerorte', 'lagerbewegungen', 'dokumente', 'changelog',
];

const OUTPUT_DIR = path.join(__dirname, 'qdrant-export');

async function scrollAll(collection: string): Promise<any[]> {
    const allPoints: any[] = [];
    let nextOffset: any = undefined;

    try {
        do {
            const response = await client.scroll(collection, {
                limit: 100,
                with_payload: true,
                with_vector: false,
                offset: nextOffset,
            });
            allPoints.push(...response.points);
            nextOffset = response.next_page_offset;
        } while (nextOffset);
    } catch (err: any) {
        if (err.message?.includes('Not found') || err.status === 404) {
            return []; // Collection doesn't exist
        }
        throw err;
    }

    return allPoints.map(p => ({ id: p.id, ...p.payload }));
}

async function detectOrphans(data: Record<string, any[]>) {
    const report: string[] = [];
    const projectIds = new Set((data['projekte'] || []).map(p => p.id));
    const tsIds = new Set((data['teilsysteme'] || []).map(t => t.id));
    const posIds = new Set((data['positionen'] || []).map(p => p.id));

    // TS without valid project
    const orphanTs = (data['teilsysteme'] || []).filter(t => t.projektId && !projectIds.has(t.projektId));
    if (orphanTs.length > 0) {
        report.push(`\n[ORPHAN] ${orphanTs.length} Teilsysteme without valid projektId:`);
        orphanTs.forEach(t => report.push(`  - TS ${t.teilsystemNummer || t.id} -> projektId: ${t.projektId}`));
    }

    // Positionen without valid TS
    const orphanPos = (data['positionen'] || []).filter(p => p.teilsystemId && !tsIds.has(p.teilsystemId));
    if (orphanPos.length > 0) {
        report.push(`\n[ORPHAN] ${orphanPos.length} Positionen without valid teilsystemId:`);
        orphanPos.forEach(p => report.push(`  - Pos ${p.nummer || p.id} -> teilsystemId: ${p.teilsystemId}`));
    }

    // Unterpositionen without valid Position
    const orphanUntPos = (data['unterpositionen'] || []).filter(u => u.positionId && !posIds.has(u.positionId));
    if (orphanUntPos.length > 0) {
        report.push(`\n[ORPHAN] ${orphanUntPos.length} Unterpositionen without valid positionId:`);
        orphanUntPos.forEach(u => report.push(`  - UntPos ${u.nummer || u.id} -> positionId: ${u.positionId}`));
    }

    if (report.length === 0) {
        report.push('\n[OK] No orphaned records detected.');
    }

    return report.join('\n');
}

async function main() {
    console.log('=== Qdrant Data Export ===\n');
    console.log(`Connecting to: ${QDRANT_URL}\n`);

    // Create output dir
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const allData: Record<string, any[]> = {};
    let totalRecords = 0;

    for (const collection of COLLECTIONS) {
        try {
            const data = await scrollAll(collection);
            allData[collection] = data;
            totalRecords += data.length;

            const outFile = path.join(OUTPUT_DIR, `${collection}.json`);
            fs.writeFileSync(outFile, JSON.stringify(data, null, 2));

            const status = data.length > 0 ? `✓ ${data.length} records` : '○ empty';
            console.log(`  ${collection.padEnd(30)} ${status}`);
        } catch (err: any) {
            console.error(`  ${collection.padEnd(30)} ✗ ERROR: ${err.message}`);
        }
    }

    console.log(`\n  TOTAL: ${totalRecords} records across ${COLLECTIONS.length} collections\n`);

    // Orphan detection
    console.log('=== Orphan Detection ===');
    const orphanReport = await detectOrphans(allData);
    console.log(orphanReport);

    // Save report
    const reportFile = path.join(OUTPUT_DIR, '_export_report.txt');
    const report = [
        `Qdrant Export Report`,
        `Date: ${new Date().toISOString()}`,
        `Source: ${QDRANT_URL}`,
        `Total Records: ${totalRecords}`,
        ``,
        `Per Collection:`,
        ...Object.entries(allData).map(([k, v]) => `  ${k}: ${v.length}`),
        ``,
        `Orphan Detection:`,
        orphanReport,
    ].join('\n');
    fs.writeFileSync(reportFile, report);
    console.log(`\nReport saved to: ${reportFile}`);
}

main().catch(err => {
    console.error('Export failed:', err);
    process.exit(1);
});
