import { DatabaseService } from './src/lib/services/db';

async function main() {
    const teilsysteme = await DatabaseService.list('teilsysteme') as any[];
    const positionen = await DatabaseService.list('positionen') as any[];

    if (teilsysteme.length === 0) {
        console.log("No teilsysteme found.");
        return;
    }

    const validTsIds = teilsysteme.map(t => t.id);
    const defaultTsId = validTsIds[0];

    for (let p of positionen) {
        if (!validTsIds.includes(p.teilsystemId)) {
            console.log(`Fixing Position ${p.id} (old TS: ${p.teilsystemId} -> new TS: ${defaultTsId})`);
            p.teilsystemId = defaultTsId;
            await DatabaseService.upsert('positionen', p);
        }
    }
    console.log("Positions fixed.");
}

main().catch(console.error);
