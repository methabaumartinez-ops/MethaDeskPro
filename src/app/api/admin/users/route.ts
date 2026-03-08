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
 * Updates a user's role (superadmin only).
 * Body: { userId: string, role: UserRole }
 */
export async function PATCH(req: Request) {
    const { error } = await requireAuth(['superadmin']);
    if (error) return error;

    try {
        const { userId, role } = await req.json() as { userId: string; role: UserRole };

        if (!userId || !role) {
            return NextResponse.json({ error: 'userId und role sind erforderlich.' }, { status: 400 });
        }

        const existing = await DatabaseService.get<any>('users', userId);
        if (!existing) {
            return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
        }

        const updated = await DatabaseService.upsert('users', { ...existing, role });
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
