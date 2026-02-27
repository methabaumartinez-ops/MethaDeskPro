
const { QdrantClient } = require('@qdrant/js-client-rest');

const url = 'https://methadesk-qdrant.ph2gu6.easypanel.host/';
const apiKey = '429683C4C977415CAAFCCE10F7D57E11';

const client = new QdrantClient({ url, apiKey, port: 443 });

async function scrollAll(collection) {
    let all = [];
    let offset = undefined;
    try {
        do {
            const res = await client.scroll(collection, { limit: 100, offset, with_payload: true });
            all.push(...res.points);
            offset = res.next_page_offset;
        } while (offset);
    } catch (e) {
        console.warn(`Collection ${collection} fail`);
    }
    return all;
}

async function main() {
    console.log("Auditing relationship IDs...");
    const positions = await scrollAll('positionen');
    const upos = await scrollAll('unterpositionen');

    console.log(`Total Positions: ${positions.length}`);
    console.log(`Total UPos: ${upos.length}`);

    if (positions.length > 0) {
        const p0 = positions[0];
        console.log(`\nSample Position ID: ${p0.id}`);
        console.log(`Sample Position Payload ID: ${p0.payload.id}`);

        const children = upos.filter(u => u.payload.positionId === p0.id || u.payload.positionId === p0.payload.id);
        console.log(`UPos linked to this sample: ${children.length}`);

        if (upos.length > 0) {
            console.log(`\nSample UPos parent ID (positionId): ${upos[0].payload.positionId}`);
        }
    }
}

main().catch(console.error);
