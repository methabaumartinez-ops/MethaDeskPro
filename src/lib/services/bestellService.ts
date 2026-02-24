import { MaterialBestellung, BestellungStatus } from '@/types';
import { DatabaseService } from './db';
import { v4 as uuidv4 } from 'uuid';

export class BestellService {
    static async getBestellungen(projektId?: string): Promise<MaterialBestellung[]> {
        if (typeof window !== 'undefined') {
            const url = projektId ? `/api/bestellungen?projektId=${projektId}` : '/api/bestellungen';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch bestellungen');
            return await res.json();
        }

        const all = await DatabaseService.list<MaterialBestellung>('bestellungen');
        return projektId ? all.filter(b => b.projektId === projektId) : all;
    }

    static async getBestellung(id: string): Promise<MaterialBestellung | undefined> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/bestellungen/${id}`);
            if (res.status === 404) return undefined;
            if (!res.ok) throw new Error('Failed to fetch bestellung');
            return await res.json();
        }

        const bestellung = await DatabaseService.get<MaterialBestellung>('bestellungen', id);
        return bestellung || undefined;
    }

    static async createBestellung(bestellung: Omit<MaterialBestellung, 'id'>): Promise<MaterialBestellung> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/bestellungen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bestellung)
            });
            if (!res.ok) throw new Error('Failed to create bestellung');
            return await res.json();
        }

        const id = `mb-${Date.now()}-${uuidv4().substring(0, 8)}`;
        const newBestellung = { ...bestellung, id };
        return await DatabaseService.upsert('bestellungen', newBestellung as MaterialBestellung);
    }

    static async updateBestellung(id: string, updates: Partial<MaterialBestellung>): Promise<MaterialBestellung> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/bestellungen/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update bestellung');
            return await res.json();
        }

        const bestellung = await this.getBestellung(id);
        if (!bestellung) throw new Error(`Bestellung with id ${id} not found`);

        const updated = { ...bestellung, ...updates };
        return await DatabaseService.upsert('bestellungen', updated);
    }

    static async updateBestellungStatus(id: string, status: BestellungStatus): Promise<MaterialBestellung> {
        return this.updateBestellung(id, { status });
    }

    static async toggleItemVorbereitet(bestellungId: string, itemId: string, vorbereitet: boolean): Promise<MaterialBestellung> {
        const bestellung = await this.getBestellung(bestellungId);
        if (!bestellung) throw new Error("Bestellung not found");

        const items = [...bestellung.items];
        const itemIndex = items.findIndex((i: any) => i.id === itemId);
        if (itemIndex > -1) {
            items[itemIndex] = { ...items[itemIndex], vorbereitet };
        }

        return this.updateBestellung(bestellungId, { items });
    }

    static async deleteBestellung(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/bestellungen/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete bestellung');
            return;
        }

        await DatabaseService.delete('bestellungen', id);
    }
}
