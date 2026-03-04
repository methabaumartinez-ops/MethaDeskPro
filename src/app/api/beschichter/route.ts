import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { WlBeschichter } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/helpers/requireAuth';

export async function GET() {
    const { error } = await requireAuth();
    if (error) return error;

    const beschichter = await DatabaseService.list<WlBeschichter>('beschichter');
    return NextResponse.json(beschichter);
}

export async function POST(request: NextRequest) {
    const { error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const body = await request.json();
        if (!body.name) return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
        const b: WlBeschichter = { ...body, id: uuidv4(), createdAt: new Date().toISOString() };
        const created = await DatabaseService.upsert('beschichter', b);
        return NextResponse.json(created, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 });
    }
}
