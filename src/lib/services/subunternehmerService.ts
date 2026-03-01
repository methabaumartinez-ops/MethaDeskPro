import { DatabaseService } from '@/lib/services/db';
import { Subunternehmer } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const SubunternehmerService = {
    async getSubunternehmer(): Promise<Subunternehmer[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/subunternehmer');
            if (!res.ok) throw new Error('Failed to fetch subunternehmer');
            return await res.json();
        }
        return DatabaseService.list<Subunternehmer>('subunternehmer');
    },

    async getSubunternehmerById(id: string): Promise<Subunternehmer | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/subunternehmer/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch subcontractor');
            return await res.json();
        }
        return DatabaseService.get<Subunternehmer>('subunternehmer', id);
    },

    async createSubunternehmer(data: Partial<Subunternehmer>): Promise<Subunternehmer> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/subunternehmer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to create subcontractor');
            return await res.json();
        }
        const newSub: Subunternehmer = {
            ...data,
            id: data.id || uuidv4(),
            createdAt: data.createdAt || new Date().toISOString()
        } as Subunternehmer;

        return DatabaseService.upsert('subunternehmer', newSub);
    },

    async updateSubunternehmer(id: string, updates: Partial<Subunternehmer>): Promise<Subunternehmer> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/subunternehmer/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update subcontractor');
            return await res.json();
        }
        const existing = await this.getSubunternehmerById(id);
        if (!existing) throw new Error('Subcontractor not found');

        const updated = { ...existing, ...updates };
        return DatabaseService.upsert('subunternehmer', updated);
    },

    async deleteSubunternehmer(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/subunternehmer/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete subcontractor');
            return;
        }
        return DatabaseService.delete('subunternehmer', id);
    }
};
