import { DatabaseService } from '@/lib/services/db';
import { Unterposition } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const SubPositionService = {
    async getUnterpositionen(positionId?: string): Promise<Unterposition[]> {
        if (typeof window !== 'undefined') {
            const url = positionId ? `/api/data/unterpositionen?positionId=${positionId}` : '/api/data/unterpositionen';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch sub-positions');
            return await res.json();
        }
        const filter = positionId ? { must: [{ key: 'positionId', match: { value: positionId } }] } : undefined;
        return DatabaseService.list<Unterposition>('unterpositionen', filter);
    },

    async getUnterpositionById(id: string): Promise<Unterposition | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/unterpositionen/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch sub-position');
            return await res.json();
        }
        return DatabaseService.get<Unterposition>('unterpositionen', id);
    },

    async createUnterposition(subPosition: Partial<Unterposition>): Promise<Unterposition> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/unterpositionen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subPosition)
            });
            if (!res.ok) throw new Error('Failed to create sub-position');
            return await res.json();
        }
        const newSub: Unterposition = {
            ...subPosition,
            id: subPosition.id || uuidv4(),
        } as Unterposition;
        return DatabaseService.upsert('unterpositionen', newSub);
    },

    async updateUnterposition(id: string, updates: Partial<Unterposition>): Promise<Unterposition> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/unterpositionen/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update sub-position');
            return await res.json();
        }
        const existing = await this.getUnterpositionById(id);
        if (!existing) throw new Error('Sub-position not found');
        const updated = { ...existing, ...updates };
        return DatabaseService.upsert('unterpositionen', updated);
    },

    async deleteUnterposition(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/unterpositionen/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete sub-position');
            return;
        }
        return DatabaseService.delete('unterpositionen', id);
    }
};
