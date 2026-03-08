import { DatabaseService } from './db';
import { v4 as uuidv4 } from 'uuid';
import type { UserRole } from '@/types';
import { isAllowedDomain } from '@/lib/validators/authValidators';
import { sendConfirmationEmail } from '@/lib/email/mailer';

const SALT_LENGTH = 16;
const ITERATIONS = 600000; // Current recommendation
const LEGACY_ITERATIONS = 100000; // Previous standard
const KEY_LENGTH = 64;
const JWT_EXPIRY_HOURS = 168; // 7 dias — sesiones largas sin cortes

// ============================================================
// Password Hashing (PBKDF2 via Web Crypto API)
// ============================================================

export async function hashPassword(password: string): Promise<string> {
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

    // Helper to derive bits
    const derive = async (iters: number) => {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );
        return await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: iters,
                hash: 'SHA-256',
            },
            keyMaterial,
            KEY_LENGTH * 8
        );
    };

    // 1. Try with current iterations
    const bits = await derive(ITERATIONS);
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hash === hashHex) return true;

    // 2. Fallback to legacy iterations (100k)
    const legacyBits = await derive(LEGACY_ITERATIONS);
    const legacyHash = Array.from(new Uint8Array(legacyBits)).map(b => b.toString(16).padStart(2, '0')).join('');

    return legacyHash === hashHex;
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
    const secret = process.env.JWT_SECRET;

    // Lazy check: Only throw if we are actually trying to use the secret and it's missing in production.
    // This allows the Next.js build phase to complete even if secrets aren't provided to the build environment.
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET_MISSING: Die Umgebungsvariable JWT_SECRET ist in der Produktion nicht gesetzt.');
    }

    const actualSecret = secret || 'methabau-dev-secret-change-me';
    const encoder = new TextEncoder();
    return crypto.subtle.importKey(
        'raw',
        encoder.encode(actualSecret),
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
    abteilung?: string;
    role: UserRole;
    createdAt: string;
    confirmed: boolean;
    confirmationToken?: string;
    onboardingStatus?: 'pending' | 'completed' | 'skipped';
}

export interface SafeUser {
    id: string;
    vorname: string;
    nachname: string;
    email: string;
    department?: string;
    abteilung?: string;
    role: UserRole;
    onboardingStatus?: 'pending' | 'completed' | 'skipped';
}

function toSafeUser(user: StoredUser & Record<string, any>): SafeUser {
    // Supabase schema uses 'name' (full), legacy uses 'vorname'/'nachname'
    const vorname = user.vorname || (user.name ? user.name.split(' ')[0] : user.username || '');
    const nachname = user.nachname || (user.name ? user.name.split(' ').slice(1).join(' ') : '');

    return {
        id: user.id,
        vorname,
        nachname,
        email: user.email,
        department: user.department || user.abteilung,
        abteilung: user.abteilung || user.department,
        role: user.role,
        onboardingStatus: user.onboardingStatus ?? 'completed',
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

        // Seed default admin user if missing
        // SECURITY: In production, seeding is disabled by default.
        // Set SEED_ADMIN=true in env vars to enable (one-time, first-run only).
        try {
            const adminUsers = await DatabaseService.list(COLLECTION, {
                must: [{ key: 'email', match: { value: 'admin@methabau.ch' } }]
            });

            if (adminUsers.length === 0) {
                const isProduction = process.env.NODE_ENV === 'production';
                const seedEnabled = process.env.SEED_ADMIN === 'true';

                if (isProduction && !seedEnabled) {
                    console.warn('[Auth] No admin user found. Seeding is disabled in production.');
                    console.warn('[Auth] Set SEED_ADMIN=true to create the initial admin user, then remove it.');
                } else {
                    // Generate a random one-time bootstrap password (or use env override)
                    const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || uuidv4().replace(/-/g, '').substring(0, 16);
                    const adminPasswordHash = await hashPassword(bootstrapPassword);
                    const adminUser: StoredUser = {
                        id: uuidv4(),
                        vorname: 'Admin',
                        nachname: 'Methabau',
                        email: 'admin@methabau.ch',
                        passwordHash: adminPasswordHash,
                        role: 'admin',
                        createdAt: new Date().toISOString(),
                        confirmed: true,
                    };
                    await DatabaseService.upsert(COLLECTION, adminUser);
                    console.log('\n══════════════════════════════════════════════');
                    console.log('  🔐 ADMIN BOOTSTRAP — WICHTIG');
                    console.log('══════════════════════════════════════════════');
                    console.log('  Admin-Benutzer erstellt: admin@methabau.ch');
                    console.log(`  Bootstrap-Passwort:      ${bootstrapPassword}`);
                    console.log('  ⚠️  Bitte sofort nach dem Login ändern!');
                    console.log('  Setze SEED_ADMIN=false oder entferne die Var.');
                    console.log('══════════════════════════════════════════════\n');
                }
            }
        } catch (seedErr) {
            console.error('Error seeding admin user:', seedErr);
        }
    } catch (error) {
        console.error('Error ensuring users collection:', error);
    }
}

export async function login(emailStr: string, passwordStr: string): Promise<{ token: string; user: SafeUser } | { error: string }> {
    const email = emailStr.trim();
    const password = passwordStr.trim();
    try {
        // NOTE: ensureUsersCollection() is intentionally NOT called here —
        // it depends on Qdrant which is not available in production anymore.
        const users = await DatabaseService.list<StoredUser & Record<string, any>>(COLLECTION, {
            must: [{ key: 'email', match: { value: email } }]
        });

        if (users.length === 0) return { error: 'Ungültige Anmeldedaten.' };

        const user = users[0] as StoredUser & Record<string, any>;

        // Support both 'passwordHash' field names
        const hash = user.passwordHash || user.password_hash;
        if (!hash) return { error: 'Ungültige Anmeldedaten.' };

        const valid = await verifyPassword(password, hash);
        if (!valid) return { error: 'Ungültige Anmeldedaten.' };

        // Support both `confirmed` (legacy) and `aktiv` (Supabase schema)
        const isActive = user.aktiv !== false && user.confirmed !== false;
        if (!isActive) {
            return { error: 'Ihr Konto ist deaktiviert. Bitte kontaktieren Sie den Administrator.' };
        }

        const safeUser = toSafeUser(user);
        const token = await generateToken({ userId: user.id, email: user.email, role: user.role });

        return { token, user: safeUser };
    } catch (error: any) {
        console.error('Login error:', error);
        if (error.message?.includes('JWT_SECRET_MISSING')) {
            return { error: 'Konfigurationsfehler: JWT_SECRET fehlt in der Serverumgebung.' };
        }
        return { error: 'Anmeldung fehlgeschlagen.' };
    }
}

export async function registerUser(data: {
    vorname: string;
    nachname: string;
    email: string;
    abteilung?: string;
    // password is no longer collected at registration — set after email confirmation
}): Promise<{ confirmationToken: string; user: SafeUser } | { error: string }> {
    try {
        // Domain restriction — server-side enforcement
        if (!isAllowedDomain(data.email)) {
            return { error: 'Nur E-Mail-Adressen von @methabau.ch oder @mansergroup.ch sind erlaubt.' };
        }

        await ensureUsersCollection();

        // Check if user exists
        const existing = await DatabaseService.list<StoredUser>(COLLECTION, {
            must: [{ key: 'email', match: { value: data.email } }]
        });
        if (existing.length > 0) {
            return { error: 'Ein Konto mit dieser E-Mail-Adresse existiert bereits.' };
        }

        const confirmationToken = uuidv4();
        const newUser: StoredUser = {
            id: uuidv4(),
            vorname: data.vorname,
            nachname: data.nachname,
            email: data.email,
            passwordHash: '', // set after email confirmation
            abteilung: data.abteilung,
            department: data.abteilung,
            role: 'mitarbeiter',
            createdAt: new Date().toISOString(),
            confirmed: false,
            confirmationToken,
            onboardingStatus: 'pending',
        };

        await DatabaseService.upsert(COLLECTION, newUser);

        // Send branded confirmation email
        await sendConfirmationEmail(data.email, data.vorname, confirmationToken);

        const safeUser = toSafeUser(newUser);
        return { confirmationToken, user: safeUser };
    } catch (error) {
        console.error('Register error:', error);
        return { error: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.' };
    }
}

/**
 * Validates confirmation token and marks email as verified.
 * Does NOT create a session — user must set password first via setPasswordAfterConfirm.
 */
export async function confirmEmail(token: string): Promise<{ userId: string; email: string } | { error: string }> {
    try {
        const users = await DatabaseService.list<StoredUser>(COLLECTION, {
            must: [{ key: 'confirmationToken', match: { value: token } }]
        });

        if (users.length === 0) {
            return { error: 'Ungültiger oder abgelaufener Bestätigungslink.' };
        }

        const user = users[0];
        if (user.confirmed && user.passwordHash) {
            // Already fully confirmed — user likely clicked link twice
            return { error: 'Dieser Bestätigungslink wurde bereits verwendet. Bitte melden Sie sich an.' };
        }

        // Mark email as confirmed (password still empty)
        const updatedUser: StoredUser = {
            ...user,
            confirmed: true,
            // Keep confirmationToken until password is set, so set-password page can use it
        };
        await DatabaseService.upsert(COLLECTION, updatedUser);

        return { userId: user.id, email: user.email };
    } catch (error) {
        console.error('Confirm email error:', error);
        return { error: 'Bestätigung fehlgeschlagen.' };
    }
}

/**
 * Sets the user password after email confirmation.
 * Token = the original confirmationToken from the email link.
 */
export async function setPasswordAfterConfirm(
    token: string,
    password: string
): Promise<{ token: string; user: SafeUser } | { error: string }> {
    try {
        const users = await DatabaseService.list<StoredUser>(COLLECTION, {
            must: [{ key: 'confirmationToken', match: { value: token } }]
        });

        if (users.length === 0) {
            return { error: 'Ungültiger oder bereits verwendeter Bestätigungslink.' };
        }

        const user = users[0];
        if (!user.confirmed) {
            return { error: 'E-Mail-Adresse wurde noch nicht bestätigt.' };
        }

        const passwordHash = await hashPassword(password);
        const updatedUser: StoredUser = {
            ...user,
            passwordHash,
            confirmationToken: undefined, // invalidate token after use
        };
        await DatabaseService.upsert(COLLECTION, updatedUser);

        const safeUser = toSafeUser(updatedUser);
        const jwtToken = await generateToken({ userId: user.id, email: user.email, role: user.role });

        return { token: jwtToken, user: safeUser };
    } catch (error) {
        console.error('setPasswordAfterConfirm error:', error);
        return { error: 'Passwort konnte nicht gesetzt werden.' };
    }
}

/**
 * Updates the onboarding status for a user.
 */
export async function updateOnboardingStatus(
    userId: string,
    status: 'completed' | 'skipped'
): Promise<{ success: boolean } | { error: string }> {
    try {
        const user = await DatabaseService.get<StoredUser>(COLLECTION, userId);
        if (!user) return { error: 'Benutzer nicht gefunden.' };

        await DatabaseService.upsert(COLLECTION, { ...user, onboardingStatus: status });
        return { success: true };
    } catch (error) {
        console.error('updateOnboardingStatus error:', error);
        return { error: 'Status konnte nicht aktualisiert werden.' };
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
        if (user) return toSafeUser(user);
    } catch {
        // DB lookup failed — fall back to JWT payload below
    }

    // Fallback: token is cryptographically valid — construct SafeUser from payload
    // Handles cases where DB is temporarily unavailable or user record is not cached
    if (payload.userId && payload.email && payload.role) {
        return {
            id: payload.userId,
            email: payload.email,
            role: payload.role as UserRole,
            vorname: '',
            nachname: '',
            onboardingStatus: 'completed',
        };
    }

    return null;
}

