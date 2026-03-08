import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * SupabaseDatabaseService — drop-in replacement for the Qdrant-based DatabaseService.
 * Same interface: list, get, upsert, delete, deleteByFilter.
 *
 * All operations go through supabaseAdmin (service_role key, bypasses RLS).
 */
export class SupabaseDatabaseService {

    /**
     * List items from a table, optionally filtered.
     * Filter format is Qdrant-compatible for backward compat:
     * { must: [{ key: 'fieldName', match: { value: 'x' } }] }
     */
    static async list<T>(tableName: string, filter?: any): Promise<T[]> {
        // Use 'any' to avoid TS 'excessively deep type instantiation' with chained .eq() calls
        let query: any = supabaseAdmin.from(tableName).select('*');

        // Convert Qdrant-style filter to Supabase .eq() calls
        if (filter?.must && Array.isArray(filter.must)) {
            for (const condition of filter.must) {
                const fieldName = condition.key;
                const value = typeof condition.match === 'object' ? condition.match.value : condition.match;
                if (fieldName && value !== undefined) {
                    query = query.eq(fieldName, value);
                }
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error(`[SupabaseDB] Error listing ${tableName}:`, error.message);
            throw new Error(`Failed to list ${tableName}: ${error.message}`);
        }

        return (data || []) as unknown as T[];
    }

    /**
     * Get a single item by ID
     */
    static async get<T>(tableName: string, id: string): Promise<T | null> {
        const { data, error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error(`[SupabaseDB] Error getting ${id} from ${tableName}:`, error.message);
            return null;
        }

        return data as unknown as T | null;
    }

    /**
     * Create or Update an item (upsert)
     */
    static async upsert<T extends { id?: string }>(tableName: string, item: T): Promise<T> {
        const id = item.id || uuidv4();
        let payload = { ...item, id };
        let retries = 0;
        const maxRetries = 10;

        while (retries < maxRetries) {
            const { data, error } = await supabaseAdmin
                .from(tableName)
                .upsert(payload as any, { onConflict: 'id' })
                .select()
                .single();

            if (!error) {
                return (data || payload) as unknown as T;
            }

            // PGRST204: Could not find the 'column_name' column of 'table_name' in the schema cache
            if (error.code === 'PGRST204') {
                const match = error.message.match(/'([^']+)' column/);
                if (match && match[1]) {
                    const badColumn = match[1];
                    console.warn(`[SupabaseDB] Stripping unknown column '${badColumn}' from payload for table '${tableName}'`);
                    
                    // Remove the offending column from the payload format entirely
                    const { [badColumn as keyof typeof payload]: _, ...cleanPayload } = payload;
                    payload = cleanPayload as any;
                    
                    retries++;
                    continue;
                }
            }

            console.error(`[SupabaseDB] Error upserting to ${tableName}:`, JSON.stringify(error, null, 2));
            throw new Error(`Failed to upsert to ${tableName}: ${error.message} - Code: ${error.code} - Details: ${error.details || 'None'} - Hint: ${error.hint || 'None'}`);
        }

        throw new Error(`[SupabaseDB] Exceeded max retries cleaning unknown columns for ${tableName}`);
    }

    /**
     * Delete an item by ID
     */
    static async delete(tableName: string, id: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`[SupabaseDB] Error deleting ${id} from ${tableName}:`, error.message);
            throw new Error(`Failed to delete from ${tableName}: ${error.message}`);
        }
    }

    /**
     * Delete multiple items by filter (Qdrant-compatible format)
     */
    static async deleteByFilter(tableName: string, filter: any): Promise<void> {
        let query: any = supabaseAdmin.from(tableName).delete();

        if (filter?.must && Array.isArray(filter.must)) {
            for (const condition of filter.must) {
                const fieldName = condition.key;
                const value = typeof condition.match === 'object' ? condition.match.value : condition.match;
                if (fieldName && value !== undefined) {
                    query = query.eq(fieldName, value);
                }
            }
        } else {
            // Safety: never delete without a filter
            console.error('[SupabaseDB] deleteByFilter called without valid filter — aborting');
            return;
        }

        const { error } = await query;

        if (error) {
            console.error(`[SupabaseDB] Error deleting by filter from ${tableName}:`, error.message);
            throw new Error(`Failed to delete by filter from ${tableName}: ${error.message}`);
        }
    }
}
