import { Subunternehmer } from '@/types';
export const SubunternehmerService = {
    async getSubunternehmer(): Promise<Subunternehmer[]> {
        const res = await fetch('/api/data/subunternehmer');
                    if (!res.ok) throw new Error('Failed to fetch subunternehmer');
                    return await res.json();
    },

    async getSubunternehmerById(id: string): Promise<Subunternehmer | null> {
        const res = await fetch(`/api/data/subunternehmer/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch subcontractor');
                    return await res.json();
    },

    async createSubunternehmer(data: Partial<Subunternehmer>): Promise<Subunternehmer> {
        const res = await fetch('/api/data/subunternehmer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!res.ok) throw new Error('Failed to create subcontractor');
                    return await res.json();
    },

    async updateSubunternehmer(id: string, updates: Partial<Subunternehmer>): Promise<Subunternehmer> {
        const res = await fetch(`/api/data/subunternehmer/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update subcontractor');
                    return await res.json();
    },

    async deleteSubunternehmer(id: string): Promise<void> {
        const res = await fetch(`/api/data/subunternehmer/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete subcontractor');
                    return;
    }
};
