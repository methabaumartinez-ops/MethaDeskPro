import 'server-only';
import { QdrantClient } from '@qdrant/js-client-rest';

// SECURITY: Use server-only env vars. NEVER use NEXT_PUBLIC_ for secrets.
// These variables are only accessible in server-side code (API routes, server components).
// In Easypanel, set QDRANT_URL to the internal service URL: http://qdrant:6333
// This avoids TLS entirely for intra-container communication on the same Docker network.
const url = process.env.QDRANT_URL;
const apiKey = process.env.QDRANT_API_KEY;

if (!url) {
    console.error(
        '[Qdrant] QDRANT_URL is not set. ' +
        'Set it to the internal service URL in Easypanel (e.g., http://qdrant:6333). ' +
        'Do NOT use NEXT_PUBLIC_QDRANT_URL as this exposes the URL to the browser bundle.'
    );
}

if (!apiKey) {
    console.warn(
        '[Qdrant] QDRANT_API_KEY is not set. ' +
        'Qdrant will be accessible without authentication — do not expose the port publicly.'
    );
}

// SECURITY: Do NOT set NODE_TLS_REJECT_UNAUTHORIZED = '0'.
// When using internal Docker networking (http://qdrant:6333), TLS is not needed.
// If you must use HTTPS, install the proper CA certificate instead of disabling TLS verification.

export const qdrantClient = new QdrantClient({
    url: url || 'http://localhost:6333',
    apiKey: apiKey,
    port: url?.startsWith('https') ? 443 : 6333,
    timeout: 60000, // 60 seconds
});
