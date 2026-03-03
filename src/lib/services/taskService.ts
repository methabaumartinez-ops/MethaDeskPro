import { DatabaseService } from '@/lib/services/db';
import { Task, TaskStatus } from '@/types/ausfuehrung';
import { Teilsystem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { SubsystemService } from './subsystemService';

export const TaskService = {
    async getTasks(filters?: { teamId?: string; status?: TaskStatus; projektId?: string }): Promise<Task[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/ausfuehrung_tasks');
            if (!res.ok) throw new Error('Failed to fetch tasks');
            let tasks = await res.json() as Task[];

            if (filters?.projektId) {
                tasks = tasks.filter(t => t.projektId === filters.projektId);
            }
            if (filters?.teamId) {
                tasks = tasks.filter(t => t.teamId === filters.teamId);
            }
            if (filters?.status) {
                tasks = tasks.filter(t => t.status === filters.status);
            }

            return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        let tasks = await DatabaseService.list<Task>('ausfuehrung_tasks');

        if (filters?.projektId) {
            tasks = tasks.filter(t => t.projektId === filters.projektId);
        }
        if (filters?.teamId) {
            tasks = tasks.filter(t => t.teamId === filters.teamId);
        }
        if (filters?.status) {
            tasks = tasks.filter(t => t.status === filters.status);
        }

        return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async getTaskById(id: string): Promise<Task | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/ausfuehrung_tasks?id=${id}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.length > 0 ? data[0] : null;
        }
        return DatabaseService.get<Task>('ausfuehrung_tasks', id);
    },

    async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
        if (!data.title) {
            throw new Error('Title is required to create a task');
        }

        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/ausfuehrung_tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to create task');
            return await res.json();
        }

        const id = uuidv4();
        const now = new Date().toISOString();
        const newTask: Task = {
            ...data,
            id,
            status: data.status || 'offen',
            createdAt: now,
            updatedAt: now,
        };
        return DatabaseService.upsert('ausfuehrung_tasks', newTask);
    },

    async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
        return this.updateTask(id, { status });
    },

    async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/ausfuehrung_tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update task');
            return await res.json();
        }
        const existing = await this.getTaskById(id);
        if (!existing) throw new Error('Task not found');
        return DatabaseService.upsert('ausfuehrung_tasks', {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        });
    },

    async deleteTask(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/ausfuehrung_tasks?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete task');
            return;
        }
        await DatabaseService.delete('ausfuehrung_tasks', id);
        // Cascade destroy: 
        // We'd ideally clean up 'ausfuehrung_subtasks' and 'ausfuehrung_task_resources'
        const subtasks = await DatabaseService.list<any>('ausfuehrung_subtasks');
        for (const st of subtasks) {
            if (st.taskId === id) {
                await DatabaseService.delete('ausfuehrung_subtasks', st.id);
            }
        }
    },

    async syncBauTeilsysteme(projektId: string): Promise<void> {
        const allTS = await SubsystemService.getTeilsysteme(projektId);
        const bauTS = allTS.filter(ts => ts.abteilung === 'Bau');

        const existingTasks = await this.getTasks({ projektId });

        for (const ts of bauTS) {
            const alreadyExists = existingTasks.some(t => t.teilsystemId === ts.id);
            if (!alreadyExists) {
                await this.createTask({
                    projektId,
                    teamId: '',
                    teilsystemId: ts.id,
                    title: `TS ${ts.teilsystemNummer}: ${ts.name}`,
                    description: ts.beschreibung || ts.bemerkung || '',
                    status: 'offen',
                    priority: 'mittel' as any,
                    sourceType: 'ts'
                });
            }
        }
    }
};
