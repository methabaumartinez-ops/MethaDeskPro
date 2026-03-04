import { Projekt } from '@/types';

export const ProjectService = {
    async getProjekte(): Promise<Projekt[]> {
        const res = await fetch('/api/projekte');
        if (!res.ok) throw new Error('Failed to fetch projects');
        const all = await res.json() as Projekt[];
        // Filter out soft-deleted projects
        return all.filter(p => !p.deletedAt);
    },

    async getProjektById(id: string): Promise<Projekt | null> {
        if (!id || id === 'undefined' || id === 'null') return null;
        try {
            const res = await fetch(`/api/data/projekte/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown API error' }));
                console.error(`[ProjectService] Failed to fetch project ${id}:`, res.status, errorData);
                throw new Error(`Failed to fetch project: ${res.status} ${errorData.error || ''}`);
            }
            return await res.json();
        } catch (error) {
            console.warn(`[ProjectService] Could not fetch project ${id} (may be unauthenticated):`, error);
            return null;
        }
    },

    async createProjekt(projekt: Partial<Projekt>): Promise<Projekt> {
        const res = await fetch('/api/projekte', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projekt)
        });
        if (!res.ok) throw new Error('Failed to create project');
        return await res.json();
    },

    async updateProjekt(id: string, updates: Partial<Projekt>): Promise<Projekt> {
        const res = await fetch(`/api/data/projekte/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update project');
        return await res.json();
    },

    async uploadImage(file: File, projektId: string, type: 'image' | 'plan' | 'ifc' | 'document' | 'lagerort' = 'image', newName?: string): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projektId', projektId);
        formData.append('type', type);
        if (newName) formData.append('newName', newName);

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to upload file');
        }

        const data = await res.json();
        return data.url;
    },

    async deleteProjekt(id: string): Promise<void> {
        const res = await fetch(`/api/data/projekte/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete project');
    },

    async getDeletedProjekte(): Promise<Projekt[]> {
        const res = await fetch('/api/projekte/deleted');
        if (!res.ok) throw new Error('Failed to fetch deleted projects');
        return await res.json();
    },

    async checkInfoBlattStatus(projektId: string): Promise<boolean> {
        try {
            const res = await fetch(`/api/dashboard-requests/${projektId}/log?action=generate_infoblatt`);
            if (res.ok) {
                const logs = await res.json();
                return logs.some((l: any) => l.status === 'success' || l.status === 'pending');
            }
        } catch (e) {
            console.error('Failed to check infoblatt status:', e);
        }
        return false;
    },

    async archiveProjekt(id: string): Promise<{ success: boolean, url?: string }> {
        const res = await fetch(`/api/projekte/${id}/archive`, {
            method: 'POST'
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to archive project');
        }
        return await res.json();
    },

    async restoreProjekt(id: string): Promise<{ success: boolean }> {
        const res = await fetch(`/api/projekte/${id}/restore`, {
            method: 'POST'
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to restore project');
        }
        return await res.json();
    },

    async triggerInfoBlattGeneration(projektId: string): Promise<void> {
        const res = await fetch('/api/dashboard-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'generate_infoblatt',
                projektId,
                payload: {}
            })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to trigger Infoblatt generation');
        }
    }
};
