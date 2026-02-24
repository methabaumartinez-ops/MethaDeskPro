
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new QdrantClient({
    url: process.env.NEXT_PUBLIC_QDRANT_URL,
    apiKey: process.env.NEXT_PUBLIC_QDRANT_API_KEY || undefined,
    port: process.env.NEXT_PUBLIC_QDRANT_URL?.startsWith('https') ? 443 : 6333,
});

async function importMachinesFull() {
    console.log('Starting full machine import from Markdown...');

    const filePath = path.join(process.cwd(), 'docs', 'methabau_maschinen_2022_full.md');
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // 1. Delete and Recreate collection
    try {
        await client.deleteCollection('fahrzeuge');
        console.log('Deleted vehicles collection');
    } catch (e) { }

    await client.createCollection('fahrzeuge', {
        vectors: { size: 768, distance: 'Cosine' }
    });
    console.log('Created vehicles collection');

    // 2. Parse Markdown
    const sections = content.split(/^## /m).slice(1);
    let vehicles: any[] = [];

    sections.forEach(section => {
        const lines = section.split('\n');
        const sectionHeader = lines[0].trim().replace(/\s+\(\d+\)/, ''); // e.g. "Baggerlader"

        // Split section by machine headers ###
        const machineBlocks = section.split(/^### /m).slice(1);

        machineBlocks.forEach(block => {
            const blockLines = block.split('\n');
            const title = blockLines[0].trim(); // e.g. "5010-03 – Wacker Neuson EZ 28"

            const data: any = {
                id: uuidv4(),
                status: 'verfuegbar',
                kwInfo: []
            };

            // Map section categories to internal keys
            const categoryMap: any = {
                'Baggerlader': 'baggerlader',
                'Frontlader': 'teleskop_frontlader',
                'Gelenkteleskop': 'teleskopbuehne',
                'Kleinbagger': 'kleinbagger',
                'Mauerbühne': 'mauerbuehne',
                'Minikran C10': 'minikran',
                'Minikran C6': 'minikran',
                'Raupendumper': 'raupendumper',
                'Raupenkran': 'turmdrehkran', // Or add new?
                'Scherenbühne': 'scherenbuehne',
                'Scherenbühne elekr.': 'scherenbuehne',
                'Teleskop Frontlader': 'teleskop_frontlader',
                'Teleskop-Gelenkbühne': 'teleskopbuehne',
                'Teleskopbühne': 'teleskopbuehne',
                'Turmdrehkran': 'turmdrehkran',
                'Vertikalmastbühne': 'vertikalmastbuehne'
            };

            data.kategorie = categoryMap[sectionHeader] || 'turmdrehkran';
            data.gruppe = sectionHeader;

            let inProperties = false;

            blockLines.slice(1).forEach(line => {
                const l = line.trim();
                if (!l) return;

                if (l === '- PDF Eigenschaften:') {
                    inProperties = true;
                    return;
                }

                if (l.startsWith('- ')) {
                    const parts = l.substring(2).split(': ');
                    if (parts.length >= 2) {
                        const key = parts[0].trim().toLowerCase();
                        const val = parts.slice(1).join(': ').trim();

                        if (inProperties) {
                            if (key === 'länge') data.laenge = val;
                            else if (key === 'breite') data.breite = val;
                            else if (key === 'höhe') data.hoehe = val;
                            else if (key === 'antrieb') data.antrieb = val;
                            else if (key === 'gewicht') data.gewicht = val;
                            else if (key === 'plattformhöhe') data.plattformhoehe = val;
                            else if (key === 'max. last') data.maxLast = val;
                            else if (key === 'bodendruck max.') data.bodendruckMax = val;
                            else if (key === 'zusatzinfo') data.zusatzinfo = val;
                            else if (key === 'muldengrösse') data.muldengroesse = val;
                        } else {
                            if (key === 'inventar') data.inventarnummer = val.replace('Inv.-Nr.:', '').replace('Inv-Nr.:', '').trim();
                            else if (key === 'fabrikat') data.fabrikat = val;
                            else if (key === 'typ') data.typ = val;
                            else if (key === 'serien-no.') data.seriennummer = val;
                            else if (key === 'farbe') data.farbe = val;
                            else if (key === 'leistung') data.leistung = val;
                            else if (key === 'gewicht') data.gewicht = val;
                            else if (key === 'baujahr') data.baujahr = parseInt(val) || undefined;
                            else if (key === 'abgas-wartung') data.abgaswartung = val;
                            else if (key === 'geprüft') data.geprueftBis = val;
                            else if (key === 'plattform') data.plattformhoehe = val;
                            else if (key === 'masse') data.masse = val;
                            else if (key === 'nutzlast') data.nutzlast = val;
                        }
                    } else if (l.startsWith('- KW ')) {
                        data.kwInfo.push(l.substring(2));
                    }
                }
            });

            // Fallback for ID and title
            if (!data.inventarnummer && title.includes(' – ')) {
                data.inventarnummer = title.split(' – ')[0].trim();
            }
            data.bezeichnung = title.includes(' – ') ? title.split(' – ')[1].trim() : title;

            vehicles.push(data);
        });
    });

    console.log(`Parsed ${vehicles.length} vehicles. Upserting to Qdrant...`);

    // Split into chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < vehicles.length; i += chunkSize) {
        const chunk = vehicles.slice(i, i + chunkSize);
        await client.upsert('fahrzeuge', {
            points: chunk.map(v => ({
                id: v.id,
                payload: v,
                vector: new Array(768).fill(0) // Dummy vector
            }))
        });
        console.log(`Uploaded chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(vehicles.length / chunkSize)}`);
    }

    console.log('Finished import.');
}

importMachinesFull().catch(console.error);
