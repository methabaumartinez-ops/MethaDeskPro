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
 * PATCH /api/unterpositionen/[id]/workflow
 *
 * Department-guarded status update for Unterpositionen.
 * Body: { status: string }
 *
 * Identical rules as positionen/workflow but resolves TS via
 * parent POS -> teilsystemId.
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

        // Load existing UNTPOS
        const existing = await DatabaseService.get<any>('unterpositionen', id);
        if (!existing) {
            return NextResponse.json(
                { error: 'Unterposition nicht gefunden.' },
                { status: 404 }
            );
        }

        // Department guard
        const isPrivileged = ['admin', 'projektleiter', 'superadmin'].includes(user?.role || '');
        const userAbt = (user as any)?.abteilung || (user as any)?.department;
        if (!isPrivileged && userAbt !== existing.abteilung) {
            return NextResponse.json(
                { error: `Nur Mitarbeiter der Abteilung '${existing.abteilung}' duerfen den Status aendern.` },
                { status: 403 }
            );
        }

        // Validate allowed status
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
        const result = await DatabaseService.upsert('unterpositionen', updatePayload);

        // Changelog
        if (user) {
            const changes = detectChanges(existing, {
                status: newStatus,
                ...(handover ? { abteilung: handover.abteilung } : {}),
            });
            if (changes.length > 0) {
                await ChangelogService.createEntry({
                    entityType: 'unterposition',
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

        // Resolve teilsystemId: direct or via parent POS
        let teilsystemId = existing.teilsystemId;
        if (!teilsystemId && existing.positionId) {
            const parentPos = await DatabaseService.get<any>('positionen', existing.positionId);
            teilsystemId = parentPos?.teilsystemId;
        }

        // Trigger TS aggregation check
        if (teilsystemId) {
            await evaluateTsAggregation(teilsystemId).catch((e) =>
                console.error('[Workflow] Aggregation check failed:', e)
            );
        }

        return NextResponse.json(result);
    } catch (err: any) {
        console.error('[API] unterpositionen workflow PATCH error:', err);
        return NextResponse.json(
            { error: err?.message || 'Workflow-Aktualisierung fehlgeschlagen.' },
            { status: 500 }
        );
    }
}
