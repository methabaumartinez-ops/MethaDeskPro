// src/lib/services/lagerortService.ts
import { DatabaseService } from '@/lib/services/db';
import { Lagerort } from '@/types';
import { v4 as uuidv4 } from 'uuid';

function generateQrContent(id: string): string {
    return `LAGERORT:${id}`;
}

export const LagerortService = {
    async getLagerorte(projektId?: string): Promise<Lagerort[]> {
        if (typeof window !== 'undefined') {
            const url = projektId ? `/api/lagerorte?projektId=${projektId}` : '/api/lagerorte';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch lagerorte');
            return res.json();
        }
        const all = await DatabaseService.list<Lagerort>('lagerorte');
        if (projektId) return all.filter(l => l.projektId === projektId);
        return all;
    },

    async getLagerortById(id: string): Promise<Lagerort | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/lagerorte/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch lagerort');
            return res.json();
        }
        return DatabaseService.get<Lagerort>('lagerorte', id);
    },

    async createLagerort(data: Partial<Lagerort>): Promise<Lagerort> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/lagerorte', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create lagerort');
            return res.json();
        }
        const id = data.id || uuidv4();
        const newLagerort: Lagerort = {
            ...data,
            id,
            qrCode: generateQrContent(id),
            createdAt: new Date().toISOString(),
        } as Lagerort;
        return DatabaseService.upsert('lagerorte', newLagerort);
    },

    async updateLagerort(id: string, updates: Partial<Lagerort>): Promise<Lagerort> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/lagerorte/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error('Failed to update lagerort');
            return res.json();
        }
        const existing = await this.getLagerortById(id);
        if (!existing) throw new Error('Lagerort not found');
        return DatabaseService.upsert('lagerorte', { ...existing, ...updates, updatedAt: new Date().toISOString() });
    },

    async deleteLagerort(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/lagerorte/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete lagerort');
            return;
        }
        return DatabaseService.delete('lagerorte', id);
    },

    getQrContent(lagerort: Lagerort): string {
        return lagerort.qrCode || generateQrContent(lagerort.id);
    },
};
