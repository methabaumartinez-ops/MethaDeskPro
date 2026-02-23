import { QdrantClient } from '@qdrant/js-client-rest';

const url = process.env.NEXT_PUBLIC_QDRANT_URL || process.env.QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY || process.env.QDRANT_API_KEY;

if (!url) {
    console.error('Qdrant URL is missing. Please set NEXT_PUBLIC_QDRANT_URL or QDRANT_URL in environment variables');
}

// In some environments, we might need to allow self-signed certificates
// matching the migration script.
if (typeof process !== 'undefined') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const qdrantClient = new QdrantClient({
    url: url || 'http://localhost:6333',
    apiKey: apiKey,
    port: url?.startsWith('https') ? 443 : 6333,
    timeout: 60000, // 60 seconds timeout
});
