import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { deleteTeilsystemWithCascade } from '@/lib/services/server/deleteHelpers';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ChangelogService, detectChanges, buildSummary } from '@/lib/services/changelogService';
import { validateTransition } from '@/lib/workflow/workflowEngine';
import { getKSFromAbteilung } from '@/lib/config/ksConfig';


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth();
    if (error) return error;

    try {
        const { id } = await params;
        let item = await DatabaseService.get('teilsysteme', id);

        // Fallback: search by teilsystemNummer — but ONLY if input is not a UUID.
        // A UUID lookup that returns null means the record doesn't exist — do NOT
        // silently return an unrelated TS by matching its system number.
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const looksLikeUUID = UUID_REGEX.test(id);

        if (!item && !looksLikeUUID) {
            const list = await DatabaseService.list<any>('teilsysteme', {
                must: [
                    { key: 'teilsystemNummer', match: { value: id } }
                ]
            });
            if (list.length > 0) {
                item = list[0];
            }
        }

        if (!item) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error('API Error fetching teilsystem:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { user, error } = await requireAuth([
        'admin', 'projektleiter', 'bauprojektleiter', 'baufuhrer', 'planer',
        'werkhof', 'produktion', 'polier', 'mitarbeiter'
    ]);
    if (error) return error;

    try {
        const { id } = await params;
        const body = await req.json();

        const existing = await DatabaseService.get('teilsysteme', id) as Record<string, unknown> | null;

        // BUG-12 FIX: If the TS doesn't exist, return 404 explicitly.
        // Previously: `|| {}` caused upsert to proceed with partial data, silently
        // overwriting only the fields in `body` and losing all others.
        if (!existing) {
            return NextResponse.json(
                { error: 'Teilsystem nicht gefunden.' },
                { status: 404 }
            );
        }

        // Validate workflow transition when status is changing
        if (body.status && body.status !== existing.status) {
            const isValid = validateTransition(
                existing.status as string,
                body.status,
                user?.role
            );
            if (!isValid) {
                return NextResponse.json(
                    { error: `Status-Uebergang von '${existing.status}' nach '${body.status}' ist fuer diese Rolle nicht erlaubt.` },
                    { status: 422 }
                );
            }
        }

        const updatedData: any = { ...existing, ...body, id };

        // ── Section 8: TS Status Automation ──────────────────────────────
        // When AVOR assigns the TS to another department (abteilung changes
        // from AVOR/offen to a working department), auto-set status = 'in_arbeit'.
        const abteilungChanged = body.abteilung && body.abteilung !== existing.abteilung;
        const wasOffen = existing.status === 'offen';
        const isAvorAssigning = abteilungChanged && body.abteilung !== 'AVOR' && body.abteilung !== 'Planung';
        if (isAvorAssigning && wasOffen && !body.status) {
            updatedData.status = 'in_arbeit';
        }

        // Only auto-derive KS from Abteilung when the caller has NOT explicitly sent a KS value.
        // This preserves the user's manual selection from the dropdown.
        if (updatedData.abteilung !== undefined && (body.ks === undefined || body.ks === null)) {
            updatedData.ks = getKSFromAbteilung(updatedData.abteilung);
        }

        const result = await DatabaseService.upsert('teilsysteme', updatedData);

        // Record structured change history (silent on failure)
        if (user) {
            const changes = detectChanges(existing, body as Record<string, unknown>);
            if (changes.length > 0) {
                await ChangelogService.createEntry({
                    entityType: 'teilsystem',
                    entityId: id,
                    projektId: existing.projektId as string | undefined,
                    changedAt: new Date().toISOString(),
                    changedBy: `${user.vorname} ${user.nachname}`,
                    changedByEmail: user.email,
                    changedFields: changes,
                    summary: buildSummary(changes),
                });
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('API Error updating teilsystem:', error);
        const message = error?.message || 'Failed to update';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}



export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const { id } = await params;
        await deleteTeilsystemWithCascade(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error deleting teilsystem:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete teilsystem' }, { status: 500 });
    }
}
