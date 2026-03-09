/**
 * src/types/ausfuehrung.ts
 *
 * Re-exports and extensions for the Ausfuehrung (execution) module.
 * Task, Team, TaskStatus, and Priority are sourced from index.ts (single source of truth).
 * Ausfuehrung-specific types (Worker, Subtask, Resource, etc.) are defined here.
 */

// ─── Re-export from index.ts to avoid type duplication ───────────────────────
export type { Task, Team, TaskStatus, TaskPriority as Priority } from './index';

// ─── Ausfuehrung-specific status types (distinct from TaskStatus) ─────────────
// These exist in the DB as lowercase values. They will be normalized in a future migration.
export type SubtaskStatus = 'Offen' | 'In Arbeit' | 'Erledigt'
    | 'offen' | 'in_arbeit' | 'fertig'; // legacy lowercase DB values

export type ResourceType = 'material' | 'machine' | 'document' | 'link' | 'other';

export interface Worker {
    id: string;
    projektId?: string;
    fullName: string;
    role?: string;
    active: boolean;
}

export interface Subtask {
    id: string;
    taskId: string;
    title: string;
    description?: string;
    status?: SubtaskStatus;
    assignedWorkerId?: string;
    orderIndex: number;
    createdAt: string;
    updatedAt: string;
}

export interface Resource {
    id: string;
    projektId?: string;
    name: string;
    type: ResourceType;
    unit?: string;
    notes?: string;
    createdAt?: string;
}

export interface TaskResource {
    id: string;
    taskId?: string;
    subtaskId?: string;
    resourceId: string;
    quantity?: number;
    comment?: string;
}
