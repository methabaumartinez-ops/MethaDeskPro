/**
 * GET  /api/admin/permissions  — get all page + table permissions (superadmin only)
 * PUT  /api/admin/permissions  — save updated permissions (superadmin only)
 *
 * Body for PUT:
 * {
 *   pagePermissions:  Record<string, string[]>           (abteilungId → PageKey[])
 *   tablePermissions: Record<string, Record<string, TablePerms>>
 * }
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { DatabaseService } from '@/lib/services/db';
import { DEFAULT_ABT_PERMISSIONS } from '@/lib/config/abteilungPagePermissions';
import { DEFAULT_TABLE_PERMISSIONS } from '@/lib/config/tablePermissions';

// ─── GET ────────────────────────────────────────────────────────────────────
export async function GET() {
    const { error } = await requireAuth(['superadmin']);
    if (error) return error;

    try {
        const [pageRows, tableRows] = await Promise.all([
            DatabaseService.list<any>('abt_page_permissions'),
            DatabaseService.list<any>('abt_table_permissions'),
        ]);

        // Group page permissions by abteilung_id → string[]
        const pagePermissions: Record<string, string[]> = { ...DEFAULT_ABT_PERMISSIONS };
        if (pageRows.length > 0) {
            const grouped: Record<string, string[]> = {};
            for (const row of pageRows) {
                if (!grouped[row.abteilung_id]) grouped[row.abteilung_id] = [];
                grouped[row.abteilung_id].push(row.page_key);
            }
            Object.assign(pagePermissions, grouped);
        }

        // Group table permissions by abteilung_id → tableId → TablePerms
        const tablePermissions: Record<string, Record<string, any>> = { ...DEFAULT_TABLE_PERMISSIONS };
        if (tableRows.length > 0) {
            const grouped: Record<string, Record<string, any>> = {};
            for (const row of tableRows) {
                if (!grouped[row.abteilung_id]) grouped[row.abteilung_id] = {};
                grouped[row.abteilung_id][row.table_id] = {
                    read: row.can_read,
                    export: row.can_export,
                    edit: row.can_edit,
                    delete: row.can_delete,
                };
            }
            Object.assign(tablePermissions, grouped);
        }

        return NextResponse.json({ pagePermissions, tablePermissions });
    } catch (err) {
        console.error('[permissions] GET error:', err);
        return NextResponse.json({ error: 'Fehler beim Laden der Berechtigungen.' }, { status: 500 });
    }
}

// ─── PUT ────────────────────────────────────────────────────────────────────
export async function PUT(req: Request) {
    const { error } = await requireAuth(['superadmin']);
    if (error) return error;

    try {
        const body = await req.json();
        const { pagePermissions, tablePermissions } = body as {
            pagePermissions?: Record<string, string[]>;
            tablePermissions?: Record<string, Record<string, { read: boolean; export: boolean; edit: boolean; delete: boolean }>>;
        };

        // Save page permissions
        if (pagePermissions) {
            for (const [abtId, pages] of Object.entries(pagePermissions)) {
                // Delete existing rows for this abteilung and re-insert
                await DatabaseService.deleteByFilter('abt_page_permissions', {
                    must: [{ key: 'abteilung_id', match: { value: abtId } }],
                });
                for (const pageKey of pages) {
                    await DatabaseService.upsert('abt_page_permissions', {
                        abteilung_id: abtId,
                        page_key: pageKey,
                    } as any);
                }
            }
        }

        // Save table permissions
        if (tablePermissions) {
            for (const [abtId, tables] of Object.entries(tablePermissions)) {
                for (const [tableId, perms] of Object.entries(tables)) {
                    await DatabaseService.upsert('abt_table_permissions', {
                        abteilung_id: abtId,
                        table_id: tableId,
                        can_read: perms.read,
                        can_export: perms.export,
                        can_edit: perms.edit,
                        can_delete: perms.delete,
                    } as any);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[permissions] PUT error:', err);
        return NextResponse.json({ error: 'Fehler beim Speichern der Berechtigungen.' }, { status: 500 });
    }
}
