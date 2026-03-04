// src/lib/services/beschichterService.ts
import { WlBeschichter } from '@/types';
export const BeschichterService = {
    async getBeschichter(): Promise<WlBeschichter[]> {
        const res = await fetch('/api/beschichter');
                    if (!res.ok) throw new Error('Failed to fetch beschichter');
                    return res.json();
    },

    async getBeschichterById(id: string): Promise<WlBeschichter | null> {
        const res = await fetch(`/api/beschichter/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch beschichter');
                    return res.json();
    },

    async createBeschichter(data: Omit<WlBeschichter, 'id' | 'createdAt'>): Promise<WlBeschichter> {
        const res = await fetch('/api/beschichter', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (!res.ok) throw new Error('Failed to create beschichter');
                    return res.json();
    },

    async updateBeschichter(id: string, updates: Partial<WlBeschichter>): Promise<WlBeschichter> {
        const res = await fetch(`/api/beschichter/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates),
                    });
                    if (!res.ok) throw new Error('Failed to update beschichter');
                    return res.json();
    },

    async deleteBeschichter(id: string): Promise<void> {
        await fetch(`/api/beschichter/${id}`, { method: 'DELETE' });
                    return;
    },
};
