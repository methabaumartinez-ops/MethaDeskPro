import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';

const ALLOWED_COLLECTIONS = [
    'projekte', 'teilsysteme', 'positionen', 'unterpositionen',
    'material', 'mitarbeiter', 'workers', 'fahrzeuge', 'fahrzeug_reservierungen', 'reservierungen', 'lieferanten', 'subunternehmer',
    'teams', 'team_members', 'tasks', 'subtasks',
    'ausfuehrung_tasks', 'ausfuehrung_subtasks', 'ausfuehrung_task_resources', 'ausfuehrung_resources'
];

export async function GET(req: Request, { params }: { params: Promise<{ collection: string }> }) {
    try {
        const { collection } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            console.warn(`[Security] Blocked unauthorized access to collection: ${collection}`);
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);

        console.log(`API: Fetching from collection '${collection}'...`);

        // Construct filter from query params if needed
        let filter = undefined;
        // Example: ?projektId=123
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
    try {
        const { collection } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });

        const user = await getUserFromToken(token);
        if (!user || (user.role !== 'admin' && user.role !== 'projektleiter')) {
            return NextResponse.json({ error: 'Keine Berechtigung zum Erstellen von Daten.' }, { status: 403 });
        }

        const body = await req.json();
        console.log(`API: Creating item in '${collection}'...`, body);

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
    try {
        const { collection } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });

        const user = await getUserFromToken(token);
        if (!user || (user.role !== 'admin' && user.role !== 'projektleiter')) {
            return NextResponse.json({ error: 'Keine Berechtigung zum Löschen von Daten.' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required for deletion' }, { status: 400 });
        }

        console.log(`API: Deleting item ${id} from '${collection}'...`);
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
