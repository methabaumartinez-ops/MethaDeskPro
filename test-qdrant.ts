import { DatabaseService } from './src/lib/services/db';
import { qdrantClient } from './src/lib/qdrant/client';

async function main() {
    console.log("Fetching Projekte:");
    const projekte = await DatabaseService.list('projekte');
    console.log(projekte);

    console.log("Fetching Teilsysteme without filter:");
    const teilsysteme = await DatabaseService.list('teilsysteme');
    console.log(teilsysteme);

    console.log("Fetching Teilsysteme with filter projektId='p1':");
    const teilsystemeP1 = await DatabaseService.list('teilsysteme', { must: [{ key: "projektId", match: { value: "p1" } }] });
    console.log(teilsystemeP1);
}

main().catch(console.error);
