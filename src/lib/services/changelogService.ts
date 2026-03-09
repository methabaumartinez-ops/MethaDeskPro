import { DatabaseService } from './db';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Types
// ============================================================

export interface FieldChange {
    field: string;
    label: string;
    before: unknown;
    after: unknown;
}

export interface ChangelogEntry {
    id: string;
    entityType: 'teilsystem' | 'position' | 'unterposition';
    entityId: string;
    projektId?: string;
    changedAt: string;
    changedBy: string;
    changedByEmail: string;
    changedFields: FieldChange[];
    summary: string;
}

// ============================================================
// Field label mapping — only tracked fields appear in history
// ============================================================

const FIELD_LABELS: Record<string, string> = {
    // Common
    status:            'Status',
    planStatus:        'Plan-Status',
    abteilung:         'Abteilung',
    name:              'Name',
    bemerkung:         'Bemerkung',
    // Dates
    lieferfrist:       'Liefertermin',
    montagetermin:     'Montagetermin',
    abgabePlaner:      'Planabgabe',
    // TS specific
    teilsystemNummer:  'TS-Nummer',
    lagerortId:        'Lagerort',
    wemaLink:          'WEMA Link',
    ks:                'Kostenstelle',
    gewicht:           'Gewicht',
    beschichtung:      'Beschichtung',
    unternehmer:       'Unternehmer',
    lieferantenIds:    'Lieferanten',
    // Pos specific
    posNummer:         'Pos-Nummer',
    teilsystemId:      'Teilsystem',
    // UntPos specific
    untPosNummer:      'UntPos-Nummer',
    positionId:        'Position',
    // Shared
    menge:             'Menge',
    einheit:           'Einheit',
    beschreibung:      'Beschreibung',
    material:          'Material',
    abmessung:         'Abmessung',
    oberflaeche:       'Oberfläche',
};

const TRACKED_FIELDS = Object.keys(FIELD_LABELS);

// ============================================================
// Helpers
// ============================================================

/**
 * Compares existing record with incoming patch body.
 * Returns only fields that actually changed (ignores metadata).
 */
export function detectChanges(
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>
): FieldChange[] {
    const changes: FieldChange[] = [];
    for (const field of TRACKED_FIELDS) {
        if (!(field in incoming)) continue; // not in the patch — skip
        const before = existing[field] ?? null;
        const after = incoming[field] ?? null;
        if (JSON.stringify(before) !== JSON.stringify(after)) {
            changes.push({ field, label: FIELD_LABELS[field] || field, before, after });
        }
    }
    return changes;
}

/** Builds a short human-readable summary from the changed fields. */
export function buildSummary(changes: FieldChange[]): string {
    return changes
        .map(c => `${c.label}: ${String(c.before ?? '—')} → ${String(c.after ?? '—')}`)
        .join(', ');
}

// ============================================================
// Service
// ============================================================

export const ChangelogService = {
    /**
     * Persists a changelog entry.
     * No-ops silently if changedFields is empty to avoid phantom entries.
     */
    async createEntry(entry: Omit<ChangelogEntry, 'id'>): Promise<void> {
        if (!entry.changedFields || entry.changedFields.length === 0) return;
        try {
            const full: ChangelogEntry = { id: uuidv4(), ...entry };
            await DatabaseService.upsert('changelog', full);
        } catch (err) {
            // Changelog failures must never block business logic
            console.error('[Changelog] Failed to persist entry:', err);
        }
    },

    /**
     * Fetches all changelog entries for a given entity, sorted newest first.
     */
    async getEntriesForEntity(entityId: string): Promise<ChangelogEntry[]> {
        try {
            const entries = await DatabaseService.list<ChangelogEntry>('changelog', {
                must: [{ key: 'entityId', match: { value: entityId } }],
            });
            return entries.sort(
                (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
            );
        } catch {
            return [];
        }
    },
};
