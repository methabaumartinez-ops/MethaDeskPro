// src/app/api/ifc-metadata/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { IFCImportService } from '@/lib/services/ifcImportService';

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
 * POST /api/ifc-metadata
 * Body: { url: string, filename: string, projektId: string }
 * Purpose: Extract metadata for form pre-filling without saving to DB.
 */
export async function POST(req: NextRequest) {
    try {
        const { url, filename, projektId } = await req.json();

        if (!url || !projektId) {
            return NextResponse.json({ error: 'Missing url or projektId' }, { status: 400 });
        }

        // 1. Download IFC
        let ifcBuffer: ArrayBuffer;
        const fileId = extractFileId(url);

        if (fileId && CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
            const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
            oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
            const drive = google.drive({ version: 'v3', auth: oauth2Client });
            const response = await drive.files.get(
                { fileId, alt: 'media' },
                { responseType: 'arraybuffer' }
            );
            ifcBuffer = response.data as ArrayBuffer;
        } else {
            const response = await fetch(url.includes('drive.google.com') ? `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}` : url);
            if (!response.ok) throw new Error(`Download failed: ${response.status}`);
            ifcBuffer = await response.arrayBuffer();
        }

        // 2. Extract Metadata (skipping checksum check for "live" metadata)
        // We call a variant or provide a flag to IFCImportService to NOT check DB
        const data = new Uint8Array(ifcBuffer);

        // We use the service but we handle the result as purely informational
        const result = await IFCImportService.extractTeilsystemFromIFC(
            data,
            filename || 'imported.ifc',
            url,
            'metadata-scan',
            projektId
        );

        return NextResponse.json({
            success: true,
            metadata: result.teilsystem,
            rawMetadata: result.rawMetadata,
            missingFields: result.missingFields,
            alreadyExists: result.alreadyExists
        });

    } catch (error: any) {
        console.error('[ifc-metadata] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
