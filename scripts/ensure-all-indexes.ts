
import { QdrantClient } from '@qdrant/js-client-rest';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_QDRANT_URL || process.env.QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY || process.env.QDRANT_API_KEY;

async function setupIndexes() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const client = new QdrantClient({ url, apiKey, port: 443 });

    const collections = [
        'projekte', 'teilsysteme', 'positionen', 'unterpositionen',
        'material', 'mitarbeiter', 'fahrzeuge', 'lieferanten'
    ];

    const fields = ['projektId', 'teilsystemId', 'positionId', 'status', 'userId'];

    try {
        console.log('Ensuring indexes for all collections...');
        for (const col of collections) {
            console.log(`\nProcessing collection: ${col}`);
            try {
                // Check if collection exists
                await client.getCollection(col);

                for (const field of fields) {
                    try {
                        console.log(`- Creating index for "${field}"...`);
                        await client.createPayloadIndex(col, {
                            field_name: field,
                            field_schema: 'keyword',
                            wait: true
                        });
                    } catch (e: any) {
                        // console.log(`  (Field index already exists or error: ${e.message})`);
                    }
                }
            } catch (e: any) {
                console.log(`  Collection "${col}" does not exist yet. Skipping.`);
            }
        }
        console.log('\nAll done.');

    } catch (error: any) {
        console.error('Final Setup Error:', error.message);
    }
}

setupIndexes();
