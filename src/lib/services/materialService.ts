import { DatabaseService } from '@/lib/services/db';
import { Material } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const MaterialService = {
    async getMaterial(): Promise<Material[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/material');
            if (!res.ok) throw new Error('Failed to fetch material');
            return await res.json();
        }
        return DatabaseService.list<Material>('material');
    },

    async getMaterialById(id: string): Promise<Material | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/material/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch material');
            return await res.json();
        }
        return DatabaseService.get<Material>('material', id);
    },

    async getMaterialByPosition(positionId: string): Promise<Material[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/material?positionId=${positionId}`);
            if (!res.ok) throw new Error('Failed to fetch material');
            return await res.json();
        }
        const all = await this.getMaterial();
        return all.filter(m => m.positionId === positionId);
    },

    async createMaterial(material: Partial<Material>): Promise<Material> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/material', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(material)
            });
            if (!res.ok) throw new Error('Failed to create material');
            return await res.json();
        }
        const newMaterial: Material = {
            ...material,
            id: material.id || uuidv4(),
        } as Material;

        return DatabaseService.upsert('material', newMaterial);
    },

    async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/material/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update material');
            return await res.json();
        }
        const existing = await this.getMaterialById(id);
        if (!existing) throw new Error('Material not found');

        const updated = { ...existing, ...updates };
        return DatabaseService.upsert('material', updated);
    },

    async deleteMaterial(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/material/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete material');
            return;
        }
        return DatabaseService.delete('material', id);
    }
};
