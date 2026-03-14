// src/lib/services/ifcImportService.ts
import 'server-only'; // BUG-10 FIX: Prevent accidental client-bundle inclusion

import { IfcAPI, IFCELEMENTASSEMBLY, IFCBEAM, IFCRELAGGREGATES, IFCRELDEFINESBYPROPERTIES, IFCRELASSOCIATESMATERIAL, IFCRELDEFINESBYTYPE } from 'web-ifc';
import path from 'path';
import crypto from 'crypto';
import { Teilsystem, ItemStatus, Position, Unterposition } from '@/types';
import { DatabaseService } from '@/lib/services/db';

// FIX 1: Correct PSet name. In HiCAD IFC exports the PropertySet is named exactly "METHABAU" (not "METHABAU Teilsystem")
const METHABAU_PSET_NAME = 'METHABAU';

export interface IFCImportResult {
    teilsystem: Partial<Teilsystem>;
    rawMetadata?: any;
    missingFields: string[];
    alreadyExists: boolean;
}

export interface IFCProcessedHierarchy {
    teilsystem: Partial<Teilsystem>;
    positionenMap: Map<string, Partial<Position>>; // Key: Collapse Signature
    unterpositionenMap: Map<string, Partial<Unterposition>>; // Key: ParentSignature + ChildSignature
}

export class IFCImportService {
    private static ifcApi: IfcAPI;

    private static async initIfc() {
        if (!this.ifcApi) {
            this.ifcApi = new IfcAPI();
            const wasmDir = path.join(process.cwd(), 'public') + path.sep;
            this.ifcApi.SetWasmPath(wasmDir, true);
            await this.ifcApi.Init();
        }
    }

    private static calculateChecksum(buffer: Uint8Array): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    private static safeGetPropValue(prop: any): string | number | null {
        if (!prop || !prop.value) return null;
        const v = prop.value;
        if (typeof v === 'string' || typeof v === 'number') return v;
        if (v.value !== undefined) return v.value;
        return null;
    }

    /**
     * Extracts Teilsystem metadata from an IFC buffer following user rules.
     * Used by /api/teilsystem-import to pre-fill the erfassen form.
     */
    static async extractTeilsystemFromIFC(
        buffer: Uint8Array,
        filename: string,
        fileUrl: string,
        user: string = 'system-import',
        projektId: string
    ): Promise<IFCImportResult> {
        await this.initIfc();
        const api = this.ifcApi;
        const modelID = api.OpenModel(buffer, { COORDINATE_TO_ORIGIN: true });

        const checksum = this.calculateChecksum(buffer);
        const schema = api.GetModelSchema(modelID);

        // BUG-03 FIX: Scope checksum lookup by projektId to prevent cross-project IFC collision.
        const existing = await DatabaseService.list<Teilsystem>('teilsysteme', {
            must: [
                { key: 'ifcChecksum', match: { value: checksum } },
                { key: 'projektId',   match: { value: projektId } },
            ]
        });

        if (existing.length > 0) {
            api.CloseModel(modelID);
            return {
                teilsystem: existing[0],
                missingFields: [],
                alreadyExists: true
            };
        }

        // FIX 1: Look for the root IFCELEMENTASSEMBLY (the one without Positionsnummer = TS level)
        // and read all METHABAU properties from it.
        let teilsystemNummer = filename.match(/^\d+/)?.[0] || `TS-${Date.now()}`;
        let tsName = filename.replace(/\.ifc$/i, '');
        let tsGewicht: number | undefined;
        let tsTeileart: string | undefined;

        const assembliesIds = api.GetLineIDsWithType(modelID, IFCELEMENTASSEMBLY);
        for (let i = 0; i < assembliesIds.size(); i++) {
            const asmId = assembliesIds.get(i);
            const methabau = this.getMethabauProperties(api, modelID, asmId);
            if (!methabau) continue;

            // TS root = has Sachnummer + Teilsystem Nr, but NO Positionsnummer (or Positionsnummer is empty)
            const hasPosNr = methabau['Positionsnummer'] && methabau['Positionsnummer'].trim() !== '';
            if (!hasPosNr && methabau['Sachnummer']) {
                // This is the root TS assembly
                let sachnummer = methabau['Sachnummer'];
                const tsNr = methabau['Teilsystem Nr'];
                if (tsNr) {
                    teilsystemNummer = tsNr;
                    // Rule: if Sachnummer starts with Teilsystem Nr, strip the prefix to avoid duplicating "3111 Konsole zu Stahlbau" → "Konsole zu Stahlbau"
                    if (sachnummer.startsWith(tsNr)) {
                        sachnummer = sachnummer.slice(tsNr.length).replace(/^[-_\s]+/, '').trim();
                    }
                }
                tsName = sachnummer || tsName;
                if (methabau['Gewicht']) tsGewicht = parseFloat(methabau['Gewicht']);
                if (methabau['Teileart']) tsTeileart = methabau['Teileart'];
                break; // Found the root — stop scanning
            }
        }

        const bemerkungLines: string[] = [];
        bemerkungLines.push(`IFC: ${schema} | Units: SI`);
        bemerkungLines.push(`Source file: ${filename}`);
        const bemerkung = bemerkungLines.join('\n');

        const missingFields: string[] = [];
        if (!teilsystemNummer) missingFields.push('Teilsystem Nr (METHABAU Pset)');
        if (!tsName) missingFields.push('Sachnummer (METHABAU Pset)');

        const result: Partial<Teilsystem> = {
            projektId,
            teilsystemNummer: String(teilsystemNummer),
            ks: 1,
            name: String(tsName),
            bemerkung,
            eroeffnetAm: new Date().toISOString(),
            eroeffnetDurch: user,
            planStatus: 'offen',
            status: 'offen',
            ifcUrl: fileUrl,
            ifcFileName: filename,
            ifcChecksum: checksum,
            ifcSchema: schema || 'IFC2X3',
            ifcUnits: { length: 'm', weight: 'kg' },
            // METHABAU fields at TS level
            ...(tsGewicht !== undefined && { gewicht: tsGewicht }),
            ...(tsTeileart && { teileart: tsTeileart }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        api.CloseModel(modelID);

        return {
            teilsystem: result,
            rawMetadata: { teilsystemNummer, tsName, tsGewicht, tsTeileart },
            missingFields,
            alreadyExists: false
        };
    }

    /**
     * Extracts full hierarchical data (TS -> Pos -> UntPos) from an IFC model 
     * collapsing identical parts to sum up quantities (menge).
     */
    static async processIFC2MethaHierarchy(
        buffer: Uint8Array,
        filename: string,
        projektId: string
    ): Promise<IFCProcessedHierarchy> {
        await this.initIfc();
        const api = this.ifcApi;
        let modelID = 0;
        try {
            modelID = api.OpenModel(buffer, { COORDINATE_TO_ORIGIN: true });

            const schema = api.GetModelSchema(modelID) || 'IFC2X3';
            
            // 1. Find the TS root assembly: IFCELEMENTASSEMBLY with METHABAU but NO Positionsnummer
            let tsName = filename.replace(/\.ifc$/i, '');
            let teilsystemNummer = filename.match(/^\d+/)?.[0] || `TS-${Date.now()}`;
            let tsGewicht: number | undefined;
            let tsTeileart: string | undefined;
            let rootAssemblyId: number | null = null;

            const assembliesIds = api.GetLineIDsWithType(modelID, IFCELEMENTASSEMBLY);

            for (let i = 0; i < assembliesIds.size(); i++) {
                const asmId = assembliesIds.get(i);
                const methabau = this.getMethabauProperties(api, modelID, asmId);
                if (!methabau) continue;

                const hasPosNr = methabau['Positionsnummer'] && methabau['Positionsnummer'].trim() !== '';
                if (!hasPosNr && methabau['Sachnummer']) {
                    // This is the TS root
                    rootAssemblyId = asmId;
                    let sachnummer = methabau['Sachnummer'];
                    const tsNr = methabau['Teilsystem Nr'];
                    if (tsNr) {
                        teilsystemNummer = tsNr;
                        if (sachnummer.startsWith(tsNr)) {
                            sachnummer = sachnummer.slice(tsNr.length).replace(/^[-_\s]+/, '').trim();
                        }
                    }
                    tsName = sachnummer || tsName;
                    if (methabau['Gewicht']) tsGewicht = parseFloat(methabau['Gewicht']);
                    if (methabau['Teileart']) tsTeileart = methabau['Teileart'];
                    break;
                }
            }

            // Legacy fallback: no METHABAU root found → use filename
            if (!rootAssemblyId && assembliesIds.size() > 0) {
                rootAssemblyId = assembliesIds.get(0);
            }

            const teilsystem: Partial<Teilsystem> = {
                projektId,
                name: tsName,
                teilsystemNummer,
                ifcSchema: schema,
                status: 'offen',
                eroeffnetAm: new Date().toISOString(),
                ifcFileName: filename,
                ifcChecksum: this.calculateChecksum(buffer),
                ...(tsGewicht !== undefined && { gewicht: tsGewicht }),
                ...(tsTeileart && { teileart: tsTeileart }),
            };
            
            const positionenMap = new Map<string, Partial<Position>>();
            const unterpositionenMap = new Map<string, Partial<Unterposition>>();

            // 2. Process all assemblies — but SKIP the root TS assembly (it maps to TS, not POS)
            // FIX 2: Only process assemblies that have a Positionsnummer (= they are POS-level)
            for (let i = 0; i < assembliesIds.size(); i++) {
                const assemblyId = assembliesIds.get(i);
                if (assemblyId === rootAssemblyId) continue; // Skip root TS
                this.processAssembly(api, modelID, assemblyId, teilsystemNummer, projektId, positionenMap, unterpositionenMap);
            }

            // 3. Also process physical elements (IFCPLATE, IFCBUILDINGELEMENTPROXY) that are
            //    direct children of the root and NOT already captured as children of sub-assemblies.
            //    These become POS-level items (they have Positionsnummer but are not IFCELEMENTASSEMBLY).
            if (rootAssemblyId !== null) {
                this.extractDirectPhysicalChildren(api, modelID, rootAssemblyId, teilsystemNummer, projektId, positionenMap, unterpositionenMap);
            }

            return {
                teilsystem,
                positionenMap,
                unterpositionenMap
            };
        } finally {
            if (modelID !== 0) {
                try {
                    api.CloseModel(modelID);
                } catch (e) {
                    console.error('Error closing IFC model', e);
                }
            }
        }
    }

    /**
     * Extracts ONLY properties from the PropertySet named "METHABAU".
     * Priority 1: IFCRELDEFINESBYPROPERTIES (Instance)
     * Priority 2: IFCRELDEFINESBYTYPE (Type definition)
     * Returns a Record mapping Property Names to their string values, or null if METHABAU PSet doesn't exist.
     */
    private static getMethabauProperties(
        api: IfcAPI,
        modelID: number,
        elementId: number
    ): Record<string, string> | null {
        // Step 1: Search Instance Properties (Priority 1)
        const instanceProps = this.extractPsetByName(api, modelID, elementId, METHABAU_PSET_NAME, IFCRELDEFINESBYPROPERTIES);
        if (instanceProps) {
            return instanceProps;
        }

        // Step 2: Search Type Properties (Priority 2 fallback)
        const typeRelIds = api.GetLineIDsWithType(modelID, IFCRELDEFINESBYTYPE);
        for (let i = 0; i < typeRelIds.size(); i++) {
            const relId = typeRelIds.get(i);
            const rel = api.GetLine(modelID, relId);
            if (!rel) continue;

            const relatedObjects = rel.RelatedObjects || [];
            if (relatedObjects.some((r: any) => r.value === elementId)) {
                const relatingType = rel.RelatingType;
                if (relatingType) {
                    const typeId = relatingType.value;
                    const typeProps = this.extractPsetByName(api, modelID, typeId, METHABAU_PSET_NAME, IFCRELDEFINESBYPROPERTIES);
                    if (typeProps) {
                        return typeProps;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Internal helper to scan a specific Relation type (usually IFCRELDEFINESBYPROPERTIES)
     * for a specific PropertySet name and extract all its values into a Dictionary.
     */
    private static extractPsetByName(
        api: IfcAPI,
        modelID: number,
        targetId: number,
        targetPsetName: string,
        relationType: number
    ): Record<string, string> | null {
        const relIds = api.GetLineIDsWithType(modelID, relationType);
        
        for (let i = 0; i < relIds.size(); i++) {
            const relId = relIds.get(i);
            const rel = api.GetLine(modelID, relId);
            if (!rel) continue;

            const relatedObjects = rel.RelatedObjects || [];
            const isRelated = relatedObjects.some((r: any) => r.value === targetId);
            
            if (isRelated && rel.RelatingPropertyDefinition) {
                const psetId = rel.RelatingPropertyDefinition.value;
                const pset = api.GetLine(modelID, psetId, true);
                if (!pset) continue;

                // Validate exactly the target PSetName
                const psetName = this.safeGetPropValue(pset.Name) as string;
                if (psetName !== targetPsetName) continue; 

                const props = pset.HasProperties || pset.Quantities;
                if (props) {
                    const extracted: Record<string, string> = {};
                    for (const propRef of props) {
                        const prop = api.GetLine(modelID, propRef.value, true);
                        if (!prop) continue;
                        const name = this.safeGetPropValue(prop.Name) as string;
                        if (name) {
                            const value = String(this.safeGetPropValue(prop.NominalValue) ?? this.safeGetPropValue(prop.WeightValue) ?? this.safeGetPropValue(prop.Description) ?? '');
                            extracted[name] = value;
                        }
                    }
                    return extracted; 
                }
            }
        }
        return null;
    }

    /**
     * Legacy helper to perform a deep scan of IfcPropertySets for a specific set of property names.
     * Maintained only as fallback if METHABAU strict search fails.
     */
    private static extractPropertiesByNames(
        api: IfcAPI,
        modelID: number,
        elementId: number,
        propertyNames: string[]
    ): string | null {
        const relDefinesType = IFCRELDEFINESBYPROPERTIES;
        const relDefinesIds = api.GetLineIDsWithType(modelID, relDefinesType);
        
        for (let i = 0; i < relDefinesIds.size(); i++) {
            const relId = relDefinesIds.get(i);
            const rel = api.GetLine(modelID, relId);
            if (!rel) continue;

            const relatedObjects = rel.RelatedObjects || [];
            const isRelated = relatedObjects.some((r: any) => r.value === elementId);
            
            if (isRelated && rel.RelatingPropertyDefinition) {
                const psetId = rel.RelatingPropertyDefinition.value;
                const pset = api.GetLine(modelID, psetId, true);
                if (!pset) continue;

                const props = pset.HasProperties || pset.Quantities;
                if (props) {
                    for (const propRef of props) {
                        const prop = api.GetLine(modelID, propRef.value, true);
                        if (!prop) continue;
                        const name = this.safeGetPropValue(prop.Name) as string;
                        if (name && propertyNames.some(pn => name.toLowerCase() === pn.toLowerCase())) {
                            return String(this.safeGetPropValue(prop.NominalValue) ?? this.safeGetPropValue(prop.WeightValue) ?? this.safeGetPropValue(prop.Description) ?? '');
                        }
                    }
                }
            }
        }
        return null;
    }

    private static getTeilsystemMetadata(api: IfcAPI, modelID: number): { name: string, description: string } | null {
        const projectIds = api.GetLineIDsWithType(modelID, 2769493134); // IFCProject integer type
        if (projectIds.size() > 0) {
             const proj = api.GetLine(modelID, projectIds.get(0), true);
             if (proj) {
                 const name = this.safeGetPropValue(proj.Name) as string;
                 const desc = this.safeGetPropValue(proj.Description) as string;
                 if (name || desc) return { name: name || '', description: desc || '' };
             }
        }
        
        const buildingIds = api.GetLineIDsWithType(modelID, 3144702005); // IFCBUILDING integer type
        if (buildingIds.size() > 0) {
             const build = api.GetLine(modelID, buildingIds.get(0), true);
             if (build) {
                 const name = this.safeGetPropValue(build.Name) as string;
                 const desc = this.safeGetPropValue(build.Description) as string;
                 if (name || desc) return { name: name || '', description: desc || '' };
             }
        }
        return null;
    }

    /**
     * FIX 3: processAssembly now extracts ALL METHABAU fields for POS:
     * Sachnummer→name, Positionsnummer→posNummer, Gewicht, Teileart, Länge, Breite, Höhe.
     * Only called for non-root assemblies (POS-level IFCELEMENTASSEMBLY).
     */
    private static processAssembly(
        api: IfcAPI,
        modelID: number,
        assemblyId: number,
        teilsystemNummer: string,
        projektId: string,
        positionenMap: Map<string, Partial<Position>>,
        unterpositionenMap: Map<string, Partial<Unterposition>>
    ) {
        const assemblyProps = api.GetLine(modelID, assemblyId, true);
        if (!assemblyProps) return;

        const globalId = this.safeGetPropValue(assemblyProps.GlobalId) as string;
        const baseName = this.safeGetPropValue(assemblyProps.Name) as string;
        const objectType = this.safeGetPropValue(assemblyProps.ObjectType) as string;
        
        const methabauProps = this.getMethabauProperties(api, modelID, assemblyId);
        
        let posNummer = '';
        let finalName = '';
        let bemerkung = '';
        let gewicht: number | undefined;
        let teileart: string | undefined;
        let dimensions: Record<string, number> = {};

        if (methabauProps) {
            // FIX 3a: Sachnummer → POS name
            finalName = methabauProps['Sachnummer'] || baseName || objectType || 'Unbenannt Assembly';
            // FIX 3b: Positionsnummer → posNummer
            posNummer = methabauProps['Positionsnummer'] || '';
            bemerkung = methabauProps['Benennung 1'] || methabauProps['Bemerkung'] || '';
            
            // Append Source Info
            bemerkung = bemerkung ? `${bemerkung} (Quelle: PSet METHABAU)` : '(Quelle: PSet METHABAU)';

            // FIX 3c: Gewicht from METHABAU directly
            if (methabauProps['Gewicht']) gewicht = parseFloat(methabauProps['Gewicht']) || undefined;
            // FIX 3d: Teileart
            if (methabauProps['Teileart']) teileart = methabauProps['Teileart'];
            // FIX 3e: Dimensions at POS level (sub-assemblies can have them)
            if (methabauProps['Länge']) dimensions.laenge = parseFloat(methabauProps['Länge']);
            if (methabauProps['Breite']) dimensions.breite = parseFloat(methabauProps['Breite']);
            if (methabauProps['Höhe']) dimensions.hoehe = parseFloat(methabauProps['Höhe']);
        } else {
            // Legacy Fallback
            const posLegacyProp = this.extractPropertiesByNames(api, modelID, assemblyId, ['Positionsnummer', 'Pos-Nr', 'Position', 'Pos.Nr.']);
            posNummer = posLegacyProp || '';
            finalName = baseName || objectType || 'Unbenannt Assembly';
        }

        if (!posNummer) posNummer = finalName;
        
        // Collapse Signature: use Positionsnummer if available, otherwise fall back to name
        const posSignature = posNummer || finalName;
        
        if (positionenMap.has(posSignature)) {
            const existingPos = positionenMap.get(posSignature)!;
            existingPos.menge = (existingPos.menge || 1) + 1;
            if (existingPos.ifcMeta && (existingPos.ifcMeta as any).allGlobalIds) {
                (existingPos.ifcMeta as any).allGlobalIds.push(globalId);
            }
        } else {
            const newPos: Partial<Position> = {
                projektId,
                name: finalName,
                posNummer,
                bemerkung,
                menge: 1,
                status: 'offen',
                einheit: 'Stk',
                ifcParentGlobalId: globalId,
                ifcMeta: { allGlobalIds: [globalId], dimensions: Object.keys(dimensions).length > 0 ? dimensions : undefined },
                // FIX 3f: Store METHABAU fields on POS
                ...(gewicht !== undefined && { gewicht }),
                ...(teileart && { teileart }),
            };
            positionenMap.set(posSignature, newPos);
        }

        // Process children (UNTPOS) of this assembly
        this.extractChildrenFromAssembly(api, modelID, assemblyId, posSignature, unterpositionenMap, projektId);
    }

    /**
     * Extracts direct physical children (IFCPLATE, IFCBUILDINGELEMENTPROXY, etc.)
     * of the ROOT assembly that are not themselves assemblies.
     * These become POS entries when they have a Positionsnummer, otherwise UNTPOS of a virtual POS.
     */
    private static extractDirectPhysicalChildren(
        api: IfcAPI,
        modelID: number,
        rootAssemblyId: number,
        teilsystemNummer: string,
        projektId: string,
        positionenMap: Map<string, Partial<Position>>,
        unterpositionenMap: Map<string, Partial<Unterposition>>
    ) {
        const aggregatesType = IFCRELAGGREGATES;
        const relAggregatesIds = api.GetLineIDsWithType(modelID, aggregatesType);

        for (let i = 0; i < relAggregatesIds.size(); i++) {
            const relId = relAggregatesIds.get(i);
            const rel = api.GetLine(modelID, relId);
            if (!rel) continue;

            const relatingObj = rel.RelatingObject;
            if (!relatingObj || relatingObj.value !== rootAssemblyId) continue;

            const relatedObjects = rel.RelatedObjects || [];
            for (const childRef of relatedObjects) {
                const childId = childRef.value;
                const childLine = api.GetLine(modelID, childId, true);
                if (!childLine) continue;

                // Skip sub-assemblies — they are handled by processAssembly
                // Check type: IFCELEMENTASSEMBLY type number
                if (childLine.type === IFCELEMENTASSEMBLY) continue;

                const methabau = this.getMethabauProperties(api, modelID, childId);
                if (!methabau) continue;

                const posNummer = methabau['Positionsnummer'] || '';
                const sachnummer = methabau['Sachnummer'] || (this.safeGetPropValue(childLine.Name) as string) || 'Unbekannt';
                
                if (!posNummer) continue; // Skip root-level elements without Positionsnummer

                const posSignature = posNummer;
                const globalId = this.safeGetPropValue(childLine.GlobalId) as string;

                if (positionenMap.has(posSignature)) {
                    const existingPos = positionenMap.get(posSignature)!;
                    existingPos.menge = (existingPos.menge || 1) + 1;
                } else {
                    const gewicht = methabau['Gewicht'] ? parseFloat(methabau['Gewicht']) : undefined;
                    const teileart = methabau['Teileart'] || undefined;
                    const werkstoff = methabau['Werkstoff'] || this.getMaterialAsociado(api, modelID, childId) || undefined;
                    const dimensions: Record<string, number> = {};
                    if (methabau['Länge']) dimensions.laenge = parseFloat(methabau['Länge']);
                    if (methabau['Breite']) dimensions.breite = parseFloat(methabau['Breite']);
                    if (methabau['Höhe']) dimensions.hoehe = parseFloat(methabau['Höhe']);
                    if (methabau['Blechdicke']) dimensions.blechdicke = parseFloat(methabau['Blechdicke']);
                    if (methabau['Oberfläche gesamt']) dimensions.oberflaecheGesamt = parseFloat(methabau['Oberfläche gesamt']);

                    positionenMap.set(posSignature, {
                        projektId,
                        name: sachnummer,
                        posNummer,
                        menge: 1,
                        status: 'offen',
                        einheit: 'Stk',
                        ifcParentGlobalId: globalId,
                        ifcMeta: { allGlobalIds: [globalId], dimensions: Object.keys(dimensions).length > 0 ? dimensions : undefined },
                        ...(gewicht !== undefined && { gewicht }),
                        ...(teileart && { teileart }),
                        ...(werkstoff && { materialProp: werkstoff }),
                    });
                }
            }
        }
    }

    /**
     * FIX 4 + FIX 5 + FIX 6: extractChildrenFromAssembly now correctly maps:
     * - Sachnummer        → UNTPOS name
     * - Positionsnummer   → UNTPOS posNummer
     * - Gewicht           → taken directly from METHABAU (not English fallbacks)
     * - Werkstoff         → taken directly from METHABAU (IFCRELASSOCIATESMATERIAL only as last resort)
     * - Teileart          → from METHABAU
     * - All dimensions    → from METHABAU
     */
    private static extractChildrenFromAssembly(
        api: IfcAPI,
        modelID: number, 
        assemblyId: number, 
        parentSignature: string, 
        untMap: Map<string, Partial<Unterposition>>, 
        projektId: string
    ) {
        const aggregatesType = IFCRELAGGREGATES;
        const relAggregatesIds = api.GetLineIDsWithType(modelID, aggregatesType);
        
        for (let i = 0; i < relAggregatesIds.size(); i++) {
            const relId = relAggregatesIds.get(i);
            const rel = api.GetLine(modelID, relId);
            if (!rel) continue;

            const relatingObj = rel.RelatingObject;
            if (!relatingObj || relatingObj.value !== assemblyId) continue;
            
            const relatedObjects = rel.RelatedObjects || [];
            for (const childRef of relatedObjects) {
                const childId = childRef.value;
                const childProps = api.GetLine(modelID, childId, true);
                if (!childProps) continue;
                
                const childGlobalId = this.safeGetPropValue(childProps.GlobalId) as string;
                const childBaseName = this.safeGetPropValue(childProps.Name) as string;
                
                const methabauProps = this.getMethabauProperties(api, modelID, childId);

                let currentName = '';
                let posNummer = '';
                let bemerkungPath = '';
                let weight: number | undefined;
                let material = '';
                let teileart = '';
                let dimensions: Record<string, number> = {};

                if (methabauProps) {
                    // FIX 4: Sachnummer → UNTPOS name (NOT Benennung 1)
                    currentName = methabauProps['Sachnummer'] || childBaseName || 'Unbekannt Teil';
                    // FIX 4b: Positionsnummer → UNTPOS posNummer
                    posNummer = methabauProps['Positionsnummer'] || '';
                    bemerkungPath = methabauProps['Bemerkung'] || '';
                    teileart = methabauProps['Teileart'] || '';
                    
                    // Append Source Info
                    bemerkungPath = bemerkungPath ? `${bemerkungPath} (Quelle: PSet METHABAU)` : '(Quelle: PSet METHABAU)';
                    
                    // FIX 5: Gewicht directly from METHABAU
                    if (methabauProps['Gewicht']) weight = parseFloat(methabauProps['Gewicht']) || undefined;
                    
                    // FIX 6: Werkstoff directly from METHABAU
                    material = methabauProps['Werkstoff'] || '';
                    
                    // Dimensions (already correct in original, kept as is)
                    if (methabauProps['Länge']) dimensions.laenge = parseFloat(methabauProps['Länge']);
                    if (methabauProps['Breite']) dimensions.breite = parseFloat(methabauProps['Breite']);
                    if (methabauProps['Höhe']) dimensions.hoehe = parseFloat(methabauProps['Höhe']);
                    if (methabauProps['Blechdicke']) dimensions.blechdicke = parseFloat(methabauProps['Blechdicke']);
                    if (methabauProps['Oberfläche gesamt']) dimensions.oberflaecheGesamt = parseFloat(methabauProps['Oberfläche gesamt']);
                } else {
                    // Legacy Fallbacks (only if no METHABAU pset found at all)
                    const legacyName = this.extractPropertiesByNames(api, modelID, childId, ['Sachnummer', 'Benennung 1', 'Bemerkung']);
                    currentName = legacyName || childBaseName || 'Unbekannt Teil';
                    posNummer = currentName;
                }
                
                // FIX 5 fallback: only use English weight keys if METHABAU had no Gewicht
                if (weight === undefined) weight = this.getWeightFromPset(api, modelID, childId);
                // FIX 6 fallback: only use IFC material relation if METHABAU had no Werkstoff
                if (!material) material = this.getMaterialAsociado(api, modelID, childId) || '';
                
                if (!currentName) currentName = childBaseName || 'Unbekannt Teil';
                
                // Filter out Welds
                const lowerName = currentName.toLowerCase();
                const lowerTeileart = teileart.toLowerCase();
                if (lowerName.includes('schweiß') || lowerName.includes('schweiss') || lowerName.includes('weld') || lowerTeileart.includes('schweiss')) {
                    continue;
                }
                
                // Collapse Signature: Positionsnummer is the best key; fallback to name+material
                const childSignature = posNummer
                    ? `${parentSignature}|${posNummer}`
                    : `${parentSignature}|${currentName}|${material}`;
                
                if (untMap.has(childSignature)) {
                    const existingUnt = untMap.get(childSignature)!;
                    existingUnt.menge = (existingUnt.menge || 1) + 1;
                } else {
                    untMap.set(childSignature, {
                        projektId,
                        name: currentName,
                        bemerkung: bemerkungPath,
                        posNummer: posNummer || currentName,
                        menge: 1,
                        materialProp: material,
                        teileart,
                        dimensions: Object.keys(dimensions).length > 0 ? dimensions : undefined,
                        gewichtKg: weight,
                        ifcChildGlobalId: childGlobalId,
                        einheit: 'Stk'
                    });
                }
            }
        }
    }

    private static getWeightFromPset(api: IfcAPI, modelID: number, elementId: number): number | undefined {
        const relDefinesType = IFCRELDEFINESBYPROPERTIES;
        const relDefinesIds = api.GetLineIDsWithType(modelID, relDefinesType);
        for (let i = 0; i < relDefinesIds.size(); i++) {
            const relId = relDefinesIds.get(i);
            const rel = api.GetLine(modelID, relId);
            if (!rel) continue;

            const relatedObjects = rel.RelatedObjects || [];
            const isRelated = relatedObjects.some((r: any) => r.value === elementId);
            
            if (isRelated && rel.RelatingPropertyDefinition) {
                const psetId = rel.RelatingPropertyDefinition.value;
                const pset = api.GetLine(modelID, psetId, true);
                if (!pset) continue;

                const psetName = this.safeGetPropValue(pset.Name) as string;
                if (psetName && (psetName.includes('Quantity') || psetName.includes('BaseQuantities'))) {
                    const props = pset.HasProperties || pset.Quantities;
                    if (props) {
                        for (const propRef of props) {
                            const prop = api.GetLine(modelID, propRef.value, true);
                            const name = this.safeGetPropValue(prop.Name) as string;
                            if (name === 'NetWeight' || name === 'GrossWeight' || name === 'Weight') {
                                return Number(this.safeGetPropValue(prop.NominalValue) ?? this.safeGetPropValue(prop.WeightValue));
                            }
                        }
                    }
                }
            }
        }
        return undefined;
    }

    private static getMaterialAsociado(api: IfcAPI, modelID: number, elementId: number): string | undefined {
        const relAssociatesType = IFCRELASSOCIATESMATERIAL;
        const relAssociatesIds = api.GetLineIDsWithType(modelID, relAssociatesType);
        for (let i = 0; i < relAssociatesIds.size(); i++) {
            const relId = relAssociatesIds.get(i);
            const rel = api.GetLine(modelID, relId);
            if (!rel) continue;

            const relatedObjects = rel.RelatedObjects || [];
            const isRelated = relatedObjects.some((r: any) => r.value === elementId);
            
            if (isRelated && rel.RelatingMaterial) {
                const matId = rel.RelatingMaterial.value;
                const mat = api.GetLine(modelID, matId, true);
                if (mat) {
                    return this.safeGetPropValue(mat.Name) as string; 
                }
            }
        }
        return undefined;
    }

    /**
     * Entrypoint for handling an IFC file upload, extracting its hierarchy, 
     * and returning it as primitive arrays for the UI to review.
     */
    static async analyzeHierarchicalIFC(
        buffer: Uint8Array,
        filename: string,
        projektId: string
    ) {
        const hierarchy = await this.processIFC2MethaHierarchy(buffer, filename, projektId);
        
        const positionen = Array.from(hierarchy.positionenMap.entries()).map(([signature, pos]) => ({ signature, ...pos }));
        const unterpositionen = Array.from(hierarchy.unterpositionenMap.entries()).map(([signature, unt]) => ({ signature, ...unt }));

        return {
            teilsystem: hierarchy.teilsystem,
            positionen,
            unterpositionen
        };
    }

    /**
     * Entrypoint for saving the reviewed and filtered hierarchy into Supabase.
     */
    static async saveHierarchicalIFC(
        payload: {
            teilsystem: Partial<Teilsystem>,
            positionen: any[],
            unterpositionen: any[]
        }
    ): Promise<Teilsystem> {
        
        // 1. Insert Teilsystem
        const tsResult = await DatabaseService.insert<Teilsystem>('teilsysteme', payload.teilsystem as Teilsystem);
        const teilsystemId = tsResult.id;

        // 2. Insert Positionen
        const insertedPositionsMap = new Map<string, string>(); // Signature -> New Database ID

        for (const posCandidate of payload.positionen) {
            const signature = posCandidate.signature;
            delete posCandidate.signature;
            
            posCandidate.teilsystemId = teilsystemId;
            const newPos = await DatabaseService.insert<Position>('positionen', posCandidate as Position);
            insertedPositionsMap.set(signature, newPos.id);
        }

        // 3. Insert Unterpositionen
        for (const untCandidate of payload.unterpositionen) {
            const signature = untCandidate.signature;
            // Parent signature is everything before the first pipe
            const parentSignature = signature.split('|')[0];
            delete untCandidate.signature;

            const parentId = insertedPositionsMap.get(parentSignature);
            
            if (parentId) {
                untCandidate.teilsystemId = teilsystemId;
                untCandidate.positionId = parentId;
                await DatabaseService.insert<Unterposition>('unterpositionen', untCandidate as Unterposition);
            } else {
                console.warn(`[IFC Import] Parent Position not found for Unterposition signature: ${signature}`);
            }
        }

        return tsResult;
    }
}
