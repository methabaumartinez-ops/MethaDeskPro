import { MaterialBestellung, BestellungStatus } from '@/types';
import { DatabaseService } from './db';
import { v4 as uuidv4 } from 'uuid';

export class BestellService {
    static async getBestellungen(projektId?: string): Promise<MaterialBestellung[]> {
        const all = await DatabaseService.list<MaterialBestellung>('bestellungen');
        return projektId ? all.filter(b => b.projektId === projektId) : all;
    }

    static async getBestellung(id: string): Promise<MaterialBestellung | undefined> {
        const bestellung = await DatabaseService.get<MaterialBestellung>('bestellungen', id);
        return bestellung || undefined;
    }

    static async createBestellung(bestellung: Omit<MaterialBestellung, 'id'>): Promise<MaterialBestellung> {
        const id = `mb-${Date.now()}-${uuidv4().substring(0, 8)}`;
        const newBestellung = { ...bestellung, id };
        return await DatabaseService.upsert('bestellungen', newBestellung as MaterialBestellung);
    }

    static async updateBestellung(id: string, updates: Partial<MaterialBestellung>): Promise<MaterialBestellung> {
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
        const itemIndex = items.findIndex(i => i.id === itemId);
        if (itemIndex > -1) {
            items[itemIndex] = { ...items[itemIndex], vorbereitet };
        }

        return this.updateBestellung(bestellungId, { items });
    }

    static async deleteBestellung(id: string): Promise<void> {
        await DatabaseService.delete('bestellungen', id);
    }
}
