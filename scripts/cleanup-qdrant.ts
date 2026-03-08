/**
 * Qdrant Cleanup — Eliminar colecciones operacionales migradas a Supabase
 * 
 * MANTIENE:
 *   - ts_tracking_docs  → AI semántica / embeddings / búsqueda vectorial
 *   - users             → Auth service (authService.ts usa Qdrant para users)
 *
 * ELIMINA:
 *   - Todas las colecciones operacionales migradas a Supabase
 * 
 * Usage: $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx tsx scripts/cleanup-qdrant.ts
 */
import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = (process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/+$/, '');
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

const client = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY,
    port: QDRANT_URL.startsWith('https') ? 443 : 6333,
    checkCompatibility: false,
    timeout: 60000,
});

// Colecciones que se MANTIENEN en Qdrant (AI / auth)
const KEEP = new Set([
    'ts_tracking_docs',    // semántica vectorial — búsqueda semántica de tracking
    'users',               // auth — authService.ts usa Qdrant para autenticación
    'conversation_logs',   // contexto de chat AI — se deja en Qdrant para RAG
    'dashboard_requests',  // logs del chat — se deja en Qdrant para contexto
]);

// Colecciones operacionales migradas a Supabase → a eliminar
const TO_DELETE = [
    'projekte',
    'teilsysteme',
    'positionen',
    'unterpositionen',
    'material',
    'mitarbeiter',
    'workers',
    'fahrzeuge',
    'fahrzeug_reservierungen',
    'reservierungen',
    'lieferanten',
    'subunternehmer',
    'teams',
    'team_members',
    'tasks',
    'subtasks',
    'ausfuehrung_tasks',
    'ausfuehrung_subtasks',
    'ausfuehrung_task_resources',
    'ausfuehrung_resources',
    'bestellungen',
    'kosten',
    'lagerorte',
    'lagerbewegungen',
    'dokumente',
    'changelog',
];

async function main() {
    console.log('=== Qdrant Cleanup — Eliminar colecciones operacionales ===\n');
    console.log(`Qdrant: ${QDRANT_URL}\n`);

    // Obtener colecciones reales existentes
    const existing = await client.getCollections();
    const existingNames = new Set(existing.collections.map(c => c.name));

    console.log(`Colecciones existentes: ${existingNames.size}`);
    console.log([...existingNames].map(n => `  ${KEEP.has(n) ? '🔒 KEEP' : '🗑  DEL '} ${n}`).join('\n'));
    console.log('');

    let deleted = 0;
    let skipped = 0;
    let notFound = 0;

    for (const name of TO_DELETE) {
        if (KEEP.has(name)) {
            console.log(`  SKIP (protected): ${name}`);
            skipped++;
            continue;
        }

        if (!existingNames.has(name)) {
            console.log(`  ○ not found:      ${name}`);
            notFound++;
            continue;
        }

        try {
            await client.deleteCollection(name);
            console.log(`  ✓ deleted:        ${name}`);
            deleted++;
        } catch (err: any) {
            console.error(`  ✗ ERROR:          ${name} → ${err.message}`);
        }
    }

    console.log(`\n=== Resultado ===`);
    console.log(`  Eliminadas: ${deleted}`);
    console.log(`  No encontradas: ${notFound}`);
    console.log(`  Protegidas (skip): ${skipped}`);

    // Verificar estado final
    const after = await client.getCollections();
    console.log(`\nColecciones restantes en Qdrant (${after.collections.length}):`);
    after.collections.forEach(c => console.log(`  - ${c.name}`));
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
