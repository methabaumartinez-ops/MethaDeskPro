import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { google } from 'googleapis';
import {
    IfcAPI, IFCWALL, IFCWALLSTANDARDCASE, IFCBEAM, IFCCOLUMN, IFCSLAB, IFCMEMBER,
    IFCPLATE, IFCSTAIRFLIGHT, IFCRAMP, IFCROOF, IFCDOOR, IFCWINDOW, IFCBUILDINGELEMENTPROXY,
    IFCFURNISHINGELEMENT, IFCDISTRIBUTIONELEMENT
} from 'web-ifc';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN?.trim();
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';

// ── IFC entity type codes that map to "Position" ──────────────────────────────
const ELEMENT_TYPES = [
    IFCWALL, IFCWALLSTANDARDCASE, IFCBEAM, IFCCOLUMN, IFCSLAB, IFCMEMBER,
    IFCPLATE, IFCSTAIRFLIGHT, IFCRAMP, IFCROOF, IFCDOOR, IFCWINDOW,
    IFCBUILDINGELEMENTPROXY, IFCFURNISHINGELEMENT, IFCDISTRIBUTIONELEMENT,
];

function extractFileId(url: string): string | null {
    try {
        const parsed = new URL(url);
        const idParam = parsed.searchParams.get('id');
        if (idParam) return idParam;
        const pathMatch = parsed.pathname.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]+)/);
        if (pathMatch) return pathMatch[1];
    } catch { }
    const match = url.match(/id=([a-zA-Z0-9_-]+)|\/d\/([a-zA-Z0-9_-]+)/);
    return match ? (match[1] || match[2]) : null;
}

function safeGetPropValue(prop: any): string | number | null {
    if (!prop || !prop.value) return null;
    const v = prop.value;
    if (typeof v === 'string' || typeof v === 'number') return v;
    if (v.value !== undefined) return v.value;
    return null;
}

/**
 * POST /api/ifc-extract
 * Body: { url: string, teilsystemId: string, projektId: string }
 * Returns: { positionen, unterpositionen, materiale }
 */
export async function POST(req: NextRequest) {
    try {
        const { url, teilsystemId, projektId } = await req.json();
        if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

        // 1. Download IFC from Google Drive (same logic as ifc-parse)
        let ifcBuffer: ArrayBuffer;
        const fileId = extractFileId(url);

        if (fileId && CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
            try {
                const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
                oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
                const drive = google.drive({ version: 'v3', auth: oauth2Client });
                const response = await drive.files.get(
                    { fileId, alt: 'media' },
                    { responseType: 'arraybuffer' }
                );
                ifcBuffer = response.data as ArrayBuffer;
            } catch {
                const directUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
                const fallbackResponse = await fetch(directUrl);
                if (!fallbackResponse.ok) throw new Error(`Download failed: HTTP ${fallbackResponse.status}`);
                ifcBuffer = await fallbackResponse.arrayBuffer();
            }
        } else {
            const directUrl = fileId
                ? `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`
                : url;
            const response = await fetch(directUrl);
            if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
            ifcBuffer = await response.arrayBuffer();
        }

        // 2. Parse IFC
        const ifcApi = new IfcAPI();
        const wasmDir = path.join(process.cwd(), 'public') + path.sep;
        ifcApi.SetWasmPath(wasmDir, true);
        await ifcApi.Init();

        const ifcData = new Uint8Array(ifcBuffer);
        const modelID = ifcApi.OpenModel(ifcData, { COORDINATE_TO_ORIGIN: true });

        // ── Results ─────────────────────────────────────────────────────────────
        type ExtractedPosition = {
            tempId: string;         // client-side only
            name: string;
            beschreibung: string;
            menge: number;
            einheit: string;
            expressID: number;
            ifcType: string;
        };

        type ExtractedUnterposition = {
            tempId: string;
            parentExpressID: number;
            name: string;
            beschreibung: string;
            menge: number;
            einheit: string;
        };

        type ExtractedMaterial = {
            tempId: string;
            name: string;
            hersteller: string;
            menge: number;
            einheit: string;
        };

        const positionen: ExtractedPosition[] = [];
        const unterpositionen: ExtractedUnterposition[] = [];
        const materiale: ExtractedMaterial[] = [];
        const seenMaterials = new Set<string>();
        let posCounter = 1;

        // 3. Extract elements → Positionen
        for (const entityType of ELEMENT_TYPES) {
            let ids: number[] = [];
            try {
                ids = ifcApi.GetLineIDsWithType(modelID, entityType) as unknown as number[];
            } catch { continue; }

            for (const expressID of ids) {
                try {
                    const element = ifcApi.GetLine(modelID, expressID, true);
                    if (!element) continue;

                    const name = safeGetPropValue(element.Name) as string || `Element ${expressID}`;
                    const beschreibung = safeGetPropValue(element.Description) as string || '';
                    const typeName = String(element.constructor?.name || entityType);

                    // Default quantity values
                    let menge = 1;
                    let einheit = 'Stk';

                    // Try to get quantities from property sets
                    try {
                        const psets = ifcApi.GetPropertySets(modelID, expressID, true);
                        for (const pset of psets) {
                            if (!pset || !pset.HasProperties) continue;
                            const props = pset.HasProperties as any[];
                            for (const prop of props) {
                                if (!prop) continue;
                                const pName = (safeGetPropValue(prop.Name) as string || '').toLowerCase();
                                // Look for area/length/volume/count fields
                                if (pName.includes('area') || pName.includes('flaeche') || pName.includes('fläche')) {
                                    const v = safeGetPropValue(prop.NominalValue || prop.LengthValue || prop.AreaValue);
                                    if (v && typeof v === 'number' && v > 0) { menge = Math.round(v * 100) / 100; einheit = 'm²'; }
                                } else if (pName.includes('length') || pName.includes('laenge') || pName.includes('länge')) {
                                    const v = safeGetPropValue(prop.NominalValue || prop.LengthValue);
                                    if (v && typeof v === 'number' && v > 0 && einheit === 'Stk') { menge = Math.round(v * 100) / 100; einheit = 'm'; }
                                } else if (pName.includes('volume') || pName.includes('volumen')) {
                                    const v = safeGetPropValue(prop.NominalValue || prop.VolumeValue);
                                    if (v && typeof v === 'number' && v > 0 && einheit === 'Stk') { menge = Math.round(v * 100) / 100; einheit = 'm³'; }
                                } else if (pName.includes('count') || pName.includes('anzahl')) {
                                    const v = safeGetPropValue(prop.NominalValue);
                                    if (v && typeof v === 'number' && v > 0 && einheit === 'Stk') { menge = v; einheit = 'Stk'; }
                                }
                            }
                        }
                    } catch { /* property sets not available */ }

                    positionen.push({
                        tempId: `pos-${expressID}`,
                        name: name.trim() || `Position ${posCounter}`,
                        beschreibung: beschreibung.trim(),
                        menge,
                        einheit,
                        expressID,
                        ifcType: typeName,
                    });

                    posCounter++;

                    // ── Sub-components (IfcRelAggregates) → Unterpositionen ────
                    try {
                        const rels = ifcApi.GetRelationships(modelID, expressID, true) as any[];
                        for (const rel of rels) {
                            if (!rel || rel.constructor?.name !== 'IfcRelAggregates') continue;
                            const parts = rel.RelatedObjects as any[];
                            if (!parts) continue;
                            for (const part of parts) {
                                const pName = safeGetPropValue(part.Name) as string || `Sub-Element ${part.expressID}`;
                                unterpositionen.push({
                                    tempId: `upos-${part.expressID}`,
                                    parentExpressID: expressID,
                                    name: pName.trim(),
                                    beschreibung: (safeGetPropValue(part.Description) as string || '').trim(),
                                    menge: 1,
                                    einheit: 'Stk',
                                });
                            }
                        }
                    } catch { /* no sub-elements */ }

                    // ── Materials ─────────────────────────────────────────────
                    try {
                        const mats = ifcApi.GetMaterialsOfElement(modelID, expressID) as any[];
                        for (const mat of mats) {
                            const matName = safeGetPropValue(mat.Name) as string || 'Material';
                            if (seenMaterials.has(matName)) continue;
                            seenMaterials.add(matName);
                            materiale.push({
                                tempId: `mat-${materiale.length + 1}`,
                                name: matName.trim(),
                                hersteller: '',
                                menge: 1,
                                einheit: 'Stk',
                            });
                        }
                    } catch { /* no materials */ }

                } catch { continue; }
            }
        }

        ifcApi.CloseModel(modelID);

        return NextResponse.json({
            positionen,
            unterpositionen,
            materiale,
            summary: {
                totalPositionen: positionen.length,
                totalUnterpositionen: unterpositionen.length,
                totalMateriale: materiale.length,
            }
        });

    } catch (err: any) {
        console.error('[ifc-extract]', err.message || err);
        return NextResponse.json({ error: err.message || 'Extract error' }, { status: 500 });
    }
}
