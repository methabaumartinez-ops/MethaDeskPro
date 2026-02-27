import fs from 'fs';
import path from 'path';

const rawPath = path.join(process.cwd(), 'ifc_raw.json');
const seedPath = path.join(process.cwd(), 'db_seed.json');

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));

const teilsystemeMap = new Map<string, any>();
const positionsMap = new Map<string, any>();
const unterpositions: any[] = [];
const warnings: string[] = [];

// 1. Identify Teilsystems
// Extract from METHABAU Teilsystem pset in ANY element
raw.elements.forEach((el: any) => {
    const tsPset = el.psets?.["METHABAU Teilsystem"];
    if (tsPset) {
        const tsName = tsPset["Teilsystemname"] || "Default TS";
        if (!teilsystemeMap.has(tsName)) {
            teilsystemeMap.set(tsName, {
                system_nummer: tsPset["TEILSYSTEM"] || `TS-${tsName}`,
                ks: 1,
                bezeichnung: tsName,
                beschreibung: `${tsPset["Gebäude"] || ""} ${tsPset["Geschoss"] || ""} ${tsPset["Abschnitt"] || ""}`.trim(),
                bemerkung: `IFC: ${raw.meta.schema} | Source: ${raw.file.name}`,
                eroeffnet_am: new Date().toISOString(),
                eroeffnet_durch: "system-import",
                plan_status: "Offen",
                status: "Offen",
                ifc_file: raw.file,
                positions: []
            });
        }
    }
});

// Fallback Teilsystem if none found
if (teilsystemeMap.size === 0) {
    teilsystemeMap.set("Imported Model", {
        system_nummer: "TS-AUTO",
        ks: 1,
        bezeichnung: "Automatische Import-Gruppe",
        beschreibung: "Generiert aus " + raw.file.name,
        bemerkung: `IFC: ${raw.meta.schema}`,
        eroeffnet_am: new Date().toISOString(),
        eroeffnet_durch: "system-import",
        plan_status: "Offen",
        status: "Offen",
        ifc_file: raw.file,
        positions: []
    });
}

const defaultTs = teilsystemeMap.values().next().value;

// 2. Identify Positions (Assemblies/Parents)
raw.elements.forEach((el: any) => {
    const mPset = el.psets?.["METHABAU Montageteil"];
    const isAssembly = el.ifcType === 'IfcElementAssembly' || raw.relations.parents[el.GlobalId];
    const posNr = mPset?.["Montageteil Position-Nr."] || (isAssembly ? el.Name || `AUTO-${el.GlobalId}` : null);

    if (posNr && (isAssembly || mPset)) {
        if (!positionsMap.has(el.GlobalId)) {
            positionsMap.set(el.GlobalId, {
                pos_nr: String(posNr).trim(),
                bezeichnung: mPset?.["Montageteil Name"] || el.Name || `Baugruppe ${posNr}`,
                menge: 0,
                status: "Offen",
                unterpositionen: [],
                _globalId: el.GlobalId,
                _teilsystem: el.psets?.["METHABAU Teilsystem"]?.["Teilsystemname"] || defaultTs.bezeichnung
            });
        }
    }
});

// Fallback Position if no assemblies
if (positionsMap.size === 0) {
    positionsMap.set("AUTO-GROUP-01", {
        pos_nr: "AUTO-GROUP-01",
        bezeichnung: "Gruppierte Einzelteile",
        menge: 0,
        status: "Offen",
        unterpositionen: [],
        _globalId: "AUTO-GROUP-01",
        _teilsystem: defaultTs.bezeichnung
    });
}

// 3. Identify Unterpositions and link to Parents
raw.elements.forEach((el: any) => {
    const sBlech = el.psets?.["METHABAU Stahlblech"];
    const sTrag = el.psets?.["METHABAU Stahlträger"];
    const uposNr = sBlech?.["Einzelteil POS"] || sTrag?.["Einzelteil POS"] || el.Tag || el.GlobalId;

    // A piece is an Unterposition if it's NOT a Position or if it's a child
    const parentGid = raw.relations.child_parent[el.GlobalId];
    let targetPos = positionsMap.get(parentGid);

    // Fallback search by Montageteil Position-Nr. in pset link
    if (!targetPos) {
        const linkedPosNr = sBlech?.["Montageteil Position-Nr."] || sTrag?.["Montageteil Position-Nr."];
        if (linkedPosNr) {
            for (const p of positionsMap.values()) {
                if (p.pos_nr === String(linkedPosNr).trim()) {
                    targetPos = p;
                    break;
                }
            }
        }
    }

    // Ultimate fallback to first position
    if (!targetPos) targetPos = Array.from(positionsMap.values())[0];

    if (targetPos) {
        // Group by uposNr within this position
        const existing = targetPos.unterpositionen.find((u: any) => u.upos_nr === String(uposNr).trim());
        if (existing) {
            existing.menge++;
        } else {
            targetPos.unterpositionen.push({
                upos_nr: String(uposNr).trim(),
                bezeichnung: el.Name || el.Description || el.ifcType,
                menge: 1,
                material: sBlech?.["MATERIAL"] || sTrag?.["MATERIAL"] || "",
                oberflaeche: sBlech?.["OBERFLÄCHE"] || sTrag?.["OBERFLÄCHE"] || "",
                farbe_rgb: null,
                dimensions: {
                    length: sTrag?.["Länge"] || sBlech?.["Länge"] || "",
                    width: sBlech?.["Breite"] || "",
                    thickness: sBlech?.["Dicke"] || ""
                },
                gewicht: Number(sBlech?.["GEWICHT"] || sTrag?.["GEWICHT"] || 0),
                ifc_meta: { GlobalId: el.GlobalId, type: el.ifcType }
            });
        }
        targetPos.menge++;
    }
});

// Assemble final structure
const result = {
    teilsysteme: Array.from(teilsystemeMap.values()).map(ts => {
        ts.positions = Array.from(positionsMap.values())
            .filter(p => p._teilsystem === ts.bezeichnung)
            .map(p => {
                const { _globalId, _teilsystem, ...cleanPos } = p;
                return cleanPos;
            });
        return ts;
    })
};

fs.writeFileSync(seedPath, JSON.stringify(result, null, 2));
console.log(`Generated ${seedPath} with ${result.teilsysteme.length} teilsystems.`);
