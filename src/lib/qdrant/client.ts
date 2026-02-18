import { QdrantClient } from '@qdrant/js-client-rest';

const url = process.env.NEXT_PUBLIC_QDRANT_URL;
const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY;

if (!url) {
    console.error('Qdrant URL is missing. Please set NEXT_PUBLIC_QDRANT_URL in .env');
}

export const qdrantClient = new QdrantClient({
    url: url || 'http://localhost:6333',
    apiKey: apiKey,
    port: url?.startsWith('https') ? 443 : 6333,
});
