import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { requireAuth } from '@/lib/helpers/requireAuth';

/**
 * POST /api/projekte/[id]/export-delete
 * Exports ALL project data as JSON, then hard-deletes from Qdrant.
 * Requires admin authorization.
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // SECURITY: Only admins can export+delete projects.
    const { error } = await requireAuth(['admin']);
    if (error) return error;

    try {
        const { id } = await params;

        const projekt = await DatabaseService.get('projekte', id);
        if (!projekt) {
            return NextResponse.json({ error: 'Projekt nicht gefunden.' }, { status: 404 });
        }

        let teilsysteme: any[] = [];
        try {
            teilsysteme = await DatabaseService.list('teilsysteme', {
                must: [{ key: 'projektId', match: { value: id } }]
            });
        } catch { console.warn('Teilsysteme collection may be missing or empty'); }

        let positionen: any[] = [];
        try {
            positionen = await DatabaseService.list('positionen', {
                must: [{ key: 'projektId', match: { value: id } }]
            });
        } catch { console.warn('Positionen collection may be missing or empty'); }

        let ausfuehrungen: any[] = [];
        try {
            ausfuehrungen = await DatabaseService.list('ausfuehrung', {
                must: [{ key: 'projektId', match: { value: id } }]
            });
        } catch { /* collection may not exist */ }

        let lieferanten: any[] = [];
        try {
            lieferanten = await DatabaseService.list('lieferanten');
        } catch { /* collection may not exist */ }

        const exportData = {
            _exportInfo: {
                exportedAt: new Date().toISOString(),
                projektId: id,
                projektName: (projekt as any).projektname,
                version: 'METHADesk Pro v1.0.0',
            },
            projekt,
            teilsysteme,
            positionen,
            ausfuehrungen,
            lieferanten,
        };

        for (const pos of positionen) {
            try { await DatabaseService.delete('positionen', (pos as any).id); } catch { /* ignore */ }
        }
        for (const ts of teilsysteme) {
            try { await DatabaseService.delete('teilsysteme', (ts as any).id); } catch { /* ignore */ }
        }
        for (const a of ausfuehrungen) {
            try { await DatabaseService.delete('ausfuehrung', (a as any).id); } catch { /* ignore */ }
        }

        await DatabaseService.delete('projekte', id);

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="projekt_${(projekt as any).projektnummer || id}_export.json"`,
            },
        });
    } catch (error) {
        console.error('Export-delete error:', error);
        return NextResponse.json(
            { error: `Export und Löschung fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
        );
    }
}
