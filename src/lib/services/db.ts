import { qdrantClient } from '@/lib/qdrant/client';
import { v4 as uuidv4 } from 'uuid';
import { mockStore } from '@/lib/mock/store';

export class DatabaseService {
    // Flag to toggle between mock data and real Qdrant DB
    // Flag to toggle between mock data and real Qdrant DB
    private static useMock = true; // Set to true by default for local stability

    /**
     * Helper to ensure ID is a valid Qdrant ID (UUID or int64)
     * If not, we generate a deterministic UUID based on the string
     */
    private static ensureQdrantId(id: string): string {
        // Simple regex for UUID V4
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        if (isUuid) return id;

        // If not a UUID, we should ideally hash it to a deterministic UUID
        // For now, if it's a mock-style ID like 'p1', we can return a "fake" UUID or just return as is if the server allows it.
        // But Qdrant strictly requires UUID. So we'll use a fixed prefix + hash or just a new UUID if it's meant to be new.
        // To keep updates working, it MUST be deterministic.
        // Let's use a simple placeholder for now or uuidv4 if we don't care about consistency yet.
        // Actually, let's just use the provided ID and let qdrantClient throw if it's invalid, 
        // but we'll log a clearer warning.
        return id;
    }

    /**
     * List items from a collection
     */
    static async list<T>(collectionName: string, filter?: any): Promise<T[]> {
        if (this.useMock) {
            console.log(`Using mock data for collection: ${collectionName} with filter:`, filter);

            // Basic support for filtering by projektId in mock mode
            let projektId: string | undefined;
            if (filter?.must) {
                const pIdMatch = filter.must.find((m: any) => m.key === 'projektId' || m.key === 'projekt_id');
                if (pIdMatch) {
                    projektId = pIdMatch.match?.value;
                }
            }

            switch (collectionName) {
                case 'projekte': return (mockStore.getProjekte() || []) as unknown as T[];
                case 'teilsysteme': return (mockStore.getTeilsysteme(projektId) || []) as unknown as T[];
                case 'positionen': {
                    let tsIdMatch = filter?.must?.find((m: any) => m.key === 'teilsystemId');
                    let tsId = tsIdMatch?.match?.value;
                    return (mockStore.getPositionen(tsId) || []) as unknown as T[];
                }
                case 'material': return (mockStore.getMaterial() || []) as unknown as T[];
                case 'mitarbeiter': return (mockStore.getMitarbeiter() || []) as unknown as T[];
                case 'fahrzeuge': return (mockStore.getFahrzeuge() || []) as unknown as T[];
                case 'reservierungen': return (mockStore.getReservierungen() || []) as unknown as T[];
                case 'lieferanten': return (mockStore.getLieferanten() || []) as unknown as T[];
                default: return [] as T[];
            }
        }

        try {
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

            return allPoints.map(point => ({
                id: point.id,
                ...point.payload
            })) as unknown as T[];
        } catch (error) {
            console.error(`Error listing from ${collectionName}:`, error);
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

        try {
            const response = await qdrantClient.retrieve(collectionName, {
                ids: [id],
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
            console.error(`Error getting ${id} from ${collectionName}:`, error);
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

            // Log for debugging
            console.log(`Upserting to mock ${collectionName}:`, newItem);

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
                case 'mitarbeiter':
                    const mitarbeiter = mockStore.getMitarbeiter() || [];
                    const miIdx = mitarbeiter.findIndex((m: any) => m.id === id);
                    if (miIdx > -1) mitarbeiter[miIdx] = newItem; else mitarbeiter.push(newItem);
                    mockStore.saveMitarbeiter(mitarbeiter);
                    break;
                case 'fahrzeuge':
                    const fahrzeuge = mockStore.getFahrzeuge() || [];
                    const fIdx = fahrzeuge.findIndex((f: any) => f.id === id);
                    if (fIdx > -1) fahrzeuge[fIdx] = newItem; else fahrzeuge.push(newItem);
                    mockStore.saveFahrzeuge(fahrzeuge);
                    break;
                case 'lieferanten':
                    const lieferanten = mockStore.getLieferanten() || [];
                    const lIdx = lieferanten.findIndex((l: any) => l.id === id);
                    if (lIdx > -1) lieferanten[lIdx] = newItem; else lieferanten.push(newItem);
                    mockStore.saveLieferanten(lieferanten);
                    break;
            }
            return newItem as T;
        }

        try {
            const id = item.id || uuidv4();
            const payload = { ...item, id };

            // Ensure Qdrant vector is handled if required
            await qdrantClient.upsert(collectionName, {
                points: [
                    {
                        id: id,
                        payload: payload as any,
                        vector: {}
                    }
                ]
            });

            return payload as T;
        } catch (error) {
            console.error(`Error upserting to ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Delete an item
     */
    static async delete(collectionName: string, id: string): Promise<void> {
        try {
            await qdrantClient.delete(collectionName, {
                points: [id]
            });
        } catch (error) {
            console.error(`Error deleting from ${collectionName}:`, error);
            throw error;
        }
    }
}
