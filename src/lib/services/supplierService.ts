import { DatabaseService } from '@/lib/services/db';
import { Lieferant } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const SupplierService = {
    async getLieferanten(): Promise<Lieferant[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/lieferanten');
            if (!res.ok) throw new Error('Failed to fetch suppliers');
            return await res.json();
        }
        return DatabaseService.list<Lieferant>('lieferanten');
    },

    async getLieferantById(id: string): Promise<Lieferant | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/lieferanten/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch supplier');
            return await res.json();
        }
        return DatabaseService.get<Lieferant>('lieferanten', id);
    },

    async createLieferant(lieferant: Partial<Lieferant>): Promise<Lieferant> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/lieferanten', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lieferant)
            });
            if (!res.ok) throw new Error('Failed to create supplier');
            return await res.json();
        }
        const newSupplier: Lieferant = {
            ...lieferant,
            id: lieferant.id || uuidv4(),
        } as Lieferant;

        return DatabaseService.upsert('lieferanten', newSupplier);
    },

    async updateLieferant(id: string, updates: Partial<Lieferant>): Promise<Lieferant> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/lieferanten/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update supplier');
            return await res.json();
        }
        const existing = await this.getLieferantById(id);
        if (!existing) throw new Error('Supplier not found');

        const updatedSupplier = { ...existing, ...updates };
        return DatabaseService.upsert('lieferanten', updatedSupplier);
    },

    async deleteLieferant(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/lieferanten/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete supplier');
            return;
        }
        return DatabaseService.delete('lieferanten', id);
    }
};
