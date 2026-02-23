
import { QdrantClient } from '@qdrant/js-client-rest';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_QDRANT_URL || process.env.QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY || process.env.QDRANT_API_KEY;

async function diagnose() {
    console.log('--- Qdrant Diagnosis ---');
    console.log('URL:', url);
    console.log('API Key length:', apiKey?.length || 0);

    if (!url) {
        console.error('Error: Qdrant URL is missing');
        return;
    }

    // Matching the client.ts behavior
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const client = new QdrantClient({
        url: url,
        apiKey: apiKey,
        port: url.startsWith('https') ? 443 : 6333,
    });

    try {
        console.log('Connecting to Qdrant...');
        const collections = await client.getCollections();
        console.log('Collections:', collections.collections.map(c => c.name));

        console.log('\nChecking "projekte" collection...');
        const projects = await client.scroll('projekte', { limit: 10 });
        console.log('Project IDs:');
        projects.points.forEach(p => {
            console.log(`- ID: ${p.id}, Payload ID: ${p.payload?.id}, Name: ${p.payload?.name}`);
        });

        const teilsystemeExists = collections.collections.some(c => c.name === 'teilsysteme');
        if (teilsystemeExists) {
            console.log('\nChecking "teilsysteme" collection...');
            const count = await client.count('teilsysteme');
            console.log('Count:', count.count);

            const points = await client.scroll('teilsysteme', { limit: 10 });
            console.log('Teilsysteme (first 10):');
            points.points.forEach(p => {
                const payload = p.payload || {};
                console.log(`- ID: ${p.id}, projektId: ${payload.projektId}, projekt_id: ${payload.projekt_id}, Name: ${payload.name}`);
            });
        }
        else {
            console.error('Error: "teilsysteme" collection does not exist!');
        }

    } catch (error: any) {
        console.error('Connection Error:', error.message || error);
    }
}

diagnose();
