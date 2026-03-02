
import { DatabaseService } from '@/lib/services/db';
import { SubsystemService } from '@/lib/services/subsystemService';
import { Projekt } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { LagerortService } from './lagerortService';
import { TaskService } from './taskService';
import { TeamService } from './teamService';

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
        if (!id || id === 'undefined' || id === 'null') return null;

        if (typeof window !== 'undefined') {
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
                console.error(`[ProjectService] Network or Parse error fetching project ${id}:`, error);
                throw error;
            }
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

    async uploadImage(file: File, projektId: string, type: 'image' | 'plan' | 'ifc' | 'document' | 'lagerort' = 'image', newName?: string): Promise<string> {
        // Client-side: upload via API
        if (typeof window !== 'undefined') {
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
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Upload failed:', errorData);
                throw new Error(errorData.error || `Upload failed with status ${res.status}`);
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

        // 0. Get the project to find Drive Folder ID
        const project = await this.getProjektById(id);

        // 1. Cascade: Delete all Teilsysteme first (this handles TS-linked files)
        const teilsysteme = await SubsystemService.getTeilsysteme(id);
        for (const ts of teilsysteme) {
            await SubsystemService.deleteTeilsystem(ts.id);
        }

        // 2. Cascade: Delete Lagerorte
        const lagerorte = await LagerortService.getLagerorte(id);
        for (const lo of lagerorte) {
            await LagerortService.deleteLagerort(lo.id);
        }

        // 3. Cascade: Delete Teams and Tasks
        const teams = await TeamService.getTeams(id);
        for (const team of teams) {
            await TeamService.deleteTeam(team.id);
        }

        const tasks = await TaskService.getTasks(id);
        for (const task of tasks) {
            await TaskService.deleteTask(task.id);
        }

        // 4. Delete Project Folder from Drive if it exists
        if (project?.driveFolderId) {
            try {
                const gDrive = eval('require')('./googleDriveService');
                await gDrive.deleteFileFromDrive(project.driveFolderId);
            } catch (e) {
                console.error(`Failed to delete Drive folder ${project.driveFolderId}:`, e);
            }
        }

        // 5. Finally delete the project record
        return DatabaseService.delete('projekte', id);
    }
};
