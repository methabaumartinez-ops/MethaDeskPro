// src/app/api/lagerorte/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { Lagerort } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const projektId = searchParams.get('projektId');

        const filter = projektId
            ? { must: [{ key: 'projektId', match: { value: projektId } }] }
            : undefined;

        const lagerorte = await DatabaseService.list<Lagerort>('lagerorte', filter);
        return NextResponse.json(lagerorte);
    } catch (error: any) {
        console.error('[API lagerorte] GET error:', error);
        return NextResponse.json({ error: 'Fehler beim Laden der Lagerorte' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body.projektId || !body.bezeichnung) {
            return NextResponse.json({ error: 'projektId und bezeichnung sind erforderlich' }, { status: 400 });
        }
        const id = body.id || uuidv4();
        const newLagerort: Lagerort = {
            ...body,
            id,
            qrCode: `LAGERORT:${id}`,
            createdAt: new Date().toISOString(),
        };
        const created = await DatabaseService.upsert('lagerorte', newLagerort);
        return NextResponse.json(created, { status: 201 });
    } catch (error: any) {
        console.error('[API lagerorte] POST error:', error);
        return NextResponse.json({ error: 'Fehler beim Erstellen des Lagerorts' }, { status: 500 });
    }
}
