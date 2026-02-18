// Disable SSL verification for self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import path from 'path';
// Import raw data directly to avoid localStorage dependency in store.ts
import { mockProjekte, mockTeilsysteme, mockPositionen, mockMaterial, mockMitarbeiter, mockFahrzeuge } from '../src/lib/mock/data.ts';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envUrl = process.env.NEXT_PUBLIC_QDRANT_URL;
let url = envUrl;

// Fallback if environment variable is the placeholder
if (!url || url === 'https://qdrant.example.com') {
    console.log('Environment URL is placeholder or missing. Using localhost...');
    url = 'http://localhost:6333';
}

const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY;

console.log(`Configured Qdrant URL: ${url}`);

const client = new QdrantClient({
    url,
    apiKey,
    port: 443, // Force HTTPS port (443) instead of default 6333, which might be blocked
    timeout: 60000, // Increase timeout to 60 seconds
});

const COLLECTIONS = [
    { name: 'projekte', vectorSize: 0 },
    { name: 'teilsysteme', vectorSize: 0 },
    { name: 'positionen', vectorSize: 0 },
    { name: 'material', vectorSize: 0 },
    { name: 'mitarbeiter', vectorSize: 0 },
    { name: 'fahrzeuge', vectorSize: 0 },
];

// Helper to generate a deterministic UUID from a string ID
// This ensures that "p1" always maps to the same UUID
function generateId(id: string): string {
    if (!id) return crypto.randomUUID();
    // Simple hash to UUID-like format for demo purposes
    // In production, use a proper v5 UUID generator
    const hash = Buffer.from(id).toString('hex');
    const padded = hash.padEnd(32, '0').slice(0, 32);
    return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20)}`;
}

async function setup() {
    console.log('Starting Qdrant setup...');

    for (const col of COLLECTIONS) {
        try {
            const exists = await client.collectionExists(col.name);
            if (!exists.exists) {
                console.log(`Creating collection: ${col.name}`);
                await client.createCollection(col.name, {
                    vectors: {},
                });
            } else {
                console.log(`Collection ${col.name} already exists.`);
            }
        } catch (error) {
            console.error(`Error creating collection ${col.name}:`, error);
        }
    }

    console.log('\nMigrating Mock Data...');

    // Migrate Projekte
    try {
        console.log(`Migrating ${mockProjekte.length} projects...`);
        if (mockProjekte.length > 0) {
            await client.upsert('projekte', {
                points: mockProjekte.map(p => ({
                    id: generateId(p.id),
                    payload: p as any,
                    vector: {}
                }))
            });
        }
    } catch (e) {
        console.error('Error migrating projects:', e);
    }

    // Migrate Teilsysteme
    try {
        console.log(`Migrating ${mockTeilsysteme.length} subsystems...`);
        if (mockTeilsysteme.length > 0) {
            await client.upsert('teilsysteme', {
                points: mockTeilsysteme.map(t => ({
                    id: generateId(t.id),
                    payload: t as any,
                    vector: {}
                }))
            });
        }
    } catch (e) {
        console.error('Error migrating subsystems:', e);
    }

    // Migrate Positionen
    try {
        console.log(`Migrating ${mockPositionen.length} positions...`);
        if (mockPositionen.length > 0) {
            await client.upsert('positionen', {
                points: mockPositionen.map(p => ({
                    id: generateId(p.id),
                    payload: p as any,
                    vector: {}
                }))
            });
        }
    } catch (e) {
        console.error('Error migrating positions:', e);
    }

    // Migrate Material
    try {
        console.log(`Migrating ${mockMaterial.length} materials...`);
        if (mockMaterial.length > 0) {
            await client.upsert('material', {
                points: mockMaterial.map(m => ({
                    id: generateId(m.id),
                    payload: m as any,
                    vector: {}
                }))
            });
        }
    } catch (e) {
        console.error('Error migrating material:', e);
    }

    // Migrate Mitarbeiter
    try {
        console.log(`Migrating ${mockMitarbeiter.length} employees...`);
        if (mockMitarbeiter.length > 0) {
            await client.upsert('mitarbeiter', {
                points: mockMitarbeiter.map(m => ({
                    id: generateId(m.id),
                    payload: m as any,
                    vector: {}
                }))
            });
        }
    } catch (e) {
        console.error('Error migrating employees:', e);
    }

    // Migrate Fahrzeuge
    try {
        console.log(`Migrating ${mockFahrzeuge.length} vehicles...`);
        if (mockFahrzeuge.length > 0) {
            await client.upsert('fahrzeuge', {
                points: mockFahrzeuge.map(f => ({
                    id: generateId(f.id),
                    payload: f as any,
                    vector: {}
                }))
            });
        }
    } catch (e) {
        console.error('Error migrating vehicles:', e);
    }

    console.log('\nSetup complete!');
}

setup();
