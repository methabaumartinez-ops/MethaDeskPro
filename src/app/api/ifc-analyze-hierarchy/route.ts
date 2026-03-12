import { NextRequest, NextResponse } from 'next/server';
import { IFCImportService } from '@/lib/services/ifcImportService';
import { requireAuth } from '@/lib/helpers/requireAuth';

export async function POST(req: NextRequest) {
    try {
        const { error: authError } = await requireAuth();
        if (authError) return authError;

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const projektId = formData.get('projektId') as string;

        if (!file || !projektId) {
            return NextResponse.json({ error: 'Fehlende Datei oder Projekt-ID' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const hierarchy = await IFCImportService.analyzeHierarchicalIFC(buffer, file.name, projektId);

        return NextResponse.json({ success: true, data: hierarchy });
    } catch (error: any) {
        console.error('[ifc-analyze-hierarchy] Error:', error);
        return NextResponse.json({ error: error.message || 'Serverfehler bei der IFC-Analyse' }, { status: 500 });
    }
}
