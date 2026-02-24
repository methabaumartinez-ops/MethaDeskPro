import { MaterialBestellung, BestellungStatus } from '@/types';
import { mockStore } from '../mock/store';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class BestellService {
    static async getBestellungen(projektId?: string): Promise<MaterialBestellung[]> {
        await delay(300);
        return mockStore.getBestellungen(projektId);
    }

    static async getBestellung(id: string): Promise<MaterialBestellung | undefined> {
        await delay(200);
        const bestellungen = mockStore.getBestellungen();
        return bestellungen.find((b: any) => b.id === id);
    }

    static async createBestellung(bestellung: Omit<MaterialBestellung, 'id'>): Promise<MaterialBestellung> {
        await delay(500);
        const bestellungen = mockStore.getBestellungen();
        const newBestellung = {
            ...bestellung,
            id: `mb-${Date.now()}`
        };
        mockStore.saveBestellungen([...bestellungen, newBestellung]);
        return newBestellung;
    }

    static async updateBestellung(id: string, updates: Partial<MaterialBestellung>): Promise<MaterialBestellung> {
        await delay(400);
        const bestellungen = mockStore.getBestellungen();
        let updatedItem: MaterialBestellung | null = null;

        const updated = bestellungen.map((b: any) => {
            if (b.id === id) {
                updatedItem = { ...b, ...updates };
                return updatedItem;
            }
            return b;
        });

        if (!updatedItem) {
            throw new Error(`Bestellung with id ${id} not found`);
        }

        mockStore.saveBestellungen(updated);
        return updatedItem;
    }

    static async updateBestellungStatus(id: string, status: BestellungStatus): Promise<MaterialBestellung> {
        return this.updateBestellung(id, { status });
    }

    static async toggleItemVorbereitet(bestellungId: string, itemId: string, vorbereitet: boolean): Promise<MaterialBestellung> {
        await delay(200);
        const bestellungen = mockStore.getBestellungen();
        let updatedBestellung: MaterialBestellung | null = null;

        const updated = bestellungen.map((b: any) => {
            if (b.id === bestellungId) {
                const newItems = b.items.map((item: any) => {
                    if (item.id === itemId) return { ...item, vorbereitet };
                    return item;
                });
                updatedBestellung = { ...b, items: newItems };
                return updatedBestellung;
            }
            return b;
        });

        if (!updatedBestellung) throw new Error("Bestellung not found");

        mockStore.saveBestellungen(updated);
        return updatedBestellung;
    }

    static async deleteBestellung(id: string): Promise<void> {
        await delay(400);
        const bestellungen = mockStore.getBestellungen();
        const filtered = bestellungen.filter((b: any) => b.id !== id);
        mockStore.saveBestellungen(filtered);
    }
}
