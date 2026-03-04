import { Material } from '@/types';
export const MaterialService = {
    async getMaterial(): Promise<Material[]> {
        const res = await fetch('/api/data/material');
                    if (!res.ok) throw new Error('Failed to fetch material');
                    return await res.json();
    },

    async getMaterialById(id: string): Promise<Material | null> {
        const res = await fetch(`/api/data/material/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch material');
                    return await res.json();
    },

    async getMaterialByPosition(positionId: string): Promise<Material[]> {
        const res = await fetch(`/api/data/material?positionId=${positionId}`);
                    if (!res.ok) throw new Error('Failed to fetch material');
                    return await res.json();
    },

    async createMaterial(material: Partial<Material>): Promise<Material> {
        const res = await fetch('/api/data/material', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(material)
                    });
                    if (!res.ok) throw new Error('Failed to create material');
                    return await res.json();
    },

    async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
        const res = await fetch(`/api/data/material/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update material');
                    return await res.json();
    },

    async deleteMaterial(id: string): Promise<void> {
        const res = await fetch(`/api/data/material/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete material');
                    return;
    }
};
