import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function check() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const url = process.env.NEXT_PUBLIC_QDRANT_URL;
    const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY;

    console.log('Connecting to:', url);

    const client = new QdrantClient({
        url,
        apiKey,
        port: 443
    });

    try {
        const collections = await client.getCollections();
        console.log('Collections:', collections.collections.map(c => c.name));

        const projCount = await client.count('projekte', {});
        console.log('Projects count:', projCount.count);

        if (projCount.count > 0) {
            const projects = await client.scroll('projekte', { limit: 10 });
            console.log('Project Names:');
            projects.points.forEach((p: any) => {
                console.log(`- ${p.payload.projektname} [ID: ${p.id}]`);
            });
        }
    } catch (e: any) {
        console.error('Check failed:', e.message);
    }
}

check();
