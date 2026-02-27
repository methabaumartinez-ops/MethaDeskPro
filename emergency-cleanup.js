
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
        console.warn(`Collection ${collection} failed or empty`);
    }
    return all;
}

async function main() {
    console.log("=== EMERGENCY DATABASE SANITATION ===");

    const p = await scrollAll('projekte');
    const ts = await scrollAll('teilsysteme');
    const pos = await scrollAll('positionen');
    const upos = await scrollAll('unterpositionen');
    const mat = await scrollAll('material');

    const pIds = new Set(p.map(x => x.id));
    const tsIds = new Set(ts.map(x => x.id));
    const posIds = new Set(pos.map(x => x.id));

    const badTS = ts.filter(x => x.payload.projektId && !pIds.has(x.payload.projektId));
    const badPos = pos.filter(x => x.payload.teilsystemId && !tsIds.has(x.payload.teilsystemId));
    const badUPos = upos.filter(x => x.payload.positionId && !posIds.has(x.payload.positionId));
    const badMat = mat.filter(x => x.payload.positionId && !posIds.has(x.payload.positionId));

    console.log(`Summary:`);
    console.log(`- Orphan TS: ${badTS.length}`);
    console.log(`- Orphan Pos: ${badPos.length}`);
    console.log(`- Orphan UPos: ${badUPos.length}`);
    console.log(`- Orphan Mat: ${badMat.length}`);

    if (badTS.length > 0) await client.delete('teilsysteme', { points: badTS.map(x => x.id) });
    if (badPos.length > 0) await client.delete('positionen', { points: badPos.map(x => x.id) });
    if (badUPos.length > 0) await client.delete('unterpositionen', { points: badUPos.map(x => x.id) });
    if (badMat.length > 0) await client.delete('material', { points: badMat.map(x => x.id) });

    console.log("=== DONE ===");
}

main().catch(console.error);
