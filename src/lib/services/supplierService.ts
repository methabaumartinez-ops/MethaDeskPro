import { Lieferant } from '@/types';
export const SupplierService = {
    async getLieferanten(): Promise<Lieferant[]> {
        const res = await fetch('/api/data/lieferanten');
                    if (!res.ok) throw new Error('Failed to fetch suppliers');
                    return await res.json();
    },

    async getLieferantById(id: string): Promise<Lieferant | null> {
        const res = await fetch(`/api/data/lieferanten/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch supplier');
                    return await res.json();
    },

    async createLieferant(lieferant: Partial<Lieferant>): Promise<Lieferant> {
        const res = await fetch('/api/data/lieferanten', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(lieferant)
                    });
                    if (!res.ok) throw new Error('Failed to create supplier');
                    return await res.json();
    },

    async updateLieferant(id: string, updates: Partial<Lieferant>): Promise<Lieferant> {
        const res = await fetch(`/api/data/lieferanten/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update supplier');
                    return await res.json();
    },

    async deleteLieferant(id: string): Promise<void> {
        const res = await fetch(`/api/data/lieferanten/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete supplier');
                    return;
    }
};
