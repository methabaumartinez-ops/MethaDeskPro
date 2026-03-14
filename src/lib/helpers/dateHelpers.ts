/**
 * dateHelpers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure date normalization helpers for DB persistence.
 *
 * PostgreSQL date/time columns expect ISO 8601 format YYYY-MM-DD.
 * The German UI displays DD.MM.YYYY, which causes "date/time field
 * value out of range" errors if sent directly to Supabase.
 *
 * These helpers guarantee that all date strings reaching the DB layer
 * are in YYYY-MM-DD format, regardless of the input format.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Normalizes a date value to ISO format (YYYY-MM-DD) for database persistence.
 *
 * Supported inputs:
 *   - "13.03.2026"      → "2026-03-13"  (German DD.MM.YYYY)
 *   - "Do 04.12.2025"   → "2025-12-04"  (German with day prefix)
 *   - "2026-03-13"      → "2026-03-13"  (already ISO)
 *   - "2026-03-13T10:30" → "2026-03-13" (ISO with time)
 *   - ""                → null
 *   - undefined         → null
 *   - null              → null
 */
export function normalizeDateForDb(value: string | undefined | null): string | null {
    if (!value || value.trim() === '') return null;

    const trimmed = value.trim();

    // Already ISO format: YYYY-MM-DD (possibly with time suffix)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    // German format: DD.MM.YYYY (optionally preceded by day abbreviation like "Do ")
    const cleaned = trimmed.replace(/^[A-Za-z]{2,3}\s+/, '');
    const germanMatch = cleaned.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (germanMatch) return `${germanMatch[3]}-${germanMatch[2]}-${germanMatch[1]}`;

    // Fallback: try native Date parsing
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

    // Cannot parse — return null to avoid DB error
    console.warn(`[normalizeDateForDb] Could not parse date value: "${value}"`);
    return null;
}

/** The date fields present on Teilsystem entities */
export const TEILSYSTEM_DATE_FIELDS = [
    'eroeffnetAm',
    'montagetermin',
    'lieferfrist',
    'abgabePlaner',
] as const;

/**
 * Normalizes all known date fields in a Teilsystem payload.
 * Safe to call on any partial payload — only touches keys that exist.
 */
export function normalizeTeilsystemDates(payload: Record<string, any>): Record<string, any> {
    const result = { ...payload };
    for (const field of TEILSYSTEM_DATE_FIELDS) {
        if (field in result) {
            result[field] = normalizeDateForDb(result[field]);
        }
    }
    return result;
}
