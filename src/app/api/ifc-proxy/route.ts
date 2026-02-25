import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

/**
 * A dedicated proxy endpoint for serving IFC files stored in Google Drive.
 * Uses authenticated access via OAuth2 to bypass large-file confirmation pages.
 * 
 * Usage: /api/ifc-proxy?id=GOOGLE_DRIVE_FILE_ID
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
        return NextResponse.json({ error: 'Missing file ID parameter (?id=...)' }, { status: 400 });
    }

    // Validate fileId format (alphanumeric, dashes, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
        return NextResponse.json({ error: 'Invalid file ID format' }, { status: 400 });
    }

    try {
        // Try authenticated download first (handles large files without confirmation page)
        if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
            const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
            oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
            const drive = google.drive({ version: 'v3', auth: oauth2Client });

            const response = await drive.files.get(
                { fileId, alt: 'media' },
                { responseType: 'arraybuffer' }
            );

            const buffer = response.data as ArrayBuffer;

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/x-step',
                    'Content-Disposition': `inline; filename="${fileId}.ifc"`,
                    'Cache-Control': 'private, max-age=3600',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        // Fallback: unauthenticated download (may fail for large files)
        const directUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
        const response = await fetch(directUrl, {
            redirect: 'follow',
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Google Drive returned ${response.status}` },
                { status: response.status }
            );
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'application/x-step';

        // Check if we got HTML instead of binary (confirmation page)
        if (contentType.includes('text/html')) {
            return NextResponse.json(
                { error: 'Google Drive returned a confirmation page. Please ensure the file is publicly accessible or configure authenticated access.' },
                { status: 502 }
            );
        }

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/x-step',
                'Cache-Control': 'private, max-age=3600',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error: any) {
        console.error('[IFC Proxy] Error:', error.message || error);
        return NextResponse.json(
            { error: `IFC proxy error: ${error.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}
