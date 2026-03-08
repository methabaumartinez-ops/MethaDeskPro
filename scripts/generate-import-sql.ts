/**
 * Generate SQL INSERT file from Qdrant export
 * 
 * Instead of calling Supabase REST API (auth issues),
 * this script generates a .sql file with INSERTs that can be
 * run directly in Supabase Studio SQL Editor.
 * 
 * Usage: npx tsx scripts/generate-import-sql.ts
 * Output: scripts/import-data.sql  (paste into Studio SQL Editor)
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const EXPORT_DIR = path.join(__dirname, 'qdrant-export');
const OUTPUT_FILE = path.join(__dirname, 'import-data.sql');

/** Escape SQL string values */
function sqlStr(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
}

/** Build INSERT for a table */
function buildInserts(table: string, rows: any[], columns: string[]): string {
    if (rows.length === 0) return `-- No data for ${table}\n`;
    
    const lines: string[] = [`-- ${table.toUpperCase()} (${rows.length} rows)`];
    
    for (const row of rows) {
        const colList = columns.map(c => `"${c}"`).join(', ');
        const valList = columns.map(c => {
            const val = row[c];
            return sqlStr(val);
        }).join(', ');
        lines.push(`INSERT INTO ${table} (${colList}) VALUES (${valList}) ON CONFLICT (id) DO NOTHING;`);
    }
    return lines.join('\n') + '\n';
}

function readCollection(name: string): any[] {
    const file = path.join(EXPORT_DIR, `${name}.json`);
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

async function main() {
    console.log('=== Generating SQL Import File ===\n');

    const sql: string[] = [
        '-- ============================================================',
        '-- MethaDeskPro — Qdrant to Supabase Data Migration',
        `-- Generated: ${new Date().toISOString()}`,
        '-- Paste this into Supabase Studio > SQL Editor and run.',
        '-- ============================================================\n',
        'BEGIN;\n',
    ];

    // --- PROJEKTE ---
    const projekte = readCollection('projekte');
    sql.push(buildInserts('projekte', projekte, [
        'id', 'projektname', 'projektnummer', 'strasse', 'plz', 'ort',
        'bauleiter', 'projektleiter', 'polier', 'status', 'description',
        'image', 'deletedAt', 'archived',
    ]));

    // --- TEILSYSTEME ---
    const teilsysteme = readCollection('teilsysteme');
    const projektIds = new Set(projekte.map(p => p.id));
    const validTs = teilsysteme.filter(t => !t.projektId || projektIds.has(t.projektId));
    const tsIds = new Set(validTs.map(t => t.id));
    sql.push(buildInserts('teilsysteme', validTs, [
        'id', 'projektId', 'name', 'teilsystemNummer', 'ks', 'status',
        'planStatus', 'abteilung', 'verantwortlich', 'lieferfrist',
        'montagetermin', 'abgabePlaner', 'bemerkung', 'montageterminSetByBauleiter',
        'unternehmer',
    ]));

    // --- POSITIONEN ---
    const positionen = readCollection('positionen');
    const validPos = positionen.filter(p => !p.teilsystemId || tsIds.has(p.teilsystemId));
    const posIds = new Set(validPos.map(p => p.id));
    sql.push(buildInserts('positionen', validPos, [
        'id', 'teilsystemId', 'projektId', 'name', 'nummer', 'status',
        'planStatus', 'abteilung', 'menge', 'einheit', 'material',
        'lieferant', 'preis', 'lieferfrist', 'bemerkung',
    ]));

    // --- UNTERPOSITIONEN (only valid ones) ---
    const unterpositionen = readCollection('unterpositionen');
    const validUntPos = unterpositionen.filter(u => u.positionId && posIds.has(u.positionId));
    const orphanUntPos = unterpositionen.length - validUntPos.length;
    console.log(`  unterpositionen: ${validUntPos.length} valid / ${orphanUntPos} orphaned (skipped)`);
    sql.push(buildInserts('unterpositionen', validUntPos, [
        'id', 'positionId', 'teilsystemId', 'projektId', 'name', 'nummer',
        'status', 'planStatus', 'abteilung', 'menge', 'einheit', 'material',
        'lieferant', 'preis', 'lieferfrist', 'bemerkung',
    ]));

    // --- MITARBEITER ---
    const mitarbeiter = readCollection('mitarbeiter');
    sql.push(buildInserts('mitarbeiter', mitarbeiter, [
        'id', 'vorname', 'nachname', 'email', 'telefon', 'rolle',
        'abteilung', 'aktiv', 'isGlobal', 'projektId',
    ]));

    // --- WORKERS ---
    const workers = readCollection('workers');
    sql.push(buildInserts('workers', workers, [
        'id', 'vorname', 'nachname', 'rolle', 'abteilung', 'aktiv', 'isGlobal', 'projektId',
    ]));

    // --- FAHRZEUGE ---
    const fahrzeuge = readCollection('fahrzeuge');
    sql.push(buildInserts('fahrzeuge', fahrzeuge, [
        'id', 'bezeichnung', 'name', 'typ', 'status', 'standort',
        'geprueftBis', 'kennzeichen', 'bemerkung',
    ]));

    // --- FAHRZEUG_RESERVIERUNGEN ---
    const fahresrv = readCollection('fahrzeug_reservierungen');
    sql.push(buildInserts('fahrzeug_reservierungen', fahresrv, [
        'id', 'fahrzeugId', 'projektId', 'mitarbeiterId', 'startDatum', 'endDatum', 'zweck', 'status',
    ]));

    // --- LAGERORTE ---
    const lagerorte = readCollection('lagerorte');
    sql.push(buildInserts('lagerorte', lagerorte, [
        'id', 'projektId', 'name', 'beschreibung', 'typ', 'image',
    ]));

    // --- LAGERBEWEGUNGEN ---
    const lagerbew = readCollection('lagerbewegungen');
    sql.push(buildInserts('lagerbewegungen', lagerbew, [
        'id', 'lagerortId', 'projektId', 'typ', 'bezeichnung', 'menge',
        'einheit', 'datum', 'benutzer', 'bemerkung',
    ]));

    // --- BESTELLUNGEN ---
    const bestellungen = readCollection('bestellungen');
    sql.push(buildInserts('bestellungen', bestellungen, [
        'id', 'projektId', 'status', 'bestelldatum', 'bestelltVon',
        'containerBez', 'items', 'bemerkung',
    ]));

    // --- TEAMS ---
    const teams = readCollection('teams');
    sql.push(buildInserts('teams', teams, [
        'id', 'name', 'projektId', 'beschreibung',
    ]));
    const teamIds = new Set(teams.map(t => t.id));

    // --- TEAM_MEMBERS ---
    const teamMembers = readCollection('team_members');
    const validMembers = teamMembers.filter(m => !m.teamId || teamIds.has(m.teamId));
    sql.push(buildInserts('team_members', validMembers, [
        'id', 'teamId', 'workerId', 'rolle',
    ]));

    // --- TASKS ---
    const tasks = readCollection('tasks');
    sql.push(buildInserts('tasks', tasks, [
        'id', 'teamId', 'projektId', 'teilsystemId', 'title', 'description',
        'status', 'priority', 'assignedTo', 'dueDate', 'sourceType',
    ]));
    const taskIds = new Set(tasks.map(t => t.id));

    // --- SUBTASKS ---
    const subtasks = readCollection('subtasks');
    const validSubtasks = subtasks.filter(s => !s.taskId || taskIds.has(s.taskId));
    sql.push(buildInserts('subtasks', validSubtasks, [
        'id', 'taskId', 'title', 'completed',
    ]));

    // --- AUSFUEHRUNG_TASKS ---
    const ausftasks = readCollection('ausfuehrung_tasks');
    sql.push(buildInserts('ausfuehrung_tasks', ausftasks, [
        'id', 'projektId', 'teilsystemId', 'title', 'description',
        'status', 'priority', 'assignedTo', 'dueDate',
    ]));
    const ausftaskIds = new Set(ausftasks.map(t => t.id));

    // --- AUSFUEHRUNG_SUBTASKS ---
    const ausfsubtasks = readCollection('ausfuehrung_subtasks');
    const validAusfSubtasks = ausfsubtasks.filter(s => !s.taskId || ausftaskIds.has(s.taskId));
    sql.push(buildInserts('ausfuehrung_subtasks', validAusfSubtasks, [
        'id', 'taskId', 'title', 'completed',
    ]));

    // --- USERS ---
    const users = readCollection('users');
    sql.push(buildInserts('users', users, [
        'id', 'username', 'email', 'passwordHash', 'role', 'name', 'department', 'aktiv',
    ]));

    // --- DASHBOARD_REQUESTS ---
    const dashReqs = readCollection('dashboard_requests');
    sql.push(buildInserts('dashboard_requests', dashReqs, [
        'id', 'userId', 'projektId', 'action', 'status', 'payload',
    ]));

    // --- CHANGELOG ---
    const changelog = readCollection('changelog');
    sql.push(buildInserts('changelog', changelog, [
        'id', 'entityId', 'entityType', 'projektId', 'field',
        'oldValue', 'newValue', 'changedBy',
    ]));

    sql.push('\nCOMMIT;');

    const sqlContent = sql.join('\n');
    fs.writeFileSync(OUTPUT_FILE, sqlContent, 'utf-8');

    const lineCount = sqlContent.split('\n').length;
    const sizeKb = Math.round(sqlContent.length / 1024);
    console.log(`\n✅ Generated: ${OUTPUT_FILE}`);
    console.log(`   Lines: ${lineCount.toLocaleString()}`);
    console.log(`   Size:  ~${sizeKb} KB`);
    console.log('\nNext step: Paste scripts/import-data.sql into Supabase Studio → SQL Editor → Run');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
