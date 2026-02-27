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

    console.log("Methods:", Object.keys(ifcApi).filter(k => typeof (ifcApi as any)[k] === 'function'));

    ifcApi.CloseModel(modelID);
}
test();
