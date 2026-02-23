import { DatabaseService } from './src/lib/services/db';

async function main() {
    const materialId = "9450dcec-a830-4159-8dc3-c4d7038569ea";
    const positionId = "2ae221ab-f788-4ec1-a3cd-c9bd800f8a8c"; // Random valid position from DB

    console.log(`Updating Material ${materialId} to have positionId = ${positionId}`);

    const material = await DatabaseService.get('material', materialId) as any;
    if (material) {
        material.positionId = positionId;
        await DatabaseService.upsert('material', material);
        console.log("Material updated.");
    } else {
        console.log("Material not found.");
    }
}

main().catch(console.error);
