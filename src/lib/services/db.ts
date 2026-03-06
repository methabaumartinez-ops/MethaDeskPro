import 'server-only';
import { qdrantClient } from '@/lib/qdrant/client';
import { v4 as uuidv4 } from 'uuid';
import { mockStore } from '@/lib/mock/store';

export class DatabaseService {
    // Flag to toggle between mock data and real Qdrant DB
    private static useMock = false; // Set to false to use real Qdrant DB

    /**
     * Helper to ensure ID is a valid Qdrant ID (UUID)
     */
    private static ensureQdrantId(id: string): string {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (!isUuid) {
            console.warn(`[DatabaseService] Standard UUID format expected, got: ${id}. This might fail if the backend strictly requires UUIDs.`);
        }
        return id;
    }

    /**
     * Ensures a collection exists in Qdrant before operation
     */
    private static async ensureCollection(collectionName: string): Promise<void> {
        if (this.useMock) return;
        try {
            // We use a cached check or just let it fail gracefully
            const collections = await qdrantClient.getCollections();
            const exists = collections.collections.some(c => c.name === collectionName);
            if (!exists) {
                console.log(`[DatabaseService] Creating collection '${collectionName}' in Qdrant...`);
                await qdrantClient.createCollection(collectionName, {
                    vectors: {}, // Changed to empty vectors to match migration script
                });

                // Create default indexes for filtering
                const commonFilterFields = ['projektId', 'teilsystemId', 'positionId', 'status', 'userId'];
                for (const field of commonFilterFields) {
                    try {
                        await qdrantClient.createPayloadIndex(collectionName, {
                            field_name: field,
                            field_schema: 'keyword',
                            wait: false
                        });
                    } catch { /* Field might not exist in all collections, ignore */ }
                }
            }
        } catch (error) {
            console.error(`[DatabaseService] Error ensuring collection '${collectionName}':`, error);
            // We don't throw here to allow operations to proceed if the collection might actually exist
            // but the getCollections call failed (e.g. transient network issue)
        }
    }

    /**
     * List items from a collection
     */
    static async list<T>(collectionName: string, filter?: any): Promise<T[]> {
        if (this.useMock) {
            console.log(`[DatabaseService] Mock list: ${collectionName}`, filter);
            let result: any[] = [];
            let projektId: string | undefined;
            if (filter?.must) {
                const pIdMatch = filter.must.find((m: any) => m.key === 'projektId' || m.key === 'projekt_id');
                if (pIdMatch) {
                    projektId = typeof pIdMatch.match === 'object' ? pIdMatch.match.value : pIdMatch.match;
                }
            }

            switch (collectionName) {
                case 'projekte': result = mockStore.getProjekte() || []; break;
                case 'teilsysteme': result = mockStore.getTeilsysteme(projektId) || []; break;
                // ... (existing mock implementation)
                case 'positionen': {
                    let tsIdMatch = filter?.must?.find((m: any) => m.key === 'teilsystemId');
                    let tsId = typeof tsIdMatch?.match === 'object' ? tsIdMatch.match.value : tsIdMatch?.match;
                    result = mockStore.getPositionen(tsId) || [];
                    break;
                }
                case 'unterpositionen': {
                    let posIdMatch = filter?.must?.find((m: any) => m.key === 'positionId');
                    let posId = typeof posIdMatch?.match === 'object' ? posIdMatch.match.value : posIdMatch?.match;
                    result = mockStore.getUnterpositionen(posId) || [];
                    break;
                }
                case 'material': result = mockStore.getMaterial() || []; break;
                case 'mitarbeiter': result = mockStore.getMitarbeiter() || []; break;
                case 'fahrzeuge': result = mockStore.getFahrzeuge() || []; break;
                case 'reservierungen': result = mockStore.getReservierungen() || []; break;
                case 'lieferanten': result = mockStore.getLieferanten() || []; break;
                case 'users': result = mockStore.getUsers() || []; break;
                case 'dashboard_requests': {
                    let userIdMatch = filter?.must?.find((m: any) => m.key === 'userId');
                    let userId = typeof userIdMatch?.match === 'object' ? userIdMatch.match.value : userIdMatch?.match;
                    result = mockStore.getDashboardRequests(userId) || [];
                    break;
                }
                case 'conversation_logs': {
                    let requestIdMatch = filter?.must?.find((m: any) => m.key === 'requestId');
                    let requestId = typeof requestIdMatch?.match === 'object' ? requestIdMatch.match.value : requestIdMatch?.match;
                    result = mockStore.getConversationLogs(requestId) || [];
                    break;
                }
                default: result = [];
            }
            return result as unknown as T[];
        }

        await this.ensureCollection(collectionName);
        await this.ensureCollection(collectionName);

        try {
            console.log(`[DatabaseService] Qdrant list: ${collectionName} with filter:`, JSON.stringify(filter, null, 2));
            let allPoints: any[] = [];
            let next_page_offset: any = undefined;

            do {
                const response = await qdrantClient.scroll(collectionName, {
                    limit: 100,
                    filter: filter,
                    with_payload: true,
                    with_vector: false,
                    offset: next_page_offset,
                });

                allPoints.push(...response.points);
                next_page_offset = response.next_page_offset;
            } while (next_page_offset);

            console.log(`[DatabaseService] Success: Found ${allPoints.length} items in ${collectionName}`);

            return allPoints.map(point => ({
                id: point.id,
                ...point.payload
            })) as unknown as T[];
        } catch (error: any) {
            console.error(`[DatabaseService] CRITICAL Error listing from ${collectionName}:`, error.message || error);
            // Don't throw if we want to return empty list on failure, but here throwing is better for visibility
            throw error;
        }
    }

    /**
     * Get a single item by ID
     */
    static async get<T>(collectionName: string, id: string): Promise<T | null> {
        if (this.useMock) {
            const all = await this.list<T>(collectionName);
            return (all as any[]).find(item => item.id === id) || null;
        }

        await this.ensureCollection(collectionName);

        try {
            const response = await qdrantClient.retrieve(collectionName, {
                ids: [this.ensureQdrantId(id)],
                with_payload: true,
                with_vector: false,
            });

            if (response.length === 0) return null;

            const point = response[0];
            return {
                id: point.id,
                ...point.payload
            } as unknown as T;
        } catch (error) {
            console.error(`[DatabaseService] Error getting ${id} from ${collectionName}:`, error);
            return null;
        }
    }

    /**
     * Create or Update an item
     */
    static async upsert<T extends { id?: string }>(collectionName: string, item: T): Promise<T> {
        if (this.useMock) {
            const id = item.id || uuidv4();
            const newItem = { ...item, id };
            console.log(`[DatabaseService] Mock upsert ${collectionName}:`, id);

            switch (collectionName) {
                case 'projekte':
                    const projekte = mockStore.getProjekte() || [];
                    const pIdx = projekte.findIndex((p: any) => p.id === id);
                    if (pIdx > -1) projekte[pIdx] = newItem; else projekte.push(newItem);
                    mockStore.saveProjekte(projekte);
                    break;
                case 'teilsysteme':
                    const teilsysteme = mockStore.getTeilsysteme() || [];
                    const tIdx = teilsysteme.findIndex((t: any) => t.id === id);
                    if (tIdx > -1) teilsysteme[tIdx] = newItem; else teilsysteme.push(newItem);
                    mockStore.saveTeilsysteme(teilsysteme);
                    break;
                case 'positionen':
                    const positionen = mockStore.getPositionen() || [];
                    const posIdx = positionen.findIndex((p: any) => p.id === id);
                    if (posIdx > -1) positionen[posIdx] = newItem; else positionen.push(newItem);
                    mockStore.savePositionen(positionen);
                    break;
                case 'material':
                    const material = mockStore.getMaterial() || [];
                    const mIdx = material.findIndex((m: any) => m.id === id);
                    if (mIdx > -1) material[mIdx] = newItem; else material.push(newItem);
                    mockStore.saveMaterial(material);
                    break;
                case 'dashboard_requests':
                    const dRequests = mockStore.getDashboardRequests() || [];
                    const dIdx = dRequests.findIndex((r: any) => r.id === id);
                    if (dIdx > -1) dRequests[dIdx] = newItem; else dRequests.push(newItem);
                    mockStore.saveDashboardRequests(dRequests);
                    break;
                case 'conversation_logs':
                    const logs = mockStore.getConversationLogs() || [];
                    const lIdx = logs.findIndex((l: any) => l.id === id);
                    if (lIdx > -1) logs[lIdx] = newItem; else logs.push(newItem);
                    mockStore.saveConversationLogs(logs);
                    break;
                // ... (other cases simplified for now)
            }
            return newItem as T;
        }

        await this.ensureCollection(collectionName);

        try {
            const id = item.id || uuidv4();
            const payload = { ...item, id };

            console.log(`[DatabaseService] Qdrant upsert ${collectionName}:`, id);

            await qdrantClient.upsert(collectionName, {
                wait: true,
                points: [
                    {
                        id: this.ensureQdrantId(id),
                        payload: payload as any,
                        vector: {}
                    }
                ]
            });

            return payload as T;
        } catch (error) {
            console.error(`[DatabaseService] Error upserting to ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Delete multiple items by filter
     */
    static async deleteByFilter(collectionName: string, filter: any): Promise<void> {
        if (this.useMock) {
            console.log(`[DatabaseService] Mock deleteByFilter ${collectionName}:`, filter);
            // Mock implementation: filter and remove
            let items: any[] = [];
            switch (collectionName) {
                case 'teilsysteme':
                    items = mockStore.getTeilsysteme() || [];
                    const pId = filter.must?.find((m: any) => m.key === 'projektId')?.match;
                    mockStore.saveTeilsysteme(items.filter((t: any) => t.projektId !== pId));
                    break;
                case 'positionen':
                    items = mockStore.getPositionen() || [];
                    const tsId = filter.must?.find((m: any) => m.key === 'teilsystemId')?.match;
                    mockStore.savePositionen(items.filter((p: any) => p.teilsystemId !== tsId));
                    break;
                case 'unterpositionen':
                    items = mockStore.getUnterpositionen() || [];
                    const posId = filter.must?.find((m: any) => m.key === 'positionId')?.match;
                    mockStore.saveUnterpositionen(items.filter((u: any) => u.positionId !== posId));
                    break;
            }
            return;
        }
        await this.ensureCollection(collectionName);

        try {
            await qdrantClient.delete(collectionName, {
                filter: filter
            });
        } catch (error) {
            console.error(`[DatabaseService] Error deleting by filter from ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Delete an item
     */
    static async delete(collectionName: string, id: string): Promise<void> {
        if (this.useMock) {
            const items = await this.list<any>(collectionName);
            const filtered = items.filter(i => i.id !== id);
            switch (collectionName) {
                case 'projekte': mockStore.saveProjekte(filtered); break;
                case 'teilsysteme': mockStore.saveTeilsysteme(filtered); break;
                case 'positionen': mockStore.savePositionen(filtered); break;
                case 'unterpositionen': mockStore.saveUnterpositionen(filtered); break;
            }
            return;
        }

        await this.ensureCollection(collectionName);

        try {
            await qdrantClient.delete(collectionName, {
                points: [this.ensureQdrantId(id)]
            });
        } catch (error) {
            console.error(`[DatabaseService] Error deleting from ${collectionName}:`, error);
            throw error;
        }
    }
}
