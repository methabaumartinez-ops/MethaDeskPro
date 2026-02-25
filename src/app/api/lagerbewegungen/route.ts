// src/app/api/lagerbewegungen/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { Lagerbewegung } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { PositionService } from '@/lib/services/positionService';
import { SubPositionService } from '@/lib/services/subPositionService';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const entityId = searchParams.get('entityId');
        const projektId = searchParams.get('projektId');

        const must: any[] = [];
        if (entityId) must.push({ key: 'entityId', match: { value: entityId } });
        if (projektId) must.push({ key: 'projektId', match: { value: projektId } });

        const filter = must.length > 0 ? { must } : undefined;
        const bewegungen = await DatabaseService.list<Lagerbewegung>('lagerbewegungen', filter);
        return NextResponse.json(bewegungen.sort((a, b) => new Date(b.zeitpunkt).getTime() - new Date(a.zeitpunkt).getTime()));
    } catch (error: any) {
        return NextResponse.json({ error: 'Fehler beim Laden der Lagerbewegungen' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { entityType, entityId, nachLagerortId, typ, durchgefuehrtVon, durchgefuehrtVonName, projektId, bemerkung, vonLagerortId } = body;

        if (!entityType || !entityId || !nachLagerortId || !typ || !durchgefuehrtVon) {
            return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
        }

        const bewegung: Lagerbewegung = {
            id: uuidv4(),
            entityType,
            entityId,
            vonLagerortId,
            nachLagerortId,
            typ,
            durchgefuehrtVon,
            durchgefuehrtVonName,
            projektId,
            bemerkung,
            zeitpunkt: new Date().toISOString(),
        };

        await DatabaseService.upsert('lagerbewegungen', bewegung);

        // Actualizar lagerortId en la entidad correspondiente
        try {
            if (entityType === 'position') {
                await PositionService.updatePosition(entityId, { lagerortId: nachLagerortId });
            } else if (entityType === 'unterposition') {
                await SubPositionService.updateUnterposition(entityId, { lagerortId: nachLagerortId });
            }
        } catch (updateError) {
            console.warn('[Lagerbewegung] Could not update entity lagerortId:', updateError);
        }

        return NextResponse.json(bewegung, { status: 201 });
    } catch (error: any) {
        console.error('[API lagerbewegungen] POST error:', error);
        return NextResponse.json({ error: 'Fehler beim Registrieren der Bewegung' }, { status: 500 });
    }
}
