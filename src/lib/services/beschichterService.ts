// src/lib/services/beschichterService.ts
import { DatabaseService } from '@/lib/services/db';
import { WlBeschichter } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const BeschichterService = {
    async getBeschichter(): Promise<WlBeschichter[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/beschichter');
            if (!res.ok) throw new Error('Failed to fetch beschichter');
            return res.json();
        }
        return DatabaseService.list<WlBeschichter>('beschichter');
    },

    async getBeschichterById(id: string): Promise<WlBeschichter | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/beschichter/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch beschichter');
            return res.json();
        }
        return DatabaseService.get<WlBeschichter>('beschichter', id);
    },

    async createBeschichter(data: Omit<WlBeschichter, 'id' | 'createdAt'>): Promise<WlBeschichter> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/beschichter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create beschichter');
            return res.json();
        }
        const b: WlBeschichter = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        return DatabaseService.upsert('beschichter', b);
    },

    async updateBeschichter(id: string, updates: Partial<WlBeschichter>): Promise<WlBeschichter> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/beschichter/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error('Failed to update beschichter');
            return res.json();
        }
        const existing = await this.getBeschichterById(id);
        if (!existing) throw new Error('Beschichter not found');
        return DatabaseService.upsert('beschichter', { ...existing, ...updates });
    },

    async deleteBeschichter(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            await fetch(`/api/beschichter/${id}`, { method: 'DELETE' });
            return;
        }
        return DatabaseService.delete('beschichter', id);
    },
};
