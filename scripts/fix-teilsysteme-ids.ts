
import { QdrantClient } from '@qdrant/js-client-rest';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_QDRANT_URL || process.env.QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY || process.env.QDRANT_API_KEY;

async function fixData() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const client = new QdrantClient({ url, apiKey, port: 443 });

    try {
        console.log('Fetching all teilsysteme to fix...');
        const result = await client.scroll('teilsysteme', {
            limit: 100,
            with_payload: true
        });

        let fixedCount = 0;
        for (const p of result.points) {
            const payload = p.payload as any;
            const pId = payload.projektId;

            if (pId && typeof pId === 'string' && pId.length === 37) {
                const correctId = pId.substring(0, 36);
                console.log(`Fixing teilsystem ${p.id}: changing ${pId} to ${correctId}`);
                await client.upsert('teilsysteme', {
                    wait: true,
                    points: [
                        {
                            id: p.id,
                            payload: { ...payload, projektId: correctId },
                            vector: {}
                        }
                    ]
                });
                fixedCount++;
            }
        }

        console.log(`Done. Fixed ${fixedCount} teilsysteme.`);

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

fixData();
