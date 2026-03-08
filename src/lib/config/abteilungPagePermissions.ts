/**
 * abteilungPagePermissions.ts
 *
 * Defines which sidebar pages each Abteilung can access.
 * Superadmin and admin always see everything (bypass in Sidebar.tsx).
 *
 * Pages map to MenuItem keys in the Sidebar.
 * To manage via UI, this config is stored in localStorage under
 * 'methabau_abt_permissions' as a JSON object:
 *   Record<AbteilungId, string[]>  (array of page keys)
 */

import type { AbteilungId } from '@/types';

export type PageKey =
  | 'dashboard-builder'
  | 'my-dashboard'
  | 'bauleitung'
  | 'analyse'
  | 'produktion'
  | 'planung'
  | 'avor'
  | 'einkauf'
  | 'schlosserei'
  | 'blech'
  | 'kosten'
  | 'tabellen'
  | 'ausfuehrung'
  | 'werkhof-bestellungen'
  | 'lagerort'
  | 'qr-scan'
  | 'fuhrpark';

export const PAGE_LABELS: Record<PageKey, string> = {
  'dashboard-builder':   'Dashboard Builder',
  'my-dashboard':        'My Dashboard',
  'bauleitung':          'Bauleitung',
  'analyse':             'Analyse',
  'produktion':          'Produktion',
  'planung':             'Planer',
  'avor':                'AVOR',
  'einkauf':             'Einkauf',
  'schlosserei':         'Schlosserei',
  'blech':               'Blechabteilung',
  'kosten':              'Kosten',
  'tabellen':            'Tabellen',
  'ausfuehrung':         'Ausführung',
  'werkhof-bestellungen':'Werkhof – Bestellungen',
  'lagerort':            'Lagerort',
  'qr-scan':             'QR Scan',
  'fuhrpark':            'Fuhrpark',
};

export const ALL_PAGES: PageKey[] = Object.keys(PAGE_LABELS) as PageKey[];

/** Default permissions per Abteilung (first setup / fallback) */
export const DEFAULT_ABT_PERMISSIONS: Record<string, PageKey[]> = {
  planung:        ['dashboard-builder', 'my-dashboard', 'bauleitung', 'analyse', 'produktion', 'planung', 'tabellen'],
  einkauf:        ['dashboard-builder', 'my-dashboard', 'einkauf', 'tabellen'],
  avor:           ['dashboard-builder', 'my-dashboard', 'avor', 'tabellen'],
  schlosserei:    ['dashboard-builder', 'my-dashboard', 'produktion', 'schlosserei', 'tabellen'],
  blech:          ['dashboard-builder', 'my-dashboard', 'produktion', 'blech', 'tabellen'],
  werkhof:        ['dashboard-builder', 'my-dashboard', 'werkhof-bestellungen', 'lagerort', 'qr-scan'],
  montage:        ['dashboard-builder', 'my-dashboard', 'ausfuehrung', 'tabellen'],
  bau:            ['dashboard-builder', 'my-dashboard', 'bauleitung', 'ausfuehrung', 'tabellen'],
  zimmerei:       ['dashboard-builder', 'my-dashboard', 'ausfuehrung', 'tabellen'],
  subunternehmer: ['dashboard-builder', 'my-dashboard', 'tabellen'],
  unternehmer:    ['dashboard-builder', 'my-dashboard', 'tabellen'],
};

const STORAGE_KEY = 'methabau_abt_permissions';

/** Load permissions from localStorage (client only) */
export function loadAbtPermissions(): Record<string, PageKey[]> {
  if (typeof window === 'undefined') return DEFAULT_ABT_PERMISSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_ABT_PERMISSIONS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_ABT_PERMISSIONS;
}

/** Save permissions to localStorage */
export function saveAbtPermissions(perms: Record<string, PageKey[]>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
}

/** Check if a given abteilung has access to a page */
export function abtCanSee(abteilungId: string | undefined, page: PageKey): boolean {
  if (!abteilungId) return true; // No abteilung = show all (fallback)
  const perms = loadAbtPermissions();
  const allowed = perms[abteilungId] ?? DEFAULT_ABT_PERMISSIONS[abteilungId] ?? [];
  return allowed.includes(page);
}
