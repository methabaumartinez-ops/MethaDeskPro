


const QDRANT_URL = 'https://methadesk-qdrant.ph2gu6.easypanel.host';
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const PROJECT_ID = '29ff60bc-8e31-4085-b77a-01fe273d56e0';

async function migrate() {
    console.log('Starting migration...');

    // 1. Get all teilsysteme
    const res = await fetch(`${QDRANT_URL}/collections/teilsysteme/points/scroll`, {
        method: 'POST',
        headers: {
            'api-key': API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 100, with_payload: true })
    });

    const data = await res.json();
    const points = data.result.points;

    console.log(`Found ${points.length} points to migrate.`);

    const pointsToUpsert = points.map(p => ({
        id: p.id,
        vector: {},
        payload: {
            ...p.payload,
            projektId: p.payload.projektId || PROJECT_ID
        }
    }));

    // 2. Upsert them back
    const upsertRes = await fetch(`${QDRANT_URL}/collections/teilsysteme/points?wait=true`, {
        method: 'PUT',
        headers: {
            'api-key': API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ points: pointsToUpsert })
    });

    const upsertData = await upsertRes.json();
    console.log('Migration result:', upsertData);
}

migrate().catch(console.error);
