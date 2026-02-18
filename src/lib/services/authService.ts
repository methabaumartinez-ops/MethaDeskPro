import { DatabaseService } from './db';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'methabau-dev-secret-change-me';
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const JWT_EXPIRY_HOURS = 24;

// ============================================================
// Password Hashing (PBKDF2 via Web Crypto API)
// ============================================================

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        KEY_LENGTH * 8
    );
    const hashArray = new Uint8Array(derivedBits);
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [saltHex, hashHex] = storedHash.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        KEY_LENGTH * 8
    );
    const newHashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return newHashHex === hashHex;
}

// ============================================================
// JWT (HMAC-SHA256 manual)
// ============================================================

function base64UrlEncode(data: Uint8Array | string): string {
    const str = typeof data === 'string' ? data : String.fromCharCode(...data);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    return atob(padded);
}

async function getHmacKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    return crypto.subtle.importKey(
        'raw',
        encoder.encode(JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

export async function generateToken(payload: Record<string, any>): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + JWT_EXPIRY_HOURS * 3600,
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await getHmacKey();
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
    const signatureB64 = base64UrlEncode(new Uint8Array(signature));

    return `${signingInput}.${signatureB64}`;
}

export async function verifyToken(token: string): Promise<Record<string, any> | null> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;
        const signingInput = `${headerB64}.${payloadB64}`;

        const key = await getHmacKey();
        const encoder = new TextEncoder();

        // Decode signature
        const sigStr = base64UrlDecode(signatureB64);
        const sigBytes = new Uint8Array(sigStr.length);
        for (let i = 0; i < sigStr.length; i++) {
            sigBytes[i] = sigStr.charCodeAt(i);
        }

        const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(signingInput));
        if (!valid) return null;

        const payload = JSON.parse(base64UrlDecode(payloadB64));

        // Check expiry
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

// ============================================================
// User types
// ============================================================

export interface StoredUser {
    id: string;
    vorname: string;
    nachname: string;
    email: string;
    passwordHash: string;
    department?: string;
    role: 'admin' | 'projektleiter' | 'mitarbeiter';
    createdAt: string;
    confirmed: boolean;
    confirmationToken?: string;
}

export interface SafeUser {
    id: string;
    vorname: string;
    nachname: string;
    email: string;
    department?: string;
    role: 'admin' | 'projektleiter' | 'mitarbeiter';
}

function toSafeUser(user: StoredUser): SafeUser {
    return {
        id: user.id,
        vorname: user.vorname,
        nachname: user.nachname,
        email: user.email,
        department: user.department,
        role: user.role,
    };
}

// ============================================================
// Auth Operations
// ============================================================

const COLLECTION = 'users';

export async function ensureUsersCollection(): Promise<void> {
    try {
        const { qdrantClient } = await import('@/lib/qdrant/client');
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(c => c.name === COLLECTION);
        if (!exists) {
            await qdrantClient.createCollection(COLLECTION, {
                vectors: { size: 1, distance: 'Cosine' },
            });
            console.log('Created users collection in Qdrant');
        }
    } catch (error) {
        console.error('Error ensuring users collection:', error);
    }
}

export async function login(email: string, password: string): Promise<{ token: string; user: SafeUser } | { error: string }> {
    try {
        const users = await DatabaseService.list<StoredUser>(COLLECTION, {
            must: [{ key: 'email', match: { value: email } }]
        });

        if (users.length === 0) return { error: 'Ungültige Anmeldedaten.' };
        const user = users[0];

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return { error: 'Ungültige Anmeldedaten.' };

        if (!user.confirmed) {
            return { error: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.' };
        }

        const safeUser = toSafeUser(user);
        const token = await generateToken({ userId: user.id, email: user.email, role: user.role });

        return { token, user: safeUser };
    } catch (error) {
        console.error('Login error:', error);
        return { error: 'Anmeldung fehlgeschlagen.' };
    }
}

export async function registerUser(data: {
    vorname: string;
    nachname: string;
    email: string;
    password: string;
    department?: string;
}): Promise<{ confirmationToken: string; user: SafeUser } | { error: string }> {
    try {
        await ensureUsersCollection();

        // Check if user exists
        const existing = await DatabaseService.list<StoredUser>(COLLECTION, {
            must: [{ key: 'email', match: { value: data.email } }]
        });
        if (existing.length > 0) {
            return { error: 'Ein Konto mit dieser E-Mail-Adresse existiert bereits.' };
        }

        const passwordHash = await hashPassword(data.password);
        const confirmationToken = uuidv4();
        const newUser: StoredUser = {
            id: uuidv4(),
            vorname: data.vorname,
            nachname: data.nachname,
            email: data.email,
            passwordHash,
            department: data.department,
            role: 'mitarbeiter',
            createdAt: new Date().toISOString(),
            confirmed: false,
            confirmationToken,
        };

        await DatabaseService.upsert(COLLECTION, newUser);

        // ============================================================
        // SIMULACIÓN DE EMAIL - En producción usar un servicio real
        // ============================================================
        console.log('\n══════════════════════════════════════════════════════════');
        console.log('  📧 METHABAU — Bestätigungs-E-Mail (simuliert)');
        console.log('══════════════════════════════════════════════════════════');
        console.log(`  An: ${data.email}`);
        console.log(`  Betreff: Willkommen bei METHADesk Pro — E-Mail bestätigen`);
        console.log('');
        console.log(`  Hallo ${data.vorname} ${data.nachname},`);
        console.log('');
        console.log('  Vielen Dank für Ihre Registrierung bei METHADesk Pro.');
        console.log('  Bitte bestätigen Sie Ihre E-Mail-Adresse:');
        console.log('');
        console.log(`  🔗 Bestätigungslink:`);
        console.log(`     /confirm?token=${confirmationToken}`);
        console.log('');
        console.log('  Mit freundlichen Grüssen,');
        console.log('  METHABAU AG');
        console.log('══════════════════════════════════════════════════════════\n');

        const safeUser = toSafeUser(newUser);
        return { confirmationToken, user: safeUser };
    } catch (error) {
        console.error('Register error:', error);
        return { error: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.' };
    }
}

export async function confirmEmail(token: string): Promise<{ token: string; user: SafeUser } | { error: string }> {
    try {
        const users = await DatabaseService.list<StoredUser>(COLLECTION, {
            must: [{ key: 'confirmationToken', match: { value: token } }]
        });

        if (users.length === 0) {
            return { error: 'Ungültiger Bestätigungstoken.' };
        }

        const user = users[0];
        if (user.confirmed) {
            return { error: 'Diese E-Mail-Adresse wurde bereits bestätigt.' };
        }

        // Confirm user
        const updatedUser: StoredUser = {
            ...user,
            confirmed: true,
            confirmationToken: undefined,
        };
        await DatabaseService.upsert(COLLECTION, updatedUser);

        const safeUser = toSafeUser(updatedUser);
        const jwtToken = await generateToken({ userId: user.id, email: user.email, role: user.role });

        return { token: jwtToken, user: safeUser };
    } catch (error) {
        console.error('Confirm email error:', error);
        return { error: 'Bestätigung fehlgeschlagen.' };
    }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean } | { error: string }> {
    try {
        const user = await DatabaseService.get<StoredUser>(COLLECTION, userId);
        if (!user) return { error: 'Benutzer nicht gefunden.' };

        const valid = await verifyPassword(currentPassword, user.passwordHash);
        if (!valid) return { error: 'Aktuelles Passwort ist falsch.' };

        const newHash = await hashPassword(newPassword);
        await DatabaseService.upsert(COLLECTION, { ...user, passwordHash: newHash });

        return { success: true };
    } catch (error) {
        console.error('Change password error:', error);
        return { error: 'Passwortänderung fehlgeschlagen.' };
    }
}

export async function getUserFromToken(token: string): Promise<SafeUser | null> {
    const payload = await verifyToken(token);
    if (!payload) return null;

    try {
        const user = await DatabaseService.get<StoredUser>(COLLECTION, payload.userId);
        if (!user) return null;
        return toSafeUser(user);
    } catch {
        return null;
    }
}
