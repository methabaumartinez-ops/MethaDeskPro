import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import path from 'path';

// Disable SSL verification for self-signed certificates (if needed)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY;

if (!url) {
    console.error('Error: NEXT_PUBLIC_QDRANT_URL not found in .env');
    process.exit(1);
}

console.log(`Configured Qdrant URL: ${url}`);
const client = new QdrantClient({ url, apiKey });

const COLLECTIONS = [
    'projekte',
    'teilsysteme',
    'positionen',
    'material',
    'mitarbeiter',
    'fahrzeuge'
];

async function manageSnapshots() {
    const action = process.argv[2]; // 'create' or 'list'

    if (!action || !['create', 'list'].includes(action)) {
        console.log('Usage: npx tsx scripts/manage-snapshots.ts <create|list>');
        return;
    }

    console.log(`\nRunning action: ${action.toUpperCase()}...\n`);

    for (const col of COLLECTIONS) {
        try {
            const exists = await client.collectionExists(col);
            if (!exists.exists) {
                console.log(`Collection ${col} does not exist. Skipping.`);
                continue;
            }

            if (action === 'create') {
                console.log(`Creating snapshot for ${col}...`);
                const snapshot = await client.createSnapshot(col);
                console.log(`✅ Snapshot created for ${col}: ${snapshot.name} (Size: ${snapshot.size || 'unknown'} bytes)`);
            } else if (action === 'list') {
                const snapshots = await client.listSnapshots(col);
                console.log(`\nSnapshots for ${col}:`);
                if (snapshots.length === 0) {
                    console.log('  (No snapshots found)');
                } else {
                    snapshots.forEach(s => {
                        console.log(`  - ${s.name} (Created: ${s.creation_time || 'unknown'})`);
                    });
                }
            }
        } catch (error) {
            console.error(`Error processing ${col}:`, error instanceof Error ? error.message : String(error));
        }
    }
}

manageSnapshots();
