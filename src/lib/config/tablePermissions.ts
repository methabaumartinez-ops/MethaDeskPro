/**
 * tablePermissions.ts
 *
 * Defines which table actions each Abteilung can perform in the Tabellen page.
 * Stored in localStorage under 'methabau_table_permissions'.
 *
 * Permissions per table:
 *  - read:   can see the table in the sidebar and view its data
 *  - export: can export the table as CSV
 *  - edit:   can edit rows (Mitarbeiter, Subunternehmer)
 *  - delete: can delete rows
 */

export type TableId =
  | 'projekte'
  | 'teilsysteme'
  | 'positionen'
  | 'unterpositionen'
  | 'lieferanten'
  | 'subunternehmer'
  | 'mitarbeiter'
  | 'fahrzeuge'
  | 'unternehmer';

export interface TablePerms {
    read:   boolean;
    export: boolean;
    edit:   boolean;
    delete: boolean;
}

export const TABLE_LABELS: Record<TableId, string> = {
    projekte:        'Projekte',
    teilsysteme:     'Teilsysteme',
    positionen:      'Positionen',
    unterpositionen: 'Unt. Positionen',
    lieferanten:     'Lieferanten',
    subunternehmer:  'Subunternehmer',
    mitarbeiter:     'Mitarbeiter',
    fahrzeuge:       'Fahrzeuge',
    unternehmer:     'Unternehmer',
};

export const ALL_TABLES: TableId[] = Object.keys(TABLE_LABELS) as TableId[];

export const ALL_PERMS: (keyof TablePerms)[] = ['read', 'export', 'edit', 'delete'];

export const PERM_LABELS: Record<keyof TablePerms, string> = {
    read:   'Lesen',
    export: 'Exportieren',
    edit:   'Bearbeiten',
    delete: 'Loeschen',
};

const FULL: TablePerms = { read: true, export: true, edit: true, delete: true };
const READ_EXPORT: TablePerms = { read: true, export: true, edit: false, delete: false };
const READ_ONLY: TablePerms = { read: true, export: false, edit: false, delete: false };
const NONE: TablePerms = { read: false, export: false, edit: false, delete: false };

/** Default table permissions per Abteilung */
export const DEFAULT_TABLE_PERMISSIONS: Record<string, Record<TableId, TablePerms>> = {
    planung:        { projekte: FULL, teilsysteme: READ_EXPORT, positionen: READ_EXPORT, unterpositionen: READ_EXPORT, lieferanten: READ_ONLY, subunternehmer: READ_ONLY, mitarbeiter: READ_ONLY, fahrzeuge: NONE, unternehmer: READ_ONLY },
    einkauf:        { projekte: READ_ONLY, teilsysteme: READ_ONLY, positionen: READ_ONLY, unterpositionen: READ_ONLY, lieferanten: FULL, subunternehmer: READ_EXPORT, mitarbeiter: NONE, fahrzeuge: NONE, unternehmer: READ_EXPORT },
    avor:           { projekte: READ_ONLY, teilsysteme: READ_EXPORT, positionen: READ_EXPORT, unterpositionen: READ_EXPORT, lieferanten: READ_ONLY, subunternehmer: NONE, mitarbeiter: NONE, fahrzeuge: NONE, unternehmer: NONE },
    schlosserei:    { projekte: READ_ONLY, teilsysteme: READ_ONLY, positionen: READ_ONLY, unterpositionen: READ_ONLY, lieferanten: NONE, subunternehmer: NONE, mitarbeiter: NONE, fahrzeuge: NONE, unternehmer: NONE },
    blech:          { projekte: READ_ONLY, teilsysteme: READ_ONLY, positionen: READ_ONLY, unterpositionen: READ_ONLY, lieferanten: NONE, subunternehmer: NONE, mitarbeiter: NONE, fahrzeuge: NONE, unternehmer: NONE },
    werkhof:        { projekte: READ_ONLY, teilsysteme: READ_ONLY, positionen: READ_ONLY, unterpositionen: NONE, lieferanten: READ_ONLY, subunternehmer: NONE, mitarbeiter: NONE, fahrzeuge: FULL, unternehmer: NONE },
    montage:        { projekte: READ_ONLY, teilsysteme: READ_ONLY, positionen: READ_ONLY, unterpositionen: READ_ONLY, lieferanten: NONE, subunternehmer: READ_ONLY, mitarbeiter: NONE, fahrzeuge: NONE, unternehmer: NONE },
    bau:            { projekte: READ_EXPORT, teilsysteme: READ_EXPORT, positionen: READ_EXPORT, unterpositionen: READ_EXPORT, lieferanten: READ_ONLY, subunternehmer: READ_ONLY, mitarbeiter: NONE, fahrzeuge: READ_ONLY, unternehmer: READ_EXPORT },
    zimmerei:       { projekte: READ_ONLY, teilsysteme: READ_ONLY, positionen: READ_ONLY, unterpositionen: READ_ONLY, lieferanten: NONE, subunternehmer: NONE, mitarbeiter: NONE, fahrzeuge: NONE, unternehmer: NONE },
    subunternehmer: { projekte: NONE, teilsysteme: NONE, positionen: NONE, unterpositionen: NONE, lieferanten: NONE, subunternehmer: NONE, mitarbeiter: NONE, fahrzeuge: NONE, unternehmer: NONE },
    unternehmer:    { projekte: NONE, teilsysteme: NONE, positionen: NONE, unterpositionen: NONE, lieferanten: NONE, subunternehmer: NONE, mitarbeiter: NONE, fahrzeuge: NONE, unternehmer: NONE },
};

const STORAGE_KEY = 'methabau_table_permissions';

export function loadTablePermissions(): Record<string, Record<TableId, TablePerms>> {
    if (typeof window === 'undefined') return DEFAULT_TABLE_PERMISSIONS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULT_TABLE_PERMISSIONS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_TABLE_PERMISSIONS;
}

export function saveTablePermissions(perms: Record<string, Record<TableId, TablePerms>>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
}

/** Check if abteilung has a specific permission on a table */
export function tableCanDo(
    abteilungId: string | undefined,
    tableId: TableId,
    perm: keyof TablePerms
): boolean {
    if (!abteilungId) return true; // no abteilung = full access (fallback)
    const perms = loadTablePermissions();
    const abtPerms = perms[abteilungId] ?? DEFAULT_TABLE_PERMISSIONS[abteilungId];
    if (!abtPerms) return true;
    return abtPerms[tableId]?.[perm] ?? false;
}
