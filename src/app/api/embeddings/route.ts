// src/app/api/embeddings/route.ts
// Genera embeddings usando @xenova/transformers (all-MiniLM-L6-v2, 384 dims)
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';

let pipeline: any = null;

async function getPipeline() {
    if (!pipeline) {
        const { pipeline: createPipeline } = await import('@xenova/transformers');
        pipeline = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return pipeline;
}

export async function POST(request: NextRequest) {
    // SECURITY: Require auth to prevent CPU-intensive model inference abuse.
    const { error } = await requireAuth();
    if (error) return error;
    try {
        const { text } = await request.json();
        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'text is required' }, { status: 400 });
        }

        const pipe = await getPipeline();
        const output = await pipe(text, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data) as number[];

        return NextResponse.json({ embedding, size: embedding.length });
    } catch (error: any) {
        console.error('[Embeddings API] Error:', error);
        return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
    }
}
