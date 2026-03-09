// src/app/api/kosten/material/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { TsMaterialkosten } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ChangelogService } from '@/lib/services/changelogService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const teilsystemId = searchParams.get('teilsystemId');
    const projektId = searchParams.get('projektId');

    const must: any[] = [];
    if (teilsystemId) must.push({ key: 'teilsystemId', match: { value: teilsystemId } });
    if (projektId) must.push({ key: 'projektId', match: { value: projektId } });

    const filter = must.length > 0 ? { must } : undefined;
    try {
        const material = await DatabaseService.list<TsMaterialkosten>('ts_materialkosten', filter);
        return NextResponse.json(material);
    } catch (err) {
        console.error('[kosten/material] GET error:', err);
        return NextResponse.json([], { status: 200 }); // graceful degradation
    }
}

export async function POST(request: NextRequest) {
    const { user } = await requireAuth();
    try {
        const body = await request.json();
        if (!body.teilsystemId || !body.projektId || !body.bezeichnung || body.menge == null || body.einzelpreis == null) {
            return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
        }
        const entry: TsMaterialkosten = {
            ...body,
            id: uuidv4(),
            gesamtpreis: body.menge * body.einzelpreis,
            createdAt: new Date().toISOString(),
        };
        const created = await DatabaseService.upsert('ts_materialkosten', entry);

        // Log to TS change history
        if (body.teilsystemId) {
            const who = user ? `${user.vorname} ${user.nachname}` : 'System';
            const email = user?.email || '';
            await ChangelogService.createEntry({
                entityType: 'teilsystem',
                entityId: body.teilsystemId,
                projektId: body.projektId,
                changedAt: new Date().toISOString(),
                changedBy: who,
                changedByEmail: email,
                changedFields: [{ field: 'material', label: 'Material', before: null, after: `${body.bezeichnung} (${body.menge} × CHF ${body.einzelpreis})` }],
                summary: `Material hinzugefügt: ${body.bezeichnung} (${body.menge} × CHF ${body.einzelpreis} = CHF ${entry.gesamtpreis})`,
            });
        }

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 });
    }
}
