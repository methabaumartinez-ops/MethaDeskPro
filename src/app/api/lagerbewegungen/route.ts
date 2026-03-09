// src/app/api/lagerbewegungen/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { Lagerbewegung } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { PositionService } from '@/lib/services/positionService';
import { SubPositionService } from '@/lib/services/subPositionService';
import { ChangelogService } from '@/lib/services/changelogService';
import { requireAuth } from '@/lib/helpers/requireAuth';

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
            } else if (entityType === 'teilsystem') {
                const { SubsystemService } = await import('@/lib/services/subsystemService');
                await SubsystemService.updateTeilsystem(entityId, { lagerortId: nachLagerortId });
            }
        } catch (updateError) {
            console.warn('[Lagerbewegung] Could not update entity lagerortId:', updateError);
        }

        // Log to entity change history
        try {
            const { user } = await requireAuth();
            const who = durchgefuehrtVonName || (user ? `${user.vorname} ${user.nachname}` : 'System');
            const email = user?.email || '';
            const typLabel = typ === 'einlagerung' ? 'Einlagerung' : typ === 'auslagerung' ? 'Auslagerung' : typ;
            // Resolve lagerort names for a readable summary
            const [vonLagerort, nachLagerort] = await Promise.all([
                vonLagerortId ? DatabaseService.get('lagerorte', vonLagerortId) : Promise.resolve(null),
                DatabaseService.get('lagerorte', nachLagerortId),
            ]);
            const vonName = (vonLagerort as any)?.name || vonLagerortId || '—';
            const nachName = (nachLagerort as any)?.name || nachLagerortId || '—';
            const entityTypeCasted = (['teilsystem','position','unterposition'] as const).find(t => t === entityType);
            if (entityTypeCasted) {
                await ChangelogService.createEntry({
                    entityType: entityTypeCasted,
                    entityId,
                    projektId,
                    changedAt: new Date().toISOString(),
                    changedBy: who,
                    changedByEmail: email,
                    changedFields: [{ field: 'lagerortId', label: typLabel, before: vonName, after: nachName }],
                    summary: `${typLabel}: ${vonName} → ${nachName}`,
                });
            }
        } catch { /* changelog failures must not block the response */ }

        return NextResponse.json(bewegung, { status: 201 });
    } catch (error: any) {
        console.error('[API lagerbewegungen] POST error:', error);
        return NextResponse.json({ error: 'Fehler beim Registrieren der Bewegung' }, { status: 500 });
    }
}
