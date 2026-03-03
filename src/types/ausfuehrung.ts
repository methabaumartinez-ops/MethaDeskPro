export type TaskStatus = 'offen' | 'in_arbeit' | 'blockiert' | 'fertig';
export type SubtaskStatus = 'offen' | 'in_arbeit' | 'fertig';
export type ResourceType = 'material' | 'machine' | 'document' | 'link' | 'other';
export type Priority = 'niedrig' | 'mittel' | 'hoch' | 'kritisch';

export interface Team {
    id: string;
    projektId: string;
    name: string;
    description?: string;
    members: string[]; // UUIDs of Workers
    createdAt: string;
    updatedAt: string;
}

export interface Worker {
    id: string;
    projektId?: string; // Optional if workers are global or per project
    fullName: string;
    role?: string;
    active: boolean;
}

export interface Task {
    id: string;
    projektId: string;
    teamId: string; // FK to Team
    title: string;
    description?: string;
    status: TaskStatus;
    priority?: Priority;
    startDate?: string;
    dueDate?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Subtask {
    id: string;
    taskId: string; // FK to Task
    title: string;
    description?: string;
    status?: SubtaskStatus;
    assignedWorkerId?: string; // FK to Worker
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
    taskId?: string; // Either taskId or subtaskId should be set
    subtaskId?: string;
    resourceId: string;
    quantity?: number;
    comment?: string;
}
