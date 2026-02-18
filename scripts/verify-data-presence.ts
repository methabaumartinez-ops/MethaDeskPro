import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Using absolute-like path from root since we run from root
import { qdrantClient } from '../src/lib/qdrant/client';

async function verify() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('Checking connection to:', process.env.NEXT_PUBLIC_QDRANT_URL);
    try {
        const collections = await qdrantClient.getCollections();
        console.log('Available collections:', collections.collections.map(c => c.name));

        for (const col of collections.collections) {
            const count = await qdrantClient.count(col.name, {});
            console.log(`- ${col.name}: ${count.count} items`);

            if (col.name === 'projekte' && count.count > 0) {
                const projects = await qdrantClient.scroll('projekte', { limit: 5 });
                console.log('Sample Projects:');
                projects.points.forEach(p => console.log(`  > ${p.payload?.projektname} (${p.payload?.projektnummer})`));
            }
        }
    } catch (e: any) {
        console.error('VERIFICATION FAILED:', e.message);
    }
}

verify();
