import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { DatabaseService } from '@/lib/services/db';
import { hashPassword } from '@/lib/services/authService';
import { v4 as uuidv4 } from 'uuid';
import type { UserRole } from '@/types';

/**
 * GET /api/admin/users
 * Returns all users (superadmin only).
 */
export async function GET() {
    const { error } = await requireAuth(['superadmin']);
    if (error) return error;

    try {
        const users = await DatabaseService.list('users');
        // Strip passwordHash before returning
        const safeUsers = (users as any[]).map(({ passwordHash, ...u }) => u);
        return NextResponse.json(safeUsers);
    } catch (err) {
        console.error('[admin/users] GET error:', err);
        return NextResponse.json({ error: 'Fehler beim Laden der Benutzer.' }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/users
 * Updates a user's role and/or name (superadmin only).
 * Body: { userId: string, role?: UserRole, vorname?: string, nachname?: string }
 */
export async function PATCH(req: Request) {
    const { error } = await requireAuth(['superadmin']);
    if (error) return error;

    try {
        const body = await req.json() as { userId: string; role?: UserRole; vorname?: string; nachname?: string; name?: string };
        const { userId, role, vorname, nachname, name } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId ist erforderlich.' }, { status: 400 });
        }

        const existing = await DatabaseService.get<any>('users', userId);
        if (!existing) {
            return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
        }

        const updates: any = { ...existing };
        if (role)     updates.role     = role;
        if (name)     updates.name     = name;
        if (vorname)  updates.vorname  = vorname;
        if (nachname) updates.nachname = nachname;

        const updated = await DatabaseService.upsert('users', updates);
        const { passwordHash: _, ...safeUser } = updated as any;
        return NextResponse.json(safeUser);
    } catch (err) {
        console.error('[admin/users] PATCH error:', err);
        return NextResponse.json(
            { error: `Fehler beim Aktualisieren: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/users
 * Creates a new user manually (superadmin only).
 * Always sets must_change_password=true so the user is forced to change on first login.
 * Body: { vorname, nachname, email, password, role, abteilung? }
 */
export async function POST(req: Request) {
    const { error } = await requireAuth(['superadmin']);
    if (error) return error;

    try {
        const body = await req.json() as {
            vorname?: string; nachname?: string; name?: string;
            email: string; password: string;
            role?: UserRole; abteilung?: string;
        };

        if (!body.email || !body.password) {
            return NextResponse.json({ error: 'E-Mail und Passwort sind erforderlich.' }, { status: 400 });
        }

        // Check duplicate
        const existing = await DatabaseService.list('users', {
            must: [{ key: 'email', match: { value: body.email } }]
        });
        if ((existing as any[]).length > 0) {
            return NextResponse.json({ error: 'Ein Benutzer mit dieser E-Mail existiert bereits.' }, { status: 409 });
        }

        const passwordHash = await hashPassword(body.password);
        const fullName = body.name || `${body.vorname || ''} ${body.nachname || ''}`.trim();

        const newUser = {
            id: uuidv4(),
            email: body.email,
            name: fullName,
            vorname: body.vorname || fullName.split(' ')[0] || '',
            nachname: body.nachname || fullName.split(' ').slice(1).join(' ') || '',
            passwordHash,
            role: body.role || 'mitarbeiter',
            department: body.abteilung,
            abteilung: body.abteilung,
            aktiv: true,
            confirmed: true,
            must_change_password: true,   // ← always true for manually created users
            mustChangePassword: true,
            createdAt: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            onboardingStatus: 'completed',
        };

        const created = await DatabaseService.upsert('users', newUser);
        const { passwordHash: _, ...safeUser } = created as any;
        return NextResponse.json(safeUser, { status: 201 });
    } catch (err) {
        console.error('[admin/users] POST error:', err);
        return NextResponse.json(
            { error: `Fehler beim Erstellen: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 }
        );
    }
}
