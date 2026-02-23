import { DatabaseService } from './src/lib/services/db';
import * as fs from 'fs';

async function main() {
    const projekte = await DatabaseService.list('projekte') as any[];
    const teilsysteme = await DatabaseService.list('teilsysteme') as any[];
    const positionen = await DatabaseService.list('positionen') as any[];
    const material = await DatabaseService.list('material') as any[];

    let broken = [];
    teilsysteme.forEach(t => {
        if (!projekte.find(p => p.id === t.projektId)) {
            broken.push(`Teilsystem ${t.id} points to unknown project ${t.projektId}`);
        }
    });
    positionen.forEach(p => {
        if (!teilsysteme.find(t => t.id === p.teilsystemId)) {
            broken.push(`Position ${p.id} points to unknown TS ${p.teilsystemId}`);
        }
    });
    material.forEach(m => {
        if (!positionen.find(p => p.id === m.positionId)) {
            broken.push(`Material ${m.id} points to unknown Position ${m.positionId}`);
        }
    });

    const output = {
        stats: {
            projekte: projekte.length,
            teilsysteme: teilsysteme.length,
            positionen: positionen.length,
            material: material.length,
        },
        broken_links: broken,
        material_data: material,
        positionen_data: positionen,
    };

    fs.writeFileSync('db-state.json', JSON.stringify(output, null, 2), 'utf-8');
}

main().catch(console.error);
