import { DatabaseService } from './src/lib/services/db';

async function main() {
    console.log("Fetching Teilsysteme...");
    const teilsysteme = await DatabaseService.list('teilsysteme');
    const PROJEKT_ID = '29ff60bc-8e31-4085-b77a-01fe273d56e0';

    let updatedCount = 0;
    for (const ts of teilsysteme as any[]) {
        if (ts.projektId !== PROJEKT_ID) {
            console.log(`Updating Teilsystem ${ts.id} (${ts.name})`);
            const updated = { ...ts, projektId: PROJEKT_ID };
            await DatabaseService.upsert('teilsysteme', updated);
            updatedCount++;
        }
    }

    console.log(`Updated ${updatedCount} Teilsysteme to projektId ${PROJEKT_ID}.`);
}

main().catch(console.error);
