import { Task, TaskStatus } from '@/types/ausfuehrung';
import { Teilsystem } from '@/types';
import { SubsystemService } from './subsystemService';

export const TaskService = {
    async getTasks(filters?: { teamId?: string; status?: TaskStatus; projektId?: string }): Promise<Task[]> {
        const params = new URLSearchParams();
                    if (filters?.projektId) params.append('projektId', filters.projektId);
                    if (filters?.teamId) params.append('teamId', filters.teamId);
                    if (filters?.status) params.append('status', filters.status);
                    const res = await fetch(`/api/data/ausfuehrung_tasks?${params.toString()}`);
                    if (!res.ok) throw new Error('Failed to fetch tasks');
                    return await res.json();
    },

    async getTaskById(id: string): Promise<Task | null> {
        const res = await fetch(`/api/data/ausfuehrung_tasks/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch task');
                    return await res.json();
    },

    async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
        const res = await fetch('/api/data/ausfuehrung_tasks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!res.ok) throw new Error('Failed to create task');
                    return await res.json();
    },

    async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
        return this.updateTask(id, { status });
    },

    async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
        const res = await fetch(`/api/data/ausfuehrung_tasks/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update task');
                    return await res.json();
    },

    async deleteTask(id: string): Promise<void> {
        const res = await fetch(`/api/data/ausfuehrung_tasks?id=${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete task');
                    return;
    },

    async syncBauTeilsysteme(projektId: string): Promise<void> {
        // This is safe because both getTeilsysteme and getTasks are now browser-safe
        const allTS = await SubsystemService.getTeilsysteme(projektId);
        const bauTS = allTS.filter(ts => ts.abteilung === 'Bau');

        const existingTasks = await this.getTasks({ projektId });

        for (const ts of bauTS) {
            const alreadyExists = existingTasks.some(t => t.teilsystemId === ts.id);
            if (!alreadyExists) {
                await this.createTask({
                    projektId,
                    teamId: '', // Unassigned initially
                    teilsystemId: ts.id,
                    title: `TS ${ts.teilsystemNummer}: ${ts.name}`,
                    description: ts.beschreibung || ts.bemerkung || '',
                    status: 'offen',
                    priority: 'mittel'
                });
            }
        }
    }
};
