// src/app/api/dokumente/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { TsDokument } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType');
    const projektId = searchParams.get('projektId');

    const must: any[] = [];
    if (entityId) must.push({ key: 'entityId', match: { value: entityId } });
    if (entityType) must.push({ key: 'entityType', match: { value: entityType } });
    if (projektId) must.push({ key: 'projektId', match: { value: projektId } });

    const filter = must.length > 0 ? { must } : undefined;
    const dokumente = await DatabaseService.list<TsDokument>('ts_dokumente', filter);
    return NextResponse.json(dokumente);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.entityType || !body.entityId || !body.name || !body.typ) {
            return NextResponse.json({ error: 'entityType, entityId, name und typ sind erforderlich' }, { status: 400 });
        }
        const doc: TsDokument = { ...body, id: uuidv4(), createdAt: new Date().toISOString() };
        const created = await DatabaseService.upsert('ts_dokumente', doc);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Fehler beim Speichern des Dokuments' }, { status: 500 });
    }
}
