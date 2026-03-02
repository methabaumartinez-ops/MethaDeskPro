// src/app/api/kosten/stunden/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { TsStunden, Mitarbeiter } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const teilsystemId = searchParams.get('teilsystemId');
    const projektId = searchParams.get('projektId');

    const must: any[] = [];
    if (teilsystemId) must.push({ key: 'teilsystemId', match: { value: teilsystemId } });
    if (projektId) must.push({ key: 'projektId', match: { value: projektId } });

    const filter = must.length > 0 ? { must } : undefined;
    const stunden = await DatabaseService.list<TsStunden>('ts_stunden', filter);
    return NextResponse.json(stunden);
}

export async function POST(request: NextRequest) {
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
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 });
    }
}
