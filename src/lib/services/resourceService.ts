import { DatabaseService } from '@/lib/services/db';
import { Resource, TaskResource } from '@/types/ausfuehrung';
import { v4 as uuidv4 } from 'uuid';

export const ResourceService = {
    async getResources(projektId?: string): Promise<Resource[]> {
        const resources = await DatabaseService.list<Resource>('ausfuehrung_resources');
        if (projektId) {
            return resources.filter(r => !r.projektId || r.projektId === projektId);
        }
        return resources;
    },

    async getResourceById(id: string): Promise<Resource | null> {
        return DatabaseService.get<Resource>('ausfuehrung_resources', id);
    },

    async createResource(data: Omit<Resource, 'id' | 'createdAt'>): Promise<Resource> {
        const newResource: Resource = {
            ...data,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
        };
        return DatabaseService.upsert('ausfuehrung_resources', newResource);
    },

    async getLinkedResources(taskId?: string, subtaskId?: string): Promise<TaskResource[]> {
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

        const newLink: TaskResource = {
            ...data,
            id: uuidv4()
        };
        return DatabaseService.upsert('ausfuehrung_task_resources', newLink);
    },

    async removeLink(linkId: string): Promise<void> {
        return DatabaseService.delete('ausfuehrung_task_resources', linkId);
    }
};
