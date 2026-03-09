/**
 * workflowEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized workflow/state-transition system for TS, Position and UntPos.
 *
 * Business rules encoded here:
 *  1. New TS by Planner/Baufuehrer  → in_planung + Planung
 *  2. Plan finished → offen + AVOR
 *  3. AVOR assigns to department     → in_arbeit + <destAbteilung>
 *  4. Department finishes work       → fertig + AVOR
 */

import type { ItemStatus, UserRole } from '@/types';
import { PLANNER_ROLES } from '@/lib/config/statusConfig';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EntityType = 'TEILSYSTEM' | 'POSITION' | 'UNTERPOSITION';

export type WorkflowTransitionId =
    | 'PLAN_FINISH'         // Planung → offen + AVOR
    | 'AVOR_ASSIGN'         // AVOR assigns to destination dept → in_arbeit + dest
    | 'DEPT_FINISH'         // Working dept finishes → fertig + AVOR
    | 'REOPEN'              // Any → offen (admin override)
    | 'NACHBEARBEITUNG';    // Any → nachbearbeitung (rework)

export interface WorkflowTransition {
    id: WorkflowTransitionId;
    label: string;
    /** Status after the transition */
    targetStatus: ItemStatus;
    /** Fixed target abteilung (null = provided dynamically, e.g. AVOR picks one) */
    targetAbteilung: string | null;
    /** Roles allowed to trigger this transition */
    allowedRoles: UserRole[];
    /** Source statuses from which this transition is valid (empty = any) */
    fromStatuses: ItemStatus[];
    /** Whether the user must supply a destination Abteilung */
    requiresDestAbteilung: boolean;
    /** Icon key for UI rendering */
    icon: 'arrow-right' | 'check' | 'rotate-ccw' | 'alert-triangle';
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION CATALOG
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
        targetStatus: 'in_arbeit',
        targetAbteilung: null,          // set dynamically by the user
        allowedRoles: ['admin', 'projektleiter', 'bauprojektleiter', 'baufuhrer'],
        fromStatuses: ['offen', 'in_planung', 'nachbearbeitung'],
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
        fromStatuses: ['fertig', 'nachbearbeitung', 'abgeschlossen'],
        requiresDestAbteilung: false,
        icon: 'rotate-ccw',
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the correct creation defaults (status + abteilung) based on the
 * creator's role. Implements rule #1.
 */
export function getCreationDefaults(
    entityType: EntityType,
    creatorRole?: string | null,
    creatorDepartment?: string | null
): { status: ItemStatus; abteilung: string } {
    if (entityType === 'TEILSYSTEM') {
        if (PLANNER_ROLES.includes(creatorRole as any)) {
            return { status: 'in_planung', abteilung: 'Planung' };
        }
        return { status: 'offen', abteilung: creatorDepartment || 'AVOR' };
    }
    // For Position and UntPos, inherit offen / no dept by default
    return { status: 'offen', abteilung: 'Sin Abteilung' };
}

/**
 * Returns the list of available workflow transitions for a given entity state
 * and user role.
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
