// src/app/api/beschichter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { WlBeschichter } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    const beschichter = await DatabaseService.list<WlBeschichter>('beschichter');
    return NextResponse.json(beschichter);
}

export async function POST(request: NextRequest) {
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
