// src/lib/qdrant/semanticSearch.ts
// Búsqueda semántica en Qdrant usando transformers.js (all-MiniLM-L6-v2, 384 dims)

import { qdrantClient } from './client';

const COLLECTION_NAME = 'ts_tracking_docs';
const VECTOR_SIZE = 384;

// Generamos embedding mediante la API REST interna para no cargar transformers en este módulo
async function getEmbedding(text: string): Promise<number[]> {
    // En el servidor, llamamos al endpoint interno de embeddings
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Failed to generate embedding');
    const data = await res.json();
    return data.embedding as number[];
}

export async function ensureTrackingCollection() {
    try {
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
        if (!exists) {
            await qdrantClient.createCollection(COLLECTION_NAME, {
                vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
            });
            // Crear índices de payload
            const filterFields = ['entityType', 'entityId', 'projektId', 'teilsystemId', 'status', 'abteilung'];
            for (const field of filterFields) {
                await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
                    field_name: field,
                    field_schema: 'keyword',
                    wait: false,
                }).catch(() => { });
            }
            console.log(`[SemanticSearch] Colección '${COLLECTION_NAME}' creada con vectores size=${VECTOR_SIZE}`);
        }
    } catch (error) {
        console.error('[SemanticSearch] Error ensuring collection:', error);
    }
}

export function buildEmbeddingText(entity: {
    type: 'teilsystem' | 'position' | 'unterposition' | 'projekt';
    name?: string;
    beschreibung?: string;
    bemerkung?: string;
    status?: string;
    abteilung?: string;
    beschichtung?: string;
}): string {
    const parts = [
        entity.type,
        entity.name || '',
        entity.beschreibung || '',
        entity.bemerkung || '',
        entity.status || '',
        entity.abteilung || '',
        entity.beschichtung || '',
    ].filter(Boolean);
    return parts.join(' ').trim().toLowerCase();
}

export async function upsertEntityEmbedding(params: {
    entityType: 'teilsystem' | 'position' | 'unterposition' | 'projekt';
    entityId: string;
    projektId?: string;
    teilsystemId?: string;
    embeddingText: string;
    payload: Record<string, unknown>;
}) {
    try {
        await ensureTrackingCollection();
        const vector = await getEmbedding(params.embeddingText);

        await qdrantClient.upsert(COLLECTION_NAME, {
            wait: true,
            points: [{
                id: params.entityId,
                vector,
                payload: {
                    entityType: params.entityType,
                    entityId: params.entityId,
                    projektId: params.projektId,
                    teilsystemId: params.teilsystemId,
                    embeddingText: params.embeddingText,
                    ...params.payload,
                },
            }],
        });
    } catch (error) {
        console.error('[SemanticSearch] Error upserting embedding:', error);
        // No lanzamos error para no bloquear la operación principal
    }
}

export async function searchSemantic(params: {
    query: string;
    limit?: number;
    filter?: {
        projektId?: string;
        entityType?: string;
        status?: string;
        abteilung?: string;
        teilsystemId?: string;
    };
}): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>> {
    try {
        await ensureTrackingCollection();
        const vector = await getEmbedding(params.query);

        const mustConditions: any[] = [];
        if (params.filter?.projektId) mustConditions.push({ key: 'projektId', match: { value: params.filter.projektId } });
        if (params.filter?.entityType) mustConditions.push({ key: 'entityType', match: { value: params.filter.entityType } });
        if (params.filter?.status) mustConditions.push({ key: 'status', match: { value: params.filter.status } });
        if (params.filter?.abteilung) mustConditions.push({ key: 'abteilung', match: { value: params.filter.abteilung } });
        if (params.filter?.teilsystemId) mustConditions.push({ key: 'teilsystemId', match: { value: params.filter.teilsystemId } });

        const searchResult = await qdrantClient.search(COLLECTION_NAME, {
            vector,
            limit: params.limit || 10,
            with_payload: true,
            filter: mustConditions.length > 0 ? { must: mustConditions } : undefined,
            score_threshold: 0.3,
        });

        return searchResult.map(r => ({
            id: r.id as string,
            score: r.score,
            payload: r.payload as Record<string, unknown>,
        }));
    } catch (error) {
        console.error('[SemanticSearch] Error searching:', error);
        return [];
    }
}
