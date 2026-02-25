// src/lib/services/lagerbewegungService.ts
import { DatabaseService } from '@/lib/services/db';
import { Lagerbewegung, LagerbewegungTyp } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const LagerbewegungService = {
    async getLagerbewegungen(filter?: { entityId?: string; projektId?: string }): Promise<Lagerbewegung[]> {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams();
            if (filter?.entityId) params.set('entityId', filter.entityId);
            if (filter?.projektId) params.set('projektId', filter.projektId);
            const res = await fetch(`/api/lagerbewegungen?${params}`);
            if (!res.ok) throw new Error('Failed to fetch lagerbewegungen');
            return res.json();
        }
        const all = await DatabaseService.list<Lagerbewegung>('lagerbewegungen');
        if (filter?.entityId) return all.filter(l => l.entityId === filter.entityId);
        if (filter?.projektId) return all.filter(l => l.projektId === filter.projektId);
        return all;
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
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/lagerbewegungen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to register lagerbewegung');
            return res.json();
        }
        const newBewegung: Lagerbewegung = {
            ...data,
            id: uuidv4(),
            zeitpunkt: new Date().toISOString(),
        };
        return DatabaseService.upsert('lagerbewegungen', newBewegung);
    },

    async getHistorieForEntity(entityId: string): Promise<Lagerbewegung[]> {
        const all = await this.getLagerbewegungen({ entityId });
        return all.sort((a, b) => new Date(b.zeitpunkt).getTime() - new Date(a.zeitpunkt).getTime());
    },
};
