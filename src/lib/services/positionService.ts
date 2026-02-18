import { DatabaseService } from '@/lib/services/db';
import { Position } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const PositionService = {
    async getPositionen(): Promise<Position[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/positionen');
            if (!res.ok) throw new Error('Failed to fetch positions');
            return await res.json();
        }
        return DatabaseService.list<Position>('positionen');
    },

    async getPositionById(id: string): Promise<Position | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/positionen/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch position');
            return await res.json();
        }
        return DatabaseService.get<Position>('positionen', id);
    },

    async getPositionenByTeilsystem(teilsystemId: string): Promise<Position[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/positionen?teilsystemId=${teilsystemId}`);
            if (!res.ok) throw new Error('Failed to fetch positions');
            return await res.json();
        }
        const all = await this.getPositionen();
        return all.filter(p => p.teilsystemId === teilsystemId);
    },

    async createPosition(position: Partial<Position>): Promise<Position> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/positionen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(position)
            });
            if (!res.ok) throw new Error('Failed to create position');
            return await res.json();
        }
        const newPosition: Position = {
            ...position,
            id: position.id || uuidv4(),
        } as Position;

        return DatabaseService.upsert('positionen', newPosition);
    },

    async updatePosition(id: string, updates: Partial<Position>): Promise<Position> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/positionen/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update position');
            return await res.json();
        }
        const existing = await this.getPositionById(id);
        if (!existing) throw new Error('Position not found');

        const updated = { ...existing, ...updates };
        return DatabaseService.upsert('positionen', updated);
    },

    async deletePosition(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/positionen/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete position');
            return;
        }
        return DatabaseService.delete('positionen', id);
    }
};
