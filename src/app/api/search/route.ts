// src/app/api/search/route.ts
// Semantische Suche: Kombiniert Qdrant-Filter + Vektorsuche
import { NextRequest, NextResponse } from 'next/server';
import { searchSemantic } from '@/lib/qdrant/semanticSearch';
import { DatabaseService } from '@/lib/services/db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const projektId = searchParams.get('projektId') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const status = searchParams.get('status') || undefined;
    const abteilung = searchParams.get('abteilung') || undefined;
    const teilsystemId = searchParams.get('teilsystemId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    try {
        if (query.trim()) {
            // Semantische Suche in Qdrant-Vektorkollektion
            const results = await searchSemantic({
                query,
                limit,
                filter: { projektId, entityType, status, abteilung, teilsystemId },
            });
            return NextResponse.json({ results, mode: 'semantic' });
        } else {
            // Ohne Query: Suche nach einfachen Filtern in normalen Kollektionen
            const must: any[] = [];
            if (projektId) must.push({ key: 'projektId', match: { value: projektId } });
            if (status) must.push({ key: 'status', match: { value: status } });
            if (abteilung) must.push({ key: 'abteilung', match: { value: abteilung } });
            if (teilsystemId) must.push({ key: 'teilsystemId', match: { value: teilsystemId } });
            const filter = must.length > 0 ? { must } : undefined;

            const collections = entityType
                ? [entityType === 'teilsystem' ? 'teilsysteme' : entityType === 'unterposition' ? 'unterpositionen' : 'positionen']
                : ['teilsysteme', 'positionen', 'unterpositionen'];

            const resultsPromises = collections.map(col => DatabaseService.list<any>(col, filter));
            const allResults = (await Promise.all(resultsPromises)).flat();

            return NextResponse.json({
                results: allResults.slice(0, limit).map(r => ({
                    id: r.id,
                    score: 1.0,
                    payload: r,
                })),
                mode: 'filter',
            });
        }
    } catch (error: any) {
        console.error('[API search]', error);
        return NextResponse.json({ error: 'Suchfehler', details: error.message }, { status: 500 });
    }
}
