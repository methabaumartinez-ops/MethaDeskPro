
import { QdrantClient } from '@qdrant/js-client-rest';

// Manually config for script execution
const qdrantClient = new QdrantClient({
    url: 'https://methadesk-qdrant.ph2gu6.easypanel.host/',
    apiKey: '429683C4C977415CAAFCCE10F7D57E11',
});

async function checkProject() {
    console.log("Checking for project 'p1'...");
    try {
        const result = await qdrantClient.retrieve('projekte', {
            ids: ['p1'],
            with_payload: true
        });

        if (result.length > 0) {
            console.log("Project FOUND:", result[0].payload);
        } else {
            console.log("Project NOT FOUND in Qdrant.");
        }
    } catch (error) {
        console.error("Error checking project:", error);
    }
}

checkProject();
