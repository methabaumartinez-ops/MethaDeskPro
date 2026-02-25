import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ALLOWED_FILES: Record<string, string> = {
    'web-ifc.wasm': path.join(process.cwd(), 'node_modules', 'web-ifc', 'web-ifc.wasm'),
    'web-ifc-mt.wasm': path.join(process.cwd(), 'node_modules', 'web-ifc', 'web-ifc-mt.wasm'),
};

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ file: string }> }
) {
    const { file } = await params;
    const filePath = ALLOWED_FILES[file];

    if (!filePath) {
        return NextResponse.json({ error: `File not found: ${file}` }, { status: 404 });
    }

    try {
        const buffer = fs.readFileSync(filePath);
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/wasm',
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (err: any) {
        console.error('[WASM route] Error reading file:', err.message);
        return NextResponse.json({ error: `Could not read WASM: ${err.message}` }, { status: 500 });
    }
}
