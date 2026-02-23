
import { QdrantClient } from '@qdrant/js-client-rest';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_QDRANT_URL || process.env.QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY || process.env.QDRANT_API_KEY;

async function testFilter() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const client = new QdrantClient({ url, apiKey, port: 443 });

    const testIds = [
        'p1',
        '29ff60bc-8e31-4085-b77a-001fe273d56e'
    ];

    for (const pId of testIds) {
        console.log(`\nTesting filter for projektId: "${pId}"`);
        const filter = {
            must: [
                { key: "projektId", match: { value: pId } }
            ]
        };

        try {
            const result = await client.scroll('teilsysteme', {
                filter: filter,
                limit: 10
            });
            console.log(`Found ${result.points.length} points.`);
            result.points.forEach(p => {
                console.log(`- ID: ${p.id}, projektId in payload: ${p.payload?.projektId}`);
            });
        } catch (error: any) {
            console.error(`Error:`, error.message);
        }
    }

    // Try with the "corrupted" ID
    const corruptedId = '29ff60bc-8e31-4085-b77a-001fe273d56e0';
    console.log(`\nTesting filter for CORRUPTED projektId: "${corruptedId}"`);
    const filterCorr = {
        must: [
            { key: "projektId", match: { value: corruptedId } }
        ]
    };
    try {
        const result = await client.scroll('teilsysteme', {
            filter: filterCorr,
            limit: 10
        });
        console.log(`Found ${result.points.length} points.`);
    } catch (error: any) {
        console.error(`Error:`, error.message);
    }
}

testFilter();
