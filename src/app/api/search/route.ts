/**
 * src/app/api/search/route.ts
 *
 * P0 Fix — 2026-03-09
 *
 * Stale Qdrant import removed. Semantic search is not available.
 * Route now uses DatabaseService-only fallback for structured filter queries.
 * When a free-text query is provided, returns a clear "not available" response
 * instead of crashing on the missing Qdrant module.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { requireAuth } from '@/lib/helpers/requireAuth';

export async function GET(request: NextRequest) {
    const { error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const projektId = searchParams.get('projektId') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const status = searchParams.get('status') || undefined;
    const abteilung = searchParams.get('abteilung') || undefined;
    const teilsystemId = searchParams.get('teilsystemId') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    try {
        if (query.trim()) {
            // Semantic search via Qdrant is NOT available (Qdrant removed).
            // For future: integrate Supabase pgvector or full-text search here.
            return NextResponse.json({
                results: [],
                mode: 'unavailable',
                message: 'Semantische Suche ist aktuell nicht verfuegbar. Bitte verwende die Filter-Suche.',
            });
        }

        // Structured filter search directly via DatabaseService (Supabase)
        const must: { key: string; match: { value: string } }[] = [];
        if (projektId) must.push({ key: 'projektId', match: { value: projektId } });
        if (status) must.push({ key: 'status', match: { value: status } });
        if (abteilung) must.push({ key: 'abteilung', match: { value: abteilung } });
        if (teilsystemId) must.push({ key: 'teilsystemId', match: { value: teilsystemId } });
        const filter = must.length > 0 ? { must } : undefined;

        // Only canonical search collections
        const collections: string[] = entityType
            ? [
                entityType === 'teilsystem' ? 'teilsysteme'
                    : entityType === 'unterposition' ? 'unterpositionen'
                        : 'positionen',
            ]
            : ['teilsysteme', 'positionen', 'unterpositionen'];

        const resultsPromises = collections.map(col =>
            DatabaseService.list<Record<string, unknown>>(col, filter)
        );
        const allResults = (await Promise.all(resultsPromises)).flat();

        return NextResponse.json({
            results: allResults.slice(0, limit).map(r => ({
                id: r.id,
                score: 1.0,
                payload: r,
            })),
            mode: 'filter',
        });
    } catch (err: unknown) {
        const e = err as { message?: string };
        console.error('[API search]', e);
        return NextResponse.json(
            { error: 'Suchfehler', details: e.message },
            { status: 500 }
        );
    }
}
