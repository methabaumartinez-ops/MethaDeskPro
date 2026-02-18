
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
        for (const coll of ['mitarbeiter', 'users']) {
            const countRes = await client.count(coll, {});
            console.log(`Collection '${coll}' count:`, countRes.count);

            if (countRes.count > 0) {
                const results = await client.scroll(coll, { limit: 5 });
                console.log(`Sample from '${coll}':`);
                results.points.forEach((p: any) => {
                    console.log(`- ${JSON.stringify(p.payload)}`);
                });
            }
        }
    } catch (e: any) {
        console.error('Check failed:', e.message);
    }
}

check();
