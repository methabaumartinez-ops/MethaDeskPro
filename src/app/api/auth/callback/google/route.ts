import { NextResponse } from 'next/server';
import { google } from 'googleapis';

/**
 * GET /api/auth/callback/google
 * Receives the authorization code from Google and exchanges it for tokens.
 * Displays the refresh_token so the user can copy it into .env.
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
        return new NextResponse(
            `<html><body style="font-family:sans-serif;padding:40px;">
                <h1 style="color:red;">❌ Autorisierungsfehler</h1>
                <p>${error}</p>
                <a href="/api/auth/google">Erneut versuchen</a>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    }

    if (!code) {
        return new NextResponse(
            `<html><body style="font-family:sans-serif;padding:40px;">
                <h1>⚠️ Autorisierungscode fehlt</h1>
                <a href="/api/auth/google">Zur Autorisierung gehen</a>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    }

    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    try {
        const { tokens } = await oauth2Client.getToken(code);

        const refreshToken = tokens.refresh_token || '(Kein Refresh-Token erhalten. Versuchen Sie es erneut mit prompt=consent)';

        return new NextResponse(
            `<html>
            <head><title>Google Drive - Token obtenido</title></head>
            <body style="font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto;">
                <h1 style="color:green;">✅ Autorisierung erfolgreich</h1>
                <h2>Refresh Token:</h2>
                <textarea readonly style="width:100%;height:80px;font-family:monospace;font-size:14px;padding:10px;border:2px solid #ccc;border-radius:8px;">${refreshToken}</textarea>
                <br/><br/>
                <div style="background:#f0f7ff;border:1px solid #0066cc;border-radius:8px;padding:20px;">
                    <h3>📋 Anweisungen:</h3>
                    <ol>
                        <li>Kopieren Sie das oben stehende <strong>Refresh Token</strong></li>
                        <li>Öffnen Sie die Datei <code>.env</code> im Stammverzeichnis des Projekts</li>
                        <li>Ersetzen Sie den Wert von <code>GOOGLE_REFRESH_TOKEN=</code> durch das kopierte Token</li>
                        <li>Starten Sie den Entwicklungsserver neu (<code>npm run dev</code>)</li>
                        <li>Fertig! Dateien werden nun auf Google Drive hochgeladen</li>
                    </ol>
                </div>
                <br/>
                <h3>Access Token (informativo):</h3>
                <textarea readonly style="width:100%;height:60px;font-family:monospace;font-size:12px;padding:10px;border:1px solid #ddd;border-radius:8px;">${tokens.access_token || 'N/A'}</textarea>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    } catch (err) {
        console.error('Error exchanging code for tokens:', err);
        return new NextResponse(
            `<html><body style="font-family:sans-serif;padding:40px;">
                <h1 style="color:red;">❌ Fehler beim Abrufen der Tokens</h1>
                <pre>${err instanceof Error ? err.message : String(err)}</pre>
                <br/>
                <a href="/api/auth/google">Intentar de nuevo</a>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    }
}
