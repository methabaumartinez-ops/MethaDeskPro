import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { google } from 'googleapis';
import { IfcAPI } from 'web-ifc';

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

/**
 * POST /api/ifc-parse
 * Body: { url: string }
 * Returns: { meshes: Array<{ positions, normals, indices, r, g, b, a, transform }> }
 */
export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

        // 1. Download IFC from Google Drive
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
            } catch (oauthErr: any) {
                console.warn('OAuth fallback triggered due to error:', oauthErr.message);
                const directUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
                const fallbackResponse = await fetch(directUrl);
                if (!fallbackResponse.ok) throw new Error(`Fallback download failed: HTTP ${fallbackResponse.status}`);
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

        // 2. Parse IFC with web-ifc — WASM runs in Node.js server-side
        const ifcApi = new IfcAPI();
        // In standalone builds, node_modules is not fully available.
        // web-ifc-node.wasm is copied to /public which IS included in standalone.
        const wasmDir = path.join(process.cwd(), 'public') + path.sep;
        ifcApi.SetWasmPath(wasmDir, true); // true = absolute path
        await ifcApi.Init();

        const ifcData = new Uint8Array(ifcBuffer);
        const modelID = ifcApi.OpenModel(ifcData, { COORDINATE_TO_ORIGIN: true });

        // 3. Extract geometry — using correct web-ifc@0.0.57 API
        const meshes: Array<{
            positions: number[];
            normals: number[];
            indices: number[];
            r: number; g: number; b: number; a: number;
            transform: number[];
        }> = [];

        ifcApi.StreamAllMeshes(modelID, (flatMesh) => {
            const geomCount = flatMesh.geometries.size();
            for (let i = 0; i < geomCount; i++) {
                const placedGeom = flatMesh.geometries.get(i);
                // color: web-ifc Color uses x=r, y=g, z=b, w=a
                const { x: r, y: g, z: b, w: a } = placedGeom.color;

                // Get the geometry data
                const ifcGeom = ifcApi.GetGeometry(modelID, placedGeom.geometryExpressID);
                const vPtr = ifcGeom.GetVertexData();
                const vSize = ifcGeom.GetVertexDataSize();
                const iPtr = ifcGeom.GetIndexData();
                const iSize = ifcGeom.GetIndexDataSize();

                const verts = ifcApi.GetVertexArray(vPtr, vSize);
                const idxs = ifcApi.GetIndexArray(iPtr, iSize);

                const stride = 6; // x, y, z, nx, ny, nz
                const count = verts.length / stride;
                const positions: number[] = [];
                const normals: number[] = [];

                for (let j = 0; j < count; j++) {
                    positions.push(verts[j * stride], verts[j * stride + 1], verts[j * stride + 2]);
                    normals.push(verts[j * stride + 3], verts[j * stride + 4], verts[j * stride + 5]);
                }

                meshes.push({
                    positions,
                    normals,
                    indices: Array.from(idxs),
                    r, g, b, a,
                    transform: Array.from(placedGeom.flatTransformation),
                });

                ifcGeom.delete();
            }
            // Note: flatMesh.delete() is not available in the Node.js version of web-ifc
        });

        ifcApi.CloseModel(modelID);

        return NextResponse.json({ meshes }, {
            headers: { 'Cache-Control': 'private, max-age=3600' }
        });

    } catch (err: any) {
        console.error('[ifc-parse]', err.message || err);
        return NextResponse.json({ error: err.message || 'Parse error' }, { status: 500 });
    }
}
