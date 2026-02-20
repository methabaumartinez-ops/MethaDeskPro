import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { AIService } from '@/lib/services/aiService';

export const maxDuration = 30;

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: 'API Key missing' }), { status: 500 });

    const google = createGoogleGenerativeAI({ apiKey: apiKey.trim() });

    try {
        const { messages, projektId } = await req.json();

        let contextText = "Kein Kontext.";
        if (projektId) {
            try {
                const context = await AIService.getProjectContext(projektId);
                if (context) contextText = AIService.formatContextToText(context);
            } catch (e) { }
        }

        const systemPrompt = `Du bist experto en MethaDeskPro.\nAntworte auf DEUTSCH.\nKontext:\n${contextText}`;

        const result = streamText({
            model: google('gemini-2.0-flash'),
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
