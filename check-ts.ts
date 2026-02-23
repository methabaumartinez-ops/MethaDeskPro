
import { qdrantClient } from './src/lib/qdrant/client';

async function checkTeilsysteme() {
    try {
        const collections = await qdrantClient.getCollections();
        console.log('Collections:', collections.collections.map(c => c.name));

        const response = await qdrantClient.scroll('teilsysteme', {
            limit: 100,
            with_payload: true
        });

        console.log(`Found ${response.points.length} teilsysteme:`);
        response.points.forEach(p => {
            console.log(`- ID: ${p.id}, Name: ${p.payload.name}, projektId: ${p.payload.projektId}`);
        });
    } catch (e) {
        console.error(e);
    }
}

checkTeilsysteme();
