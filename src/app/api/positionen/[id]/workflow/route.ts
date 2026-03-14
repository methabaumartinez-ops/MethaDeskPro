import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ChangelogService, detectChanges, buildSummary } from '@/lib/services/changelogService';
import {
    isStatusAllowedForDept,
    getHandoverResult,
} from '@/lib/workflow/workflowEngine';
import { evaluateTsAggregation } from '@/lib/workflow/aggregationService';

/**
 * PATCH /api/positionen/[id]/workflow
 *
 * Department-guarded status update for Positionen.
 * Body: { status: string }
 *
 * Rules:
 *  1. User.abteilung must match pos.abteilung (unless admin/projektleiter).
 *  2. New status must be in the department's allowed list.
 *  3. If terminal + non-final dept -> handover to AVOR.
 *  4. Trigger TS aggregation check.
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await requireAuth([
        'admin', 'projektleiter', 'bauprojektleiter', 'baufuhrer',
        'planer', 'werkhof', 'polier', 'produktion', 'mitarbeiter', 'monteur'
    ]);
    if (error) return error;

    try {
        const { id } = await params;
        const body = await req.json();
        const newStatus = body.status;

        if (!newStatus) {
            return NextResponse.json(
                { error: 'Status ist erforderlich.' },
                { status: 400 }
            );
        }

        // Load existing POS
        const existing = await DatabaseService.get<any>('positionen', id);
        if (!existing) {
            return NextResponse.json(
                { error: 'Position nicht gefunden.' },
                { status: 404 }
            );
        }

        // Department guard: user must belong to the item's department
        const isPrivileged = ['admin', 'projektleiter', 'superadmin'].includes(user?.role || '');
        const userAbt = (user as any)?.abteilung || (user as any)?.department;
        if (!isPrivileged && userAbt !== existing.abteilung) {
            return NextResponse.json(
                { error: `Nur Mitarbeiter der Abteilung '${existing.abteilung}' duerfen den Status aendern.` },
                { status: 403 }
            );
        }

        // Validate status is allowed for this department
        if (!isStatusAllowedForDept(existing.abteilung, newStatus)) {
            return NextResponse.json(
                { error: `Status '${newStatus}' ist fuer Abteilung '${existing.abteilung}' nicht erlaubt.` },
                { status: 422 }
            );
        }

        // Build update payload
        const updatePayload: any = { ...existing, status: newStatus };

        // Apply handover if terminal + non-final
        const handover = getHandoverResult(existing.abteilung, newStatus);
        if (handover) {
            updatePayload.abteilung = handover.abteilung;
        }

        // Persist
        const result = await DatabaseService.upsert('positionen', updatePayload);

        // Changelog
        if (user) {
            const changes = detectChanges(existing, {
                status: newStatus,
                ...(handover ? { abteilung: handover.abteilung } : {}),
            });
            if (changes.length > 0) {
                await ChangelogService.createEntry({
                    entityType: 'position',
                    entityId: id,
                    projektId: existing.projektId,
                    changedAt: new Date().toISOString(),
                    changedBy: `${user.vorname} ${user.nachname}`,
                    changedByEmail: user.email,
                    changedFields: changes,
                    summary: buildSummary(changes),
                });
            }
        }

        // Trigger TS aggregation check
        if (existing.teilsystemId) {
            await evaluateTsAggregation(existing.teilsystemId).catch((e) =>
                console.error('[Workflow] Aggregation check failed:', e)
            );
        }

        return NextResponse.json(result);
    } catch (err: any) {
        console.error('[API] positionen workflow PATCH error:', err);
        return NextResponse.json(
            { error: err?.message || 'Workflow-Aktualisierung fehlgeschlagen.' },
            { status: 500 }
        );
    }
}
