import { DatabaseService } from '@/lib/services/db';
import { Subtask, SubtaskStatus } from '@/types/ausfuehrung';
import { v4 as uuidv4 } from 'uuid';

export const SubtaskService = {
    async getSubtasksByTaskId(taskId: string): Promise<Subtask[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/ausfuehrung_subtasks');
            if (!res.ok) throw new Error('Failed to fetch subtasks');
            const data = await res.json() as Subtask[];
            const filtered = data.filter(s => s.taskId === taskId);
            return filtered.sort((a, b) => a.orderIndex - b.orderIndex);
        }
        const subtasks = await DatabaseService.list<Subtask>('ausfuehrung_subtasks');
        const filtered = subtasks.filter(s => s.taskId === taskId);
        return filtered.sort((a, b) => a.orderIndex - b.orderIndex);
    },

    async getSubtaskById(id: string): Promise<Subtask | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/ausfuehrung_subtasks?id=${id}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.length > 0 ? data[0] : null;
        }
        return DatabaseService.get<Subtask>('ausfuehrung_subtasks', id);
    },

    async createSubtask(data: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex'> & { orderIndex?: number }): Promise<Subtask> {
        if (!data.taskId || !data.title) {
            throw new Error('Title and Task ID are required to create a subtask');
        }

        if (typeof window !== 'undefined') {
            // We need to calculate orderIndex if not provided
            let orderIndex = data.orderIndex;
            if (orderIndex === undefined) {
                const existing = await this.getSubtasksByTaskId(data.taskId);
                orderIndex = existing.length > 0 ? existing[existing.length - 1].orderIndex + 1 : 0;
            }

            const res = await fetch('/api/data/ausfuehrung_subtasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, orderIndex })
            });
            if (!res.ok) throw new Error('Failed to create subtask');
            return await res.json();
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        // Calculate orderIndex if not provided
        let orderIndex = data.orderIndex;
        if (orderIndex === undefined) {
            const existing = await this.getSubtasksByTaskId(data.taskId);
            orderIndex = existing.length > 0 ? existing[existing.length - 1].orderIndex + 1 : 0;
        }

        const newSubtask: Subtask = {
            ...data,
            id,
            orderIndex,
            status: data.status || 'offen',
            createdAt: now,
            updatedAt: now,
        };
        return DatabaseService.upsert('ausfuehrung_subtasks', newSubtask);
    },

    async updateSubtaskStatus(id: string, status: SubtaskStatus): Promise<Subtask> {
        return this.updateSubtask(id, { status });
    },

    async updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/ausfuehrung_subtasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update subtask');
            return await res.json();
        }
        const existing = await this.getSubtaskById(id);
        if (!existing) throw new Error('Subtask not found');
        return DatabaseService.upsert('ausfuehrung_subtasks', {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        });
    },

    async reorderSubtasks(taskId: string, newOrderIds: string[]): Promise<void> {
        const allSubtasks = await this.getSubtasksByTaskId(taskId);

        for (let i = 0; i < newOrderIds.length; i++) {
            const id = newOrderIds[i];
            const subtask = allSubtasks.find(s => s.id === id);
            if (subtask && subtask.orderIndex !== i) {
                await this.updateSubtask(subtask.id, { orderIndex: i });
            }
        }
    },

    async deleteSubtask(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/ausfuehrung_subtasks?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete subtask');
            return;
        }
        return DatabaseService.delete('ausfuehrung_subtasks', id);
    }
};
