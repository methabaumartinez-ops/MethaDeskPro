/**
 * abteilungPagePermissions.ts
 *
 * Defines which sidebar pages each Abteilung can access.
 * Superadmin and admin always see everything (bypass in Sidebar.tsx).
 *
 * Storage strategy (layered):
 *  1. DB-backed via GET /api/admin/permissions  (source of truth, multi-user)
 *  2. localStorage cache under 'methabau_abt_permissions' (offline / fast read)
 *  3. DEFAULT_ABT_PERMISSIONS hardcoded below   (first-boot / DB unreachable)
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
  | 'arbeitsplan'
  | 'werkhof-bestellungen'
  | 'lagerort'
  | 'qr-scan'
  | 'fuhrpark';

export const PAGE_LABELS: Record<PageKey, string> = {
  'dashboard-builder': 'Dashboard Builder',
  'my-dashboard': 'My Dashboard',
  'bauleitung': 'Bauleitung',
  'analyse': 'Analyse',
  'produktion': 'Produktion',
  'planung': 'Planer',
  'avor': 'AVOR',
  'einkauf': 'Einkauf',
  'schlosserei': 'Schlosserei',
  'blech': 'Blechabteilung',
  'kosten': 'Kosten',
  'tabellen': 'Tabellen',
  'ausfuehrung': 'Ausfuehrung',
  'arbeitsplan': 'Arbeitsplan',
  'werkhof-bestellungen': 'Werkhof \u2013 Bestellungen',
  'lagerort': 'Lagerort',
  'qr-scan': 'QR Scan',
  'fuhrpark': 'Fuhrpark',
};

export const ALL_PAGES: PageKey[] = Object.keys(PAGE_LABELS) as PageKey[];

/** Default permissions (hardcoded fallback — also initial seed for DB) */
export const DEFAULT_ABT_PERMISSIONS: Record<string, PageKey[]> = {
  planung: ['dashboard-builder', 'my-dashboard', 'bauleitung', 'analyse', 'produktion', 'planung', 'tabellen'],
  einkauf: ['dashboard-builder', 'my-dashboard', 'einkauf', 'tabellen'],
  avor: ['dashboard-builder', 'my-dashboard', 'avor', 'tabellen'],
  schlosserei: ['dashboard-builder', 'my-dashboard', 'produktion', 'schlosserei', 'tabellen'],
  blech: ['dashboard-builder', 'my-dashboard', 'produktion', 'blech', 'tabellen'],
  werkhof: ['dashboard-builder', 'my-dashboard', 'werkhof-bestellungen', 'lagerort', 'qr-scan'],
  montage: ['dashboard-builder', 'my-dashboard', 'ausfuehrung', 'tabellen'],
  bau: ['dashboard-builder', 'my-dashboard', 'bauleitung', 'ausfuehrung', 'tabellen'],
  zimmerei: ['dashboard-builder', 'my-dashboard', 'ausfuehrung', 'tabellen'],
  subunternehmer: ['dashboard-builder', 'my-dashboard', 'tabellen'],
  unternehmer: ['dashboard-builder', 'my-dashboard', 'tabellen'],
};

// ─── Storage keys ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'methabau_abt_permissions';

// ─── localStorage cache (fast client-side reads) ───────────────────────────

/** Load permissions from localStorage cache. Falls back to defaults if empty. */
export function loadAbtPermissions(): Record<string, PageKey[]> {
  if (typeof window === 'undefined') return DEFAULT_ABT_PERMISSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_ABT_PERMISSIONS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_ABT_PERMISSIONS;
}

/** Save permissions to localStorage (used as write-through cache). */
export function saveAbtPermissions(perms: Record<string, PageKey[]>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
}

// ─── DB-backed API (source of truth) ──────────────────────────────────────

/**
 * Fetch permissions from the server (GET /api/admin/permissions).
 * On success, updates the localStorage cache so subsequent reads are fast.
 * Falls back to localStorage/defaults if the request fails.
 *
 * Call this once after login or when entering the admin permissions UI.
 */
export async function fetchAndCacheAbtPermissions(): Promise<Record<string, PageKey[]>> {
  try {
    const res = await fetch('/api/admin/permissions');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const perms = data.pagePermissions as Record<string, PageKey[]>;
    // Write-through: update localStorage cache
    saveAbtPermissions(perms);
    return perms;
  } catch (err) {
    console.warn('[abteilungPagePermissions] Could not fetch from DB, using cache/defaults:', err);
    return loadAbtPermissions();
  }
}

/**
 * Save permissions to the server (PUT /api/admin/permissions).
 * Simultaneously updates the localStorage cache for instant UI reflection.
 */
export async function persistAbtPermissions(perms: Record<string, PageKey[]>): Promise<void> {
  // Optimistic cache update
  saveAbtPermissions(perms);
  const res = await fetch('/api/admin/permissions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pagePermissions: perms }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Fehler beim Speichern der Berechtigungen.');
  }
}

// ─── Permission check (reads from localStorage cache) ────────────────────

/** Check if a given abteilung has access to a page */
export function abtCanSee(abteilungId: string | undefined, page: PageKey): boolean {
  if (!abteilungId) return true; // No abteilung = show all (admin fallback)
  const perms = loadAbtPermissions();
  const allowed = perms[abteilungId] ?? DEFAULT_ABT_PERMISSIONS[abteilungId] ?? [];
  return allowed.includes(page);
}
