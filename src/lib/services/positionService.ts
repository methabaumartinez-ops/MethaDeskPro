import { SubPositionService } from './subPositionService';
import { MaterialService } from './materialService';
import { Position } from '@/types';
import { STATUS_DEFAULTS } from '@/lib/config/statusConfig';

export const PositionService = {
    async getPositionen(): Promise<Position[]> {
        const res = await fetch('/api/data/positionen');
                    if (!res.ok) throw new Error('Failed to fetch positions');
                    return await res.json();
    },

    async getPositionById(id: string): Promise<Position | null> {
        const res = await fetch(`/api/data/positionen/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch position');
                    return await res.json();
    },

    async getPositionenByTeilsystem(teilsystemId: string): Promise<Position[]> {
        const res = await fetch(`/api/data/positionen?teilsystemId=${teilsystemId}`);
                    if (!res.ok) throw new Error('Failed to fetch positions');
                    return await res.json();
    },
    async createPosition(position: Partial<Position>): Promise<Position> {
        const payload = {
            ...position,
            status: position.status || STATUS_DEFAULTS.POSITION.status,
            abteilung: STATUS_DEFAULTS.POSITION.abteilung as any
        };
        const res = await fetch('/api/data/positionen', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error('Failed to create position');
                    return await res.json();
    },

    async updatePosition(id: string, updates: Partial<Position>): Promise<Position> {
        const res = await fetch(`/api/data/positionen/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update position');
                    return await res.json();
    },

    async deletePosition(id: string): Promise<void> {
        const res = await fetch(`/api/data/positionen/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete position');
                    return;
    }
};
