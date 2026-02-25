// src/lib/services/dokumentService.ts
import { DatabaseService } from '@/lib/services/db';
import { TsDokument, DokumentTyp } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const DokumentService = {
    async getDokumente(filter?: {
        entityId?: string;
        entityType?: TsDokument['entityType'];
        projektId?: string;
    }): Promise<TsDokument[]> {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams();
            if (filter?.entityId) params.set('entityId', filter.entityId);
            if (filter?.entityType) params.set('entityType', filter.entityType);
            if (filter?.projektId) params.set('projektId', filter.projektId);
            const res = await fetch(`/api/dokumente?${params}`);
            if (!res.ok) throw new Error('Failed to fetch dokumente');
            return res.json();
        }
        const all = await DatabaseService.list<TsDokument>('ts_dokumente');
        let result = all;
        if (filter?.entityId) result = result.filter(d => d.entityId === filter.entityId);
        if (filter?.entityType) result = result.filter(d => d.entityType === filter.entityType);
        if (filter?.projektId) result = result.filter(d => d.projektId === filter.projektId);
        return result;
    },

    async createDokument(data: Omit<TsDokument, 'id' | 'createdAt'>): Promise<TsDokument> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/dokumente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create dokument');
            return res.json();
        }
        const doc: TsDokument = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        return DatabaseService.upsert('ts_dokumente', doc);
    },

    async updateDokument(id: string, updates: Partial<TsDokument>): Promise<TsDokument> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/dokumente/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error('Failed to update dokument');
            return res.json();
        }
        const existing = await DatabaseService.get<TsDokument>('ts_dokumente', id);
        if (!existing) throw new Error('Dokument not found');
        return DatabaseService.upsert('ts_dokumente', { ...existing, ...updates });
    },

    async deleteDokument(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            await fetch(`/api/dokumente/${id}`, { method: 'DELETE' });
            return;
        }
        return DatabaseService.delete('ts_dokumente', id);
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
