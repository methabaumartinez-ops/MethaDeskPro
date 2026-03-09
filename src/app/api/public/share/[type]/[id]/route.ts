import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';

export const dynamic = 'force-dynamic';

// ──────────────────────────────────────────────────────────────────────────────
// Public read-only share API — NO authentication required.
// Only safe, non-sensitive fields are exposed.
// Write operations are NOT available here.
// ──────────────────────────────────────────────────────────────────────────────

/** Fields allowed for public exposure per entity type */
const PUBLIC_FIELDS: Record<string, string[]> = {
    teilsystem: [
        'id', 'name', 'teilsystemNummer', 'status', 'planStatus',
        'abteilung', 'bemerkung', 'montagetermin', 'lieferfrist',
        'abgabePlaner', 'projektId', 'ks', 'wemaLink',
        'gebäude', 'abschnitt', 'geschoss'
    ],
    position: [
        'id', 'name', 'posNummer', 'status', 'planStatus',
        'abteilung', 'bemerkung', 'teilsystemId', 'projektId'
    ],
    unterposition: [
        'id', 'name', 'untPosNummer', 'status', 'planStatus',
        'abteilung', 'bemerkung', 'positionId', 'projektId'
    ],
};

const COLLECTION_MAP: Record<string, string> = {
    teilsystem:    'teilsysteme',
    position:      'positionen',
    unterposition: 'unterpositionen',
};

function stripToPublicFields(obj: Record<string, any>, fields: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const f of fields) {
        if (obj[f] !== undefined) result[f] = obj[f];
    }
    return result;
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ type: string; id: string }> }
) {
    try {
        const { type, id } = await params;

        const collection = COLLECTION_MAP[type];
        const allowedFields = PUBLIC_FIELDS[type];

        if (!collection || !allowedFields) {
            return NextResponse.json(
                { error: `Unbekannter Typ: ${type}` },
                { status: 400 }
            );
        }

        const item = await DatabaseService.get<Record<string, any>>(collection, id);

        if (!item) {
            return NextResponse.json(
                { error: 'Eintrag nicht gefunden.' },
                { status: 404 }
            );
        }

        const publicData = stripToPublicFields(item, allowedFields);

        // For TS: also fetch basic position list (id, name, posNummer, status only)
        if (type === 'teilsystem') {
            const allPositionen = await DatabaseService.list<Record<string, any>>('positionen', {
                must: [{ key: 'teilsystemId', match: { value: id } }]
            });
            publicData._positionen = allPositionen.map(p => ({
                id: p.id,
                name: p.name,
                posNummer: p.posNummer,
                status: p.status,
            }));
        }

        // For Position: also fetch basic unterposition list
        if (type === 'position') {
            const allUnterpos = await DatabaseService.list<Record<string, any>>('unterpositionen', {
                must: [{ key: 'positionId', match: { value: id } }]
            });
            publicData._unterpositionen = allUnterpos.map(u => ({
                id: u.id,
                name: u.name,
                untPosNummer: u.untPosNummer,
                status: u.status,
            }));
        }

        return NextResponse.json(publicData);
    } catch (err: any) {
        console.error('[Public Share API] Error:', err.message || err);
        return NextResponse.json(
            { error: 'Fehler beim Laden der Daten.' },
            { status: 500 }
        );
    }
}
