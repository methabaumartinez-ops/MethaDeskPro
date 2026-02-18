
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function check() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const url = process.env.NEXT_PUBLIC_QDRANT_URL;
    const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY;

    const client = new QdrantClient({
        url,
        apiKey,
        port: 443
    });

    try {
        const collections = await client.getCollections();
        for (const coll of collections.collections.map(c => c.name)) {
            const countRes = await client.count(coll, {});
            console.log(`- ${coll}: ${countRes.count} points`);
        }
    } catch (e: any) {
        console.error('Check failed:', e.message);
    }
}

check();
