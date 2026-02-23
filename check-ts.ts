import { DatabaseService } from './src/lib/services/db';

async function main() {
    const ts = await DatabaseService.list('teilsysteme') as any[];
    const trag = ts.find(t => t.name && t.name.includes('Trägeraufsatz'));
    if (!trag) {
        console.log("Not found.");
    } else {
        console.log(`Found: ${trag.name} (${trag.id})`);
        console.log(`ifcUrl: ${trag.ifcUrl}`);
    }
}
main().catch(console.error);
