import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { AIService } from '@/lib/services/aiService';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages, projektId } = await req.json();

    let contextText = "";
    if (projektId) {
        const context = await AIService.getProjectContext(projektId);
        contextText = AIService.formatContextToText(context);
    }

    const systemPrompt = `
Du bist ein Experten-Assistent für MethaDeskPro, eine Projektmanagement-Plattform für das Baugewerbe.
Dein Ziel ist es, den Benutzer bei Anfragen zu seinen Projekten, Personal und Maschinen zu unterstützen.

Aktueller Projektkontext:
${contextText}

Anweisungen:
1. Antworte IMMER auf DEUTSCH.
2. Basieren deine Antworten auf den bereitgestellten Daten.
3. Wenn Informationen fehlen, antworte höflich, dass keine Daten dazu vorliegen.
4. Sei präzise und professionell.
`;

    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages,
    });

    return result.toTextStreamResponse();
}
