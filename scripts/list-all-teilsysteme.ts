
import { QdrantClient } from '@qdrant/js-client-rest';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_QDRANT_URL || process.env.QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY || process.env.QDRANT_API_KEY;

async function listAll() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const client = new QdrantClient({ url, apiKey, port: 443 });

    try {
        console.log('Listing ALL teilsysteme...');
        const result = await client.scroll('teilsysteme', {
            limit: 100,
            with_payload: true
        });

        console.log(`Total retrieved: ${result.points.length}`);
        result.points.forEach(p => {
            console.log(`- ID: ${p.id}`);
            console.log(`  Payload RAW: ${JSON.stringify(p.payload)}`);
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

listAll();
