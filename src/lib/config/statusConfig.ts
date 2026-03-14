// src/lib/config/statusConfig.ts

import { ItemStatus, Abteilung, ABTEILUNGEN_CONFIG } from '@/types';
import { badgeVariants } from '@/components/ui/badge';

// ============================================================
// STATUS ARRAYS (Allowed values per entity type)
// ============================================================

export const TS_ALLOWED_STATUSES: ItemStatus[] = [
    'in_planung',
    'offen',
    'in_arbeit',
    'bereit',
    'fertig',
    'nachbearbeitung'
];

export const POS_ALLOWED_STATUSES: ItemStatus[] = [
    'offen',
    'in_arbeit',
    'bestellt',
    'geliefert',
    'verbaut',
    'nachbearbeitung',
    'fertig'
];

// Status propio para Unterpositionen (independiente de Pos y TS)
export const UNTPOS_ALLOWED_STATUSES: ItemStatus[] = [
    'offen',
    'in_arbeit',
    'bestellt',
    'geliefert',
    'verbaut',
    'nachbearbeitung',
    'fertig',
    'abgeschlossen',
];

// Alias de compatibilidad (legacy)
export const UPOS_ALLOWED_STATUSES = UNTPOS_ALLOWED_STATUSES;

// ============================================================
// STATUS UI CONFIGURATION (Colors and Labels)
// ============================================================

export type StatusVariant = 
    | 'default' | 'outline' | 'success' | 'warning' | 'error' 
    | 'info' | 'secondary' | 'gray' | 'orange' | 'teal' | 'violet'
    | 'fertig' | 'amber';

export interface StatusStyle {
    value: ItemStatus;
    label: string;
    variant: StatusVariant;
    // Granular tokens for icon / container use (scope-limited)
    iconColor: string;       // Tailwind text-* class for the icon
    bgColor: string;         // Tailwind bg-* class for the chip/container bg
    textColor: string;       // Tailwind text-* class for the chip/container text
    borderColor?: string;    // Optional tailwind border-* class
}

export const STATUS_UI_CONFIG: Record<ItemStatus, StatusStyle> = {
    // ── Offen → Green ────────────────────────────────────────
    offen: {
        value: 'offen',
        label: 'Offen',
        variant: 'success',
        iconColor: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-800 dark:text-green-400',
        borderColor: 'border-green-200 dark:border-green-800',
    },

    // ── Fertig → Light grey (solid, no opacity) ──────────────
    fertig: {
        value: 'fertig',
        label: 'Fertig',
        variant: 'fertig',
        iconColor: 'text-slate-500',
        bgColor: 'bg-slate-200 dark:bg-slate-700',
        textColor: 'text-slate-700 dark:text-slate-200',
        borderColor: 'border-slate-300 dark:border-slate-600',
    },

    // ── In Arbeit → Blue ──────────────────────────────────────
    in_arbeit: {
        value: 'in_arbeit',
        label: 'In Arbeit',
        variant: 'info',
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-800 dark:text-blue-400',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },

    // ── Nachbearbeitung → Red ─────────────────────────────────
    nachbearbeitung: {
        value: 'nachbearbeitung',
        label: 'Nachbearbeitung',
        variant: 'error',
        iconColor: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-800 dark:text-red-400',
        borderColor: 'border-red-200 dark:border-red-800',
    },

    // ── Geliefert → Yellow ───────────────────────────────────
    geliefert: {
        value: 'geliefert',
        label: 'Geliefert',
        variant: 'warning',
        iconColor: 'text-yellow-600',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        textColor: 'text-yellow-800 dark:text-yellow-400',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
    },

    // ── Bestellt → Amber (distinct from yellow) ───────────────
    bestellt: {
        value: 'bestellt',
        label: 'Bestellt',
        variant: 'amber',
        iconColor: 'text-amber-700',
        bgColor: 'bg-amber-200 dark:bg-amber-800/40',
        textColor: 'text-amber-900 dark:text-amber-300',
        borderColor: 'border-amber-300 dark:border-amber-700',
    },

    // ── In Planung → Teal ─────────────────────────────────────
    in_planung: {
        value: 'in_planung',
        label: 'In Planung',
        variant: 'teal',
        iconColor: 'text-teal-600',
        bgColor: 'bg-teal-100 dark:bg-teal-900/30',
        textColor: 'text-teal-800 dark:text-teal-400',
        borderColor: 'border-teal-200 dark:border-teal-800',
    },

    // ── Verbaut → Violet ──────────────────────────────────────
    verbaut: {
        value: 'verbaut',
        label: 'Verbaut',
        variant: 'violet',
        iconColor: 'text-violet-600',
        bgColor: 'bg-violet-100 dark:bg-violet-900/30',
        textColor: 'text-violet-800 dark:text-violet-400',
        borderColor: 'border-violet-200 dark:border-violet-800',
    },

    // ── Bereit → Cyan (TS aggregation readiness) ─────────────
    bereit: {
        value: 'bereit',
        label: 'Bereit',
        variant: 'teal',
        iconColor: 'text-cyan-600',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
        textColor: 'text-cyan-800 dark:text-cyan-400',
        borderColor: 'border-cyan-200 dark:border-cyan-800',
    },

    // ── Abgeschlossen → Dark slate ────────────────────────────
    abgeschlossen: {
        value: 'abgeschlossen',
        label: 'Abgeschlossen',
        variant: 'secondary',
        iconColor: 'text-slate-600',
        bgColor: 'bg-slate-100 dark:bg-slate-800',
        textColor: 'text-slate-800 dark:text-slate-100',
        borderColor: 'border-slate-200 dark:border-slate-700',
    },

    // ── Legacy aliases (map to canonical) ────────────────────
    geaendert: {
        value: 'nachbearbeitung',
        label: 'Nachbearbeitung',
        variant: 'error',
        iconColor: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-800 dark:text-red-400',
        borderColor: 'border-red-200 dark:border-red-800',
    },
    in_produktion: {
        value: 'in_arbeit',
        label: 'In Arbeit',
        variant: 'info',
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-800 dark:text-blue-400',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
};


// ============================================================
// CANONICAL STATUS RESOLVER
// Normalizes any variant (spaced, legacy, cased) to a known key
// ============================================================

/** Maps known string aliases to a canonical ItemStatus key.
 * Covers: ItemStatus, TaskStatus (Title-case), SubtaskStatus, PlanStatus, ProjektStatus variants.
 * All keys are lowercased — the resolver calls .toLowerCase().trim() before lookup.
 */
const STATUS_ALIAS_MAP: Record<string, ItemStatus> = {
    // ── ItemStatus canonical (snake_case) ──────────────────────────
    'offen':            'offen',
    'fertig':           'fertig',
    'in_arbeit':        'in_arbeit',
    'in arbeit':        'in_arbeit',
    'inarbeit':         'in_arbeit',
    'in_planung':       'in_planung',
    'in planung':       'in_planung',
    'in_bearbeitung':   'in_arbeit',
    'nachbearbeitung':  'nachbearbeitung',
    'nachbearbeiten':   'nachbearbeitung',
    'geaendert':        'nachbearbeitung',
    'geliefert':        'geliefert',
    'bestellt':         'bestellt',
    'verbaut':          'verbaut',
    'bereit':           'bereit',
    'abgeschlossen':    'abgeschlossen',
    'in_produktion':    'in_arbeit',
    'inproduktion':     'in_arbeit',
    'blockiert':        'nachbearbeitung',
    'pausiert':         'nachbearbeitung',
    'freigegeben':      'fertig',
    // ── TaskStatus Title-case (lowercased by resolver) ───────────────
    'erledigt':         'fertig',
    'abgerechnet':      'abgeschlossen',
};

/** Resolves any status string to its StatusStyle. Falls back to a neutral style. */
export function getStatusStyle(status: string | null | undefined): StatusStyle {
    if (!status) return _fallback(status ?? '');

    const key = status.toLowerCase().trim();
    const canonical = STATUS_ALIAS_MAP[key] ?? (key as ItemStatus);

    return STATUS_UI_CONFIG[canonical] ?? _fallback(status);
}

function _fallback(status: string): StatusStyle {
    return {
        value: status as ItemStatus,
        label: status || '—',
        variant: 'outline',
        iconColor: 'text-muted-foreground',
        bgColor: 'bg-muted/40',
        textColor: 'text-foreground',
        borderColor: 'border-border',
    };
}

/**
 * Returns Tailwind border-b-4 + ring classes for badge borders in banners.
 * Replaces all hardcoded "border-green-600/20 ring-4 ring-green-50/50" usages.
 * Scope: status badge decorative borders only.
 */
export function getStatusBorderRing(status: string | null | undefined): string {
    const style = getStatusStyle(status);
    const map: Record<string, string> = {
        success:   'border-green-500/25  ring-4 ring-green-50/60  dark:ring-green-900/20',
        info:      'border-blue-500/25   ring-4 ring-blue-50/60   dark:ring-blue-900/20',
        warning:   'border-yellow-500/25 ring-4 ring-yellow-50/60 dark:ring-yellow-900/20',
        amber:     'border-amber-500/25  ring-4 ring-amber-50/60  dark:ring-amber-900/20',
        error:     'border-red-500/25    ring-4 ring-red-50/60    dark:ring-red-900/20',
        teal:      'border-teal-500/25   ring-4 ring-teal-50/60   dark:ring-teal-900/20',
        violet:    'border-violet-500/25 ring-4 ring-violet-50/60 dark:ring-violet-900/20',
        fertig:    'border-slate-400/25  ring-4 ring-slate-100/60 dark:ring-slate-800/20',
        secondary: 'border-slate-400/25  ring-4 ring-slate-100/60 dark:ring-slate-800/20',
        default:   'border-primary/20    ring-4 ring-primary/5',
        outline:   'border-border        ring-4 ring-muted/30',
    };
    return map[style.variant] ?? map.outline;
}

/**
 * Returns a Tailwind text-color class for rendering date values
 * that are tinted by status. Uses the iconColor from the centralized map.
 * Scope: date value text in Termine/Fristen cards only.
 */
export function getStatusDateColor(status: string | null | undefined): string {
    const style = getStatusStyle(status);
    return style.iconColor;
}

/**
 * Returns minimal bg+text+border classes for tiny status pills
 * (e.g. the small date-label pills in Termine cards).
 * Scope: date badge pills in Termine/Fristen cards only.
 */
export function getStatusPillClasses(status: string | null | undefined): string {
    const style = getStatusStyle(status);
    return `${style.bgColor} ${style.textColor} ${style.borderColor ?? ''}`.trim();
}

// ============================================================
// DEFAULTS & LOGIC
// ============================================================

/** Roles that trigger In Planung + Planung dept on TS creation */
export const PLANNER_ROLES = ['planer', 'baufuhrer', 'bauprojektleiter'] as const;

export const STATUS_DEFAULTS = {
    TEILSYSTEM: {
        /** Returns the correct default status based on the creator's role */
        getStatus: (creatorRole?: string): ItemStatus =>
            PLANNER_ROLES.includes(creatorRole as any) ? 'in_planung' : 'offen',
        /** Returns the correct default abteilung based on the creator's role */
        getAbteilung: (creatorRole?: string, creatorDepartment?: string): string =>
            PLANNER_ROLES.includes(creatorRole as any) ? 'Planung' : (creatorDepartment || 'AVOR'),
        // Legacy static defaults kept for backward compat
        status: 'offen' as ItemStatus,
        abteilung: (creatorDepartment?: string): Abteilung | string => creatorDepartment || 'Bau'
    },
    POSITION: {
        status: 'offen' as ItemStatus,
        abteilung: 'Sin Abteilung' as Abteilung | string
    },
    UNTERPOSITION: {
        status: 'offen' as ItemStatus,
        abteilung: 'Sin Abteilung' as Abteilung | string
    }
};


// ============================================================
// LEGACY HELPERS (kept for compat, internally use getStatusStyle)
// ============================================================

/**
 * Returns Tailwind classes for <select> elements colored by status.
 * Produces: colored bg + matching visible border + readable text.
 *
 * IMPORTANT: Must NOT use badgeVariants — those have border-transparent
 * which hides the <select> border. This helper is select-specific.
 *
 * Scope: status <select> / status field inputs only.
 */
export function getStatusColorClasses(status: ItemStatus | string | undefined | null): string {
    const style = getStatusStyle(status ?? undefined);
    // Map each variant to bg + visible border + text suitable for a <select>
    const selectMap: Record<string, string> = {
        success:   'bg-green-100   border-green-400   text-green-900   dark:bg-green-900/30  dark:border-green-600  dark:text-green-300',
        info:      'bg-blue-100    border-blue-400     text-blue-900    dark:bg-blue-900/30   dark:border-blue-600   dark:text-blue-300',
        warning:   'bg-yellow-100  border-yellow-400   text-yellow-900  dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-300',
        amber:     'bg-amber-200   border-amber-500    text-amber-900   dark:bg-amber-800/40  dark:border-amber-600  dark:text-amber-200',
        error:     'bg-red-100     border-red-400      text-red-900     dark:bg-red-900/30    dark:border-red-600    dark:text-red-300',
        teal:      'bg-teal-100    border-teal-400     text-teal-900    dark:bg-teal-900/30   dark:border-teal-600   dark:text-teal-300',
        violet:    'bg-violet-100  border-violet-400   text-violet-900  dark:bg-violet-900/30 dark:border-violet-600 dark:text-violet-300',
        fertig:    'bg-slate-200   border-slate-400    text-slate-800   dark:bg-slate-700     dark:border-slate-500  dark:text-slate-200',
        secondary: 'bg-slate-100   border-slate-400    text-slate-800   dark:bg-slate-800     dark:border-slate-500  dark:text-slate-200',
        default:   'bg-primary/10  border-primary/50   text-primary',
        outline:   'bg-background  border-input         text-foreground',
    };
    return selectMap[style.variant] ?? selectMap.outline;
}

/**
 * Returns Tailwind classes for Abteilung <select> elements.
 * Select-safe: bg + visible colored border + readable text.
 * Must NOT use badgeVariants (those have border-transparent).
 */
export function getAbteilungColorClasses(abteilung: Abteilung | string | undefined | null): string {
    if (!abteilung || abteilung === 'Sin Abteilung') {
        return 'bg-slate-50 border-slate-300 text-slate-500 font-normal';
    }

    // Map ABTEILUNGEN_CONFIG color tokens → select-safe classes
    const colorToSelectClass: Record<string, string> = {
        blue:    'bg-blue-100    border-blue-400    text-blue-900    dark:bg-blue-900/30   dark:border-blue-600   dark:text-blue-200',
        sky:     'bg-sky-100     border-sky-400     text-sky-900     dark:bg-sky-900/30    dark:border-sky-600    dark:text-sky-200',
        teal:    'bg-teal-100    border-teal-400    text-teal-900    dark:bg-teal-900/30   dark:border-teal-600   dark:text-teal-200',
        warning: 'bg-yellow-100  border-yellow-400  text-yellow-900  dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-200',
        info:    'bg-blue-100    border-blue-400     text-blue-900    dark:bg-blue-900/30   dark:border-blue-600   dark:text-blue-200',
        gray:    'bg-gray-100    border-gray-400    text-gray-900    dark:bg-gray-800      dark:border-gray-500   dark:text-gray-200',
        orange:  'bg-orange-100  border-orange-400  text-orange-900  dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-200',
        violet:  'bg-violet-100  border-violet-400  text-violet-900  dark:bg-violet-900/30 dark:border-violet-600 dark:text-violet-200',
        success: 'bg-green-100   border-green-400   text-green-900   dark:bg-green-900/30  dark:border-green-600  dark:text-green-200',
        error:   'bg-red-100     border-red-400     text-red-900     dark:bg-red-900/30    dark:border-red-600    dark:text-red-200',
        default: 'bg-primary/10  border-primary/50  text-primary',
        outline: 'bg-background  border-input        text-foreground',
    };

    const departmentStr = abteilung.toLowerCase();
    const configMatch = ABTEILUNGEN_CONFIG.find(
        (c) => c.name.toLowerCase() === departmentStr || c.id.toLowerCase() === departmentStr
    );

    if (configMatch) {
        return colorToSelectClass[configMatch.color] ?? colorToSelectClass.outline;
    }

    return colorToSelectClass.outline;
}
