// src/lib/services/kostenService.ts
import { TsStunden, TsMaterialkosten } from '@/types';
export const KostenService = {
    // ---- Stunden ----
    async getStunden(teilsystemId?: string, projektId?: string): Promise<TsStunden[]> {
        const params = new URLSearchParams();
                    if (teilsystemId) params.set('teilsystemId', teilsystemId);
                    if (projektId) params.set('projektId', projektId);
                    const res = await fetch(`/api/kosten/stunden?${params}`);
                    if (!res.ok) throw new Error('Failed to fetch stunden');
                    return res.json();
    },

    async createStunden(data: Omit<TsStunden, 'id' | 'createdAt'>): Promise<TsStunden> {
        const res = await fetch('/api/kosten/stunden', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (!res.ok) throw new Error('Failed to create stunden');
                    return res.json();
    },

    async deleteStunden(id: string): Promise<void> {
        await fetch(`/api/kosten/stunden/${id}`, { method: 'DELETE' });
                    return;
    },

    // ---- Materialkosten ----
    async getMaterialkosten(teilsystemId?: string, projektId?: string): Promise<TsMaterialkosten[]> {
        const params = new URLSearchParams();
                    if (teilsystemId) params.set('teilsystemId', teilsystemId);
                    if (projektId) params.set('projektId', projektId);
                    const res = await fetch(`/api/kosten/material?${params}`);
                    if (!res.ok) throw new Error('Failed to fetch materialkosten');
                    return res.json();
    },

    async createMaterialkosten(data: Omit<TsMaterialkosten, 'id' | 'createdAt' | 'gesamtpreis'>): Promise<TsMaterialkosten> {
        const res = await fetch('/api/kosten/material', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (!res.ok) throw new Error('Failed to create materialkosten');
                    return res.json();
    },

    async deleteMaterialkosten(id: string): Promise<void> {
        await fetch(`/api/kosten/material/${id}`, { method: 'DELETE' });
                    return;
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
