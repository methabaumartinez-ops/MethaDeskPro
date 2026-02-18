
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
            const res = await fetch('/api/projekte', {
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

        // Create Drive Folder if credentials exist
        try {
            if (process.env.GOOGLE_CLIENT_ID) {
                const { ensureProjectFolder } = await import('./googleDriveService');
                const folderId = await ensureProjectFolder({
                    projektnummer: newProject.projektnummer,
                    projektname: newProject.projektname,
                    driveFolderId: newProject.driveFolderId
                });
                if (folderId) {
                    newProject.driveFolderId = folderId;
                }
            }
        } catch (error) {
            console.error('Failed to create Drive folder:', error);
            // Continue creating project even if Drive fails
        }

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

        // Check if we need to create/update folder (e.g. if name changed or missing folder)
        let driveFolderId = existing.driveFolderId;
        if (process.env.GOOGLE_CLIENT_ID) {
            // Only if name/number changed or folder missing
            if (!driveFolderId || (updates.projektname && updates.projektname !== existing.projektname)) {
                try {
                    const { ensureProjectFolder } = await import('./googleDriveService');
                    const folderId = await ensureProjectFolder({
                        projektnummer: updates.projektnummer || existing.projektnummer,
                        projektname: updates.projektname || existing.projektname,
                        driveFolderId: existing.driveFolderId
                    });
                    if (folderId) driveFolderId = folderId;
                } catch (e) {
                    console.error('Error ensuring drive folder on update:', e);
                }
            }
        }

        const updatedProject = { ...existing, ...updates, driveFolderId };
        return DatabaseService.upsert('projekte', updatedProject);
    },

    async uploadImage(file: File, projektId: string): Promise<string> {
        // Client-side: upload via API
        if (typeof window !== 'undefined') {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projektId', projektId);
            formData.append('type', 'image'); // Hint for backend

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                console.error('Upload failed');
                // Fallback to blob if upload fails?
                return URL.createObjectURL(file);
            }
            const data = await res.json();
            return data.url; // WebContentLink or ViewLink
        }

        // This part (server-side direct call) usually doesn't happen for File object in NodeJS context directly from UI
        // But if needed:
        return '';
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
