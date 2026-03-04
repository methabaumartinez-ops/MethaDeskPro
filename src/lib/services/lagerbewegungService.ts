// src/lib/services/lagerbewegungService.ts
import { Lagerbewegung, LagerbewegungTyp } from '@/types';
export const LagerbewegungService = {
    async getLagerbewegungen(filter?: { entityId?: string; projektId?: string }): Promise<Lagerbewegung[]> {
        const params = new URLSearchParams();
                    if (filter?.entityId) params.set('entityId', filter.entityId);
                    if (filter?.projektId) params.set('projektId', filter.projektId);
                    const res = await fetch(`/api/lagerbewegungen?${params}`);
                    if (!res.ok) throw new Error('Failed to fetch lagerbewegungen');
                    return res.json();
    },

    async registriereBewegung(data: {
        entityType: 'position' | 'unterposition';
        entityId: string;
        vonLagerortId?: string;
        nachLagerortId: string;
        typ: LagerbewegungTyp;
        durchgefuehrtVon: string;
        durchgefuehrtVonName?: string;
        projektId?: string;
        bemerkung?: string;
    }): Promise<Lagerbewegung> {
        const res = await fetch('/api/lagerbewegungen', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (!res.ok) throw new Error('Failed to register lagerbewegung');
                    return res.json();
    },

    async getHistorieForEntity(entityId: string): Promise<Lagerbewegung[]> {
        const all = await this.getLagerbewegungen({ entityId });
        return all.sort((a, b) => new Date(b.zeitpunkt).getTime() - new Date(a.zeitpunkt).getTime());
    },
};
