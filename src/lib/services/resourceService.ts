import { Resource, TaskResource } from '@/types/ausfuehrung';
export const ResourceService = {
    async getResources(projektId?: string): Promise<Resource[]> {
        const url = projektId ? `/api/data/ausfuehrung_resources?projektId=${projektId}` : '/api/data/ausfuehrung_resources';
                    const res = await fetch(url);
                    if (!res.ok) throw new Error('Failed to fetch resources');
                    return await res.json();
    },

    async getResourceById(id: string): Promise<Resource | null> {
        const res = await fetch(`/api/data/ausfuehrung_resources/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch resource');
                    return await res.json();
    },

    async createResource(data: Omit<Resource, 'id' | 'createdAt'>): Promise<Resource> {
        const res = await fetch('/api/data/ausfuehrung_resources', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!res.ok) throw new Error('Failed to create resource');
                    return await res.json();
    },

    async getLinkedResources(taskId?: string, subtaskId?: string): Promise<TaskResource[]> {
        const params = new URLSearchParams();
                    if (taskId) params.append('taskId', taskId);
                    if (subtaskId) params.append('subtaskId', subtaskId);
                    const res = await fetch(`/api/data/ausfuehrung_task_resources?${params.toString()}`);
                    if (!res.ok) throw new Error('Failed to fetch linked resources');
                    return await res.json();
    },

    async linkResource(data: Omit<TaskResource, 'id'>): Promise<TaskResource> {
        const res = await fetch('/api/data/ausfuehrung_task_resources', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!res.ok) throw new Error('Failed to link resource');
                    return await res.json();
    },

    async removeLink(linkId: string): Promise<void> {
        const res = await fetch(`/api/data/ausfuehrung_task_resources?id=${linkId}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete resource link');
                    return;
    }
};
