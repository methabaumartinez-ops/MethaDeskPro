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
                <h1 style="color:red;">❌ Error de autorización</h1>
                <p>${error}</p>
                <a href="/api/auth/google">Intentar de nuevo</a>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    }

    if (!code) {
        return new NextResponse(
            `<html><body style="font-family:sans-serif;padding:40px;">
                <h1>⚠️ Falta el código de autorización</h1>
                <a href="/api/auth/google">Ir a autorizar</a>
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

        const refreshToken = tokens.refresh_token || '(No se recibió refresh_token. Intenta de nuevo con prompt=consent)';

        return new NextResponse(
            `<html>
            <head><title>Google Drive - Token obtenido</title></head>
            <body style="font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto;">
                <h1 style="color:green;">✅ Autorización exitosa</h1>
                <h2>Refresh Token:</h2>
                <textarea readonly style="width:100%;height:80px;font-family:monospace;font-size:14px;padding:10px;border:2px solid #ccc;border-radius:8px;">${refreshToken}</textarea>
                <br/><br/>
                <div style="background:#f0f7ff;border:1px solid #0066cc;border-radius:8px;padding:20px;">
                    <h3>📋 Instrucciones:</h3>
                    <ol>
                        <li>Copia el <strong>Refresh Token</strong> de arriba</li>
                        <li>Abre el archivo <code>.env</code> en la raíz del proyecto</li>
                        <li>Reemplaza el valor de <code>GOOGLE_REFRESH_TOKEN=</code> con el token copiado</li>
                        <li>Reinicia el servidor de desarrollo (<code>npm run dev</code>)</li>
                        <li>¡Listo! Los archivos ahora se subirán a Google Drive</li>
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
                <h1 style="color:red;">❌ Error al obtener tokens</h1>
                <pre>${err instanceof Error ? err.message : String(err)}</pre>
                <br/>
                <a href="/api/auth/google">Intentar de nuevo</a>
            </body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    }
}
