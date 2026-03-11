/**
 * src/lib/services/aiService.ts
 *
 * P1 View-Based Grounding — 2026-03-09
 *
 * Context is now assembled from curated SQL views (v_ai_*) instead
 * of raw tables. Views enforce field whitelisting at the DB layer.
 * All P0 protections are preserved:
 * - Strict project scoping (every source filtered by projektId)
 * - RBAC cost gate (kosten only for authorized roles)
 * - No global-table leakage (fahrzeuge, lieferanten excluded)
 * - No sensitive fields (email, telefon, passwordHash excluded in views)
 * - Deterministic refusal if context empty (enforced in chat/route.ts)
 */

import { DatabaseService } from '@/lib/services/db';
import type { UserRole } from '@/types';

// ============================================================
// RBAC — Rollen die Kostendaten sehen dürfen
// ============================================================

const COST_AUTHORIZED_ROLES: UserRole[] = [
    'superadmin',
    'admin',
    'projektleiter',
    'bauprojektleiter',
];

export function userCanSeeCosts(role: UserRole): boolean {
    return COST_AUTHORIZED_ROLES.includes(role);
}

// ============================================================
// View row types (minimal, matches what views expose)
// ============================================================

interface TeilsystemViewRow {
    id: string;
    projektId: string;
    name: string;
    teilsystemNummer?: string;
    status?: string;
    planStatus?: string;
    abteilung?: string;
    montagetermin?: string;
    lieferfrist?: string;
    abgabePlaner?: string;
    verantwortlich?: string;
    unternehmer?: string;
    bemerkung?: string;
    positionen_count?: number;
    material_kosten?: number; // only rendered when includeCosts
}

interface TaskViewRow {
    id: string;
    projektId: string;
    teilsystemId?: string;
    teamId?: string;
    title: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    description?: string;
    subtasks_total?: number;
    subtasks_done?: number;
}

interface PersonalViewRow {
    quelle: 'mitarbeiter' | 'worker';
    id: string;
    name: string;
    rolle?: string;
    abteilung?: string;
    aktiv?: boolean;
    isGlobal?: boolean;
    projektId?: string;
}

interface KostenRow {
    id: string;
    bezeichnung?: string;
    kategorie?: string;
    betrag?: number;
    datum?: string;
}

// ============================================================
// ProjectContextOptions
// ============================================================

export interface ProjectContextOptions {
    projektId: string;
    userRole: UserRole;
}

// ============================================================
// AIService
// ============================================================

export class AIService {

    /**
     * Assembles strictly project-scoped, view-based, RBAC-gated context.
     *
     * Sources (view-first):
     *   - v_ai_projekt_kontext      → project header
     *   - v_ai_teilsystem_detail    → Bauzeitenplan + position count
     *   - v_ai_task_status          → ausfuehrung_tasks with subtask progress
     *   - v_ai_personal             → mitarbeiter + workers (no email/phone)
     *   - raw positionen table      → field-whitelisted (no v_ai_positionen view yet)
     *   - raw material table        → field-whitelisted (no v_ai_material view yet)
     *   - raw kosten table          → only for authorized roles
     *   - raw teams table           → field-whitelisted
     */
    static async getProjectContext(opts: ProjectContextOptions) {
        const { projektId, userRole } = opts;
        const includeCosts = userCanSeeCosts(userRole);

        const projektIdFilter = {
            must: [{ key: 'projektId', match: { value: projektId } }],
        };

        try {
            const [
                projektHeader,
                teilsysteme,
                tasks,
                personal,
                positionenRaw,
                materialRaw,
                teamsRaw,
            ] = await Promise.all([
                // VIEW: Aggregated project header (project_id is PK, not id)
                DatabaseService.list<Record<string, unknown>>(
                    'v_ai_projekt_kontext',
                    { must: [{ key: 'projekt_id', match: { value: projektId } }] }
                ),
                // VIEW: Teilsystem detail (Bauzeitenplan, aggregates)
                DatabaseService.list<TeilsystemViewRow>(
                    'v_ai_teilsystem_detail', projektIdFilter
                ),
                // VIEW: Task status with subtask progress
                DatabaseService.list<TaskViewRow>(
                    'v_ai_task_status', projektIdFilter
                ),
                // VIEW: Unified personal (no email/phone, active only)
                // Fetch ALL active and filter in memory to support isGlobal=true (BUG-11 Fix)
                DatabaseService.list<PersonalViewRow>('v_ai_personal'),
                // RAW: positionen (field-whitelisted at format layer)
                DatabaseService.list<Record<string, unknown>>(
                    'positionen', projektIdFilter
                ),
                // RAW: material (field-whitelisted at format layer)
                DatabaseService.list<Record<string, unknown>>(
                    'material', projektIdFilter
                ),
                // RAW: teams (no sensitive fields in table)
                DatabaseService.list<Record<string, unknown>>(
                    'teams', projektIdFilter
                ),
            ]);

            // Cost data — fetched only when user role is authorized
            let kostenData: KostenRow[] = [];
            if (includeCosts) {
                kostenData = await DatabaseService.list<KostenRow>(
                    'kosten', projektIdFilter
                );
            }

            // v_ai_projekt_kontext returns an array — take first matching row.
            // Fallback to raw projekte table if view returns nothing.
            let projekt: Record<string, unknown> | null = (projektHeader?.[0]) ?? null;
            if (!projekt) {
                projekt = await DatabaseService.get<Record<string, unknown>>(
                    'projekte', projektId
                );
            }

            return {
                projekt,
                teilsysteme: teilsysteme ?? [],
                tasks: tasks ?? [],
                personal: (personal ?? []).filter(p => p.isGlobal === true || p.projektId === projektId),
                positionen: (positionenRaw ?? []).map(pos => ({
                    id: pos.id,
                    teilsystemId: pos.teilsystemId,
                    name: pos.name,
                    nummer: pos.posNummer ?? pos.nummer,
                    status: pos.status,
                    menge: pos.menge,
                    einheit: pos.einheit,
                    beschreibung: pos.beschreibung,
                    // preis: excluded here; material_kosten aggregate is in v_ai_teilsystem_detail
                })),
                material: (materialRaw ?? []).map(mat => ({
                    bezeichnung: mat.bezeichnung ?? mat.name,
                    menge: mat.menge,
                    einheit: mat.einheit,
                    liefertermin: mat.liefertermin,
                    status: mat.status,
                    ...(includeCosts ? { preis: mat.preis } : {}),
                })),
                teams: (teamsRaw ?? []).map(t => ({
                    id: t.id,
                    name: t.name,
                    beschreibung: t.beschreibung,
                })),
                kosten: kostenData,
                includeCosts,
            };
        } catch (error) {
            console.error('[AIService] Error fetching project context:', error);
            return null;
        }
    }

    /**
     * Formats the view-based project context to a structured text block for GPT-4o.
     * Cost values (preis, material_kosten, betrag) are only rendered when includeCosts.
     */
    static formatContextToText(
        context: NonNullable<Awaited<ReturnType<typeof AIService.getProjectContext>>>
    ): string {
        let text = `=== SYSTEMKONFIGURATION ===\n`;
        text += `Datenquelle: Supabase (MethaDeskPro Produktionsdatenbank)\n`;
        text += `Aktuelles Datum: ${new Date().toLocaleDateString('de-CH')}\n\n`;

        // ── PROJEKT HEADER ──────────────────────────────────
        text += `=== AKTUELLE PROJEKTINFORMATIONEN ===\n`;
        if (context.projekt) {
            const p = context.projekt;
            text += `Name: ${p.projektname ?? p.name ?? p.id}\n`;
            text += `Projektnummer: ${p.projektnummer ?? 'N/A'}\n`;
            const ort = String(p.ort ?? '').trim();
            if (ort) text += `Ort: ${ort}\n`;
            text += `Bauleiter: ${p.bauleiter ?? 'Nicht zugewiesen'}\n`;
            text += `Projektleiter: ${p.projektleiter ?? 'Nicht zugewiesen'}\n`;
            text += `Status: ${p.status ?? p.projekt_status ?? 'N/A'}\n`;
            if (p.description) text += `Beschreibung: ${p.description}\n`;
            // Aggregate from view
            if (p.ts_anzahl !== undefined) text += `Teilsysteme gesamt: ${p.ts_anzahl} (${p.ts_fertig ?? 0} fertig)\n`;
            if (context.includeCosts && p.gesamtkosten_positionen) {
                text += `Gesamtkosten Positionen: ${Number(p.gesamtkosten_positionen).toFixed(2)} CHF\n`;
            }
        } else {
            text += `Projekt nicht gefunden.\n`;
        }

        // ── TEILSYSTEME & BAUZEITENPLAN ──────────────────────
        if (context.teilsysteme.length > 0) {
            text += `\n=== TEILSYSTEME & BAUZEITENPLAN ===\n`;
            context.teilsysteme.forEach(ts => {
                text += `- ${ts.name} (${ts.teilsystemNummer ?? ts.id}):\n`;
                text += `  Status: ${ts.status ?? 'offen'}\n`;
                if (ts.montagetermin) text += `  MONTAGETERMIN: ${ts.montagetermin}\n`;
                if (ts.lieferfrist) text += `  Liefertermin: ${ts.lieferfrist}\n`;
                if (ts.abgabePlaner) text += `  Abgabe Planer: ${ts.abgabePlaner}\n`;
                if (ts.verantwortlich) text += `  Verantwortlich: ${ts.verantwortlich}\n`;
                if (ts.bemerkung) text += `  Bemerkung: ${ts.bemerkung}\n`;
                if (ts.positionen_count !== undefined) text += `  Positionen: ${ts.positionen_count}\n`;
                if (context.includeCosts && ts.material_kosten) {
                    text += `  Materialkosten: ${Number(ts.material_kosten).toFixed(2)} CHF\n`;
                }
            });
        }

        // ── AUFGABEN ─────────────────────────────────────────
        if (context.tasks.length > 0) {
            text += `\n=== AUFGABEN & AUSFUEHRUNG ===\n`;
            context.tasks.forEach(t => {
                text += `- ${t.title}: Status ${t.status ?? 'offen'}, Prioritaet ${t.priority ?? 'normal'}`;
                if (t.dueDate) text += `, Faellig: ${t.dueDate}`;
                if (t.subtasks_total) text += ` [${t.subtasks_done ?? 0}/${t.subtasks_total} Unteraufgaben]`;
                text += `\n`;
            });
        }

        // ── PERSONAL (aus View — kein email/telefon) ────────
        if (context.personal.length > 0) {
            text += `\n=== PERSONAL & VERFUEGBARKEIT ===\n`;
            context.personal.forEach(m => {
                text += `- ${m.name}: Rolle: ${m.rolle ?? 'Mitarbeiter'}, Abteilung: ${m.abteilung ?? 'N/A'}`;
                if (m.isGlobal) text += ` [Global]`;
                text += `\n`;
            });
        }

        // ── TEAMS ────────────────────────────────────────────
        if (context.teams.length > 0) {
            text += `\n=== TEAMS ===\n`;
            context.teams.forEach(t => {
                const team = t as { name?: string; beschreibung?: string };
                text += `- ${team.name ?? ''}${team.beschreibung ? ': ' + team.beschreibung : ''}\n`;
            });
        }

        // ── MATERIAL ─────────────────────────────────────────
        if (context.material.length > 0) {
            text += `\n=== MATERIAL ===\n`;
            context.material.slice(0, 40).forEach(mat => {
                const m = mat as Record<string, unknown>;
                text += `- ${m.bezeichnung}: ${m.menge ?? 0} ${m.einheit ?? 'Stk'}`;
                if (context.includeCosts && m.preis) text += `, Preis: ${m.preis} CHF`;
                if (m.liefertermin) text += `, LIEFERTERMIN: ${m.liefertermin}`;
                if (m.status) text += `, Status: ${m.status}`;
                text += `\n`;
            });
        }

        // ── KOSTEN (RBAC-gated) ──────────────────────────────
        if (context.includeCosts && context.kosten.length > 0) {
            text += `\n=== FINANZDATEN & KOSTEN ===\n`;
            let total = 0;
            context.kosten.forEach(k => {
                const betrag = Number(k.betrag ?? 0);
                total += betrag;
                text += `- ${k.bezeichnung ?? k.kategorie ?? 'Kosten'}: ${betrag.toFixed(2)} CHF`;
                if (k.datum) text += ` (${k.datum})`;
                text += `\n`;
            });
            text += `Summe Kosten: ${total.toFixed(2)} CHF\n`;
        }

        return text;
    }
}
