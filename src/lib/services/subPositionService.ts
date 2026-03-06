import { Unterposition } from '@/types';
import { STATUS_DEFAULTS } from '@/lib/config/statusConfig';
export const SubPositionService = {
    async getUnterpositionen(positionId?: string): Promise<Unterposition[]> {
        const url = positionId ? `/api/data/unterpositionen?positionId=${positionId}` : '/api/data/unterpositionen';
                    const res = await fetch(url);
                    if (!res.ok) throw new Error('Failed to fetch sub-positions');
                    return await res.json();
    },

    async getUnterpositionById(id: string): Promise<Unterposition | null> {
        const res = await fetch(`/api/data/unterpositionen/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch sub-position');
                    return await res.json();
    },

    async createUnterposition(subPosition: Partial<Unterposition>): Promise<Unterposition> {
        const payload = {
            ...subPosition,
            status: subPosition.status || STATUS_DEFAULTS.UNTERPOSITION.status,
            abteilung: STATUS_DEFAULTS.UNTERPOSITION.abteilung as any
        };
        const res = await fetch('/api/data/unterpositionen', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error('Failed to create sub-position');
                    return await res.json();
    },

    async updateUnterposition(id: string, updates: Partial<Unterposition>): Promise<Unterposition> {
        const res = await fetch(`/api/data/unterpositionen/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update sub-position');
                    return await res.json();
    },

    async deleteUnterposition(id: string): Promise<void> {
        const res = await fetch(`/api/data/unterpositionen/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete sub-position');
                    return;
    }
};
