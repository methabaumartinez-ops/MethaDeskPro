import 'server-only';
import { v4 as uuidv4 } from 'uuid';
import { mockStore } from '@/lib/mock/store';
import { SupabaseDatabaseService } from '@/lib/services/supabaseDb';

/**
 * DatabaseService
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified DB abstraction. Two modes:
 *
 *   1. SUPABASE (default, production) — USE_SUPABASE=true
 *   2. MOCK (dev/test only)           — USE_MOCK=true
 *
 * The legacy Qdrant-as-database path has been removed.
 * Qdrant is used only for semantic search via src/lib/qdrant/semanticSearch.ts.
 *
 * GUARD: USE_MOCK=true is blocked in production by src/lib/env.ts startup check.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export class DatabaseService {
    /** Mock mode — only for development and automated tests */
    private static readonly useMock: boolean = process.env.USE_MOCK === 'true';

    /**
     * When false (default), Supabase is active.
     * Kept as a flag to ease future testing of alternative backends.
     */
    private static readonly useSupabase: boolean = process.env.USE_SUPABASE === 'true';

    // ─────────────────────────────────────────────────────────────────────────
    // LIST
    // ─────────────────────────────────────────────────────────────────────────

    static async list<T>(collectionName: string, filter?: any): Promise<T[]> {
        if (this.useSupabase) return SupabaseDatabaseService.list<T>(collectionName, filter);

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
                case 'positionen': {
                    const tsIdMatch = filter?.must?.find((m: any) => m.key === 'teilsystemId');
                    const tsId = typeof tsIdMatch?.match === 'object' ? tsIdMatch.match.value : tsIdMatch?.match;
                    result = mockStore.getPositionen(tsId) || [];
                    break;
                }
                case 'unterpositionen': {
                    const posIdMatch = filter?.must?.find((m: any) => m.key === 'positionId');
                    const posId = typeof posIdMatch?.match === 'object' ? posIdMatch.match.value : posIdMatch?.match;
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
                    const userIdMatch = filter?.must?.find((m: any) => m.key === 'userId');
                    const userId = typeof userIdMatch?.match === 'object' ? userIdMatch.match.value : userIdMatch?.match;
                    result = mockStore.getDashboardRequests(userId) || [];
                    break;
                }
                case 'conversation_logs': {
                    const requestIdMatch = filter?.must?.find((m: any) => m.key === 'requestId');
                    const requestId = typeof requestIdMatch?.match === 'object' ? requestIdMatch.match.value : requestIdMatch?.match;
                    result = mockStore.getConversationLogs(requestId) || [];
                    break;
                }
                default: result = [];
            }
            return result as unknown as T[];
        }

        throw new Error(
            `[DatabaseService] No active database backend. ` +
            `Set USE_SUPABASE=true in environment variables.`
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET
    // ─────────────────────────────────────────────────────────────────────────

    static async get<T>(collectionName: string, id: string): Promise<T | null> {
        if (this.useSupabase) return SupabaseDatabaseService.get<T>(collectionName, id);

        if (this.useMock) {
            const all = await this.list<T>(collectionName);
            return (all as any[]).find(item => item.id === id) || null;
        }

        throw new Error(
            `[DatabaseService] No active database backend. ` +
            `Set USE_SUPABASE=true in environment variables.`
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPSERT
    // ─────────────────────────────────────────────────────────────────────────

    static async upsert<T extends { id?: string }>(collectionName: string, item: T): Promise<T> {
        if (this.useSupabase) return SupabaseDatabaseService.upsert<T>(collectionName, item);

        if (this.useMock) {
            const id = item.id || uuidv4();
            const newItem = { ...item, id };
            console.log(`[DatabaseService] Mock upsert ${collectionName}:`, id);
            switch (collectionName) {
                case 'projekte': {
                    const projekte = mockStore.getProjekte() || [];
                    const idx = projekte.findIndex((p: any) => p.id === id);
                    if (idx > -1) projekte[idx] = newItem; else projekte.push(newItem);
                    mockStore.saveProjekte(projekte); break;
                }
                case 'teilsysteme': {
                    const teilsysteme = mockStore.getTeilsysteme() || [];
                    const idx = teilsysteme.findIndex((t: any) => t.id === id);
                    if (idx > -1) teilsysteme[idx] = newItem; else teilsysteme.push(newItem);
                    mockStore.saveTeilsysteme(teilsysteme); break;
                }
                case 'positionen': {
                    const positionen = mockStore.getPositionen() || [];
                    const idx = positionen.findIndex((p: any) => p.id === id);
                    if (idx > -1) positionen[idx] = newItem; else positionen.push(newItem);
                    mockStore.savePositionen(positionen); break;
                }
                case 'material': {
                    const material = mockStore.getMaterial() || [];
                    const idx = material.findIndex((m: any) => m.id === id);
                    if (idx > -1) material[idx] = newItem; else material.push(newItem);
                    mockStore.saveMaterial(material); break;
                }
                case 'dashboard_requests': {
                    const dRequests = mockStore.getDashboardRequests() || [];
                    const idx = dRequests.findIndex((r: any) => r.id === id);
                    if (idx > -1) dRequests[idx] = newItem; else dRequests.push(newItem);
                    mockStore.saveDashboardRequests(dRequests); break;
                }
                case 'conversation_logs': {
                    const logs = mockStore.getConversationLogs() || [];
                    const idx = logs.findIndex((l: any) => l.id === id);
                    if (idx > -1) logs[idx] = newItem; else logs.push(newItem);
                    mockStore.saveConversationLogs(logs); break;
                }
            }
            return newItem as T;
        }

        throw new Error(
            `[DatabaseService] No active database backend. ` +
            `Set USE_SUPABASE=true in environment variables.`
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INSERT (create only — fails if duplicate id)
    // ─────────────────────────────────────────────────────────────────────────

    static async insert<T extends { id?: string }>(collectionName: string, item: T): Promise<T> {
        if (this.useSupabase) return SupabaseDatabaseService.insert<T>(collectionName, item);
        // Mock mode: insert behaves same as upsert (no conflict in mock store)
        if (this.useMock) return this.upsert<T>(collectionName, item);
        throw new Error(
            `[DatabaseService] No active database backend. ` +
            `Set USE_SUPABASE=true in environment variables.`
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE BY FILTER
    // ─────────────────────────────────────────────────────────────────────────

    static async deleteByFilter(collectionName: string, filter: any): Promise<void> {
        if (this.useSupabase) return SupabaseDatabaseService.deleteByFilter(collectionName, filter);

        if (this.useMock) {
            console.log(`[DatabaseService] Mock deleteByFilter ${collectionName}:`, filter);
            switch (collectionName) {
                case 'teilsysteme': {
                    const items = mockStore.getTeilsysteme() || [];
                    const pId = filter.must?.find((m: any) => m.key === 'projektId')?.match?.value;
                    if (pId) mockStore.saveTeilsysteme(items.filter((t: any) => t.projektId !== pId));
                    break;
                }
                case 'positionen': {
                    const items = mockStore.getPositionen() || [];
                    const tsId = filter.must?.find((m: any) => m.key === 'teilsystemId')?.match?.value;
                    if (tsId) mockStore.savePositionen(items.filter((p: any) => p.teilsystemId !== tsId));
                    break;
                }
                case 'unterpositionen': {
                    const items = mockStore.getUnterpositionen() || [];
                    const posId = filter.must?.find((m: any) => m.key === 'positionId')?.match?.value;
                    if (posId) mockStore.saveUnterpositionen(items.filter((u: any) => u.positionId !== posId));
                    break;
                }
            }
            return;
        }

        throw new Error(
            `[DatabaseService] No active database backend. ` +
            `Set USE_SUPABASE=true in environment variables.`
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────

    static async delete(collectionName: string, id: string): Promise<void> {
        if (this.useSupabase) return SupabaseDatabaseService.delete(collectionName, id);

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

        throw new Error(
            `[DatabaseService] No active database backend. ` +
            `Set USE_SUPABASE=true in environment variables.`
        );
    }
}
