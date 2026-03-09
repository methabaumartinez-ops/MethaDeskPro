// src/app/api/kosten/stunden/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { TsStunden, Mitarbeiter } from '@/types';
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
        const stunden = await DatabaseService.list<TsStunden>('ts_stunden', filter);
        return NextResponse.json(stunden);
    } catch (err) {
        console.error('[kosten/stunden] GET error:', err);
        return NextResponse.json([], { status: 200 }); // graceful degradation
    }
}

export async function POST(request: NextRequest) {
    const { user } = await requireAuth();
    try {
        const body = await request.json();
        if (!body.teilsystemId || !body.projektId || !body.mitarbeiterId || !body.datum || body.stunden == null) {
            return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
        }
        let { stundensatz, gesamtpreis } = body;
        if (stundensatz === undefined || gesamtpreis === undefined) {
            const emp = await DatabaseService.get<Mitarbeiter>('mitarbeiter', body.mitarbeiterId);
            stundensatz = emp?.stundensatz || 55;
            gesamtpreis = stundensatz * body.stunden;
        }

        const entry: TsStunden = {
            ...body,
            stundensatz,
            gesamtpreis,
            id: uuidv4(),
            createdAt: new Date().toISOString()
        };
        const created = await DatabaseService.upsert('ts_stunden', entry);

        // Log to TS change history
        if (body.teilsystemId) {
            const who = user ? `${user.vorname} ${user.nachname}` : 'System';
            const email = user?.email || '';
            const mitarbeiterLabel = body.mitarbeiterName || body.mitarbeiterId;
            await ChangelogService.createEntry({
                entityType: 'teilsystem',
                entityId: body.teilsystemId,
                projektId: body.projektId,
                changedAt: new Date().toISOString(),
                changedBy: who,
                changedByEmail: email,
                changedFields: [{ field: 'stunden', label: 'Stunden', before: null, after: `${mitarbeiterLabel}: ${body.stunden}h (CHF ${gesamtpreis})` }],
                summary: `Stunden erfasst: ${mitarbeiterLabel} ${body.stunden}h am ${body.datum} = CHF ${gesamtpreis}`,
            });
        }

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 });
    }
}
