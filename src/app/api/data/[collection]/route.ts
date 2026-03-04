import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/helpers/requireAuth';

const ALLOWED_COLLECTIONS = [
    'projekte', 'teilsysteme', 'positionen', 'unterpositionen',
    'material', 'mitarbeiter', 'workers', 'fahrzeuge', 'fahrzeug_reservierungen', 'reservierungen', 'lieferanten', 'subunternehmer',
    'teams', 'team_members', 'tasks', 'subtasks',
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
    const { error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const { collection } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        const body = await req.json();

        const newItem = {
            ...body,
            id: body.id || uuidv4(),
        };

        const result = await DatabaseService.upsert(collection, newItem);
        return NextResponse.json(result);
    } catch (error) {
        const { collection } = await params;
        console.error(`API Error creating item in ${collection}:`, error);
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
