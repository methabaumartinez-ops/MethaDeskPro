import { DatabaseService } from '@/lib/services/db';
import { Resource, TaskResource } from '@/types/ausfuehrung';
import { v4 as uuidv4 } from 'uuid';

export const ResourceService = {
    async getResources(projektId?: string): Promise<Resource[]> {
        if (typeof window !== 'undefined') {
            const url = projektId ? `/api/data/ausfuehrung_resources?projektId=${projektId}` : '/api/data/ausfuehrung_resources';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch resources');
            return await res.json();
        }
        const resources = await DatabaseService.list<Resource>('ausfuehrung_resources');
        if (projektId) {
            return resources.filter(r => !r.projektId || r.projektId === projektId);
        }
        return resources;
    },

    async getResourceById(id: string): Promise<Resource | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/ausfuehrung_resources/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch resource');
            return await res.json();
        }
        return DatabaseService.get<Resource>('ausfuehrung_resources', id);
    },

    async createResource(data: Omit<Resource, 'id' | 'createdAt'>): Promise<Resource> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/ausfuehrung_resources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to create resource');
            return await res.json();
        }
        const newResource: Resource = {
            ...data,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
        };
        return DatabaseService.upsert('ausfuehrung_resources', newResource);
    },

    async getLinkedResources(taskId?: string, subtaskId?: string): Promise<TaskResource[]> {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams();
            if (taskId) params.append('taskId', taskId);
            if (subtaskId) params.append('subtaskId', subtaskId);
            const res = await fetch(`/api/data/ausfuehrung_task_resources?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch linked resources');
            return await res.json();
        }
        const links = await DatabaseService.list<TaskResource>('ausfuehrung_task_resources');
        return links.filter(l =>
            (taskId && l.taskId === taskId) ||
            (subtaskId && l.subtaskId === subtaskId)
        );
    },

    async linkResource(data: Omit<TaskResource, 'id'>): Promise<TaskResource> {
        if (!data.taskId && !data.subtaskId) {
            throw new Error('Must provide either taskId or subtaskId to link a resource');
        }

        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/ausfuehrung_task_resources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to link resource');
            return await res.json();
        }

        const newLink: TaskResource = {
            ...data,
            id: uuidv4()
        };
        return DatabaseService.upsert('ausfuehrung_task_resources', newLink);
    },

    async removeLink(linkId: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/ausfuehrung_task_resources?id=${linkId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete resource link');
            return;
        }
        return DatabaseService.delete('ausfuehrung_task_resources', linkId);
    }
};
