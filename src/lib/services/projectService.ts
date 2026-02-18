import { DatabaseService } from '@/lib/services/db';
import { Projekt } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const ProjectService = {
    async getProjekte(): Promise<Projekt[]> {
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch('/api/projekte');
                if (!res.ok) throw new Error('Failed to fetch projects');
                return await res.json();
            } catch (error) {
                console.error("Client fetch error:", error);
                // Fallback or rethrow
                throw error;
            }
        }
        return DatabaseService.list<Projekt>('projekte');
    },

    async getProjektById(id: string): Promise<Projekt | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/projekte/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch project');
            return await res.json();
        }
        return DatabaseService.get<Projekt>('projekte', id);
    },

    async createProjekt(projekt: Partial<Projekt>): Promise<Projekt> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/projekte', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projekt)
            });
            if (!res.ok) throw new Error('Failed to create project');
            return await res.json();
        }

        const newProject: Projekt = {
            ...projekt,
            id: projekt.id || uuidv4(),
            createdAt: new Date().toISOString(),
            status: projekt.status || 'offen',
        } as Projekt;

        return DatabaseService.upsert('projekte', newProject);
    },

    async updateProjekt(id: string, updates: Partial<Projekt>): Promise<Projekt> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/projekte/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update project');
            return await res.json();
        }
        const existing = await this.getProjektById(id);
        if (!existing) throw new Error('Project not found');

        const updatedProject = { ...existing, ...updates };
        return DatabaseService.upsert('projekte', updatedProject);
    },

    async uploadImage(file: File): Promise<string> {
        // TODO: Implement real storage or use base64 in Qdrant (limited size)
        return URL.createObjectURL(file);
    },

    async deleteProjekt(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/projekte/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete project');
            return;
        }
        return DatabaseService.delete('projekte', id);
    }
};
