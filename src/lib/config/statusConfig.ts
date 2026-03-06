// src/lib/config/statusConfig.ts

import { ItemStatus, Abteilung, ABTEILUNGEN_CONFIG } from '@/types';
import { badgeVariants } from '@/components/ui/badge';

// ============================================================
// STATUS ARRAYS (Allowed values per entity type)
// ============================================================

export const TS_ALLOWED_STATUSES: ItemStatus[] = [
    'offen',
    'in_arbeit',
    'fertig',
    'nachbearbeitung'
];

export const POS_ALLOWED_STATUSES: ItemStatus[] = [
    'offen',
    'in_arbeit',
    'bestellt',
    'nachbearbeitung',
    'fertig'
];

// Reusing same logic for Unterpositionen based on rules
export const UPOS_ALLOWED_STATUSES = POS_ALLOWED_STATUSES;

// ============================================================
// STATUS UI CONFIGURATION (Colors and Labels)
// ============================================================

export interface StatusStyle {
    value: ItemStatus;
    label: string;
    variant: 'default' | 'outline' | 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'gray' | 'orange' | 'teal' | 'violet';
}

export const STATUS_UI_CONFIG: Record<ItemStatus, StatusStyle> = {
    offen: { value: 'offen', label: 'Offen', variant: 'success' }, // Green
    in_arbeit: { value: 'in_arbeit', label: 'In Arbeit', variant: 'info' }, // Blue
    fertig: { value: 'fertig', label: 'Fertig', variant: 'outline' }, // Neutral / No Color
    nachbearbeitung: { value: 'nachbearbeitung', label: 'Nachbearbeitung', variant: 'error' }, // Red
    geliefert: { value: 'geliefert', label: 'Geliefert', variant: 'warning' }, // Yellow
    bestellt: { value: 'bestellt', label: 'Bestellt', variant: 'warning' }, // Yellow
    
    // Legacy mapping (to avoid breaking old items not migrated yet)
    geaendert: { value: 'nachbearbeitung', label: 'Nachbearbeitung', variant: 'error' },
    in_produktion: { value: 'in_arbeit', label: 'In Arbeit', variant: 'info' },
    verbaut: { value: 'verbaut', label: 'Verbaut', variant: 'outline' },
    abgeschlossen: { value: 'abgeschlossen', label: 'Abgeschlossen', variant: 'default' }
};

// ============================================================
// DEFAULTS & LOGIC
// ============================================================

export const STATUS_DEFAULTS = {
    TEILSYSTEM: {
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
// UI HELPER FUNCTIONS FOR TABLES AND EDITABLE COMPONENTS
// ============================================================

export function getStatusColorClasses(status: ItemStatus | string | undefined | null): string {
    if (!status) return badgeVariants.outline;
    
    const sKey = status.toLowerCase() as ItemStatus;
    if (STATUS_UI_CONFIG[sKey]) {
        return badgeVariants[STATUS_UI_CONFIG[sKey].variant];
    }
    
    if (status.toLowerCase() === 'in arbeit') return badgeVariants.info;
    if (status.toLowerCase() === 'pausiert') return badgeVariants.error;
    
    return badgeVariants.outline;
}

export function getAbteilungColorClasses(abteilung: Abteilung | string | undefined | null): string {
    if (!abteilung || abteilung === 'Sin Abteilung') return "text-slate-400 border-dashed font-normal bg-slate-50/50";
    
    const departmentStr = abteilung.toLowerCase();
    const configMatch = ABTEILUNGEN_CONFIG.find(
        (c) => c.name.toLowerCase() === departmentStr || c.id.toLowerCase() === departmentStr
    );
    
    if (configMatch && badgeVariants[configMatch.color as keyof typeof badgeVariants]) {
        return badgeVariants[configMatch.color as keyof typeof badgeVariants];
    }
    
    return badgeVariants.outline;
}
