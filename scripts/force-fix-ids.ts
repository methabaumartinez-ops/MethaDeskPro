
import { QdrantClient } from '@qdrant/js-client-rest';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.NEXT_PUBLIC_QDRANT_URL || process.env.QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY || process.env.QDRANT_API_KEY;

async function forceFix() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const client = new QdrantClient({ url, apiKey, port: 443 });

    try {
        console.log('Fetching ALL teilsysteme points...');
        const result = await client.scroll('teilsysteme', {
            limit: 100,
            with_payload: true
        });

        console.log(`Analyzing ${result.points.length} points...`);
        let fixedCount = 0;

        for (const p of result.points) {
            const payload = p.payload as any;
            const pId = payload.projektId;

            // Fix 1: Longer than 36 chars (extra char at the end)
            if (pId && typeof pId === 'string' && pId.length > 36) {
                const newId = pId.substring(0, 36);
                console.log(`[FIX] Point ${p.id}: truncating projektId from "${pId}" to "${newId}"`);
                await client.setPayload('teilsysteme', {
                    payload: { projektId: newId },
                    points: [p.id],
                    wait: true
                });
                fixedCount++;
            }

            // Fix 2: "undefined" as string
            if (pId === "undefined" || payload.projekt_id === "undefined") {
                console.log(`[WARN] Point ${p.id} has "undefined" as projektid. Skipping but noted.`);
            }
        }

        console.log(`Execution finished. Total fixed: ${fixedCount}`);

    } catch (error: any) {
        console.error('Error during forceFix:', error.message);
    }
}

forceFix();
