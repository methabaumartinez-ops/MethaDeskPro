import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { google } from 'googleapis';
import {
    IfcAPI, IFCWALL, IFCWALLSTANDARDCASE, IFCBEAM, IFCCOLUMN, IFCSLAB, IFCMEMBER,
    IFCPLATE, IFCSTAIRFLIGHT, IFCRAMP, IFCROOF, IFCDOOR, IFCWINDOW, IFCBUILDINGELEMENTPROXY,
    IFCFURNISHINGELEMENT, IFCDISTRIBUTIONELEMENT, IFCELEMENTASSEMBLY,
    IFCFASTENER, IFCMECHANICALFASTENER
} from 'web-ifc';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN?.trim();
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';

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
    if (prop === undefined || prop === null) return null;
    if (typeof prop === 'string' || typeof prop === 'number') return prop;
    if (prop.value !== undefined) {
        if (typeof prop.value === 'string' || typeof prop.value === 'number') return prop.value;
        if (prop.value && prop.value.value !== undefined) return prop.value.value;
    }
    return null;
}

/**
 * POST /api/ifc-extract
 * Role: "MethaDesk IFC Importer PRO"
 */
export async function POST(req: NextRequest) {
    const ifcApi = new IfcAPI();
    let modelID = -1;

    try {
        const { url, teilsystemId, projektId } = await req.json();
        if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

        const warnings: string[] = [];
        const debugLogs: string[] = [];
        const log = (msg: string) => {
            console.log(`[ifc-extract-pro] ${msg}`);
            debugLogs.push(msg);
        };

        log(`Model URL: ${url.substring(0, 50)}...`);

        // 1. Download IFC
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
            } catch (e: any) {
                log(`Drive API failed: ${e.message}. Trying direct...`);
                const directUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
                const fallbackRes = await fetch(directUrl);
                ifcBuffer = await fallbackRes.arrayBuffer();
            }
        } else {
            const response = await fetch(fileId ? `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}` : url);
            ifcBuffer = await response.arrayBuffer();
        }

        // 2. Init IFC Engine
        const wasmDir = path.join(process.cwd(), 'public') + path.sep;
        ifcApi.SetWasmPath(wasmDir, true);
        await ifcApi.Init();
        const ifcData = new Uint8Array(ifcBuffer);
        modelID = ifcApi.OpenModel(ifcData, { COORDINATE_TO_ORIGIN: true });

        // ── PRO ENGINE CONSTANTS ───────────────────────────────────────────────
        const PSET_TEILSYSTEM = "METHABAU Teilsystem";
        const PSET_MONTAGETEIL = "METHABAU Montageteil";
        const PSET_STAHLBLECH = "METHABAU Stahlblech";
        const PSET_STAHLTRAEGER = "METHABAU Stahlträger";
        const PSET_WELD = "METHABAU Schweissnaht";

        const FIELD_OK = "Höhenkote OK";
        const FIELD_UK = "Höhenkote UK";
        const FIELD_AREA = "Fläche";
        const FIELD_COLOR = "Farbe";
        const FIELD_REMARK = "Bemerkung";

        const SCAN_TYPES = [
            IFCELEMENTASSEMBLY, IFCWALL, IFCWALLSTANDARDCASE, IFCBEAM, IFCCOLUMN,
            IFCSLAB, IFCMEMBER, IFCPLATE, IFCSTAIRFLIGHT, IFCRAMP, IFCROOF,
            IFCDOOR, IFCWINDOW, IFCBUILDINGELEMENTPROXY, IFCFASTENER, IFCMECHANICALFASTENER
        ];

        // ── HELPER FUNCTIONS ──────────────────────────────────────────────────
        const getPsets = async (id: number) => {
            try { return await ifcApi.properties.getPropertySets(modelID, id, true, true); }
            catch { return []; }
        };
        const findPset = (psets: any[], name: string) => 
            psets.find(p => String(safeGetPropValue(p.Name) || '').trim().toLowerCase() === name.toLowerCase());
            
        const getPsetProp = (pset: any, propName: string) => {
            if (!pset || !pset.HasProperties) return null;
            const prop = pset.HasProperties.find((p: any) => 
                String(safeGetPropValue(p.Name) || '').trim().toLowerCase() === propName.toLowerCase()
            );
            return prop ? safeGetPropValue(prop.NominalValue) : null;
        };

        const getAnyPsetProp = (psets: any[], targetPset: string, propName: string) => {
            const pset = findPset(psets, targetPset);
            let val = getPsetProp(pset, propName);
            if (val !== null && val !== undefined && val !== '') return val;
            
            // Fallback search across everything
            for (const p of psets) {
                val = getPsetProp(p, propName);
                if (val !== null && val !== undefined && val !== '') return val;
            }
            return null;
        };

        const getSimplifiedPsets = (psets: any[]) => {
            const result: Record<string, any> = {};
            psets.forEach(ps => {
                const psName = safeGetPropValue(ps.Name);
                if (!psName) return;
                const props: Record<string, any> = {};
                if (ps.HasProperties) {
                    ps.HasProperties.forEach((p: any) => {
                        const pName = safeGetPropValue(p.Name);
                        if (pName) props[pName] = safeGetPropValue(p.NominalValue);
                    });
                }
                result[psName as string] = props;
            });
            return result;
        };

        // ── PHASE 1: PURE EXTRACTION (ifc_raw) ────────────────────────────────
        log("Phase 1: Pure Extraction (Generating ifc_raw)");
        const elementsMap = new Map<number, any>();
        const spatialParentMap = new Map<number, number>();

        try {
            const spatial = await ifcApi.properties.getSpatialStructure(modelID, true);
            const walk = (node: any, pId?: number) => {
                if (pId) spatialParentMap.set(node.expressID, pId);
                if (node.children) node.children.forEach((c: any) => walk(c, node.expressID));
            };
            walk(spatial);
        } catch { }

        for (const tc of SCAN_TYPES) {
            try {
                const ids = ifcApi.GetLineIDsWithType(modelID, tc) as unknown as number[];
                for (const id of ids) {
                    const el = ifcApi.GetLine(modelID, id);
                    const psets = await getPsets(id);
                    elementsMap.set(id, {
                        id,
                        typeCode: tc,
                        name: safeGetPropValue(el.Name),
                        tag: safeGetPropValue(el.Tag),
                        psets,
                        rawPsets: getSimplifiedPsets(psets)
                    });
                }
            } catch { }
        }

        if (elementsMap.size === 0) {
            log("Targeted scan empty, check ifcTypes/file.");
        }
        if (elementsMap.size === 0) throw new Error("REGEL 0: Keine Elemente gefunden. Abbrechen.");

        // ── PHASE 2: HIERARCHY DETECTION (PRO rules) ──────────────────────────
        log("Phase 2: Hierarchy Detection");
        const isParentEl = (e: any) => {
            if (e.typeCode === IFCELEMENTASSEMBLY) return true;
            const mPset = findPset(e.psets, PSET_MONTAGETEIL);
            if (mPset || getPsetProp(mPset, "Montageteil Position-Nr.")) return true;
            return false;
        };
        const isChildEl = (e: any) => {
            const sB = findPset(e.psets, PSET_STAHLBLECH);
            const sT = findPset(e.psets, PSET_STAHLTRAEGER);
            if (sB || sT || getPsetProp(sB, "Einzelteil POS") || getPsetProp(sT, "Einzelteil POS")) return true;
            const pieceTypes = [IFCPLATE, IFCBEAM, IFCFASTENER, IFCMECHANICALFASTENER, IFCMEMBER];
            return pieceTypes.includes(e.typeCode);
        };

        const pIds = new Set<number>();
        const cIds = new Set<number>();
        for (const [id, e] of elementsMap) {
            if (isParentEl(e)) pIds.add(id);
            if (isChildEl(e)) cIds.add(id);
        }

        const childToParentMap = new Map<number, number>();
        for (const cid of cIds) {
            let curr = cid;
            while (spatialParentMap.has(curr)) {
                const p = spatialParentMap.get(curr)!;
                if (pIds.has(p)) { childToParentMap.set(cid, p); break; }
                curr = p;
            }
        }

        // ── PHASE 3: FALLBACK GROUPING ────────────────────────────────────────
        log("Phase 3: Fallback Grouping");
        const extractedPositions: any[] = [];
        const extractedUnterpositions: any[] = [];
        const orphans = Array.from(cIds).filter(id => !childToParentMap.has(id));

        if (orphans.length > 0 && pIds.size === 0) {
            log(`Applying heuristic fallback for ${orphans.length} orphans (Rule A->B->C)...`);
            const groups = new Map<string, { ids: number[], method: string }>();
            for (const id of orphans) {
                const e = elementsMap.get(id);
                const sB = findPset(e.psets, PSET_STAHLBLECH);
                const sT = findPset(e.psets, PSET_STAHLTRAEGER);

                // Rule A: Baugruppe ID
                let key = (getPsetProp(sB, "Baugruppe-ID") || getPsetProp(sT, "Baugruppe-ID")) as string;
                let usedMethod = 'FALLBACK_A';

                // Rule B: Normalized Name
                if (!key) {
                    key = (e.name || "Item").toLowerCase().replace(/[0-9]/g, '').trim() || "Group";
                    usedMethod = 'FALLBACK_B';
                }

                // Rule C: Material + Type + Dimensions
                if (key === "item" || key === "group") {
                    const mat = (getPsetProp(sB, "MATERIAL") || getPsetProp(sT, "MATERIAL") || "NoMat") as string;
                    const tc = String(e.typeCode);
                    const dim = (getPsetProp(sB, "Länge") || getPsetProp(sT, "Länge") || "NoDim") as string;
                    key = `${mat}-${tc}-${dim}`;
                    usedMethod = 'FALLBACK_C';
                }

                if (!groups.has(key)) groups.set(key, { ids: [], method: usedMethod });
                groups.get(key)!.ids.push(id);
            }
            let gIdx = 1;
            for (const [gKey, data] of groups) {
                const dummyId = 3000000 + gIdx;
                const eSample = elementsMap.get(data.ids[0]);
                extractedPositions.push({
                    tempId: `pos-${dummyId}`,
                    posNr: `AUTO-GROUP-${String(gIdx).padStart(2, '0')}`,
                    name: eSample.name || `Gruppe ${gIdx}`,
                    beschreibung: `Automatic Group (Rule: ${data.method})`,
                    menge: data.ids.length,
                    expressID: dummyId,
                    ifcType: "Fallback",
                    groupingMethod: data.method,
                    groupingKey: gKey
                });
                data.ids.forEach(cid => childToParentMap.set(cid, dummyId));
                gIdx++;
            }
        } else if (orphans.length > 0) {
            const firstP = Array.from(pIds)[0];
            if (firstP) orphans.forEach(id => childToParentMap.set(id, firstP));
        }

        // ── PHASE 4-6: DATA MAPPING & ENRICHMENT ──────────────────────────────
        let tsInfo: any = {};
        for (const [id, e] of elementsMap) {
            const tsPset = findPset(e.psets, PSET_TEILSYSTEM);
            if (tsPset) {
                tsInfo = {
                    nummer: getPsetProp(tsPset, "TEILSYSTEM"),
                    name: getPsetProp(tsPset, "Teilsystemname"),
                    building: getPsetProp(tsPset, "Gebäude"),
                    section: getPsetProp(tsPset, "Abschnitt"),
                    floor: getPsetProp(tsPset, "Geschoss"),
                    layer: getPsetProp(tsPset, "Layer"),
                    project: getPsetProp(tsPset, "Projekt")
                };
                if (tsInfo.nummer) break;
            }
        }

        for (const pid of pIds) {
            const e = elementsMap.get(pid);
            
            const rawPosNr = String(getAnyPsetProp(e.psets, PSET_MONTAGETEIL, "Montageteil Position-Nr.") || e.name || `POS-${pid}`).trim();
            const rawName = String(getAnyPsetProp(e.psets, PSET_MONTAGETEIL, "Montageteil Name") || e.name || `Assembly ${pid}`).trim();
            const rawGewicht = Number(getAnyPsetProp(e.psets, PSET_MONTAGETEIL, "Gewicht") || 0);

            // Exact Regex para TS/POS (e.g. 2114/200 -> TS: 2114, POS: 200)
            const match = rawPosNr.match(/^([^\/]+)\/(.+)$/);
            const tsPrefix = match ? match[1].trim() : "UNBEKANNT";
            const finalPosNr = match ? match[2].trim() : rawPosNr;

            if (!match) warnings.push(`Formato inválido en Position ${rawPosNr} (ID: ${pid}). Se requiere "TS/POS".`);

            // Normalize Name (Remove TS Prefix if present)
            const tsPrefixRegex = new RegExp(`^${tsPrefix}\\s+`);
            const normalizedName = rawName.replace(tsPrefixRegex, "").trim();

            extractedPositions.push({
                tempId: `pos-${pid}`,
                expressID: pid,
                teilsystemNummer: tsPrefix,
                positionsNummer: finalPosNr,
                rawPositionsnummer: rawPosNr,
                name: normalizedName,
                beschreibung: `Baugruppe (ID: ${pid})`,
                menge: 1,
                einheit: "Stk",
                ifcType: "IfcElementAssembly",
                gewichtTotal: rawGewicht,
                groupingMethod: 'REAL_PARENT',
                ifcMeta: {
                    psets: e.rawPsets,
                    dimensions: { 
                        length: getAnyPsetProp(e.psets, PSET_MONTAGETEIL, "Länge"), 
                        width: getAnyPsetProp(e.psets, PSET_MONTAGETEIL, "Breite"), 
                        height: getAnyPsetProp(e.psets, PSET_MONTAGETEIL, "Höhe") 
                    },
                    ok: getAnyPsetProp(e.psets, PSET_MONTAGETEIL, FIELD_OK),
                    uk: getAnyPsetProp(e.psets, PSET_MONTAGETEIL, FIELD_UK)
                }
            });
        }

        const N = (val: any) => val ? (Math.round(Number(val) * 1000) / 1000).toFixed(3) : "0.000";

        for (const [cid, pid] of childToParentMap) {
            const e = elementsMap.get(cid);
            const sB = findPset(e.psets, PSET_STAHLBLECH);
            const sT = findPset(e.psets, PSET_STAHLTRAEGER);
            const weldPset = findPset(e.psets, PSET_WELD);
            const currentPset = sB || sT || weldPset;

            const rawUntPos = String(getAnyPsetProp(e.psets, PSET_STAHLBLECH, "Einzelteil POS") || 
                                     getAnyPsetProp(e.psets, PSET_STAHLTRAEGER, "Einzelteil POS") || e.tag || "").trim();
            const untMatch = rawUntPos.match(/^([^\/]+)\/(.+)$/);
            let unterpositionsNummer = untMatch ? untMatch[2].trim() : rawUntPos;

            const typeCode = String(e.typeCode);
            const name = String(e.name || "Bauteil").trim().toLowerCase();
            const mat = String(getAnyPsetProp(e.psets, PSET_STAHLBLECH, "MATERIAL") || getAnyPsetProp(e.psets, PSET_STAHLTRAEGER, "MATERIAL") || "Unbekannt").trim();
            let unitWgt = Number(getAnyPsetProp(e.psets, PSET_STAHLBLECH, "GEWICHT") || getAnyPsetProp(e.psets, PSET_STAHLTRAEGER, "GEWICHT") || getAnyPsetProp(e.psets, PSET_MONTAGETEIL, "Gewicht") || 0);

            const lenRaw = getAnyPsetProp(e.psets, PSET_STAHLTRAEGER, "LÄNGE") || getAnyPsetProp(e.psets, PSET_STAHLBLECH, "LÄNGE");
            const widRaw = getAnyPsetProp(e.psets, PSET_STAHLBLECH, "BREITE") || getAnyPsetProp(e.psets, PSET_STAHLTRAEGER, "BREITE");
            const thkRaw = getAnyPsetProp(e.psets, PSET_STAHLBLECH, "DICKE") || getAnyPsetProp(e.psets, PSET_STAHLTRAEGER, "STEGDICKE");

            const len = N(lenRaw);
            const wid = N(widRaw);
            const thk = N(thkRaw);

            if (unitWgt === 0) {
                const volRaw = getAnyPsetProp(e.psets, PSET_STAHLBLECH, "Volumen") || getAnyPsetProp(e.psets, PSET_STAHLTRAEGER, "Volumen") || getAnyPsetProp(e.psets, PSET_MONTAGETEIL, "Volumen");
                if (volRaw && Number(volRaw) > 0) {
                    unitWgt = Number(volRaw) * 7850;
                } else {
                    const l = Number(lenRaw || 0); const w = Number(widRaw || 0); const t = Number(thkRaw || 0);
                    if (l > 0 && w > 0 && t > 0) {
                        unitWgt = (l / 1000) * (w / 1000) * (t / 1000) * 7850;
                    }
                }
            }

            let hash = "";

            if (typeCode === "156" || e.typeCode === IFCFASTENER || e.typeCode === IFCMECHANICALFASTENER) {
                // Ignore fastener for untpos generation
                unterpositionsNummer = "";
                hash = `FASTENER|${name}|${mat}|${unitWgt.toFixed(2)}`;
            } 
            else {
                hash = `GEO|${typeCode}|${unterpositionsNummer}|${mat}|${len}|${wid}|${thk}`;
            }

            const existing = extractedUnterpositions.find(u => 
                u.parentExpressID === pid && u.groupHash === hash
            );

            if (existing) { 
                existing.menge += 1; 
                existing.gewichtGesamt = existing.gewichtEinheit * existing.menge;
            } else {
                extractedUnterpositions.push({
                    tempId: `upos-${cid}`,
                    parentExpressID: pid,
                    groupHash: hash,
                    unterpositionsNummer: unterpositionsNummer,
                    name: String(e.name || "Bauteil").trim(),
                    menge: 1,
                    einheit: "Stk",
                    material: mat,
                    gewichtEinheit: unitWgt,
                    gewichtGesamt: unitWgt,
                    expressID: cid,
                    ifcType: weldPset ? "WELD" : "Part",
                    ifcMeta: {
                        psets: e.rawPsets,
                        dimensions: {
                            length: lenRaw,
                            width: widRaw
                        },
                        ok: getPsetProp(currentPset, FIELD_OK),
                        uk: getPsetProp(currentPset, FIELD_UK),
                    }
                });
            }
        }

        // ── PHASE 5: CONSOLIDATION BY NAME ────────────────────────────────────
        // Group positions with identical names, summing menge and weight,
        // and re-mapping child Unterpositionen to the consolidated parent.
        log("Phase 5: Consolidation by Name");
        const nameGroups = new Map<string, number[]>(); // normalized name → indices
        for (let i = 0; i < extractedPositions.length; i++) {
            const key = (extractedPositions[i].name || '').trim().toLowerCase();
            if (!nameGroups.has(key)) nameGroups.set(key, []);
            nameGroups.get(key)!.push(i);
        }

        const indicesToRemove = new Set<number>();
        for (const [, indices] of nameGroups) {
            if (indices.length <= 1) continue; // nothing to merge

            const primary = extractedPositions[indices[0]];
            for (let k = 1; k < indices.length; k++) {
                const dup = extractedPositions[indices[k]];
                // Sum quantities and weight
                primary.menge = (primary.menge || 1) + (dup.menge || 1);
                primary.gewichtTotal = (primary.gewichtTotal || 0) + (dup.gewichtTotal || 0);

                // Re-map child Unterpositionen from duplicate → primary
                for (const u of extractedUnterpositions) {
                    if (u.parentExpressID === dup.expressID) {
                        u.parentExpressID = primary.expressID;
                    }
                }
                indicesToRemove.add(indices[k]);
            }
            primary.beschreibung = `${indices.length} Baugruppen zusammengefasst`;
        }

        // Filter out merged duplicates (iterate in reverse to keep indices stable)
        const consolidatedPositions = extractedPositions.filter((_, i) => !indicesToRemove.has(i));
        log(`Consolidated ${extractedPositions.length} → ${consolidatedPositions.length} positions`);

        // Validation: No empty parents
        for (const p of consolidatedPositions) {
            if (!extractedUnterpositions.some(u => u.parentExpressID === p.expressID)) {
                extractedUnterpositions.push({
                    tempId: `upos-self-${p.expressID}`, parentExpressID: p.expressID, unterpositionsNummer: p.positionsNummer, groupHash: `SELF|${p.expressID}`,
                    name: p.name, beschreibung: "Self-piece", menge: 1, einheit: "Stk", material: "", gewichtEinheit: 0, gewichtGesamt: 0, ifcMeta: p.ifcMeta, expressID: p.expressID
                });
            }
        }

        return NextResponse.json({
            tsInfo,
            positionen: consolidatedPositions,
            unterpositionen: extractedUnterpositions,
            materiale: [],
            warnings,
            debugLogs,
            summary: {
                totalPositionen: consolidatedPositions.length,
                totalUnterpositionen: extractedUnterpositions.length,
                totalMateriale: 0
            }
        });

    } catch (err: any) {
        if (modelID !== -1) ifcApi.CloseModel(modelID);
        console.error('[ifc-extract-pro]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
