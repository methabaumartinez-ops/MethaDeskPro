// src/app/api/teilsystem-import/route.ts
// NOTE: This endpoint extracts IFC metadata for form pre-fill ONLY.
// It does NOT create or modify any database records.
// The real Teilsystem creation happens exclusively via POST /api/teilsysteme.

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { IFCImportService } from '@/lib/services/ifcImportService';
import { requireAuth } from '@/lib/helpers/requireAuth';

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
 * POST /api/teilsystem-import
 * Body: { url: string, filename: string, projektId: string, user: string }
 * Returns extracted IFC metadata for form pre-fill.
 * DOES NOT write to the database.
 */
export async function POST(req: NextRequest) {
    // BUG-01 FIX: Enforce authentication BEFORE any IFC parsing or Drive access.
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    try {
        const body = await req.json();
        const { url, filename, projektId, user, overrides } = body;

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

        // 2. Extract metadata only — no DB writes
        const data = new Uint8Array(ifcBuffer);
        const result = await IFCImportService.extractTeilsystemFromIFC(
            data,
            filename || 'imported.ifc',
            url,
            user || 'system-import',
            projektId
        );

        // Apply overrides if provided (and not empty)
        if (overrides) {
            if (overrides.teilsystemNummer) result.teilsystem.teilsystemNummer = overrides.teilsystemNummer;
            if (overrides.name) result.teilsystem.name = overrides.name;
            if (overrides.beschreibung) result.teilsystem.beschreibung = overrides.beschreibung;
        }

        // Return metadata for form pre-fill — no DB save
        return NextResponse.json({
            message: 'metadata_only',
            teilsystem: result.teilsystem,
            summary: {
                extractedFields: Object.keys(result.teilsystem).filter(k => (result.teilsystem as any)[k] !== null),
                missingFields: result.missingFields
            }
        });

    } catch (error: any) {
        console.error('[teilsystem-import] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

