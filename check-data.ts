import { DatabaseService } from './src/lib/services/db';

async function main() {
    console.log("Checking database foreign keys...");
    const projekte = await DatabaseService.list('projekte') as any[];
    const teilsysteme = await DatabaseService.list('teilsysteme') as any[];
    const positionen = await DatabaseService.list('positionen') as any[];
    const material = await DatabaseService.list('material') as any[];

    console.log("\n--- Projects (" + projekte.length + ") ---");
    projekte.forEach(p => console.log(p.id, p.projektname));

    console.log("\n--- Teilsysteme (" + teilsysteme.length + ") ---");
    teilsysteme.forEach(t => console.log(t.id, t.name, "-> Proj:", t.projektId));

    console.log("\n--- Positionen (" + positionen.length + ") ---");
    positionen.forEach(p => console.log(p.id, p.name, "-> TS:", p.teilsystemId));

    console.log("\n--- Material (" + material.length + ") ---");
    material.forEach(m => console.log(m.id, m.name, "-> Pos:", m.positionId));

    console.log("\nChecking broken links...");
    let broken = false;
    teilsysteme.forEach(t => {
        if (!projekte.find(p => p.id === t.projektId)) {
            console.log("Teilsystem", t.id, "points to unknown project", t.projektId);
            broken = true;
        }
    });

    positionen.forEach(p => {
        if (!teilsysteme.find(t => t.id === p.teilsystemId)) {
            console.log("Position", p.id, "points to unknown TS", p.teilsystemId);
            broken = true;
        }
    });

    material.forEach(m => {
        if (!positionen.find(p => p.id === m.positionId)) {
            console.log("Material", m.id, "points to unknown Position", m.positionId);
            broken = true;
        }
    });

    if (!broken) {
        console.log("All foreign keys are valid among these collections!");
    }
}

main().catch(console.error);
