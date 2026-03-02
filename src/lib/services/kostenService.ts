// src/lib/services/kostenService.ts
import { DatabaseService } from '@/lib/services/db';
import { TsStunden, TsMaterialkosten } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const KostenService = {
    // ---- Stunden ----
    async getStunden(teilsystemId?: string, projektId?: string): Promise<TsStunden[]> {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams();
            if (teilsystemId) params.set('teilsystemId', teilsystemId);
            if (projektId) params.set('projektId', projektId);
            const res = await fetch(`/api/kosten/stunden?${params}`);
            if (!res.ok) throw new Error('Failed to fetch stunden');
            return res.json();
        }
        const all = await DatabaseService.list<TsStunden>('ts_stunden');
        if (teilsystemId) return all.filter(s => s.teilsystemId === teilsystemId);
        if (projektId) return all.filter(s => s.projektId === projektId);
        return all;
    },

    async createStunden(data: Omit<TsStunden, 'id' | 'createdAt'>): Promise<TsStunden> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/kosten/stunden', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create stunden');
            return res.json();
        }
        const gesamtpreis = data.stundensatz ? data.stunden * data.stundensatz : undefined;
        const entry: TsStunden = {
            ...data,
            id: uuidv4(),
            gesamtpreis,
            createdAt: new Date().toISOString()
        };
        return DatabaseService.upsert('ts_stunden', entry);
    },

    async deleteStunden(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            await fetch(`/api/kosten/stunden/${id}`, { method: 'DELETE' });
            return;
        }
        return DatabaseService.delete('ts_stunden', id);
    },

    // ---- Materialkosten ----
    async getMaterialkosten(teilsystemId?: string, projektId?: string): Promise<TsMaterialkosten[]> {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams();
            if (teilsystemId) params.set('teilsystemId', teilsystemId);
            if (projektId) params.set('projektId', projektId);
            const res = await fetch(`/api/kosten/material?${params}`);
            if (!res.ok) throw new Error('Failed to fetch materialkosten');
            return res.json();
        }
        const all = await DatabaseService.list<TsMaterialkosten>('ts_materialkosten');
        if (teilsystemId) return all.filter(m => m.teilsystemId === teilsystemId);
        if (projektId) return all.filter(m => m.projektId === projektId);
        return all;
    },

    async createMaterialkosten(data: Omit<TsMaterialkosten, 'id' | 'createdAt' | 'gesamtpreis'>): Promise<TsMaterialkosten> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/kosten/material', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create materialkosten');
            return res.json();
        }
        const entry: TsMaterialkosten = {
            ...data,
            id: uuidv4(),
            gesamtpreis: data.menge * data.einzelpreis,
            createdAt: new Date().toISOString(),
        };
        return DatabaseService.upsert('ts_materialkosten', entry);
    },

    async deleteMaterialkosten(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            await fetch(`/api/kosten/material/${id}`, { method: 'DELETE' });
            return;
        }
        return DatabaseService.delete('ts_materialkosten', id);
    },

    // ---- Aggregation ----
    async getKostenzusammenfassung(teilsystemId: string): Promise<{
        totalStunden: number;
        totalMaterialkosten: number;
    }> {
        const [stunden, material] = await Promise.all([
            this.getStunden(teilsystemId),
            this.getMaterialkosten(teilsystemId),
        ]);
        return {
            totalStunden: stunden.reduce((sum, s) => sum + s.stunden, 0),
            totalMaterialkosten: material.reduce((sum, m) => sum + (m.gesamtpreis ?? m.menge * m.einzelpreis), 0),
        };
    },

    // ---- CSV Export ----
    exportStundenCSV(stunden: TsStunden[]): string {
        const header = 'Datum,Mitarbeiter,Stunden,Abteilung,Tätigkeit,Bemerkung';
        const rows = stunden.map(s =>
            [s.datum, s.mitarbeiterName || s.mitarbeiterId, s.stunden, s.abteilung || '', s.taetigkeit || '', s.bemerkung || ''].join(',')
        );
        return [header, ...rows].join('\n');
    },

    exportMaterialCSV(material: TsMaterialkosten[]): string {
        const header = 'Bezeichnung,Lieferant,Menge,Einheit,Einzelpreis CHF,Gesamtpreis CHF,Bestelldatum,Lieferdatum';
        const rows = material.map(m =>
            [m.bezeichnung, m.lieferantName || '', m.menge, m.einheit, m.einzelpreis, m.gesamtpreis ?? m.menge * m.einzelpreis, m.bestelldatum || '', m.lieferdatum || ''].join(',')
        );
        return [header, ...rows].join('\n');
    },
};
