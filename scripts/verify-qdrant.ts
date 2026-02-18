// Disable SSL verification for self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY;

console.log(`Configured Qdrant URL: ${url}`);

async function verifyConnection() {
    let client: QdrantClient;

    // Try configured URL first
    if (url && url !== 'https://qdrant.example.com') {
        console.log('Attemping connection to configured URL...');
        client = new QdrantClient({ url, apiKey });
    } else {
        console.log('Configured URL is placeholder or missing. Falling back to localhost:6333...');
        client = new QdrantClient({ url: 'http://localhost:6333' });
    }

    try {
        const collections = await client.getCollections();
        console.log('Successfully connected to Qdrant!');
        console.log('Collections:', collections.collections.map(c => c.name).join(', '));
        return true;
    } catch (error) {
        console.error('Failed to connect to Qdrant:', error instanceof Error ? error.message : String(error));
        return false;
    }
}

verifyConnection();
