import fs from 'fs';
import path from 'path';
import { IfcAPI } from 'web-ifc';

async function test() {
    const ifcApi = new IfcAPI();
    const publicWasm = path.join(process.cwd(), 'public') + path.sep;
    ifcApi.SetWasmPath(publicWasm, true);
    await ifcApi.Init();

    const buffer = fs.readFileSync("C:\\Users\\f.martinez\\Desktop\\1120 Rühlwand.ifc");
    const modelID = ifcApi.OpenModel(new Uint8Array(buffer));
    console.log("Model ID:", modelID);
    console.log("Schema:", ifcApi.GetModelSchema(modelID));

    // Check projects
    const all = ifcApi.GetLineIDsWithType(modelID, 0);
    console.log("Lines (all):", all.size());

    // Try specific type: IfcProject is 1358994323 in some versions, but let's just find it
    // Actually, iterate over ALL IDs from 1 to some max if size() is 0
    if (all.size() === 0) {
        console.log("Trying to list first 100 lines manually...");
        for (let i = 1; i <= 100; i++) {
            try {
                const line = ifcApi.GetLine(modelID, i);
                if (line) console.log(`Line #${i}: ${line.constructor.name}`);
            } catch (e) { }
        }
    }

    ifcApi.CloseModel(modelID);
}
test();
