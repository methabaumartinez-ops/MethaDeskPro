// src/lib/services/dokumentService.ts
import { TsDokument, DokumentTyp } from '@/types';
export const DokumentService = {
    async getDokumente(filter?: {
        entityId?: string;
        entityType?: TsDokument['entityType'];
        projektId?: string;
    }): Promise<TsDokument[]> {
        const params = new URLSearchParams();
                    if (filter?.entityId) params.set('entityId', filter.entityId);
                    if (filter?.entityType) params.set('entityType', filter.entityType);
                    if (filter?.projektId) params.set('projektId', filter.projektId);
                    const res = await fetch(`/api/dokumente?${params}`);
                    if (!res.ok) throw new Error('Failed to fetch dokumente');
                    return res.json();
    },

    async createDokument(data: Omit<TsDokument, 'id' | 'createdAt'>): Promise<TsDokument> {
        const res = await fetch('/api/dokumente', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (!res.ok) throw new Error('Failed to create dokument');
                    return res.json();
    },

    async updateDokument(id: string, updates: Partial<TsDokument>): Promise<TsDokument> {
        const res = await fetch(`/api/dokumente/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates),
                    });
                    if (!res.ok) throw new Error('Failed to update dokument');
                    return res.json();
    },

    async deleteDokument(id: string): Promise<void> {
        await fetch(`/api/dokumente/${id}`, { method: 'DELETE' });
                    return;
    },

    getDokumentTypOptions(): { value: DokumentTyp; label: string }[] {
        return [
            { value: 'PDF', label: 'PDF' },
            { value: 'DXF', label: 'DXF' },
            { value: 'Schnittliste', label: 'Schnittliste' },
            { value: 'Auszug', label: 'Auszug' },
            { value: 'IFC', label: 'IFC-Modell' },
            { value: 'Zeichnung', label: 'Zeichnung' },
            { value: 'Lieferschein', label: 'Lieferschein' },
            { value: 'Rechnung', label: 'Rechnung' },
            { value: 'Andere', label: 'Andere' },
        ];
    },
};
