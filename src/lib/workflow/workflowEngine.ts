/**
 * workflowEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Department-driven workflow system for TS, Position and UntPos.
 *
 * Core principle: AVOR is the orchestrator.
 *   - AVOR distributes items to departments.
 *   - Each department works through its allowed statuses.
 *   - When a department reaches its terminal status the item returns to AVOR.
 *   - Final departments (Bau, Montage) do NOT return to AVOR.
 *
 * Business rules:
 *  1. New TS by Planner/Baufuehrer  → in_planung + Planung
 *  2. Plan finished                 → offen + AVOR
 *  3. AVOR assigns to department    → item.abteilung = dest, status = offen
 *  4. Department finishes work      → terminal status, handover to AVOR
 *  5. Final depts (Bau, Montage)    → no AVOR return after terminal
 *  6. Creation rule                 → abteilung = creator.abteilung, status = offen
 */

import type { ItemStatus, UserRole } from '@/types';


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EntityType = 'TEILSYSTEM' | 'POSITION' | 'UNTERPOSITION';

export type WorkflowTransitionId =
    | 'PLAN_FINISH'
    | 'AVOR_ASSIGN'
    | 'DEPT_FINISH'
    | 'REOPEN'
    | 'NACHBEARBEITUNG';

export interface WorkflowTransition {
    id: WorkflowTransitionId;
    label: string;
    targetStatus: ItemStatus;
    targetAbteilung: string | null;
    allowedRoles: UserRole[];
    fromStatuses: ItemStatus[];
    requiresDestAbteilung: boolean;
    icon: 'arrow-right' | 'check' | 'rotate-ccw' | 'alert-triangle';
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT WORKFLOW CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export interface DeptWorkflowDef {
    /** Statuses this department is allowed to set */
    allowed: ItemStatus[];
    /** Statuses that represent completed work for this department */
    terminal: ItemStatus[];
    /** If true, items do NOT return to AVOR after terminal (e.g. Bau, Montage) */
    isFinal: boolean;
}

/**
 * Department workflow configuration matrix.
 * Each department defines its allowed statuses, terminal states, and whether
 * it is a "final" department (items don't return to AVOR).
 */
export const DEPT_WORKFLOW_CONFIG: Record<string, DeptWorkflowDef> = {
    Planung: {
        allowed: ['offen', 'in_arbeit', 'fertig'],
        terminal: ['fertig'],
        isFinal: false,
    },
    AVOR: {
        allowed: ['offen', 'in_arbeit', 'bestellt', 'geliefert', 'fertig', 'nachbearbeitung'],
        terminal: ['fertig', 'geliefert'],
        isFinal: false,
    },
    Einkauf: {
        allowed: ['offen', 'bestellt', 'geliefert', 'nachbearbeitung'],
        terminal: ['geliefert'],
        isFinal: false,
    },
    Blechabteilung: {
        allowed: ['offen', 'in_arbeit', 'fertig'],
        terminal: ['fertig'],
        isFinal: false,
    },
    Schlosserei: {
        allowed: ['offen', 'in_arbeit', 'fertig'],
        terminal: ['fertig'],
        isFinal: false,
    },
    Bau: {
        allowed: ['offen', 'in_arbeit', 'verbaut', 'nachbearbeitung'],
        terminal: ['verbaut'],
        isFinal: true,
    },
    Montage: {
        allowed: ['offen', 'in_arbeit', 'verbaut', 'nachbearbeitung'],
        terminal: ['verbaut'],
        isFinal: true,
    },
};

/**
 * Fallback config for departments not explicitly listed.
 * Allows basic offen/in_arbeit/fertig cycle and returns to AVOR.
 */
const DEFAULT_DEPT_CONFIG: DeptWorkflowDef = {
    allowed: ['offen', 'in_arbeit', 'fertig', 'nachbearbeitung'],
    terminal: ['fertig'],
    isFinal: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT WORKFLOW HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Resolves the DeptWorkflowDef for a given department name. */
function resolveDeptConfig(abteilung: string | undefined | null): DeptWorkflowDef {
    if (!abteilung) return DEFAULT_DEPT_CONFIG;
    return DEPT_WORKFLOW_CONFIG[abteilung] ?? DEFAULT_DEPT_CONFIG;
}

/**
 * Returns the list of statuses that a department is allowed to use.
 * Used by the UI to filter status dropdowns.
 */
export function getAllowedStatuses(abteilung: string | undefined | null): ItemStatus[] {
    return resolveDeptConfig(abteilung).allowed;
}

/**
 * Returns true if the given status is a terminal state for the department.
 * Terminal means the department considers its work done.
 *
 * IMPORTANT: Do NOT use `status === 'fertig'` directly.
 * Always use this function — terminal varies by department.
 */
export function isTerminalStatus(
    abteilung: string | undefined | null,
    status: ItemStatus | string | undefined | null
): boolean {
    if (!status) return false;
    const config = resolveDeptConfig(abteilung);
    return config.terminal.includes(status as ItemStatus);
}

/**
 * Determines the handover result when a department reaches a terminal status.
 *
 * - Non-final departments: returns { abteilung: 'AVOR', status: <currentStatus> }
 * - Final departments (Bau, Montage): returns null (no handover)
 */
export function getHandoverResult(
    abteilung: string | undefined | null,
    status: ItemStatus | string
): { abteilung: string; status: ItemStatus } | null {
    const config = resolveDeptConfig(abteilung);
    if (!config.terminal.includes(status as ItemStatus)) return null;
    if (config.isFinal) return null;
    return { abteilung: 'AVOR', status: status as ItemStatus };
}

/**
 * Checks whether the given status is allowed for the department.
 */
export function isStatusAllowedForDept(
    abteilung: string | undefined | null,
    status: ItemStatus | string
): boolean {
    const config = resolveDeptConfig(abteilung);
    return config.allowed.includes(status as ItemStatus);
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION CATALOG (kept for backward compat on TS-level UI)
// ─────────────────────────────────────────────────────────────────────────────

export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
    {
        id: 'PLAN_FINISH',
        label: 'Planung abschliessen → AVOR',
        targetStatus: 'offen',
        targetAbteilung: 'AVOR',
        allowedRoles: ['planer', 'baufuhrer', 'bauprojektleiter', 'projektleiter', 'admin'],
        fromStatuses: ['in_planung'],
        requiresDestAbteilung: false,
        icon: 'arrow-right',
    },
    {
        id: 'AVOR_ASSIGN',
        label: 'An Abteilung uebergeben',
        targetStatus: 'offen',
        targetAbteilung: null,
        allowedRoles: ['admin', 'projektleiter', 'bauprojektleiter', 'baufuhrer'],
        fromStatuses: ['offen', 'in_planung', 'nachbearbeitung', 'bereit'],
        requiresDestAbteilung: true,
        icon: 'arrow-right',
    },
    {
        id: 'DEPT_FINISH',
        label: 'Arbeit abgeschlossen → AVOR',
        targetStatus: 'fertig',
        targetAbteilung: 'AVOR',
        allowedRoles: ['admin', 'projektleiter', 'bauprojektleiter', 'baufuhrer',
                       'planer', 'werkhof', 'polier', 'produktion'],
        fromStatuses: ['in_arbeit', 'bestellt'],
        requiresDestAbteilung: false,
        icon: 'check',
    },
    {
        id: 'NACHBEARBEITUNG',
        label: 'Nachbearbeitung',
        targetStatus: 'nachbearbeitung',
        targetAbteilung: null,
        allowedRoles: ['admin', 'projektleiter', 'bauprojektleiter', 'baufuhrer', 'planer'],
        fromStatuses: ['fertig', 'in_arbeit', 'offen'],
        requiresDestAbteilung: false,
        icon: 'alert-triangle',
    },
    {
        id: 'REOPEN',
        label: 'Wieder oeffnen',
        targetStatus: 'offen',
        targetAbteilung: 'AVOR',
        allowedRoles: ['admin', 'projektleiter'],
        fromStatuses: ['fertig', 'nachbearbeitung', 'abgeschlossen', 'bereit'],
        requiresDestAbteilung: false,
        icon: 'rotate-ccw',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the correct creation defaults (status + abteilung) based on the
 * creator's role and department.
 *
 * Rules:
 *  - TS by Planner → in_planung + Planung
 *  - TS by other   → offen + creator.abteilung
 *  - POS / UNTPOS  → offen + creator.abteilung
 *  - System import with override → use provided values
 */
export function getCreationDefaults(
    entityType: EntityType,
    creatorRole?: string | null,
    creatorDepartment?: string | null,
    systemOverride?: { status?: ItemStatus; abteilung?: string }
): { status: ItemStatus; abteilung: string } {
    // System/import override: use provided values directly
    if (systemOverride) {
        return {
            status: systemOverride.status || 'offen',
            abteilung: systemOverride.abteilung || creatorDepartment || 'AVOR',
        };
    }

    if (entityType === 'TEILSYSTEM') {
        return { status: 'offen', abteilung: creatorDepartment || 'AVOR' };
    }

    // POS and UNTPOS: always offen + AVOR
    return { status: 'offen', abteilung: 'AVOR' };
}

/**
 * Returns the list of available workflow transitions for a given entity state
 * and user role. Used for the TS-level transition buttons.
 */
export function getAvailableTransitions(
    currentStatus: ItemStatus | string,
    userRole: UserRole | string | undefined | null
): WorkflowTransition[] {
    if (!userRole) return [];
    return WORKFLOW_TRANSITIONS.filter((t) => {
        const roleOk = t.allowedRoles.includes(userRole as UserRole);
        const statusOk =
            t.fromStatuses.length === 0 ||
            t.fromStatuses.includes(currentStatus as ItemStatus);
        return roleOk && statusOk;
    });
}

/**
 * Applies a named transition and returns the resulting { status, abteilung }.
 * Pass `destAbteilung` when the transition needs a destination department.
 */
export function applyTransition(
    transitionId: WorkflowTransitionId,
    destAbteilung?: string
): { status: ItemStatus; abteilung: string } | null {
    const t = WORKFLOW_TRANSITIONS.find((x) => x.id === transitionId);
    if (!t) return null;

    const abteilung = t.requiresDestAbteilung
        ? (destAbteilung ?? 'AVOR')
        : (t.targetAbteilung ?? 'AVOR');

    return { status: t.targetStatus, abteilung };
}

/**
 * Validates whether a status change is allowed given the actor's role.
 * Returns true if the transition is valid (used in API route guards).
 */
export function validateTransition(
    fromStatus: ItemStatus | string | undefined,
    toStatus: ItemStatus | string,
    userRole: UserRole | string | undefined | null
): boolean {
    if (!userRole) return false;
    // Superadmin, Admin and projektleiter can always change status freely
    if (userRole === 'superadmin' || userRole === 'admin' || userRole === 'projektleiter') return true;

    const available = getAvailableTransitions(fromStatus as ItemStatus, userRole);
    return available.some((t) => t.targetStatus === toStatus);
}
