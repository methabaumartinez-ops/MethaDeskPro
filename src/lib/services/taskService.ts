import { Task, Subtask, Teilsystem } from '@/types';
import { DatabaseService } from './db';
import { SubsystemService } from './subsystemService';
import { v4 as uuidv4 } from 'uuid';

export class TaskService {
    static async getTasks(projektId: string): Promise<Task[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/tasks?projektId=${projektId}`);
            if (!res.ok) throw new Error('Failed to fetch tasks');
            return res.json();
        }
        const tasks = await DatabaseService.list<Task>('tasks', {
            must: [{ key: 'projektId', match: { value: projektId } }]
        });
        return tasks || [];
    }

    static async getSubtasks(taskId: string): Promise<Subtask[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/subtasks?taskId=${taskId}`);
            if (!res.ok) throw new Error('Failed to fetch subtasks');
            const data: Subtask[] = await res.json();
            return data.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        const subtasks = await DatabaseService.list<Subtask>('subtasks', {
            must: [{ key: 'taskId', match: { value: taskId } }]
        });
        return subtasks.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    static async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            if (!res.ok) throw new Error('Failed to create task');
            return res.json();
        }
        const newTask: Task = {
            ...task,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as Task;
        return await DatabaseService.upsert('tasks', newTask);
    }

    static async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
        if (typeof window !== 'undefined') {
            // For client-side update, we need to fetch the existing task to merge updates
            // This assumes the API endpoint for tasks can handle a GET by ID
            const existingTaskRes = await fetch(`/api/data/tasks?id=${id}`);
            if (!existingTaskRes.ok) throw new Error(`Failed to fetch task ${id} for update`);
            const existing = await existingTaskRes.json();
            if (!existing) throw new Error(`Task ${id} not found`);

            const res = await fetch('/api/data/tasks', {
                method: 'POST', // Assuming POST for upsert/update
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...existing, ...updates, updatedAt: new Date().toISOString() })
            });
            if (!res.ok) throw new Error('Failed to update task');
            return res.json();
        }
        const existing = await DatabaseService.get<Task>('tasks', id);
        if (!existing) throw new Error(`Task ${id} not found`);
        return await DatabaseService.upsert('tasks', {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        });
    }

    static async deleteTask(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/tasks?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Failed to delete task ${id}`);
            return;
        }
        await DatabaseService.delete('tasks', id);
        await DatabaseService.deleteByFilter('subtasks', {
            must: [{ key: 'taskId', match: { value: id } }]
        });
    }

    static async createSubtask(subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subtask> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/subtasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subtask)
            });
            if (!res.ok) throw new Error('Failed to create subtask');
            return res.json();
        }
        const newSubtask: Subtask = {
            ...subtask,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as Subtask;
        return await DatabaseService.upsert('subtasks', newSubtask);
    }

    static async updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask> {
        if (typeof window !== 'undefined') {
            // For client-side update, we need to fetch the existing subtask to merge updates
            // This assumes the API endpoint for subtasks can handle a GET by ID
            const existingSubtaskRes = await fetch(`/api/data/subtasks?id=${id}`);
            if (!existingSubtaskRes.ok) throw new Error(`Failed to fetch subtask ${id} for update`);
            const existing = await existingSubtaskRes.json();
            if (!existing) throw new Error(`Subtask ${id} not found`);

            const res = await fetch('/api/data/subtasks', {
                method: 'POST', // Assuming POST for upsert/update
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...existing, ...updates, updatedAt: new Date().toISOString() })
            });
            if (!res.ok) throw new Error('Failed to update subtask');
            return res.json();
        }
        const existing = await DatabaseService.get<Subtask>('subtasks', id);
        if (!existing) throw new Error(`Subtask ${id} not found`);
        return await DatabaseService.upsert('subtasks', {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        });
    }

    static async deleteSubtask(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/subtasks?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Failed to delete subtask ${id}`);
            return;
        }
        await DatabaseService.delete('subtasks', id);
    }

    /**
     * Syncs Teilsysteme with abteilung='Bau' to Tasks
     */
    static async syncBauTeilsysteme(projektId: string): Promise<void> {
        if (typeof window !== 'undefined') {
            // Client-side sync would typically involve calling a specific API route for the sync operation
            // or performing all individual fetches/updates.
            // For simplicity and to match the server-side logic, we'll assume a dedicated sync endpoint.
            const res = await fetch('/api/data/syncBauTeilsysteme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projektId })
            });
            if (!res.ok) throw new Error('Failed to sync Bau Teilsysteme on client');
            return;
        }
        try {
            const allTs = await SubsystemService.getTeilsysteme(projektId);
            const allTasks = await this.getTasks(projektId);

            // Map existing tasks by their source_ts_id for quick lookup
            const taskByTsId = new Map<string, Task>();
            allTasks.forEach(t => {
                if (t.sourceType === 'ts' && t.sourceTsId) {
                    taskByTsId.set(t.sourceTsId, t);
                }
            });

            const defaultSubtaskTitles = ['Vorbereitung', 'Montage', 'Ressourcen', 'Qualitaet', 'Sicherheit'];

            for (const ts of allTs) {
                const isBau = ts.abteilung === 'Bau';
                const existingTask = taskByTsId.get(ts.id);

                if (isBau && !existingTask) {
                    // Create new task for Bau Teilsystem
                    const newTask = await this.createTask({
                        projektId: ts.projektId,
                        title: `TS ${ts.teilsystemNummer || ''} - ${ts.name}`.trim(),
                        status: 'Offen',
                        sourceType: 'ts',
                        sourceTsId: ts.id,
                        priority: 'Mittel'
                    });

                    // Create default subtasks
                    for (let i = 0; i < defaultSubtaskTitles.length; i++) {
                        await this.createSubtask({
                            taskId: newTask.id,
                            title: defaultSubtaskTitles[i],
                            status: 'Offen',
                            sortOrder: i
                        });
                    }
                } else if (!isBau && existingTask && existingTask.status !== 'Erledigt' && existingTask.status !== 'Blockiert') {
                    // TS changed from Bau to something else, mark task as Blockiert to keep traceability
                    await this.updateTask(existingTask.id, { projektId: ts.projektId, status: 'Blockiert', description: 'Teilsystem ist nicht mehr Abteilung Bau.' });
                }
            }
        } catch (error) {
            console.error("Failed to sync Bau Teilsysteme to tasks", error);
        }
    }
}
