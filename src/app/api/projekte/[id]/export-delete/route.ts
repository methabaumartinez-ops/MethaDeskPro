import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';

/**
 * POST /api/projekte/[id]/export-delete
 * 
 * Exports ALL project data (project + teilsysteme + positionen) as JSON,
 * then deletes the data from Qdrant.
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Get the project
        const projekt = await DatabaseService.get('projekte', id);
        if (!projekt) {
            return NextResponse.json({ error: 'Projekt nicht gefunden.' }, { status: 404 });
        }

        // 2. Get all related data
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

        // Also try to get any other project-scoped collections
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

        // 3. Build the export object
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

        // 4. Delete all related data from Qdrant
        // Delete positionen first (deepest level)
        for (const pos of positionen) {
            try { await DatabaseService.delete('positionen', (pos as any).id); } catch { /* ignore */ }
        }

        // Delete teilsysteme
        for (const ts of teilsysteme) {
            try { await DatabaseService.delete('teilsysteme', (ts as any).id); } catch { /* ignore */ }
        }

        // Delete ausfuehrungen
        for (const a of ausfuehrungen) {
            try { await DatabaseService.delete('ausfuehrung', (a as any).id); } catch { /* ignore */ }
        }

        // Delete the project itself
        await DatabaseService.delete('projekte', id);

        // 5. Return the export data as JSON download
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
