// Disable SSL verification for self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envUrl = process.env.NEXT_PUBLIC_QDRANT_URL;
let url = envUrl;

// Fallback if environment variable is the placeholder
if (!url || url === 'https://qdrant.example.com') {
    console.log('Environment URL is placeholder or missing. Using localhost...');
    url = 'http://localhost:6333';
}

const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY;

console.log(`Connecting to Qdrant at: ${url}`);

const client = new QdrantClient({
    url,
    apiKey,
    port: 443, // Force HTTPS port (443) instead of default 6333
    timeout: 60000,
});

const COLLECTIONS = [
    'projekte',
    'teilsysteme',
    'positionen',
    'material',
    'mitarbeiter',
    'fahrzeuge',
    'reservierungen'
];

async function cleanMockData() {
    console.log('Checking database connection and content...');

    try {
        const collectionsList = await client.getCollections();
        const existingNames = collectionsList.collections.map(c => c.name);
        console.log(`Connected! Found collections: ${existingNames.join(', ')}`);

        let totalDeleted = 0;

        for (const colName of COLLECTIONS) {
            if (!existingNames.includes(colName)) {
                console.log(`Collection '${colName}' does not exist.`);
                continue;
            }

            try {
                const countRes = await client.count(colName, {});
                const count = countRes.count;

                if (count > 0) {
                    console.log(`Collection '${colName}' has ${count} items. Deleting and recreating...`);

                    await client.deleteCollection(colName);
                    await client.createCollection(colName, { vectors: {} });

                    console.log(`Verified cleaned '${colName}'.`);
                    totalDeleted += count;
                } else {
                    console.log(`Collection '${colName}' is already empty.`);
                }
            } catch (error: any) {
                console.error(`Error processing '${colName}':`, error.message);
            }
        }

        console.log(`\nOperation complete. Deleted ${totalDeleted} items.`);

        if (totalDeleted === 0) {
            console.log("No data found to delete.");
        }

    } catch (error) {
        console.error("Failed to connect to Qdrant:", error);
    }
}

cleanMockData();
