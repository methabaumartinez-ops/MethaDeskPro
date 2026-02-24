import OpenAI from 'openai';
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

    const openai = new OpenAI({ apiKey: apiKey.trim() });

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

        const systemPrompt = `Du bist ein Experte für MethaDeskPro.\nAntworte IMMER auf DEUTSCH.\nKontext:\n${contextText}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            stream: true,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map((m: any) => ({
                    role: m.role as 'user' | 'assistant' | 'system',
                    content: m.content,
                })),
            ],
        });

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of response) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(encoder.encode(content));
                        }
                    }
                } catch (error) {
                    controller.error(error);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error: any) {
        console.error('Chat error:', error);
        let message = error.message || 'Ein Fehler ist aufgetreten.';
        if (error.status === 429 || message.toLowerCase().includes('quota')) {
            message = 'API-Quota überschritten. Bitte versuchen Sie es in un paar Minuten erneut o prüfen Sie Ihren Tarif.';
        }
        return new Response(JSON.stringify({ error: message }), { status: error.status || 500 });
    }
}
