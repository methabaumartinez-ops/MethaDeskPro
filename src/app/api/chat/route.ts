/**
 * src/app/api/chat/route.ts
 *
 * P0 Grounding Lockdown — 2026-03-09
 *
 * Safety guarantees:
 * - User role extracted from JWT session and passed to context builder.
 * - Cost data only included in prompt when user role is authorized (RBAC gate).
 * - Empty-context guard: if no valid projektId or context, LLM is NOT called.
 * - System prompt enforces EISERNE REGELN — no pretrained-knowledge fallback.
 * - Stale Qdrant reference removed from prompt text.
 */

import OpenAI from 'openai';
import { AIService, userCanSeeCosts } from '@/lib/services/aiService';
import { z } from 'zod';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { chatLimiter } from '@/lib/helpers/rateLimit';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

const chatSchema = z.object({
    messages: z.array(z.any()),
    projektId: z.string().uuid().optional(),
});

// ============================================================
// Hardened System Prompt — EISERNE REGELN
// ============================================================

function buildSystemPrompt(contextText: string): string {
    return `Du bist METHAbot, ein KI-Assistent für das MethaDeskPro Baumanagementsystem.

EISERNE REGELN — NIEMALS BRECHEN:
A. Du arbeitest AUSSCHLIESSLICH mit dem untenstehenden DATENBANKKONTEXT.
   Du hast kein eigenes Wissen über dieses Unternehmen, diese Projekte oder diese Daten.
B. Du darfst KEIN trainiertes Wissen über Baubranche, Kosten, Termine oder Materialien
   als Ersatz für fehlende Projektdaten verwenden. Branchenwissen ist VERBOTEN.
C. Wenn eine Information nicht im Datenbankkontext enthalten ist, antworte EXAKT:
   "Diese Information ist im aktuellen Datenbankkontext nicht vorhanden."
D. Wenn nur ein Teil der Frage beantwortet werden kann:
   Beantworte nur den belegten Teil und nenne EXPLIZIT was fehlt.
E. Nenne NIEMALS Zahlen, Daten, Namen, Statuswerte oder Mengen,
   die nicht wörtlich im untenstehenden Kontext stehen.
F. Wenn keine Kostendaten im Kontext vorhanden sind und nach Kosten gefragt wird:
   Antworte: "Du hast keine Berechtigung auf Kostendaten zuzugreifen, oder es sind keine vorhanden."
G. Antworte IMMER auf DEUTSCH in informellem Stil.
H. Formatiere Listen mit doppeltem Zeilenumbruch. Nutze das Schema:
   **[Name]** | **[TS-Nummer]** | **[Datum/Status]**

DATENBANKKONTEXT (Supabase — MethaDeskPro):
${contextText}`;
}

// ============================================================
// Route Handler
// ============================================================

export async function POST(req: Request) {
    // Auth: Require valid session
    const { user, error } = await requireAuth();
    if (error) return error;

    // Rate limit: 20 req/min per user
    const limitResult = chatLimiter.check(user.id);
    if (!limitResult.allowed) {
        return NextResponse.json({ error: limitResult.message }, { status: 429 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'API Key nicht konfiguriert.' }, { status: 500 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Ungültige JSON-Anfrage.' }, { status: 400 });
    }

    const validation = chatSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: 'Ungültige Anfragedaten.', details: validation.error.errors },
            { status: 400 }
        );
    }

    const { messages, projektId } = validation.data;

    // ── Empty-Context Guard ──────────────────────────────────
    // If no projektId is provided, do NOT call the LLM.
    // Return a deterministic refusal — prevents GPT-4o answering without grounding.
    if (!projektId) {
        return NextResponse.json(
            { error: 'Fuer dieses Projekt sind aktuell keine Daten im Kontext verfuegbar. Bitte waehle ein Projekt aus.' },
            { status: 400 }
        );
    }

    // ── RBAC: Check cost authorization before context build ──
    const canSeeCosts = userCanSeeCosts(user.role);

    // ── Context Assembly ────────────────────────────────────
    let contextText = '';
    try {
        const context = await AIService.getProjectContext({
            projektId,
            userRole: user.role,
        });

        if (!context || !context.projekt) {
            // Project not found in DB — deterministic refusal, do NOT call LLM
            return NextResponse.json(
                { error: 'Fuer dieses Projekt sind aktuell keine Daten im Kontext verfuegbar.' },
                { status: 404 }
            );
        }

        contextText = AIService.formatContextToText(context);
    } catch (e) {
        console.error('[Chat] Context fetch failed:', e);
        return NextResponse.json(
            { error: 'Datenbankkontext konnte nicht geladen werden.' },
            { status: 500 }
        );
    }

    // ── Prompt Construction ─────────────────────────────────
    const systemPrompt = buildSystemPrompt(contextText);

    // ── LLM Call ────────────────────────────────────────────
    try {
        const openai = new OpenAI({ apiKey: apiKey.trim() });

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            stream: true,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map((m: { role: string; content: string }) => ({
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
                        if (content) controller.enqueue(encoder.encode(content));
                    }
                } catch (err) {
                    controller.error(err);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Content-Type-Options': 'nosniff',
                // Expose whether costs are included so client can display notice
                'X-Cost-Context': canSeeCosts ? 'included' : 'excluded',
            },
        });
    } catch (error: unknown) {
        const err = error as { message?: string; status?: number };
        console.error('[Chat] LLM error:', err);
        let message = err.message || 'Ein Fehler ist aufgetreten.';
        if (err.status === 429 || message.toLowerCase().includes('quota')) {
            message = 'API-Quota ueberschritten. Bitte in einigen Minuten erneut versuchen.';
        }
        return NextResponse.json({ error: message }, { status: err.status || 500 });
    }
}
