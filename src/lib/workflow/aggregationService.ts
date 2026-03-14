/**
 * aggregationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-only service that evaluates whether a parent Teilsystem (TS)
 * is ready to be marked as `bereit`.
 *
 * Rule: evaluate the LOWEST operational level.
 *   - If a POS has UNTPOS -> evaluate UNTPOS only.
 *   - If a POS has no UNTPOS -> evaluate POS itself.
 *
 * Guard conditions:
 *   - TS must have already left planning (status != 'in_planung')
 *   - At least one item must have been AVOR-derivated
 *     (i.e. some child has abteilung != Planung)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import 'server-only';
import { DatabaseService } from '@/lib/services/db';
import { isTerminalStatus } from '@/lib/workflow/workflowEngine';
import type { ItemStatus } from '@/types';

interface EvaluatableItem {
    id: string;
    status: string;
    abteilung?: string;
}

/**
 * Evaluates whether a Teilsystem should transition to `bereit`.
 * If all relevant operational items have reached their terminal status,
 * updates TS.status = 'bereit' and TS.abteilung = 'AVOR'.
 *
 * @returns true if TS was updated to bereit, false otherwise.
 */
export async function evaluateTsAggregation(teilsystemId: string): Promise<boolean> {
    if (!teilsystemId) return false;

    // 1. Load the TS
    const ts = await DatabaseService.get<any>('teilsysteme', teilsystemId);
    if (!ts) return false;

    // Guard: TS must have left planning phase
    if (ts.status === 'in_planung') return false;

    // Guard: don't re-evaluate if already bereit or beyond
    if (ts.status === 'bereit' || ts.status === 'abgeschlossen') return false;

    // 2. Load all POS for this TS
    const positionen = await DatabaseService.list<any>('positionen', {
        must: [{ key: 'teilsystemId', match: { value: teilsystemId } }]
    });

    // Guard: no positions -> nothing to aggregate
    if (positionen.length === 0) return false;

    // 3. Collect the items to evaluate (lowest operational level)
    const itemsToEvaluate: EvaluatableItem[] = [];
    let hasAvorDerivation = false;

    for (const pos of positionen) {
        const unterpositionen = await DatabaseService.list<any>('unterpositionen', {
            must: [{ key: 'positionId', match: { value: pos.id } }]
        });

        if (unterpositionen.length > 0) {
            // POS has UNTPOS -> evaluate UNTPOS only
            for (const upos of unterpositionen) {
                itemsToEvaluate.push({
                    id: upos.id,
                    status: upos.status || 'offen',
                    abteilung: upos.abteilung,
                });
                if (upos.abteilung && upos.abteilung !== 'Planung' && upos.abteilung !== 'Sin Abteilung') {
                    hasAvorDerivation = true;
                }
            }
        } else {
            // POS has no UNTPOS -> evaluate POS itself
            itemsToEvaluate.push({
                id: pos.id,
                status: pos.status || 'offen',
                abteilung: pos.abteilung,
            });
            if (pos.abteilung && pos.abteilung !== 'Planung' && pos.abteilung !== 'Sin Abteilung') {
                hasAvorDerivation = true;
            }
        }
    }

    // Guard: at least one AVOR derivation must have happened
    if (!hasAvorDerivation) return false;

    // Guard: must have items to evaluate
    if (itemsToEvaluate.length === 0) return false;

    // 4. Check if ALL items have reached terminal status
    const allTerminal = itemsToEvaluate.every(item =>
        isTerminalStatus(item.abteilung, item.status as ItemStatus)
    );

    if (!allTerminal) return false;

    // 5. Update TS to bereit
    const updatedTs = { ...ts, status: 'bereit', abteilung: 'AVOR' };
    await DatabaseService.upsert('teilsysteme', updatedTs);

    console.log(`[Aggregation] TS ${teilsystemId} -> bereit (all ${itemsToEvaluate.length} items terminal)`);
    return true;
}
