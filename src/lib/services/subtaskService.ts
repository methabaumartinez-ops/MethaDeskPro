import { Subtask, SubtaskStatus } from '@/types/ausfuehrung';
export const SubtaskService = {
    async getSubtasksByTaskId(taskId: string): Promise<Subtask[]> {
        const res = await fetch(`/api/data/ausfuehrung_subtasks?taskId=${taskId}`);
                    if (!res.ok) throw new Error('Failed to fetch subtasks');
                    return await res.json();
    },

    async getSubtaskById(id: string): Promise<Subtask | null> {
        const res = await fetch(`/api/data/ausfuehrung_subtasks/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch subtask');
                    return await res.json();
    },

    async createSubtask(data: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex'> & { orderIndex?: number }): Promise<Subtask> {
        const res = await fetch('/api/data/ausfuehrung_subtasks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!res.ok) throw new Error('Failed to create subtask');
                    return await res.json();
    },

    async updateSubtaskStatus(id: string, status: SubtaskStatus): Promise<Subtask> {
        return this.updateSubtask(id, { status });
    },

    async updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask> {
        const res = await fetch(`/api/data/ausfuehrung_subtasks/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update subtask');
                    return await res.json();
    },

    async reorderSubtasks(taskId: string, newOrderIds: string[]): Promise<void> {
        // reorderSubtasks is fine because it calls updateSubtask which is now safe
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
        const res = await fetch(`/api/data/ausfuehrung_subtasks?id=${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete subtask');
                    return;
    }
};
