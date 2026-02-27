import fs from 'fs';
import path from 'path';
import { IfcAPI } from 'web-ifc';

async function extractIfc(sourcePath: string, outputPath: string) {
    console.log(`Loading IFC: ${sourcePath}`);
    const ifcApi = new IfcAPI();
    const publicWasm = path.join(process.cwd(), 'public') + path.sep;
    ifcApi.SetWasmPath(publicWasm, true);
    await ifcApi.Init();

    const buffer = fs.readFileSync(sourcePath);
    const modelID = ifcApi.OpenModel(new Uint8Array(buffer));

    const result: any = {
        file: { name: path.basename(sourcePath), size_bytes: buffer.length, path: path.resolve(sourcePath) },
        meta: { schema: ifcApi.GetModelSchema(modelID), units: "extracted" },
        spatial: { sites: [], buildings: [], storeys: [] },
        relations: { parents: {}, child_parent: {} },
        elements: []
    };

    const getSafe = (p: any) => {
        if (!p) return null;
        if (typeof p.value === 'object' && p.value !== null) return p.value.value;
        return p.value;
    };

    let consecutiveNulls = 0;
    for (let id = 1; id <= 100000; id++) {
        let line;
        try {
            line = ifcApi.GetLine(modelID, id, false);
        } catch {
            consecutiveNulls++;
            if (consecutiveNulls > 500) break;
            continue;
        }

        if (!line) {
            consecutiveNulls++;
            if (consecutiveNulls > 500) break;
            continue;
        }
        consecutiveNulls = 0;

        const typeName = line.constructor.name;

        // Relations
        if (typeName === 'IfcRelAggregates' || typeName === 'IfcRelNests') {
            try {
                const rel = ifcApi.GetLine(modelID, id, true);
                const parent = rel.RelatingObject;
                const kids = rel.RelatedObjects || [];
                if (parent && parent.value) {
                    const pEl = ifcApi.GetLine(modelID, parent.value);
                    const pGid = pEl.GlobalId?.value;
                    if (pGid) {
                        if (!result.relations.parents[pGid]) result.relations.parents[pGid] = [];
                        for (const k of kids) {
                            const cEl = ifcApi.GetLine(modelID, k.value);
                            const cGid = cEl.GlobalId?.value;
                            if (cGid) {
                                result.relations.parents[pGid].push(cGid);
                                result.relations.child_parent[cGid] = pGid;
                            }
                        }
                    }
                }
            } catch { }
        }

        // Spatial
        if (typeName === 'IfcSite') result.spatial.sites.push({ GlobalId: line.GlobalId?.value, Name: getSafe(line.Name) });
        if (typeName === 'IfcBuilding') result.spatial.buildings.push({ GlobalId: line.GlobalId?.value, Name: getSafe(line.Name) });
        if (typeName === 'IfcBuildingStorey') result.spatial.storeys.push({ GlobalId: line.GlobalId?.value, Name: getSafe(line.Name), Elevation: getSafe(line.Elevation) });

        // Elements
        const upperType = typeName.toUpperCase();
        const isElement = upperType.includes('ELEMENT') ||
            upperType.includes('PLATE') ||
            upperType.includes('BEAM') ||
            upperType.includes('COLUMN') ||
            upperType.includes('MEMBER') ||
            upperType.includes('SLAB') ||
            upperType.includes('FASTENER') ||
            upperType.includes('DISCRETEACCESSORY') ||
            upperType.includes('PROXY');

        if (isElement && !upperType.includes('REL') && !upperType.includes('TYPE')) {
            const el = ifcApi.GetLine(modelID, id, true);

            const psetsObj: any = {};
            try {
                const psets = await ifcApi.properties.getPropertySets(modelID, id, true);
                for (const ps of psets) {
                    const psName = getSafe(ps.Name);
                    if (psName) {
                        psetsObj[psName] = {};
                        for (const prop of (ps.HasProperties || [])) {
                            const pName = getSafe(prop.Name);
                            if (pName) {
                                let val = getSafe(prop.NominalValue);
                                if (val && typeof val === 'object') val = val.value;
                                psetsObj[psName][pName] = val;
                            }
                        }
                        for (const q of (ps.Quantities || [])) {
                            const qName = getSafe(q.Name);
                            if (qName) psetsObj[psName][qName] = getSafe(q.CountValue || q.LengthValue || q.AreaValue || q.VolumeValue || q.WeightValue);
                        }
                    }
                }
            } catch { }

            result.elements.push({
                GlobalId: el.GlobalId?.value,
                ifcType: typeName,
                Name: getSafe(el.Name),
                Description: getSafe(el.Description),
                Tag: getSafe(el.Tag),
                psets: psetsObj,
                materials: []
            });
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`OK ${outputPath} elements: ${result.elements.length}`);
    ifcApi.CloseModel(modelID);
}

const [, , inPath, outPath] = process.argv;
extractIfc(inPath, outPath).catch(console.error);
