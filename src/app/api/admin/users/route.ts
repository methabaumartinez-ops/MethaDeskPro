import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { DatabaseService } from '@/lib/services/db';
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
