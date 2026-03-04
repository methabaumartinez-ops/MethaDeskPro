import { MaterialBestellung, BestellungStatus } from '@/types';

export class BestellService {
    static async getBestellungen(projektId?: string): Promise<MaterialBestellung[]> {
        const url = projektId ? `/api/bestellungen?projektId=${projektId}` : '/api/bestellungen';
                    const res = await fetch(url);
                    if (!res.ok) throw new Error('Failed to fetch bestellungen');
                    return await res.json();
    }

    static async getBestellung(id: string): Promise<MaterialBestellung | undefined> {
        const res = await fetch(`/api/bestellungen/${id}`);
                    if (res.status === 404) return undefined;
                    if (!res.ok) throw new Error('Failed to fetch bestellung');
                    return await res.json();
    }

    static async createBestellung(bestellung: Omit<MaterialBestellung, 'id'>): Promise<MaterialBestellung> {
        const res = await fetch('/api/bestellungen', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(bestellung)
                    });
                    if (!res.ok) throw new Error('Failed to create bestellung');
                    return await res.json();
    }

    static async updateBestellung(id: string, updates: Partial<MaterialBestellung>): Promise<MaterialBestellung> {
        const res = await fetch(`/api/bestellungen/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update bestellung');
                    return await res.json();
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

    static async updateItemAttachment(bestellungId: string, itemId: string, attachment: { url: string; id: string; name: string } | null): Promise<MaterialBestellung> {
        const bestellung = await this.getBestellung(bestellungId);
        if (!bestellung) throw new Error("Bestellung not found");

        const items = [...bestellung.items];
        const itemIndex = items.findIndex((i: any) => i.id === itemId);
        if (itemIndex > -1) {
            if (attachment) {
                items[itemIndex] = {
                    ...items[itemIndex],
                    attachmentUrl: attachment.url,
                    attachmentId: attachment.id,
                    attachmentName: attachment.name
                };
            } else {
                const newItem = { ...items[itemIndex] };
                delete newItem.attachmentUrl;
                delete newItem.attachmentId;
                delete newItem.attachmentName;
                items[itemIndex] = newItem;
            }
        }

        return this.updateBestellung(bestellungId, { items });
    }

    static async updateItemBemerkung(bestellungId: string, itemId: string, bemerkung: string): Promise<MaterialBestellung> {
        const bestellung = await this.getBestellung(bestellungId);
        if (!bestellung) throw new Error("Bestellung not found");

        const items = [...bestellung.items];
        const itemIndex = items.findIndex((i: any) => i.id === itemId);
        if (itemIndex > -1) {
            items[itemIndex] = { ...items[itemIndex], bemerkung };
        }

        return this.updateBestellung(bestellungId, { items });
    }

    static async deleteBestellung(id: string): Promise<void> {
        const res = await fetch(`/api/bestellungen/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete bestellung');
                    return;
    }
}
