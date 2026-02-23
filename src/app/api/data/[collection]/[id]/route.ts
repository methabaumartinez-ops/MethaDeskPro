import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';

const ALLOWED_COLLECTIONS = [
    'projekte', 'teilsysteme', 'positionen', 'unterpositionen',
    'material', 'mitarbeiter', 'fahrzeuge', 'reservierungen', 'lieferanten'
];

export async function GET(req: Request, { params }: { params: Promise<{ collection: string, id: string }> }) {
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
        console.error(`API Error fetching item from collection:`, error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ collection: string, id: string }> }) {
    try {
        const { collection, id } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });

        const user = await getUserFromToken(token);
        if (!user || (user.role !== 'admin' && user.role !== 'projektleiter')) {
            return NextResponse.json({ error: 'Keine Berechtigung zum Bearbeiten von Daten.' }, { status: 403 });
        }

        const body = await req.json();

        // Merge with existing data to prevent overwriting fields
        const existing = await DatabaseService.get(collection, id);
        const merged = existing ? { ...(existing as Record<string, unknown>), ...body, id } : { ...body, id };

        const updated = await DatabaseService.upsert(collection, merged);
        return NextResponse.json(updated);
    } catch (error) {
        console.error(`API Error updating item in collection:`, error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ collection: string, id: string }> }) {
    try {
        const { collection, id } = await params;
        if (!ALLOWED_COLLECTIONS.includes(collection)) {
            return NextResponse.json({ error: 'Collection not accessible' }, { status: 403 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });

        const user = await getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Nur Administratoren können Daten löschen.' }, { status: 403 });
        }

        await DatabaseService.delete(collection, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`API Error deleting item from collection:`, error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}

