
import { QdrantClient } from '@qdrant/js-client-rest';

// Manually config for script execution
const qdrantClient = new QdrantClient({
    url: 'https://methadesk-qdrant.ph2gu6.easypanel.host/',
    apiKey: '429683C4C977415CAAFCCE10F7D57E11',
});

async function clearTeilsysteme() {
    console.log("Clearing 'teilsysteme' collection...");
    try {
        // Scroll to get all points
        const allPoints = [];
        let next_page_offset = undefined;

        do {
            const response = await qdrantClient.scroll('teilsysteme', {
                limit: 100,
                with_payload: false,
                offset: next_page_offset,
            });
            allPoints.push(...response.points.map(p => p.id));
            next_page_offset = response.next_page_offset;
        } while (next_page_offset);

        console.log(`Found ${allPoints.length} items to delete.`);

        if (allPoints.length > 0) {
            await qdrantClient.delete('teilsysteme', {
                points: allPoints
            });
            console.log("Successfully deleted all items.");
        } else {
            console.log("Collection is already empty.");
        }

    } catch (error) {
        console.error("Error clearing collection:", error);
    }
}

clearTeilsysteme();
