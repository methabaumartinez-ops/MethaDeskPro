import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { AIService } from '@/lib/services/aiService';

const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 30;

export async function GET() {
    return new Response('Chat API is active. POST to this endpoint for AI chat.');
}

export async function POST(req: Request) {
    console.log('--- POST /api/chat received ---');

    if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is missing in environment variables');
        return new Response('OpenAI API Key is not configured', { status: 500 });
    }
    try {
        const body = await req.json();
        const { messages, projektId } = body;
        console.log('Project ID:', projektId);
        console.log('Messages count:', messages?.length);

        if (!messages) {
            return new Response('Missing messages', { status: 400 });
        }

        let contextText = "Kein Kontext verfügbar.";
        try {
            if (projektId) {
                const context = await AIService.getProjectContext(projektId);
                if (context) {
                    contextText = AIService.formatContextToText(context);
                }
            }
        } catch (e) {
            console.error('Context fetch error:', e);
        }

        const systemPrompt = `
Du bist ein Experten-Assistent für MethaDeskPro (Baumanagement).
Antworte IMMER auf DEUTSCH.
Projektkontext:
${contextText}
Beantworte Fragen präzise basierend auf dem Kontext.
`;

        const result = streamText({
            model: openai('gpt-4o-mini'),
            system: systemPrompt,
            messages,
        });

        // Use toDataStreamResponse for AI SDK 4.x
        return (result as any).toDataStreamResponse();
    } catch (error: any) {
        console.error('Chat API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
