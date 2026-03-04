// src/lib/services/ifcImportService.ts

import { IfcAPI } from 'web-ifc';
import path from 'path';
import crypto from 'crypto';
import { Teilsystem, ItemStatus } from '@/types';
const METHABAU_PSET_NAME = 'METHABAU Teilsystem';

export interface IFCImportResult {
    teilsystem: Partial<Teilsystem>;
    rawMetadata?: any;
    missingFields: string[];
    alreadyExists: boolean;
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

        // Check if already exists by checksum
        const existing = await DatabaseService.list<Teilsystem>('teilsysteme', {
            must: [{ key: 'ifcChecksum', match: { value: checksum } }]
        });

        if (existing.length > 0) {
            api.CloseModel(modelID);
            return {
                teilsystem: existing[0],
                missingFields: [],
                alreadyExists: true
            };
        }

        const metadata: any = {
            TEILSYSTEM: null,
            Teilsystemname: null,
            Layer: null,
            Gebäude: null,
            Abschnitt: null,
            Geschoss: null,
        };

        const missingFields: string[] = [];

        // 1. Extract METHABAU Teilsystem Pset
        // We look for any element that has this Pset. Usually it's attached to the Building or Site, or just present.
        // We'll scan elements to find it.
        const allLines = api.GetLineIDsWithType(modelID, 0) as unknown as number[]; // Scan all? No, let's target common containers
        // Usually, custom Psets in Tekla can be on many things. 
        // We'll check IfcProject, IfcBuilding, etc.
        const containerTypes = [1, 2, 3]; // Simplified codes for Project, Site, Building if they were constants
        // Better: iterate all elements and find the Pset by name

        try {
            const psets = await api.properties.getPropertySets(modelID, 0, true, true); // Root?
            // This might not work as expected for all elements. 
            // In web-ifc, we often need to find the IfcPropertySet by text if we don't know the owner.
        } catch { }

        // Fallback: Scan every element until we find the Pset (inefficient but thorough for extraction)
        // Or better: Use GetLineIDsWithType for IfcPropertySet (approx 1021431185 in some web-ifc versions?)
        // Let's use a more robust approach: find all IfcPropertySet lines
        const propertySetIds = api.GetLineIDsWithType(modelID, 3816766444) as unknown as number[]; // Code for IFCPROPERTYSET

        for (const psetId of propertySetIds) {
            const pset = api.GetLine(modelID, psetId, true);
            const psetName = this.safeGetPropValue(pset.Name);
            if (psetName === METHABAU_PSET_NAME) {
                const props = pset.HasProperties as any[];
                if (props) {
                    for (const prop of props) {
                        const name = (this.safeGetPropValue(prop.Name) as string || '').trim();
                        const val = this.safeGetPropValue(prop.NominalValue);
                        if (name in metadata) metadata[name] = val;
                    }
                }
            }
        }

        // 2. Extract Site/Building/Storey if missing
        // (Logic to be expanded if needed, but METHABAU Pset is priority)

        // 3. Mapping Rules
        const systemNummer = metadata.TEILSYSTEM || filename.match(/^\d+/)?.[0] || `TS-${Date.now()}`;
        const bezeichnung = metadata.Teilsystemname || filename.replace(/\.ifc$/i, '');

        const descBlocks = [];
        if (metadata.Gebäude) descBlocks.push(`Gebäude: ${metadata.Gebäude}`);
        if (metadata.Geschoss) descBlocks.push(`Geschoss: ${metadata.Geschoss}`);
        if (metadata.Abschnitt) descBlocks.push(`Abschnitt: ${metadata.Abschnitt}`);
        const beschreibung = descBlocks.join(' | ');

        const bemerkungLines = [];
        if (metadata.Layer) bemerkungLines.push(`Layer: ${metadata.Layer}`);
        bemerkungLines.push(`IFC: ${schema} | Units: SI`); // Simplified units for now
        bemerkungLines.push(`Source file: ${filename}`);
        const bemerkung = bemerkungLines.join('\n');

        const result: Partial<Teilsystem> = {
            projektId,
            teilsystemNummer: String(systemNummer),
            ks: 1, // Default
            name: String(bezeichnung),
            beschreibung,
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Check required fields
        if (!metadata.TEILSYSTEM) missingFields.push('TEILSYSTEM (Pset)');
        if (!metadata.Teilsystemname) missingFields.push('Teilsystemname (Pset)');

        api.CloseModel(modelID);

        return {
            teilsystem: result,
            rawMetadata: metadata, // Added for frontend pre-filling
            missingFields,
            alreadyExists: false
        };
    }
}
