import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';
import { DatabaseService } from '@/lib/services/db';

/**
 * POST /api/projekte/[id]/restore
 * Clears deletedAt from the project record to restore it to the active list.
 * The archivedZipUrl/archivedZipName fields are intentionally PRESERVED.
 * Admin or projektleiter role required.
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Auth check
        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });
        }

        const user = await getUserFromToken(token);
        if (!user || (user.role !== 'admin' && user.role !== 'projektleiter')) {
            return NextResponse.json({ error: 'Nur Administratoren oder Projektleiter können Projekte wiederherstellen.' }, { status: 403 });
        }

        // Load the project
        const project = await DatabaseService.get<any>('projekte', id);
        if (!project) {
            return NextResponse.json({ error: 'Projekt nicht gefunden.' }, { status: 404 });
        }

        if (!project.deletedAt) {
            return NextResponse.json({ error: 'Projekt ist nicht archiviert.' }, { status: 409 });
        }

        // Build clean payload — explicitly remove deletedAt so Qdrant does not store it.
        // Setting deletedAt: undefined is insufficient because JSON.stringify drops undefined
        // values but Qdrant JS client serialises the payload with the key present as null.
        // Deleting the property from the object guarantees the key is absent from the payload.
        const restoredProject = { ...project };
        delete restoredProject.deletedAt;
        restoredProject.restoredAt = new Date().toISOString();
        restoredProject.restoredBy = user.email || user.id;

        await DatabaseService.upsert('projekte', restoredProject);

        return NextResponse.json({ success: true, restoredAt: restoredProject.restoredAt });
    } catch (error: any) {
        console.error('[Restore API] Error:', error);
        return NextResponse.json(
            { error: `Wiederherstellung fehlgeschlagen: ${error?.message || String(error)}` },
            { status: 500 }
        );
    }
}
