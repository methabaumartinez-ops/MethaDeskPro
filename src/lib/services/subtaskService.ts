import { DatabaseService } from '@/lib/services/db';
import { Subtask, SubtaskStatus } from '@/types/ausfuehrung';
import { v4 as uuidv4 } from 'uuid';

export const SubtaskService = {
    async getSubtasksByTaskId(taskId: string): Promise<Subtask[]> {
        const subtasks = await DatabaseService.list<Subtask>('ausfuehrung_subtasks');
        const filtered = subtasks.filter(s => s.taskId === taskId);
        return filtered.sort((a, b) => a.orderIndex - b.orderIndex);
    },

    async getSubtaskById(id: string): Promise<Subtask | null> {
        return DatabaseService.get<Subtask>('ausfuehrung_subtasks', id);
    },

    async createSubtask(data: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex'> & { orderIndex?: number }): Promise<Subtask> {
        if (!data.taskId || !data.title) {
            throw new Error('Title and Task ID are required to create a subtask');
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
        return DatabaseService.delete('ausfuehrung_subtasks', id);
    }
};
