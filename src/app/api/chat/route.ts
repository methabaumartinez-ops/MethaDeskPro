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

        const systemPrompt = `Du bist METHAbot, ein hochintelligenter KI-Experte für MethaDeskPro.
Deine Aufgabe ist die Analyse und Beantwortung von Fragen basierend auf dem untenstehenden PROJEKTKONTEXT.
Dieser Kontext stammt direkt aus unserer Qdrant-Echtzeit-Datenbank.

REGELN FÜR DICH:
1. Antworte IMMER auf DEUTSCH und sprich den Benutzer informell mit "Du" an. Wenn möglich, sprich ihn mit seinem Namen an, falls dieser im Gesprächsverlauf genannt wird.
2. ERFINDE NIEMALS ANTWORTEN. Wenn die Antwort nicht im Kontext enthalten ist, musst du explizit sagen, dass du diese Information nicht hast. Keine Halluzinationen!
3. Behaupte NIE, dass du keinen Zugriff auf die Datenbank hast. Der untenstehende Kontext IST die Datenbank.
4. Wenn nach Terminen (Bauzeitenplan) gefragt wird, schaue unter "=== TEILSYSTEME & BAUZEITENPLAN ===" nach "MONTAGETERMIN".
5. Wenn nach Kosten gefragt wird, schaue unter "=== FINANZDATEN & MATERIALKOSTEN ===" nach Preisen und Summen.
6. Sei ein proaktiver Bau-Assistent. Wenn nach einem Problem gefragt wird, schlage Lösungen basierend auf den vorhandenen Maschinen und Mitarbeitern vor.
7. Formatiere Antworten über Teilsysteme, Termine oder Materialien IMMER als übersichtliche Liste mit DOPPELTEM Zeilenumbruch zwischen den Elementen.
8. Nutze für Listen dieses klare Schema fettgedruckt:
   **[Name]** | **[TS-Nummer]** | **[Datum/Termin]**
9. Verwende kurze, prägnante Sätze und vermeide Textwände.

KONTEXT AUS DER DATENBANK:
${contextText}`;

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
            message = 'API-Quota überschritten. Bitte versuchen Sie es in ein paar Minuten erneut oder prüfen Sie Ihren Tarif.';
        }
        return new Response(JSON.stringify({ error: message }), { status: error.status || 500 });
    }
}
