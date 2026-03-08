// src/lib/services/lagerortService.ts
import { Lagerort } from '@/types';

function generateQrContent(id: string): string {
    return `LAGERORT:${id}`;
}

export const LagerortService = {
    async getLagerorte(projektId?: string): Promise<Lagerort[]> {
        const url = projektId ? `/api/lagerorte?projektId=${projektId}` : '/api/lagerorte';
        const res = await fetch(url);
        if (!res.ok) {
            let errorMsg = res.statusText;
            try {
                const body = await res.json();
                if (body.error) errorMsg = body.error;
            } catch (e) { }
            throw new Error(`Failed to fetch lagerorte for projektId ${projektId || 'ALL'}: HTTP ${res.status} - ${errorMsg}`);
        }
        return res.json();
    },

    async getLagerortById(id: string): Promise<Lagerort | null> {
        const res = await fetch(`/api/lagerorte/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch lagerort');
                    return res.json();
    },

    async createLagerort(data: Partial<Lagerort>): Promise<Lagerort> {
        const res = await fetch('/api/lagerorte', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (!res.ok) throw new Error('Failed to create lagerort');
                    return res.json();
    },

    async updateLagerort(id: string, updates: Partial<Lagerort>): Promise<Lagerort> {
        const res = await fetch(`/api/lagerorte/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates),
                    });
                    if (!res.ok) throw new Error('Failed to update lagerort');
                    return res.json();
    },

    async deleteLagerort(id: string): Promise<void> {
        const res = await fetch(`/api/lagerorte/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete lagerort');
                    return;
    },

    getQrContent(lagerort: Lagerort): string {
        return lagerort.qrCode || generateQrContent(lagerort.id);
    },
};
