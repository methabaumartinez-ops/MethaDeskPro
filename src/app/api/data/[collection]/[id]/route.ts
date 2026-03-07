import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';
import { ProjectService } from '@/lib/services/projectService';
import { deleteTeilsystemWithCascade, deletePositionWithCascade } from '@/lib/services/server/deleteHelpers';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ChangelogService, detectChanges, buildSummary } from '@/lib/services/changelogService';


const ALLOWED_COLLECTIONS = [
    'projekte', 'teilsysteme', 'positionen', 'unterpositionen',
    'material', 'mitarbeiter', 'fahrzeuge', 'fahrzeug_reservierungen', 'reservierungen', 'lieferanten'
];

export async function GET(req: Request, { params }: { params: Promise<{ collection: string, id: string }> }) {
    // SECURITY: Require authentication for all single-item reads.
    const { error } = await requireAuth();
    if (error) return error;

    try {
        const { collection, id } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }
        const item = await DatabaseService.get(collection, id);

        if (!item) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error('API Error fetching item from collection:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

const CHANGELOG_ENTITY_MAP: Record<string, 'teilsystem' | 'position' | 'unterposition'> = {
    positionen: 'position',
    unterpositionen: 'unterposition',
};

export async function PUT(req: Request, { params }: { params: Promise<{ collection: string, id: string }> }) {
    const { user, error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const { collection, id } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        const body = await req.json();
        const existing = (await DatabaseService.get(collection, id) || {}) as Record<string, unknown>;
        const merged = { ...existing, ...body, id };

        const updated = await DatabaseService.upsert(collection, merged);

        // Record changelog for tracked entity types
        const entityType = CHANGELOG_ENTITY_MAP[collection];
        if (user && entityType) {
            const changes = detectChanges(existing, body as Record<string, unknown>);
            if (changes.length > 0) {
                await ChangelogService.createEntry({
                    entityType,
                    entityId: id,
                    projektId: existing.projektId as string | undefined,
                    changedAt: new Date().toISOString(),
                    changedBy: `${user.vorname} ${user.nachname}`,
                    changedByEmail: user.email,
                    changedFields: changes,
                    summary: buildSummary(changes),
                });
            }
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('API Error updating item in collection:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ collection: string, id: string }> }) {
    const { user, error } = await requireAuth(['admin', 'projektleiter', 'mitarbeiter']);
    if (error) return error;

    try {
        const { collection, id } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        const body = await req.json();
        const existing = (await DatabaseService.get(collection, id) || {}) as Record<string, unknown>;
        const merged = { ...existing, ...body, id };

        const updated = await DatabaseService.upsert(collection, merged);

        // Record changelog for tracked entity types
        const entityType = CHANGELOG_ENTITY_MAP[collection];
        if (user && entityType) {
            const changes = detectChanges(existing, body as Record<string, unknown>);
            if (changes.length > 0) {
                await ChangelogService.createEntry({
                    entityType,
                    entityId: id,
                    projektId: existing.projektId as string | undefined,
                    changedAt: new Date().toISOString(),
                    changedBy: `${user.vorname} ${user.nachname}`,
                    changedByEmail: user.email,
                    changedFields: changes,
                    summary: buildSummary(changes),
                });
            }
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('API Error patching item in collection:', error);
        return NextResponse.json({ error: 'Failed to patch' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ collection: string, id: string }> }) {
    const { error } = await requireAuth(['admin']);
    if (error) return error;

    try {
        const { collection, id } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        switch (collection) {
            case 'projekte': {
                const p = await DatabaseService.get('projekte', id);
                if (p) await DatabaseService.upsert('projekte', { ...(p as object), deletedAt: new Date().toISOString() } as any);
                break;
            }
            case 'teilsysteme':
                await deleteTeilsystemWithCascade(id);
                break;
            case 'positionen':
                await deletePositionWithCascade(id);
                break;
            default:
                await DatabaseService.delete(collection, id);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error deleting item from collection:', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
