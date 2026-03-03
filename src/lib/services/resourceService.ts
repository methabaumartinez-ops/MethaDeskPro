import { DatabaseService } from '@/lib/services/db';
import { Resource, TaskResource } from '@/types/ausfuehrung';
import { v4 as uuidv4 } from 'uuid';

export const ResourceService = {
    async getResources(projektId?: string): Promise<Resource[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/ausfuehrung_resources');
            if (!res.ok) throw new Error('Failed to fetch resources');
            let resources = await res.json() as Resource[];
            if (projektId) {
                return resources.filter(r => !r.projektId || r.projektId === projektId);
            }
            return resources;
        }
        const resources = await DatabaseService.list<Resource>('ausfuehrung_resources');
        if (projektId) {
            return resources.filter(r => !r.projektId || r.projektId === projektId);
        }
        return resources;
    },

    async getResourceById(id: string): Promise<Resource | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/ausfuehrung_resources?id=${id}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.length > 0 ? data[0] : null;
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
            const res = await fetch('/api/data/ausfuehrung_task_resources');
            if (!res.ok) throw new Error('Failed to fetch linked resources');
            const data = await res.json() as TaskResource[];
            return data.filter(l =>
                (taskId && l.taskId === taskId) ||
                (subtaskId && l.subtaskId === subtaskId)
            );
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
            if (!res.ok) throw new Error('Failed to remove link');
            return;
        }
        return DatabaseService.delete('ausfuehrung_task_resources', linkId);
    }
};
