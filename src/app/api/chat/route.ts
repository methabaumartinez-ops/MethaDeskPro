import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { AIService } from '@/lib/services/aiService';
import { z } from 'zod';

export const maxDuration = 30;

const chatSchema = z.object({
    messages: z.array(z.any()),
    projektId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: 'API Key missing' }), { status: 500 });

    const openai = createOpenAI({ apiKey: apiKey.trim() });

    try {
        const body = await req.json();
        const validation = chatSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ error: 'Ungültige Anfragedaten.', details: validation.error.errors }), { status: 400 });
        }

        const { messages, projektId } = validation.data;

        let contextText = "Kein Kontext.";
        if (projektId) {
            try {
                const context = await AIService.getProjectContext(projektId);
                if (context) contextText = AIService.formatContextToText(context);
            } catch (e) { }
        }

        const systemPrompt = `Du bist experto en MethaDeskPro.\nAntworte auf DEUTSCH.\nKontext:\n${contextText}`;

        const result = streamText({
            model: openai('gpt-4o') as any,
            system: systemPrompt,
            messages,
        });

        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error('Chat error:', error);
        let message = error.message || 'Ein Fehler ist aufgetreten.';
        if (error.status === 429 || message.toLowerCase().includes('quota')) {
            message = 'API-Quota überschritten. Bitte versuchen Sie es in un paar Minuten erneut o prüfen Sie Ihren Tarif.';
        }
        return new Response(JSON.stringify({ error: message }), { status: error.status || 500 });
    }
}
