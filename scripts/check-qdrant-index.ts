
import { QdrantClient } from '@qdrant/js-client-rest';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_QDRANT_URL || process.env.QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY || process.env.QDRANT_API_KEY;

async function checkIndex() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const client = new QdrantClient({ url, apiKey, port: 443 });

    try {
        console.log('Checking collection info for "teilsysteme"...');
        const info = await client.getCollection('teilsysteme');
        console.log('Payload schema:', JSON.stringify(info.payload_schema, null, 2));

        console.log('\nCreating payload index for "projektId"...');
        await client.createPayloadIndex('teilsysteme', {
            field_name: 'projektId',
            field_schema: 'keyword',
            wait: true
        });
        console.log('Index created/confirmed.');

        console.log('\nRetesting filter for "p1"...');
        const result = await client.scroll('teilsysteme', {
            filter: {
                must: [
                    { key: "projektId", match: { value: "p1" } }
                ]
            }
        });
        console.log(`Found ${result.points.length} points.`);

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

checkIndex();
