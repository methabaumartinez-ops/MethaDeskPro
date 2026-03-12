import { NextRequest, NextResponse } from 'next/server';
import { IFCImportService } from '@/lib/services/ifcImportService';
import { requireAuth } from '@/lib/helpers/requireAuth';

export async function POST(req: NextRequest) {
    try {
        const { error: authError } = await requireAuth();
        if (authError) return authError;

        const body = await req.json();
        
        if (!body.teilsystem || !body.positionen || !body.unterpositionen) {
            return NextResponse.json({ error: 'Fehlende Hierarchie-Daten' }, { status: 400 });
        }

        const savedTeilsystem = await IFCImportService.saveHierarchicalIFC(body);

        return NextResponse.json({ success: true, teilsystemId: savedTeilsystem.id });
    } catch (error: any) {
        console.error('[ifc-save-hierarchy] Error:', error);
        return NextResponse.json({ error: error.message || 'Serverfehler beim Speichern der IFC-Daten' }, { status: 500 });
    }
}
