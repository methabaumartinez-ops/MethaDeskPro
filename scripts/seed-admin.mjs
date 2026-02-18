/**
 * Seed script: crear usuario admin en la colección 'users' de Qdrant.
 * 
 * Ejecutar con: node scripts/seed-admin.mjs
 */

import 'dotenv/config';

const QDRANT_URL = process.env.NEXT_PUBLIC_QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.NEXT_PUBLIC_QDRANT_API_KEY;

const COLLECTION = 'users';

// Password hashing con Web Crypto API (igual que authService.ts)
async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 64 * 8
    );
    const hashArray = new Uint8Array(derivedBits);
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${saltHex}:${hashHex}`;
}

async function qdrantFetch(path, options = {}) {
    const url = `${QDRANT_URL.replace(/\/$/, '')}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(QDRANT_API_KEY ? { 'api-key': QDRANT_API_KEY } : {}),
    };
    const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    return res;
}

async function ensureCollection() {
    const res = await qdrantFetch(`/collections/${COLLECTION}`);
    if (res.status === 404 || !res.ok) {
        console.log(`Creando colección '${COLLECTION}'...`);
        const createRes = await qdrantFetch(`/collections/${COLLECTION}`, {
            method: 'PUT',
            body: JSON.stringify({
                vectors: { size: 1, distance: 'Cosine' },
            }),
        });
        if (!createRes.ok) {
            console.error('Error creando colección:', await createRes.text());
            process.exit(1);
        }
        console.log('Colección creada.');
    } else {
        console.log(`Colección '${COLLECTION}' ya existe.`);
    }
}

async function seedAdmin() {
    await ensureCollection();

    const adminId = '00000000-0000-0000-0000-000000000001';
    const passwordHash = await hashPassword('admin123');

    const adminUser = {
        id: adminId,
        vorname: 'Admin',
        nachname: 'Methabau',
        email: 'admin@methabau.ch',
        passwordHash,
        department: 'IT / Management',
        role: 'admin',
        createdAt: new Date().toISOString(),
    };

    console.log('Creando usuario admin...');
    const res = await qdrantFetch(`/collections/${COLLECTION}/points`, {
        method: 'PUT',
        body: JSON.stringify({
            points: [{
                id: adminId,
                payload: adminUser,
                vector: [0.0],
            }],
        }),
    });

    if (res.ok) {
        console.log('✅ Usuario admin creado:');
        console.log('   Email:    admin@methabau.ch');
        console.log('   Password: admin123');
        console.log('   Role:     admin');
    } else {
        console.error('❌ Error:', await res.text());
    }
}

seedAdmin().catch(console.error);
