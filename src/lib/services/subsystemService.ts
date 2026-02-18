import { DatabaseService } from '@/lib/services/db';
import { Teilsystem, Position, Material } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { PositionService } from './positionService';
import { MaterialService } from './materialService';

export const SubsystemService = {
    // CRUD
    async getTeilsysteme(projektId?: string): Promise<Teilsystem[]> {
        if (typeof window !== 'undefined') {
            try {
                const url = projektId ? `/api/teilsysteme?projektId=${projektId}` : '/api/teilsysteme';
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch teilsysteme');
                return await res.json();
            } catch (error) {
                console.error("Client fetch error:", error);
                throw error;
            }
        }
        // Filter by projektId if provided
        const all = await DatabaseService.list<Teilsystem>('teilsysteme');
        if (projektId) {
            return all.filter(t => t.projektId === projektId);
        }
        return all;
    },

    async getTeilsystemById(id: string): Promise<Teilsystem | null> {
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch(`/api/teilsysteme/${id}`);
                if (res.status === 404) return null;
                if (!res.ok) throw new Error('Failed to fetch teilsystem');
                return await res.json();
            } catch (error) {
                console.error("Client fetch error:", error);
                throw error;
            }
        }
        return DatabaseService.get<Teilsystem>('teilsysteme', id);
    },

    async createTeilsystem(teilsystem: Partial<Teilsystem>): Promise<Teilsystem> {
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch('/api/teilsysteme', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(teilsystem)
                });
                if (!res.ok) throw new Error('Failed to create teilsystem');
                return await res.json();
            } catch (error) {
                console.error("Client fetch error:", error);
                throw error;
            }
        }
        const newSystem: Teilsystem = {
            ...teilsystem,
            id: teilsystem.teilsystemNummer || teilsystem.id || uuidv4(),
        } as Teilsystem;
        return DatabaseService.upsert('teilsysteme', newSystem);
    },

    async updateTeilsystem(id: string, updates: Partial<Teilsystem>): Promise<Teilsystem> {
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch(`/api/teilsysteme/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                if (!res.ok) throw new Error('Failed to update teilsystem');
                return await res.json();
            } catch (error) {
                console.error("Client fetch error:", error);
                throw error;
            }
        }
        const existing = await this.getTeilsystemById(id);
        if (!existing) throw new Error('Teilsystem not found');
        const updated = { ...existing, ...updates };
        return DatabaseService.upsert('teilsysteme', updated);
    },

    async deleteTeilsystem(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch(`/api/teilsysteme/${id}`, {
                    method: 'DELETE',
                });
                if (!res.ok) throw new Error('Failed to delete teilsystem');
                return;
            } catch (error) {
                console.error("Client fetch error:", error);
                throw error;
            }
        }
        return DatabaseService.delete('teilsysteme', id);
    },

    // Aggregations
    async getTeilsystemCount(projektId: string): Promise<number> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/teilsysteme?projektId=${projektId}`);
            if (!res.ok) throw new Error('Failed to fetch count');
            const data = await res.json();
            return data.length;
        }
        return (await this.getTeilsysteme(projektId)).length;
    },

    async getPositionCount(projektId: string): Promise<number> {
        if (typeof window !== 'undefined') {
            // This is a bit heavy, but for MVP it works
            const teilsysteme = await this.getTeilsysteme(projektId);
            const tsIds = teilsysteme.map(t => t.id);
            const positionenRes = await fetch('/api/data/positionen');
            const positionen: Position[] = await positionenRes.json();
            return positionen.filter(p => tsIds.includes(p.teilsystemId)).length;
        }
        const teilsysteme = await this.getTeilsysteme(projektId);
        const tsIds = teilsysteme.map(t => t.id);
        const positionen = await PositionService.getPositionen();
        return positionen.filter(p => tsIds.includes(p.teilsystemId)).length;
    },

    async getMaterialCount(projektId: string): Promise<number> {
        if (typeof window !== 'undefined') {
            const teilsysteme = await this.getTeilsysteme(projektId);
            const tsIds = teilsysteme.map(t => t.id);
            const positionenRes = await fetch('/api/data/positionen');
            const positionen: Position[] = await positionenRes.json();
            const projectPositions = positionen.filter(p => tsIds.includes(p.teilsystemId));
            const posIds = projectPositions.map(p => p.id);

            const materialRes = await fetch('/api/data/material');
            const material: Material[] = await materialRes.json();
            return material.filter(m => m.positionId && posIds.includes(m.positionId)).length;
        }
        const teilsysteme = await this.getTeilsysteme(projektId);
        const tsIds = teilsysteme.map(t => t.id);
        const positionen = await PositionService.getPositionen();
        const projectPositions = positionen.filter(p => tsIds.includes(p.teilsystemId));
        const posIds = projectPositions.map(p => p.id);

        const material = await MaterialService.getMaterial();
        return material.filter(m => m.positionId && posIds.includes(m.positionId)).length;
    },

    async getRecentActivity(projektId: string) {
        if (typeof window !== 'undefined') {
            const [teilsysteme, positionsRes, materialRes] = await Promise.all([
                this.getTeilsysteme(projektId),
                fetch('/api/data/positionen'),
                fetch('/api/data/material')
            ]);
            const positionen: Position[] = await positionsRes.json();
            const material: Material[] = await materialRes.json();

            const tsIds = teilsysteme.map(t => t.id);
            const projectPositions = positionen.filter(p => tsIds.includes(p.teilsystemId));
            const posIds = projectPositions.map(p => p.id);
            const projectMaterial = material.filter(m => m.positionId && posIds.includes(m.positionId));

            const activities = [
                ...teilsysteme.map((i: any) => ({ action: 'Teilsystem erstellt', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/teilsysteme` })),
                ...projectPositions.map((i: any) => ({ action: 'Position erstellt', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/positionen` })),
                ...projectMaterial.map((i: any) => ({ action: 'Material erfasst', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/material` }))
            ];

            return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
        }
        const teilsysteme = await this.getTeilsysteme(projektId);
        const tsIds = teilsysteme.map(t => t.id);

        const positionen = await PositionService.getPositionen();
        const projectPositions = positionen.filter(p => tsIds.includes(p.teilsystemId));
        const posIds = projectPositions.map(p => p.id);

        const material = await MaterialService.getMaterial();
        const projectMaterial = material.filter(m => m.positionId && posIds.includes(m.positionId));

        const activities = [
            ...teilsysteme.map((i: any) => ({ action: 'Teilsystem erstellt', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/teilsysteme` })),
            ...projectPositions.map((i: any) => ({ action: 'Position erstellt', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/positionen` })),
            ...projectMaterial.map((i: any) => ({ action: 'Material erfasst', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/material` }))
        ];

        return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
    }
};
