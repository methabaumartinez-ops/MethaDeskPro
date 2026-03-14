import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ChangelogService } from '@/lib/services/changelogService';
import { getKSFromAbteilung, KSCategory } from '@/lib/config/ksConfig';

const ALLOWED_COLLECTIONS = [
    'projekte', 'teilsysteme', 'positionen', 'unterpositionen',
    'material', 'mitarbeiter', 'workers', 'fahrzeuge', 'fahrzeug_reservierungen', 'reservierungen', 'lieferanten', 'subunternehmer', 'unternehmer',
    'teams', 'team_members', 'team_membership_history', 'tasks', 'subtasks',
    'ausfuehrung_tasks', 'ausfuehrung_subtasks', 'ausfuehrung_task_resources', 'ausfuehrung_resources'
];

export async function GET(req: Request, { params }: { params: Promise<{ collection: string }> }) {
    // SECURITY: Require authentication for all reads.
    const { error } = await requireAuth();
    if (error) return error;

    try {
        const { collection } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            console.warn(`[Security] Blocked unauthorized access to collection: ${collection}`);
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);

        // Construct filter from query params
        let filter = undefined;
        const entries = Array.from(searchParams.entries()).filter(([key]) => key !== '_r' && key !== 't');
        if (entries.length > 0) {
            const must = entries.map(([key, value]) => ({
                key,
                match: { value }
            }));
            filter = { must };
        }

        const data = await DatabaseService.list(collection, filter);
        return NextResponse.json(data);
    } catch (error) {
        const { collection } = await params;
        console.error(`API Error fetching ${collection}:`, error);
        return NextResponse.json(
            { error: `Failed to fetch ${collection}` },
            { status: 500 }
        );
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ collection: string }> }) {
    // SECURITY: Require admin or projektleiter to create records.
    const { user, error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const { collection } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        const body = await req.json();

        const newItem: any = {
            ...body,
            id: body.id || uuidv4(),
        };

        // ── Workflow creation rule for POS and UNTPOS ──────────────────
        // Manual creation: abteilung = AVOR, status = offen
        // System/import creation (?systemOverride=true): use client values
        const isSystemOverride = new URL(req.url).searchParams.get('systemOverride') === 'true';
        const WORKFLOW_COLLECTIONS = ['positionen', 'unterpositionen'];
        if (WORKFLOW_COLLECTIONS.includes(collection) && !isSystemOverride) {
            newItem.abteilung = 'AVOR';
            newItem.status = 'offen';
        }

        // Automatically derive KS from Abteilung for specific collections
        const KS_AWARE_COLLECTIONS = ['teilsysteme', 'kosten', 'ausfuehrung_tasks', 'tasks', 'fahrzeuge'];
        if (KS_AWARE_COLLECTIONS.includes(collection) && newItem.abteilung) {
            newItem.ks = getKSFromAbteilung(newItem.abteilung);
        }

        // BUG-07 FIX: Use insert() instead of upsert() for creation.
        // upsert() would silently overwrite an existing record if the client
        // accidentally sends a duplicate ID. insert() fails on conflict, which is correct.
        const result = await DatabaseService.insert(collection, newItem);

        const skipChangelog = new URL(req.url).searchParams.get('skipChangelog') === 'true';

        // Track creation of Positionen and Unterpositionen
        if (user && collection === 'positionen' && newItem.teilsystemId && !skipChangelog) {
            await ChangelogService.createEntry({
                entityType: 'teilsystem',
                entityId: newItem.teilsystemId,
                projektId: newItem.projektId,
                changedAt: new Date().toISOString(),
                changedBy: `${user.vorname} ${user.nachname}`,
                changedByEmail: user.email,
                changedFields: [{ field: 'posNummer', label: 'Neue Position', before: null, after: `${newItem.posNummer || ''} ${newItem.name || ''}`.trim() }],
                summary: `Position hinzugefügt: ${newItem.posNummer || ''} – ${newItem.name || ''}`,
            });
        }
        if (user && collection === 'unterpositionen' && newItem.positionId && !skipChangelog) {
            // Also log to the parent position's history
            const pos = await DatabaseService.get<any>('positionen', newItem.positionId);
            const tsId = pos?.teilsystemId || newItem.teilsystemId;
            if (tsId) {
                await ChangelogService.createEntry({
                    entityType: 'teilsystem',
                    entityId: tsId,
                    projektId: newItem.projektId || pos?.projektId,
                    changedAt: new Date().toISOString(),
                    changedBy: `${user.vorname} ${user.nachname}`,
                    changedByEmail: user.email,
                    changedFields: [{ field: 'untPosNummer', label: 'Neue Unterposition', before: null, after: `${newItem.untPosNummer || ''} ${newItem.name || ''}`.trim() }],
                    summary: `Unterposition hinzugefügt: ${newItem.untPosNummer || ''} – ${newItem.name || ''} (Pos: ${pos?.posNummer || newItem.positionId})`,
                });
            }
            // Also log in the position history
            await ChangelogService.createEntry({
                entityType: 'position',
                entityId: newItem.positionId,
                projektId: newItem.projektId || pos?.projektId,
                changedAt: new Date().toISOString(),
                changedBy: `${user.vorname} ${user.nachname}`,
                changedByEmail: user.email,
                changedFields: [{ field: 'untPosNummer', label: 'Neue Unterposition', before: null, after: `${newItem.untPosNummer || ''} ${newItem.name || ''}`.trim() }],
                summary: `Unterposition hinzugefügt: ${newItem.untPosNummer || ''} – ${newItem.name || ''}`,
            });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        const { collection } = await params;
        console.error(`API Error creating item in ${collection}:`, error);

        const message = error?.message || '';
        // BUG-08 FIX: Catch underlying DB constraint violation
        if (message.includes('23505') || message.toLowerCase().includes('duplicate key value')) {
            return NextResponse.json(
                { error: 'DUPLICATE_TS_NUMMER' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: `Failed to create item in ${collection}` },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ collection: string }> }) {
    // SECURITY: Require admin or projektleiter to delete records.
    const { error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const { collection } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        // BUG-06 FIX: Block generic DELETE for hierarchical entities.
        // These entities have child records (unterpositionen, dokumente, Drive files) that must be
        // cleaned up via proper cascade logic in their dedicated endpoints.
        // Allowing simple delete here would create orphan rows and Drive file leaks.
        const HIERARCHICAL_COLLECTIONS = ['teilsysteme', 'positionen', 'unterpositionen'];
        if (HIERARCHICAL_COLLECTIONS.includes(collection)) {
            return NextResponse.json(
                { error: `Direkte Loeschung von '${collection}' ueber die generische Route ist nicht erlaubt. Bitte den spezifischen Endpunkt verwenden.` },
                { status: 405 }
            );
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required for deletion' }, { status: 400 });
        }

        await DatabaseService.delete(collection, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        const { collection } = await params;
        console.error(`API Error deleting item from ${collection}:`, error);
        return NextResponse.json(
            { error: `Failed to delete item from ${collection}` },
            { status: 500 }
        );
    }
}
