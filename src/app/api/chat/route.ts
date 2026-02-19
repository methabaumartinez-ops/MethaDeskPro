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
Eres un asistente experto para MethaDeskPro, una plataforma de gestión de proyectos de construcción. 
Tu objetivo es ayudar al usuario con consultas sobre sus proyectos, personal y maquinaria.

Contexto del proyecto actual:
${contextText}

Instrucciones:
1. Responde siempre en español.
2. Si el usuario pregunta algo sobre el proyecto, consulta el contexto proporcionado arriba.
3. Si no sabes la respuesta basada en el contexto, indícalo educadamente.
4. Mantén un tono profesional y servicial.
`;

    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        messages,
    });

    return result.toDataStreamResponse();
}
