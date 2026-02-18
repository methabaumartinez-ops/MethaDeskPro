/**
 * Seed script: crear 5 Lieferanten de ejemplo y cambiar password del admin.
 * 
 * Ejecutar con: node scripts/seed-lieferanten.mjs
 */

import 'dotenv/config';

const QDRANT_URL = process.env.NEXT_PUBLIC_QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.NEXT_PUBLIC_QDRANT_API_KEY;

async function qdrantFetch(path, options = {}) {
    const url = `${QDRANT_URL.replace(/\/$/, '')}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(QDRANT_API_KEY ? { 'api-key': QDRANT_API_KEY } : {}),
    };
    return fetch(url, { ...options, headers: { ...headers, ...options.headers } });
}

async function ensureCollection(name) {
    const res = await qdrantFetch(`/collections/${name}`);
    if (res.status === 404 || !res.ok) {
        console.log(`Creando colección '${name}'...`);
        await qdrantFetch(`/collections/${name}`, {
            method: 'PUT',
            body: JSON.stringify({ vectors: { size: 1, distance: 'Cosine' } }),
        });
        console.log(`✅ Colección '${name}' creada.`);
    } else {
        console.log(`Colección '${name}' ya existe.`);
    }
}

// ─── Password hashing (igual que authService.ts) ──────
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
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${saltHex}:${hashHex}`;
}

// ─── Seed: 5 Lieferanten ──────────────────────────────
async function seedLieferanten() {
    await ensureCollection('lieferanten');

    const lieferanten = [
        {
            id: '10000000-0000-0000-0000-000000000001',
            name: 'Hilti AG',
            kontakt: 'Thomas Berger',
            email: 'info@hilti.ch',
            telefon: '+41 71 243 18 18',
            adresse: 'Feldkircherstrasse 100, 9494 Schaan',
            notizen: 'Befestigungstechnik, Bohr- und Meisseltechnik',
        },
        {
            id: '10000000-0000-0000-0000-000000000002',
            name: 'Sika Schweiz AG',
            kontakt: 'Anna Müller',
            email: 'info@sika.ch',
            telefon: '+41 58 436 40 40',
            adresse: 'Tüffenwies 16, 8048 Zürich',
            notizen: 'Dichtungssysteme, Klebstoffe, Betonzusatzmittel',
        },
        {
            id: '10000000-0000-0000-0000-000000000003',
            name: 'Bossard AG',
            kontakt: 'Martin Hofstetter',
            email: 'info@bossard.com',
            telefon: '+41 41 749 66 11',
            adresse: 'Steinhauserstrasse 70, 6300 Zug',
            notizen: 'Verbindungstechnik und Schrauben',
        },
        {
            id: '10000000-0000-0000-0000-000000000004',
            name: 'Debrunner Acifer AG',
            kontakt: 'Sandra Weber',
            email: 'info@debrunner-acifer.ch',
            telefon: '+41 71 228 41 41',
            adresse: 'Hinterlauben 8, 9004 St. Gallen',
            notizen: 'Stahl, Metalle, Werkzeuge und Maschinen',
        },
        {
            id: '10000000-0000-0000-0000-000000000005',
            name: 'Würth AG',
            kontakt: 'Peter Keller',
            email: 'info@wuerth.ch',
            telefon: '+41 61 705 91 11',
            adresse: 'Dornwydenweg 11, 4144 Arlesheim',
            notizen: 'Montage- und Befestigungsmaterial',
        },
    ];

    console.log('\nCreando 5 Lieferanten...');
    const points = lieferanten.map(l => ({
        id: l.id,
        payload: l,
        vector: [0.0],
    }));

    const res = await qdrantFetch('/collections/lieferanten/points', {
        method: 'PUT',
        body: JSON.stringify({ points }),
    });

    if (res.ok) {
        console.log('✅ 5 Lieferanten creados:');
        lieferanten.forEach(l => console.log(`   • ${l.name} (${l.kontakt})`));
    } else {
        console.error('❌ Error:', await res.text());
    }
}

// ─── Cambiar contraseña del admin ─────────────────────
async function changeAdminPassword() {
    const adminId = '00000000-0000-0000-0000-000000000001';
    const newPassword = 'Metha123!';

    // Get current admin data
    const res = await qdrantFetch(`/collections/users/points/${adminId}`);
    if (!res.ok) {
        console.error('❌ Admin no encontrado. Ejecuta primero seed-admin.mjs');
        return;
    }

    const data = await res.json();
    const adminPayload = data.result?.payload || {};

    const newHash = await hashPassword(newPassword);

    const updateRes = await qdrantFetch('/collections/users/points', {
        method: 'PUT',
        body: JSON.stringify({
            points: [{
                id: adminId,
                payload: {
                    ...adminPayload,
                    passwordHash: newHash,
                    confirmed: true,
                },
                vector: [0.0],
            }],
        }),
    });

    if (updateRes.ok) {
        console.log('\n✅ Contraseña del admin actualizada:');
        console.log('   Email:    admin@methabau.ch');
        console.log('   Password: Metha123!');
    } else {
        console.error('❌ Error al cambiar contraseña:', await updateRes.text());
    }
}

// ─── Run ──────────────────────────────────────────────
async function main() {
    console.log('══════════════════════════════════════════════════');
    console.log('  🏗  METHABAU — Seed: Lieferanten + Admin PW');
    console.log('══════════════════════════════════════════════════\n');

    await seedLieferanten();
    await changeAdminPassword();

    console.log('\n══════════════════════════════════════════════════');
    console.log('  ✅ Seed completado');
    console.log('══════════════════════════════════════════════════\n');
}

main().catch(console.error);
